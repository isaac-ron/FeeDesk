const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const School = require('../models/School');
const LedgerEntry = require('../models/LedgerEntry');
const StudentFee = require('../models/StudentFee');
const { allocatePayment } = require('../services/paymentAllocationService');
const { findStudentMatches } = require('../services/matchingService');
const { markProcessedByRef } = require('../services/inboundEventService');
const InboundEvent = require('../models/InboundEvent');
const { getSmsQueue } = require('../queues');

// PaymentWorker — processes every inbound payment callback asynchronously.
//
// Job data shape (normalised — from paymentNormalizer.normalise()):
//   { provider, ref, amount, phone, accountRef, paidBy, receivedAt,
//     sourceLabel, rawPayload, schoolId?, paybillNumber? }
//
// Flow:
//   1. Idempotency check (skip if Transaction with this ref already exists)
//   2. Resolve school (by paybill for MPESA, by schoolId for bank)
//   3. Match accountRef → student.admissionNumber within that school
//   4. Create Transaction record
//   5. If matched: allocate to fee lines, create ledger entries, enqueue SMS
//   6. If unmatched: create suspense transaction, emit alert
//   7. Emit socket event for real-time dashboard

let io = null; // set by startPaymentWorker()

const processPayment = async (job) => {
  const data = job.data;
  const { provider, ref, amount, phone, accountRef, paidBy, sourceLabel, rawPayload } = data;

  console.log(`\n[PaymentWorker] Processing ${provider} payment: ${ref} KES ${amount}`);

  // 1. Idempotency — skip if we already processed this transaction.
  //    This is a check-then-act, so it is advisory only: the authoritative
  //    guard is the unique { school, transactionId } index, enforced at the
  //    Transaction.create below. See the E11000 handling there.
  const existing = await Transaction.findOne({ transactionId: ref });
  if (existing) {
    console.log(`[PaymentWorker] Duplicate ${ref} — skipping`);
    await markProcessedByRef(ref);
    return { status: 'duplicate', ref };
  }

  // 2. Resolve school
  let school = null;
  if (data.schoolId) {
    school = await School.findById(data.schoolId);
  } else if (data.paybillNumber) {
    school = await School.findOne({ paybillNumber: String(data.paybillNumber) });
  }

  if (!school) {
    console.warn(`[PaymentWorker] No school resolved for ${ref} — saving as orphan`);
  }

  // 3. Match student via the matching ladder (exact ref → normalized ref →
  //    payer phone). Auto-matches only when unambiguous; otherwise returns
  //    ranked candidates for the bursar to resolve from the suspense screen.
  let student = null;
  let matchMethod = 'NONE';
  let matchConfidence = 0;
  let suggestedMatches = [];
  if (school && accountRef) {
    const m = await findStudentMatches({
      school,
      accountRef,
      payerPhone: phone,
      payerName: paidBy,
      prefix: school.admissionPrefix,
    });
    if (m.autoMatch) {
      student = m.autoMatch;
      matchMethod = m.method;
      matchConfidence = m.confidence;
    } else {
      suggestedMatches = m.candidates.map((c) => ({
        student: c.student._id,
        score: c.score,
        reasons: c.reasons,
      }));
    }
  }

  // 4. Create Transaction record
  let newTransaction;
  try {
    newTransaction = await Transaction.create({
      school: school?._id || null,
      transactionId: ref,
      student: student?._id || null,
      amount: parseFloat(amount),
      source: provider === 'MPESA' ? 'MPESA' : 'BANK_TRANSFER',
      type: 'CREDIT',
      // Always PENDING at creation. A matched payment is flipped to COMPLETED
      // only after its allocation + ledger writes actually persist (see below).
      // This way, if the worker crashes mid-allocation, the retry's idempotency
      // check finds a visible PENDING record to review — not a deceptive
      // COMPLETED-but-unapplied one that silently leaves the student still owing.
      status: 'PENDING',
      reference: accountRef,
      paidBy: paidBy || 'Unknown',
      phoneNumber: phone || null,
      matchMethod,
      matchConfidence,
      suggestedMatches,
      metadata: { provider, rawPayload, processedAt: new Date() },
    });
  } catch (err) {
    // E11000 = the unique { school, transactionId } index rejected this write,
    // meaning another delivery of the same payment won the race between the
    // findOne above and this create. That is a duplicate, not a failure — if we
    // let it throw, BullMQ would retry three times and then park a healthy
    // payment in the failed set. Two channels reporting the same transaction
    // (a Safaricom retry, or a webhook racing a replay) makes this routine.
    if (err.code === 11000) {
      console.log(`[PaymentWorker] Duplicate ${ref} caught at insert — skipping`);
      await markProcessedByRef(ref);
      return { status: 'duplicate', ref };
    }
    throw err;
  }

  // 5. Matched → allocate, ledger, SMS
  if (student) {
    const oldBalance = student.currentBalance;

    // Allocate payment across outstanding fee lines
    const { allocations, unallocated } = await allocatePayment({
      studentId: student._id,
      amount: parseFloat(amount),
      transaction: newTransaction,
    });
    if (unallocated > 0) {
      console.log(`[PaymentWorker] Overpayment on ${ref}: KES ${unallocated} held as credit (unallocatedAmount)`);
    }

    // Create ledger entries for each allocation
    for (const alloc of allocations) {
      const sf = await StudentFee.findById(alloc.studentFee);
      if (!sf) continue;

      // Running balance for this fee line = -(amountCharged - amountPaid)
      const balanceAfter = -Math.max(0, (sf.amountCharged || 0) - (sf.amountPaid || 0));

      await LedgerEntry.create({
        school: school._id,
        student: student._id,
        studentFee: alloc.studentFee,
        term: sf.term,
        type: 'payment',
        amount: alloc.amount, // positive = credit
        balanceAfter,
        payment: newTransaction._id,
        note: `${sourceLabel} payment — ref ${ref}`,
      });
    }

    // Refresh balance
    const refreshed = await Student.findById(student._id).select('currentBalance');
    const newBalance = refreshed.currentBalance;

    console.log(`[PaymentWorker] Allocated for ${student.name}: ${oldBalance} → ${newBalance}`);

    // Allocation + ledger have now persisted — safe to mark the payment done.
    newTransaction.status = 'COMPLETED';
    await newTransaction.save();

    // Emit real-time event
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

    // Enqueue SMS receipt (async — never block on SMS)
    try {
      const smsQueue = getSmsQueue();
      await smsQueue.add('payment-receipt', {
        type: 'payment_receipt',
        schoolId: school._id,
        studentId: student._id,
        guardianPhone: student.guardianPhone,
        transactionPhone: phone,
        studentName: student.name,
        amount,
        newBalance,
        reference: ref,
        source: sourceLabel,
        credit: unallocated,
      });
    } catch (err) {
      console.error(`[PaymentWorker] Failed to enqueue SMS: ${err.message}`);
    }

    await markProcessedByRef(ref);
    return { status: 'completed', ref, studentName: student.name, allocations: allocations.length };
  }

  // 6. Unmatched → suspense. Still a successful ingest — the money is recorded
  //    and visible to the bursar, it just needs a student attached.
  console.warn(`[PaymentWorker] Unmatched payment ${ref} for account "${accountRef}" — suspense`);
  if (io) {
    io.emit('unknown_payment', {
      id: newTransaction._id,
      reference: accountRef,
      amount: newTransaction.amount,
      source: sourceLabel,
      time: new Date().toLocaleTimeString(),
    });
  }

  await markProcessedByRef(ref);
  return { status: 'unmatched', ref, accountRef };
};

const startPaymentWorker = (socketIo) => {
  io = socketIo;

  const worker = new Worker('payment.received', processPayment, {
    connection: getRedisConnection(),
    concurrency: 5,
  });

  worker.on('completed', (job, result) => {
    console.log(`[PaymentWorker] Job ${job.id} done: ${result.status} (${result.ref})`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[PaymentWorker] Job ${job?.id} failed: ${err.message}`);

    // BullMQ fires this on every attempt. Only once retries are exhausted is the
    // payment genuinely stuck — reflect that back onto the edge log so it shows
    // up in triage and can be replayed once the cause is fixed.
    const attempts = job?.opts?.attempts ?? 1;
    if (!job || job.attemptsMade < attempts) return;

    const reason = `Worker failed after ${attempts} attempts: ${err.message}`;
    if (job.data?.ref) {
      await markProcessedByRef(job.data.ref, { error: reason });
      return;
    }

    // No ref to correlate on — which is itself the symptom of a payload we could
    // not parse. Fall back to the event id the edge handler stamped on the job,
    // so the row still lands in triage instead of sitting at ENQUEUED forever.
    if (job.data?.inboundEventId) {
      try {
        await InboundEvent.updateOne(
          { _id: job.data.inboundEventId, status: { $in: ['RECEIVED', 'ENQUEUED'] } },
          { $set: { status: 'FAILED', error: reason } }
        );
      } catch (e) {
        console.error(`[PaymentWorker] Could not mark inbound event failed: ${e.message}`);
      }
    }
  });

  console.log('[PaymentWorker] Started — listening for payment.received jobs');
  return worker;
};

module.exports = { startPaymentWorker };
