const Transaction = require('../models/Transaction');
const Student = require('../models/Student');

// Helper: returns school filter respecting super_admin bypass
const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { status, source, type, startDate, endDate } = req.query;

    let query = { ...schoolFilter(req) };

    if (status) query.status = status;
    if (source) query.source = source;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('student', 'admissionNumber name classLevel')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('student', 'admissionNumber name classLevel guardianName guardianPhone');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'super_admin' && transaction.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create manual transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { transactionId, amount, source, reference, type, metadata } = req.body;

    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;

    // Check if transaction ID already exists within this school
    const existingTransaction = await Transaction.findOne({ transactionId, school: schoolId });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Transaction with this ID already exists'
      });
    }

    // Try to find student by reference (admission number) within this school
    let student = null;
    if (reference) {
      student = await Student.findOne({
        admissionNumber: reference.toUpperCase(),
        school: schoolId
      });
    }

    const transaction = await Transaction.create({
      transactionId,
      amount,
      source,
      reference,
      type: type || 'CREDIT',
      status: 'COMPLETED',
      school: schoolId,
      student: student ? student._id : null,
      metadata: metadata || {}
    });

    // Update student balance if student found
    if (student) {
      if (type === 'DEBIT') {
        student.currentBalance += amount;
      } else {
        student.currentBalance -= amount;
      }
      await student.save();
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('student', 'admissionNumber name classLevel');

    res.status(201).json({ success: true, data: populatedTransaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get student transactions
// @route   GET /api/transactions/student/:studentId
// @access  Private
const getStudentTransactions = async (req, res) => {
  try {
    const query = { student: req.params.studentId, ...schoolFilter(req) };

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reverse transaction
// @route   PUT /api/transactions/:id/reverse
// @access  Private
const reverseTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'super_admin' && transaction.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (transaction.status === 'REVERSED') {
      return res.status(400).json({
        success: false,
        message: 'Transaction already reversed'
      });
    }

    transaction.status = 'REVERSED';
    await transaction.save();

    // Update student balance if student exists
    if (transaction.student) {
      const student = await Student.findById(transaction.student);
      if (student) {
        if (transaction.type === 'CREDIT') {
          student.currentBalance += transaction.amount;
        } else {
          student.currentBalance -= transaction.amount;
        }
        await student.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Transaction reversed successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  getStudentTransactions,
  reverseTransaction
};
