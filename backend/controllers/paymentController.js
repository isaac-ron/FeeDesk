const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const School = require('../models/School');
const StkPushLog = require('../models/StkPushLog');
const StudentFee = require('../models/StudentFee');
const LedgerEntry = require('../models/LedgerEntry');
const bankService = require('../services/bankService');
const { sendPaymentReceipt } = require('../services/smsService');
const mpesaService = require('../services/mpesaService');
const { allocatePayment } = require('../services/paymentAllocationService');
const { normalise } = require('../services/paymentNormalizer');
const { getPaymentQueue, getSmsQueue } = require('../queues');
const { recordAudit } = require('../services/auditService');

/**
 * Creates ledger entries for payment allocations. Used by manual payment
 * flows (cash, bank) that process synchronously. Webhook payments get
 * their ledger entries created in the PaymentWorker instead.
 */
const createLedgerEntriesForAllocations = async ({ allocations, schoolId, studentId, transactionId, sourceLabel, ref }) => {
  for (const alloc of allocations) {
    const sf = await StudentFee.findById(alloc.studentFee);
    if (!sf) continue;
    const balanceAfter = -Math.max(0, (sf.amountCharged || 0) - (sf.amountPaid || 0));
    await LedgerEntry.create({
      school: schoolId,
      student: studentId,
      studentFee: alloc.studentFee,
      term: sf.term,
      type: 'payment',
      amount: alloc.amount,
      balanceAfter,
      payment: transactionId,
      note: `${sourceLabel} payment — ref ${ref}`,
    });
  }
};

/**
 * Shared post-confirmation pipeline for any M-PESA credit (C2B or STK).
 * Creates the Transaction, allocates it to the fee ledger, emits the
 * live-dashboard socket event, and fires a receipt SMS. Caller must have
 * already resolved `student` (with populated `school`) and done the
 * idempotency check on `transactionId`.
 */
const finalizeMpesaPayment = async ({
  req,
  student,
  school,
  transactionId,
  amount,
  phoneNumber,
  paidBy,
  reference,
  sourceLabel,
  metadata,
}) => {
  const newTransaction = await Transaction.create({
    school: school?._id || null,
    transactionId,
    student: student?._id || null,
    amount: parseFloat(amount),
    source: 'MPESA',
    type: 'CREDIT',
    reference,
    status: student ? 'COMPLETED' : 'PENDING',
    paidBy: paidBy || 'Unknown',
    phoneNumber: phoneNumber || null,
    metadata: metadata || {},
  });

  if (student) {
    const oldBalance = student.currentBalance;
    await allocatePayment({
      studentId: student._id,
      amount: parseFloat(amount),
      transaction: newTransaction,
    });
    const refreshed = await Student.findById(student._id).select('currentBalance');
    student.currentBalance = refreshed.currentBalance;
    console.log(`✅ [MPESA] Allocated for ${student.name} — ${oldBalance} → ${student.currentBalance}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('payment_received', {
        id: newTransaction._id,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        amount: newTransaction.amount,
        source: sourceLabel,
        time: new Date().toLocaleTimeString(),
        status: 'COMPLETED',
      });
    }

    sendPaymentReceipt({
      guardianPhone: student.guardianPhone,
      transactionPhone: phoneNumber,
      studentName: student.name,
      amount,
      newBalance: student.currentBalance,
      reference: transactionId,
      source: sourceLabel,
    }).catch((err) => console.error('❌ [MPESA] SMS error:', err.message));
  } else {
    const io = req.app.get('io');
    if (io) {
      io.emit('unknown_payment', {
        id: newTransaction._id,
        reference,
        amount: newTransaction.amount,
        source: sourceLabel,
        time: new Date().toLocaleTimeString(),
      });
    }
  }

  return newTransaction;
};

/**
 * @desc    Handle MPESA Validation (Safaricom asks: "Should I process this?")
 * @route   POST /api/mpesa/validation
 * @access  Public (Safaricom Only)
 */
const mpesaValidation = async (req, res) => {
  // Enterprise Rule: ALWAYS accept money. Logic checks happen in Confirmation.
  // We just return code 0 to tell Safaricom "Go ahead".
  console.log('\n========== MPESA VALIDATION RECEIVED ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Response: Accepting validation');
  console.log('===============================================\n');
  
  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
};

/**
 * @desc    Handle MPESA Confirmation (Actual Payment Data)
 * @route   POST /api/mpesa/confirmation
 * @access  Public (Safaricom Only)
 *
 * Non-negotiable #1: Respond within 5 seconds. Normalise → enqueue → 200.
 * The PaymentWorker handles matching, allocation, ledger, and SMS async.
 */
const mpesaConfirmation = async (req, res) => {
  console.log('\n========== MPESA CONFIRMATION RECEIVED ==========');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const { TransID, TransAmount, BillRefNumber, BusinessShortCode } = req.body;

    if (!TransID || !TransAmount || !BillRefNumber || !BusinessShortCode) {
      console.error('Missing required fields:', { TransID, TransAmount, BillRefNumber, BusinessShortCode });
      return res.json({ ResultCode: 1, ResultDesc: 'Missing required fields' });
    }

    // Quick idempotency check — light DB read before enqueuing
    const existing = await Transaction.findOne({ transactionId: TransID });
    if (existing) {
      console.log(`Duplicate ${TransID} — ignoring`);
      return res.json({ ResultCode: 0, ResultDesc: 'Duplicate' });
    }

    // Normalise into internal shape
    const normalised = normalise('MPESA', req.body);

    // Enqueue for async processing — respond 200 immediately
    const queue = getPaymentQueue();
    await queue.add('mpesa-c2b', {
      ...normalised,
      paybillNumber: BusinessShortCode,
    }, {
      jobId: `mpesa-${TransID}`, // prevents duplicate jobs on Safaricom retries
    });

    console.log(`Enqueued MPESA C2B: ${TransID} KES ${TransAmount}`);
    res.json({ ResultCode: 0, ResultDesc: 'Received' });
  } catch (error) {
    console.error('MPESA Confirmation Error:', error.message);
    // Still 200 so Safaricom stops retrying
    res.json({ ResultCode: 0, ResultDesc: 'Error but received' });
  }
};

/**
 * @desc    Register C2B validation & confirmation URLs with Safaricom
 * @route   POST /api/payments/register
 * @access  Private (Admin Only)
 */
const mpesaRegisterUrl = async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        message: 'API_BASE_URL environment variable not set',
      });
    }

    const validationUrl = `${baseUrl}/api/payments/validation`;
    const confirmationUrl = `${baseUrl}/api/payments/confirmation`;

    const result = await mpesaService.registerC2bUrls({
      validationUrl,
      confirmationUrl,
    });

    res.json({ success: true, message: 'C2B URLs registered', data: result });
  } catch (error) {
    console.error('❌ [MPESA] C2B registration error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Initiate STK Push — sends M-PESA payment prompt to customer phone
 * @route   POST /api/payments/stkpush
 * @access  Private
 */
const stkPush = async (req, res) => {
  try {
    const { phoneNumber, amount, admissionNumber, description } = req.body;

    if (!phoneNumber || !amount || !admissionNumber) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber, amount, and admissionNumber are required',
      });
    }

    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School context is required' });
    }

    const cleanAdm = admissionNumber.trim().toUpperCase();
    const student = await Student.findOne({ school: schoolId, admissionNumber: cleanAdm }).populate('school');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found with this admission number',
      });
    }

    const result = await mpesaService.stkPush({
      phoneNumber,
      amount: Number(amount),
      accountRef: cleanAdm,
      description: description || `Fee payment for ${student.name}`,
      school: student.school,
    });

    if (result.ResponseCode === '0') {
      // Persist the link between CheckoutRequestID and student so the
      // async stkCallback can finalise the payment against the right account.
      await StkPushLog.create({
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
        school: student.school._id,
        student: student._id,
        admissionNumber: cleanAdm,
        amount: Number(amount),
        phoneNumber: mpesaService.normalisePhone
          ? mpesaService.normalisePhone(phoneNumber)
          : phoneNumber,
        status: 'PENDING',
      });

      res.json({
        success: true,
        message: 'STK Push sent — check your phone',
        data: {
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
          studentName: student.name,
          amount: Number(amount),
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.ResponseDescription || 'STK Push failed',
        data: result,
      });
    }
  } catch (error) {
    console.error('❌ [MPESA] STK Push error:', error.response?.data || error.message);
    const msg = error.response?.data?.errorMessage || error.message;
    res.status(500).json({ success: false, message: msg });
  }
};

/**
 * @desc    STK Push callback — Safaricom calls this after user completes/cancels payment
 * @route   POST /api/payments/stkcallback
 * @access  Public (Safaricom Only)
 *
 * Non-negotiable #1: Respond within 5 seconds. Parse minimally → enqueue → 200.
 */
const stkCallback = async (req, res) => {
  console.log('\n========== STK PUSH CALLBACK ==========');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const parsed = mpesaService.parseStkCallback(req.body);
    if (!parsed) {
      console.warn('[STK] Could not parse callback body');
      return res.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    // Update StkPushLog status immediately (lightweight write)
    const pushLog = await StkPushLog.findOne({ checkoutRequestId: parsed.checkoutRequestId });

    if (!parsed.success) {
      console.log(`[STK] Payment failed/cancelled: ${parsed.resultDesc}`);
      if (pushLog) {
        pushLog.status = 'FAILED';
        pushLog.resultCode = parsed.resultCode;
        pushLog.resultDesc = parsed.resultDesc;
        await pushLog.save();
      }
      return res.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    const transId = parsed.mpesaReceiptNumber;

    // Quick idempotency check
    const existing = await Transaction.findOne({ transactionId: transId });
    if (existing) {
      console.log(`[STK] Duplicate ${transId} — skipping`);
      return res.json({ ResultCode: 0, ResultDesc: 'Duplicate' });
    }

    const phone = parsed.phoneNumber ? mpesaService.normalisePhone(parsed.phoneNumber) : null;
    const reference = pushLog ? pushLog.admissionNumber : `STK-${parsed.checkoutRequestId}`;

    // Enqueue for async processing
    const queue = getPaymentQueue();
    await queue.add('mpesa-stk', {
      provider: 'MPESA',
      ref: transId,
      amount: parsed.amount,
      phone,
      accountRef: reference,
      paidBy: phone || 'STK Payer',
      receivedAt: new Date().toISOString(),
      sourceLabel: 'MPESA (STK)',
      rawPayload: req.body,
      schoolId: pushLog?.school?.toString() || null,
      pushLogId: pushLog?._id?.toString() || null,
    }, {
      jobId: `stk-${transId}`,
    });

    console.log(`Enqueued STK callback: ${transId} KES ${parsed.amount}`);
    res.json({ ResultCode: 0, ResultDesc: 'Received' });
  } catch (error) {
    console.error('[STK] Callback error:', error.message);
    res.json({ ResultCode: 0, ResultDesc: 'Error but received' });
  }
};

/**
 * @desc    Query the status of an STK Push transaction
 * @route   POST /api/payments/stkquery
 * @access  Private
 */
const stkQueryStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;
    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: 'checkoutRequestId is required' });
    }

    const result = await mpesaService.stkQuery(checkoutRequestId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [MPESA] STK Query error:', error.response?.data || error.message);
    const msg = error.response?.data?.errorMessage || error.message;
    res.status(500).json({ success: false, message: msg });
  }
};
// @desc    Record bank payment
// @route   POST /api/payments/bank
// @access  Private
const recordBankPayment = async (req, res) => {
  console.log('\n========== BANK PAYMENT RECORDING ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('School:', req.school?.name);
  console.log('User:', req.user?.email);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { transactionId, amount, reference, source, paidBy } = req.body;
    
    console.log('[STEP 1] Checking for duplicate transaction...');
    // Check if transaction already exists in THIS school
    const existingTransaction = await Transaction.findOne({ 
      school: req.school._id,
      transactionId 
    });
    if (existingTransaction) {
      console.log('❌ Duplicate transaction found:', transactionId);
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction already recorded' 
      });
    }
    console.log('✅ [STEP 1] No duplicate found');
    
    console.log('[STEP 2] Looking up student...');
    // Find student by admission number in THIS school
    const student = await Student.findOne({ 
      school: req.school._id,
      admissionNumber: reference.toUpperCase() 
    });
    
    if (!student) {
      console.log('❌ Student not found:', reference);
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found with this admission number' 
      });
    }
    console.log('✅ [STEP 2] Student found:', student.name);
    
    console.log('[STEP 3] Creating transaction record...');
    const transaction = await Transaction.create({
      school: req.school._id,
      transactionId,
      amount,
      source: source || 'BANK_TRANSFER',
      reference,
      type: 'CREDIT',
      status: 'COMPLETED',
      student: student._id,
      paidBy: paidBy || 'Bank Transfer',
      metadata: { ...req.body, recordedBy: req.user._id }
    });
    console.log('✅ [STEP 3] Transaction created:', transaction._id);
    
    console.log('[STEP 4] Allocating payment to fee ledger...');
    const oldBalance = student.currentBalance;
    const { allocations } = await allocatePayment({ studentId: student._id, amount, transaction });

    // Create ledger entries for each allocation
    await createLedgerEntriesForAllocations({
      allocations,
      schoolId: req.school._id,
      studentId: student._id,
      transactionId: transaction._id,
      sourceLabel: source || 'BANK_TRANSFER',
      ref: transactionId,
    });

    const refreshed = await Student.findById(student._id).select('currentBalance');
    console.log(`✅ [STEP 4] Allocated: ${oldBalance} → ${refreshed.currentBalance}`);

    // Enqueue SMS receipt async
    try {
      const smsQueue = getSmsQueue();
      await smsQueue.add('payment-receipt', {
        type: 'payment_receipt',
        guardianPhone: student.guardianPhone,
        studentName: student.name,
        amount,
        newBalance: refreshed.currentBalance,
        reference: transactionId,
        source: source || 'Bank Transfer',
        schoolId: req.school._id.toString(),
        studentId: student._id.toString(),
      });
    } catch (err) {
      console.error('SMS enqueue error:', err.message);
    }

    recordAudit({
      school: req.school._id,
      user: req.user._id,
      action: 'payment.record_bank',
      entityType: 'PAYMENT',
      entityId: transaction._id,
      description: `Recorded bank payment of KES ${amount} for ${student.name} (${student.admissionNumber})`,
      metadata: { amount, source: source || 'BANK_TRANSFER', transactionId },
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('student', 'admissionNumber name classLevel');

    res.status(201).json({
      success: true,
      message: 'Bank payment recorded successfully',
      data: populatedTransaction
    });
  } catch (error) {
    console.error('❌ ========== BANK PAYMENT ERROR ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================\n');
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Record cash payment
// @route   POST /api/payments/cash
// @access  Private
const recordCashPayment = async (req, res) => {
  console.log('\n========== CASH PAYMENT RECORDING ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('School:', req.school?.name);
  console.log('User:', req.user?.email);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { amount, reference, receiptNumber, paidBy } = req.body;
    
    console.log('[STEP 1] Looking up student...');
    // Find student in THIS school
    const student = await Student.findOne({ 
      school: req.school._id,
      admissionNumber: reference.toUpperCase() 
    });
    
    if (!student) {
      console.log('❌ Student not found:', reference);
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    console.log('✅ [STEP 1] Student found:', student.name);
    
    console.log('[STEP 2] Creating transaction record...');
    const transactionId = receiptNumber || `CASH-${Date.now()}`;
    const transaction = await Transaction.create({
      school: req.school._id,
      transactionId,
      amount,
      source: 'CASH',
      reference,
      type: 'CREDIT',
      status: 'COMPLETED',
      student: student._id,
      paidBy: paidBy || reference,
      metadata: { recordedBy: req.user._id, recordedAt: new Date() }
    });
    console.log('✅ [STEP 2] Transaction created:', transaction._id);
    
    console.log('[STEP 3] Allocating payment to fee ledger...');
    const oldBalance = student.currentBalance;
    const { allocations } = await allocatePayment({ studentId: student._id, amount, transaction });

    // Create ledger entries for each allocation
    await createLedgerEntriesForAllocations({
      allocations,
      schoolId: req.school._id,
      studentId: student._id,
      transactionId: transaction._id,
      sourceLabel: 'CASH',
      ref: transactionId,
    });

    const refreshed = await Student.findById(student._id).select('currentBalance');
    console.log(`✅ [STEP 3] Allocated: ${oldBalance} → ${refreshed.currentBalance}`);

    // Enqueue SMS receipt async
    try {
      const smsQueue = getSmsQueue();
      await smsQueue.add('payment-receipt', {
        type: 'payment_receipt',
        guardianPhone: student.guardianPhone,
        studentName: student.name,
        amount,
        newBalance: refreshed.currentBalance,
        reference: transactionId,
        source: 'Cash',
        schoolId: req.school._id.toString(),
        studentId: student._id.toString(),
      });
    } catch (err) {
      console.error('SMS enqueue error:', err.message);
    }

    recordAudit({
      school: req.school._id,
      user: req.user._id,
      action: 'payment.record_cash',
      entityType: 'PAYMENT',
      entityId: transaction._id,
      description: `Recorded cash payment of KES ${amount} for ${student.name} (${student.admissionNumber})`,
      metadata: { amount, transactionId },
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('student', 'admissionNumber name classLevel');

    res.status(201).json({
      success: true,
      data: populatedTransaction
    });
  } catch (error) {
    console.error('❌ ========== CASH PAYMENT ERROR ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================\n');
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
const getPaymentStats = async (req, res) => {
  console.log('\n========== PAYMENT STATS REQUEST ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('School:', req.school?.name);
  console.log('Query Params:', req.query);
  
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {
      school: req.school._id
    };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    console.log('[STEP 1] Date filter:', dateFilter);
    
    console.log('[STEP 2] Calculating stats by source...');
    const stats = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'CREDIT', status: 'COMPLETED' } },
      {
        $group: {
          _id: '$source',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('[STEP 3] Calculating total revenue...');
    const totalRevenue = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'CREDIT', status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const responseData = {
      success: true,
      school: req.school.name,
      data: {
        bySource: stats,
        totalRevenue: totalRevenue[0]?.total || 0,
        period: {
          startDate: req.query.startDate,
          endDate: req.query.endDate
        }
      }
    };
    
    console.log('✅ Stats calculated:');
    console.log('   Total Revenue: KES', responseData.data.totalRevenue);
    console.log('   By Source:', stats);
    console.log('==========================================\n');
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ ========== STATS ERROR ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('====================================\n');
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle Bank Payment Webhook (Equity, KCB, Co-op)
// @route   POST /api/payments/bank/webhook/:provider
// @access  Public (Bank APIs Only)
//
// Non-negotiable #1: Validate signature → normalise → enqueue → respond fast.
const bankWebhookHandler = async (req, res) => {
  console.log('\n========== BANK WEBHOOK RECEIVED ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Provider:', req.params.provider.toUpperCase());

  const provider = req.params.provider.toUpperCase();

  const ack = (success, message) => {
    if (provider === 'KCB') {
      try {
        return bankService.getBankProvider('KCB').ackResponse(req.body, { success, message });
      } catch { /* fall through */ }
    }
    return {
      ResultCode: success ? 0 : 1,
      ResultDesc: message || (success ? 'Processed' : 'Rejected'),
    };
  };

  try {
    // 1. Validate provider
    if (!['EQUITY', 'KCB', 'COOP'].includes(provider)) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid bank provider' });
    }

    // 2. Identify school (lightweight read — needed for signature validation)
    let accountIdentifier;
    if (provider === 'EQUITY') {
      accountIdentifier = req.body.accountNumber || req.body.merchantAccount;
    } else if (provider === 'KCB') {
      accountIdentifier = req.body.creditAccountIdentifier || req.body.accountNumber;
    } else if (provider === 'COOP') {
      accountIdentifier = req.body.AccountNumber || req.body.accountNumber;
    }

    if (!accountIdentifier) {
      return res.status(400).json(ack(false, 'Missing account identifier'));
    }

    const school = await School.findOne({
      'bankIntegration.provider': provider,
      'bankIntegration.credentials.accountNumber': accountIdentifier,
      'bankIntegration.enabled': true,
      'bankIntegration.isActive': true,
    });

    if (!school) {
      return res.status(404).json(ack(false, 'School not configured for this bank account'));
    }

    // 3. Validate webhook signature
    const signature =
      req.headers['x-buni-signature'] ||
      req.headers['x-kcb-signature'] ||
      req.headers['signature'] ||
      req.headers['x-jenga-signature'] ||
      req.headers['x-signature'] ||
      req.headers['authorization'];
    const bodyForSig = req.rawBody || req.body;
    const isValid = bankService.validateWebhook(provider, bodyForSig, signature, school);
    const enforceSig = process.env.BANK_WEBHOOK_SIGNATURE_REQUIRED === 'true';

    if (!isValid && enforceSig) {
      return res.status(403).json(ack(false, 'Invalid signature'));
    }

    // 4. Normalise payload into internal shape
    const normalised = normalise(provider, req.body, school);

    // 5. Enqueue for async processing — respond immediately
    const queue = getPaymentQueue();
    await queue.add(`bank-${provider.toLowerCase()}`, {
      ...normalised,
      schoolId: school._id.toString(),
    }, {
      jobId: `bank-${normalised.ref}`,
    });

    console.log(`Enqueued ${provider} bank payment: ${normalised.ref} KES ${normalised.amount}`);
    res.json(ack(true, 'Notification received successfully'));
  } catch (error) {
    console.error('BANK WEBHOOK ERROR:', error.message);
    // Still 200 so the bank stops retrying
    res.json(ack(true, 'Received'));
  }
};

// @desc    Register Bank Webhook URL
// @route   POST /api/payments/bank/register/:provider
// @access  Private (Admin)
const registerBankWebhook = async (req, res) => {
  console.log('\n========== BANK WEBHOOK REGISTRATION ==========');
  console.log('Provider:', req.params.provider.toUpperCase());
  console.log('School:', req.school.name);
  
  try {
    const provider = req.params.provider.toUpperCase();
    
    // Validate provider
    if (!['EQUITY', 'KCB', 'COOP'].includes(provider)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bank provider. Must be EQUITY, KCB, or COOP' 
      });
    }
    
    // Check if school has bank integration configured
    if (!req.school.bankIntegration.enabled || req.school.bankIntegration.provider !== provider) {
      return res.status(400).json({ 
        success: false, 
        message: `Bank integration not configured for ${provider}` 
      });
    }
    
    // Generate callback URL
    const baseUrl = process.env.API_BASE_URL || 'https://api.schoolpay.co.ke';
    const callbackUrl = `${baseUrl}/api/payments/bank/webhook/${provider.toLowerCase()}`;
    
    console.log('Registering webhook URL:', callbackUrl);
    
    // Register with bank
    const result = await bankService.registerWebhook(provider, req.school, callbackUrl);
    
    // Update school record
    req.school.bankIntegration.credentials.callbackUrl = callbackUrl;
    req.school.bankIntegration.isActive = true;
    await req.school.save();
    
    console.log('✅ Webhook registered successfully');
    console.log('===============================================\n');
    
    res.json({ 
      success: true, 
      message: `${provider} Bank webhook registered successfully`,
      callbackUrl,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Webhook registration error:', error.message);
    console.error('===============================================\n');
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Fetch and reconcile bank transactions
// @route   GET /api/payments/bank/reconcile/:provider
// @access  Private (Admin)
const reconcileBankTransactions = async (req, res) => {
  console.log('\n========== BANK RECONCILIATION ==========');
  console.log('Provider:', req.params.provider.toUpperCase());
  console.log('School:', req.school.name);
  
  try {
    const provider = req.params.provider.toUpperCase();
    const { fromDate, toDate } = req.query;
    
    // Validate dates
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago
    const to = toDate ? new Date(toDate) : new Date(); // Default: today
    
    console.log('Date range:', from.toISOString(), 'to', to.toISOString());
    
    // Fetch transactions from bank
    const bankTransactions = await bankService.fetchTransactions(provider, req.school, from, to);
    
    console.log(`✅ Fetched ${bankTransactions.length} transactions from bank`);
    
    // Compare with our records
    const ourTransactions = await Transaction.find({
      school: req.school._id,
      source: 'BANK_TRANSFER',
      'metadata.provider': provider,
      createdAt: { $gte: from, $lte: to }
    });
    
    console.log(`✅ Found ${ourTransactions.length} matching transactions in our system`);
    
    // Find missing transactions
    const ourTransactionIds = new Set(ourTransactions.map(t => t.transactionId));
    const missingTransactions = bankTransactions.filter(
      t => !ourTransactionIds.has(t.transaction_reference || t.TransactionID || t.transactionReference)
    );
    
    console.log(`⚠️  ${missingTransactions.length} transactions not in our system`);
    console.log('===============================================\n');
    
    res.json({ 
      success: true, 
      data: {
        bankTransactions: bankTransactions.length,
        systemTransactions: ourTransactions.length,
        missingTransactions: missingTransactions,
        dateRange: { from, to }
      }
    });
    
  } catch (error) {
    console.error('❌ Reconciliation error:', error.message);
    console.error('===============================================\n');
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Match an unmatched (suspense) payment to a student
// @route   PATCH /api/payments/:id/match
// @access  Private (owner, bursar)
const matchPayment = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'super_admin' && transaction.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Can only match PENDING (unmatched) payments. Current status: ${transaction.status}`,
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.school.toString() !== transaction.school?.toString()) {
      return res.status(400).json({ success: false, message: 'Student belongs to a different school' });
    }

    // Link the transaction to the student
    transaction.student = student._id;
    transaction.reference = student.admissionNumber;
    transaction.status = 'COMPLETED';
    await transaction.save();

    // Allocate to fee lines + create ledger entries
    const { allocations } = await allocatePayment({
      studentId: student._id,
      amount: transaction.amount,
      transaction,
    });

    await createLedgerEntriesForAllocations({
      allocations,
      schoolId: transaction.school,
      studentId: student._id,
      transactionId: transaction._id,
      sourceLabel: transaction.source,
      ref: transaction.transactionId,
    });

    // Enqueue SMS receipt
    try {
      const smsQueue = getSmsQueue();
      await smsQueue.add('payment-receipt', {
        type: 'payment_receipt',
        guardianPhone: student.guardianPhone,
        studentName: student.name,
        amount: transaction.amount,
        newBalance: (await Student.findById(student._id).select('currentBalance')).currentBalance,
        reference: transaction.transactionId,
        source: transaction.source,
        schoolId: transaction.school.toString(),
        studentId: student._id.toString(),
      });
    } catch (err) {
      console.error('SMS enqueue error:', err.message);
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('payment_received', {
        id: transaction._id,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        amount: transaction.amount,
        source: transaction.source,
        time: new Date().toLocaleTimeString(),
        status: 'COMPLETED',
      });
    }

    const populated = await Transaction.findById(transaction._id)
      .populate('student', 'admissionNumber name classLevel');

    recordAudit({
      school: transaction.school,
      user: req.user._id,
      action: 'payment.match',
      entityType: 'PAYMENT',
      entityId: transaction._id,
      description: `Matched suspense payment of KES ${transaction.amount} to ${student.name} (${student.admissionNumber})`,
      metadata: { amount: transaction.amount, studentId: student._id },
    });

    res.json({ success: true, message: 'Payment matched successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List unmatched (suspense) payments
// @route   GET /api/payments/unmatched
// @access  Private
const getUnmatchedPayments = async (req, res) => {
  try {
    const filter = { status: 'PENDING', student: null };
    if (req.user.role !== 'super_admin') filter.school = req.user.school;

    const payments = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refund a payment — creates a reversal ledger entry
// @route   POST /api/payments/:id/refund
// @access  Private (owner, bursar)
const refundPayment = async (req, res) => {
  try {
    const { reason } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'super_admin' && transaction.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (transaction.status === 'REVERSED') {
      return res.status(409).json({ success: false, message: 'Transaction already refunded' });
    }

    if (transaction.type !== 'CREDIT') {
      return res.status(400).json({ success: false, message: 'Can only refund credit (payment) transactions' });
    }

    // Mark as reversed
    transaction.status = 'REVERSED';
    await transaction.save();

    // Unwind allocations: reduce amountPaid on each StudentFee row
    if (transaction.student && Array.isArray(transaction.allocations) && transaction.allocations.length) {
      for (const alloc of transaction.allocations) {
        const row = await StudentFee.findById(alloc.studentFee);
        if (!row) continue;

        row.amountPaid = Math.max(0, (row.amountPaid || 0) - (alloc.amount || 0));
        await row.save();

        // Create refund ledger entry (negative = debit, increases what student owes)
        const balanceAfter = -Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0));
        await LedgerEntry.create({
          school: transaction.school,
          student: transaction.student,
          studentFee: alloc.studentFee,
          term: row.term,
          type: 'refund',
          amount: -alloc.amount, // negative = debit (money returned)
          balanceAfter,
          payment: transaction._id,
          performedBy: req.user._id,
          note: reason || `Refund of ${transaction.transactionId}`,
        });
      }

      // Recompute student balance
      const { recomputeStudentBalance } = require('../services/balanceService');
      await recomputeStudentBalance(transaction.student);
    }

    recordAudit({
      school: transaction.school,
      user: req.user._id,
      action: 'payment.refund',
      entityType: 'PAYMENT',
      entityId: transaction._id,
      description: `Refunded payment ${transaction.transactionId} (KES ${transaction.amount})${reason ? ': ' + reason : ''}`,
      metadata: { amount: transaction.amount, reason },
    });

    res.json({ success: true, message: 'Payment refunded', data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reallocate a payment to different fee lines
// @route   POST /api/payments/:id/reallocate
// @access  Private (owner, bursar)
const reallocatePayment = async (req, res) => {
  try {
    const { allocations: newAllocations } = req.body;
    // newAllocations: [{ studentFeeId, amount }]

    if (!Array.isArray(newAllocations) || !newAllocations.length) {
      return res.status(400).json({ success: false, message: 'allocations array is required' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'super_admin' && transaction.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!transaction.student) {
      return res.status(400).json({ success: false, message: 'Cannot reallocate unmatched payments' });
    }

    // Validate total doesn't exceed payment amount
    const requestedTotal = newAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    if (requestedTotal > transaction.amount + 0.01) { // small epsilon for float precision
      return res.status(400).json({
        success: false,
        message: `Allocation total (${requestedTotal}) exceeds payment amount (${transaction.amount})`,
      });
    }

    // Step 1: Unwind old allocations
    if (Array.isArray(transaction.allocations)) {
      for (const alloc of transaction.allocations) {
        const row = await StudentFee.findById(alloc.studentFee);
        if (!row) continue;
        row.amountPaid = Math.max(0, (row.amountPaid || 0) - (alloc.amount || 0));
        await row.save();

        // Adjustment ledger entry to reverse old allocation
        const balAfter = -Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0));
        await LedgerEntry.create({
          school: transaction.school,
          student: transaction.student,
          studentFee: alloc.studentFee,
          term: row.term,
          type: 'adjustment',
          amount: -alloc.amount,
          balanceAfter: balAfter,
          payment: transaction._id,
          performedBy: req.user._id,
          note: `Reallocation — reversed from ${row.name || 'fee line'}`,
        });
      }
    }

    // Step 2: Apply new allocations
    const appliedAllocations = [];
    for (const newAlloc of newAllocations) {
      const row = await StudentFee.findById(newAlloc.studentFeeId);
      if (!row) continue;

      // Ensure the fee belongs to the same student and school
      if (row.student.toString() !== transaction.student.toString()) continue;

      const applyAmount = Math.min(newAlloc.amount, row.amountCharged - row.amountPaid);
      if (applyAmount <= 0) continue;

      row.amountPaid = (row.amountPaid || 0) + applyAmount;
      await row.save();

      appliedAllocations.push({ studentFee: row._id, amount: applyAmount });

      const balAfter = -Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0));
      await LedgerEntry.create({
        school: transaction.school,
        student: transaction.student,
        studentFee: row._id,
        term: row.term,
        type: 'payment',
        amount: applyAmount,
        balanceAfter: balAfter,
        payment: transaction._id,
        performedBy: req.user._id,
        note: `Reallocation — applied to ${row.name || 'fee line'}`,
      });
    }

    // Step 3: Update transaction allocations
    transaction.allocations = appliedAllocations;
    await transaction.save();

    // Recompute balance
    const { recomputeStudentBalance } = require('../services/balanceService');
    await recomputeStudentBalance(transaction.student);

    const populated = await Transaction.findById(transaction._id)
      .populate('student', 'admissionNumber name classLevel')
      .populate('allocations.studentFee', 'name type amountCharged amountPaid');

    recordAudit({
      school: transaction.school,
      user: req.user._id,
      action: 'payment.reallocate',
      entityType: 'PAYMENT',
      entityId: transaction._id,
      description: `Reallocated payment ${transaction.transactionId} across ${appliedAllocations.length} fee line(s)`,
      metadata: { amount: transaction.amount, allocationCount: appliedAllocations.length },
    });

    res.json({ success: true, message: 'Payment reallocated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  mpesaValidation,
  mpesaConfirmation,
  mpesaRegisterUrl,
  stkPush,
  stkCallback,
  stkQueryStatus,
  recordBankPayment,
  recordCashPayment,
  getPaymentStats,
  bankWebhookHandler,
  registerBankWebhook,
  reconcileBankTransactions,
  matchPayment,
  getUnmatchedPayments,
  refundPayment,
  reallocatePayment,
};
