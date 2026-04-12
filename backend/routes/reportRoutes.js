const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * Convert a dateRange string + optional term/year to a MongoDB date filter.
 */
const buildDateFilter = (dateRange) => {
  const now = new Date();
  let start;

  switch (dateRange) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'last-7-days':
      start = new Date(now); start.setDate(start.getDate() - 7);
      break;
    case 'last-30-days':
      start = new Date(now); start.setDate(start.getDate() - 30);
      break;
    case 'this-month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last-month': {
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      start = new Date(y, m, 1);
      break;
    }
    case 'this-term': {
      // Kenya terms: Jan-Apr, May-Aug, Sep-Dec
      const month = now.getMonth();
      const termStart = month < 4 ? 0 : month < 8 ? 4 : 8;
      start = new Date(now.getFullYear(), termStart, 1);
      break;
    }
    case 'this-year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now); start.setDate(start.getDate() - 30);
  }

  return { $gte: start, $lte: now };
};

// @desc    Get report data
// @route   GET /api/reports
// @access  Private
router.get('/', async (req, res) => {
  try {
    const schoolId = req.user.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated' });
    }

    const { dateRange = 'last-30-days' } = req.query;
    const dateFilter = buildDateFilter(dateRange);

    const txnMatch = {
      school: schoolId,
      status: 'COMPLETED',
      type: 'CREDIT',
      createdAt: dateFilter,
    };

    // --- Run queries in parallel ---
    const [
      revenueResult,
      paymentMethodResult,
      activeStudents,
      studentsWithBalances,
      feeTotal,
    ] = await Promise.all([
      // Total revenue in period
      Transaction.aggregate([
        { $match: txnMatch },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      // By payment method
      Transaction.aggregate([
        { $match: txnMatch },
        {
          $group: {
            _id: '$source',
            amount: { $sum: '$amount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      // Active students count
      Student.countDocuments({ school: schoolId, status: 'Active' }),

      // Students with balances (for defaulters, top payers, class breakdown)
      Student.find({ school: schoolId, status: 'Active' })
        .select('name admissionNumber classLevel currentBalance guardianPhone')
        .lean(),

      // Total expected fees this year
      Fee.aggregate([
        { $match: { school: schoolId, academicYear: String(new Date().getFullYear()), isActive: true } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const totalExpected = feeTotal[0]?.total || 0;

    // Outstanding = sum of negative balances
    const outstandingAmount = studentsWithBalances.reduce((sum, s) => {
      return s.currentBalance < 0 ? sum + Math.abs(s.currentBalance) : sum;
    }, 0);

    const collectionRate = totalExpected > 0
      ? Math.round(((totalExpected - outstandingAmount) / totalExpected) * 100)
      : 0;

    // --- By class ---
    const classMap = {};
    for (const s of studentsWithBalances) {
      const cls = s.classLevel || 'Unknown';
      if (!classMap[cls]) classMap[cls] = { students: 0, outstanding: 0 };
      classMap[cls].students++;
      if (s.currentBalance < 0) classMap[cls].outstanding += Math.abs(s.currentBalance);
    }

    // Get revenue by class via join with transactions
    const classTxn = await Transaction.aggregate([
      { $match: txnMatch },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$studentInfo.classLevel', collected: { $sum: '$amount' } } },
    ]);

    const byClass = Object.entries(classMap).map(([cls, data]) => {
      const txn = classTxn.find(t => t._id === cls);
      const collected = txn?.collected || 0;
      const total = collected + data.outstanding;
      return {
        class: cls,
        students: data.students,
        collected,
        outstanding: data.outstanding,
        rate: total > 0 ? Math.round((collected / total) * 100) : 0,
      };
    }).sort((a, b) => b.collected - a.collected);

    // --- Payment methods ---
    const totalPayments = paymentMethodResult.reduce((s, p) => s + p.amount, 0);
    const sourceLabels = { MPESA: 'M-PESA', BANK_TRANSFER: 'Bank Transfer', BANK_AGENT: 'Bank Agent', CASH: 'Cash', CHEQUE: 'Cheque' };
    const byPaymentMethod = paymentMethodResult.map(p => ({
      method: sourceLabels[p._id] || p._id,
      amount: p.amount,
      percentage: totalPayments > 0 ? Math.round((p.amount / totalPayments) * 100) : 0,
      transactions: p.transactions,
    }));

    // --- Top payers (students who paid the most in this period) ---
    const topPayerAgg = await Transaction.aggregate([
      { $match: txnMatch },
      { $group: { _id: '$student', paid: { $sum: '$amount' } } },
      { $sort: { paid: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: '$info' },
      { $project: { name: '$info.name', admNo: '$info.admissionNumber', class: '$info.classLevel', paid: 1, balance: '$info.currentBalance' } },
    ]);
    const topPayers = topPayerAgg.map(p => ({ name: p.name, admNo: p.admNo, class: p.class, paid: p.paid, balance: p.balance }));

    // --- Defaulters (students with biggest arrears) ---
    const defaulterStudents = studentsWithBalances
      .filter(s => s.currentBalance < 0)
      .sort((a, b) => a.currentBalance - b.currentBalance)
      .slice(0, 10);

    // Get last payment date for defaulters
    const defaulterIds = defaulterStudents.map(s => s._id);
    const lastPayments = await Transaction.aggregate([
      { $match: { student: { $in: defaulterIds }, status: 'COMPLETED', type: 'CREDIT' } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$student', lastPayment: { $first: '$createdAt' } } },
    ]);
    const lastPaymentMap = Object.fromEntries(lastPayments.map(lp => [lp._id.toString(), lp.lastPayment]));

    const defaulters = defaulterStudents.map(s => ({
      name: s.name,
      admNo: s.admissionNumber,
      class: s.classLevel,
      paid: 0, // Not critical for defaulter view
      balance: s.currentBalance,
      lastPayment: lastPaymentMap[s._id.toString()] || null,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalStudents: activeStudents,
          collectionRate,
          outstandingAmount,
        },
        byClass,
        byPaymentMethod,
        topPayers,
        defaulters,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
