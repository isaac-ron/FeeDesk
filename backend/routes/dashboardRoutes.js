const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const SmsLog = require('../models/SmsLog');
const Term = require('../models/Term');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get total collected today
    const todayTransactions = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          createdAt: { $gte: today },
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get total collected yesterday for comparison
    const yesterdayTransactions = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          createdAt: { $gte: yesterday, $lt: today },
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalCollectedToday = todayTransactions[0]?.total || 0;
    const totalCollectedYesterday = yesterdayTransactions[0]?.total || 0;
    const todayChange = totalCollectedYesterday > 0 
      ? Math.round(((totalCollectedToday - totalCollectedYesterday) / totalCollectedYesterday) * 100)
      : 0;

    // Outstanding balance — aggregate over StudentFee (the source of truth for
    // published fees). Excludes WAIVED rows. Clamps per-row outstanding at 0 so
    // overpayments on one row don't mask arrears on another.
    const feeAgg = await StudentFee.aggregate([
      { $match: { school: req.user.school, status: { $ne: 'WAIVED' } } },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: '$amountCharged' },
          totalPaid: { $sum: '$amountPaid' },
          outstanding: {
            $sum: {
              $max: [0, { $subtract: ['$amountCharged', '$amountPaid'] }],
            },
          },
        },
      },
    ]);

    const totalExpected = feeAgg[0]?.totalExpected || 0;
    const totalPaid = feeAgg[0]?.totalPaid || 0;
    const outstandingBalance = feeAgg[0]?.outstanding || 0;
    const outstandingPercentage = totalExpected > 0
      ? Math.round((outstandingBalance / totalExpected) * 100)
      : 0;

    // Get active students count
    const activeStudents = await Student.countDocuments({
      school: req.user.school,
      status: 'Active'
    });

    // Students with a non-zero balance ("owing") vs the rest ("cleared").
    // currentBalance is kept in sync with the StudentFee ledger by balanceService.
    const studentsOwing = await Student.countDocuments({
      school: req.user.school,
      status: 'Active',
      currentBalance: { $gt: 0 }
    });
    const studentsCleared = Math.max(0, activeStudents - studentsOwing);

    const smsFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school };
    const smsSent = await SmsLog.countDocuments({ ...smsFilter, status: 'SENT' });

    res.json({
      totalCollectedToday,
      totalCollectedTodayChange: todayChange,
      outstandingBalance,
      outstandingPercentage,
      // Term-collection figures for the dashboard hero strip. billedTerm is the
      // total charged (== collected + outstanding); collectedTerm is total paid.
      collectedTerm: totalPaid,
      billedTerm: totalExpected,
      activeStudents,
      studentsOwing,
      studentsCleared,
      smsSent,
      systemStatus: 'operational'
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get recent transactions
// @route   GET /api/dashboard/transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const transactions = await Transaction.find({
      school: req.user.school,
      status: 'COMPLETED'
    })
      .populate('student', 'name admissionNumber')
      .sort({ createdAt: -1 })
      .limit(limit);

    const formattedTransactions = transactions.map(txn => ({
      id: txn.transactionId || txn._id.toString().slice(-4).toUpperCase(),
      studentName: txn.student?.name || txn.paidBy || 'Unknown',
      admissionNumber: txn.student?.admissionNumber || txn.reference || 'N/A',
      amount: txn.amount,
      source: txn.source || 'CASH',
      time: new Date(txn.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      timestamp: txn.createdAt
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get collection trends
// @route   GET /api/dashboard/trends?range=30d|term|year   (legacy: ?days=)
// @access  Private
//
// Returns a single normalized shape the dashboard TrendChart consumes:
//   { range, total, totalLabel, sub, data: [Number...], xlabels: [String...] }
// where `data` is the ordered bucket amounts (daily / weekly / monthly).
router.get('/trends', protect, async (req, res) => {
  try {
    const school = req.user.school;

    // Sum COMPLETED transactions in [start, end) bucketed by `groupId`, ordered.
    const bucketSums = async (start, end, groupId) => {
      const match = { school, status: 'COMPLETED', createdAt: { $gte: start } };
      if (end) match.createdAt.$lt = end;
      const rows = await Transaction.aggregate([
        { $match: match },
        { $group: { _id: groupId, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]);
      return rows;
    };

    // Legacy ?days= consumers (no range) keep the old daily-window behaviour.
    const rangeParam = req.query.range;
    const range = rangeParam || (req.query.days ? '30d' : '30d');

    let data = [];
    let xlabels = [];
    let totalLabel = 'Last 30 days';
    let sub = 'Last 30 days · daily breakdown';

    if (range === 'term') {
      const term = await Term.findOne({ school, status: 'ACTIVE' });
      if (term && term.startDate) {
        const start = new Date(term.startDate);
        start.setHours(0, 0, 0, 0);
        const rows = await bucketSums(start, null, { $week: '$createdAt' });
        data = rows.map(r => r.amount);
        xlabels = rows.map((_, i) => `W${i + 1}`);
        totalLabel = 'Term to date';
        sub = `${term.name || 'This term'} · weekly breakdown`;
      }
    } else if (range === 'year') {
      // Calendar year of the active term (else current year), monthly buckets.
      const term = await Term.findOne({ school, status: 'ACTIVE' });
      const year = term?.academicYear ? parseInt(term.academicYear) : new Date().getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      const rows = await bucketSums(start, end, { $month: '$createdAt' });
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      // Densify to 12 months so the bar chart and x-axis stay aligned.
      const byMonth = new Map(rows.map(r => [r._id, r.amount]));
      data = MONTHS.map((_, i) => byMonth.get(i + 1) || 0);
      xlabels = ['Jan', 'Apr', 'Jul', 'Oct', 'Dec'];
      totalLabel = 'Year to date';
      sub = `${year} · monthly breakdown`;
    }

    // Default / fallback: last-30-days daily window.
    if (data.length === 0) {
      const days = parseInt(req.query.days) || 30;
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      const rows = await bucketSums(start, null, { $dayOfMonth: '$createdAt' });
      data = rows.map(r => r.amount);
      xlabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
      totalLabel = 'Last 30 days';
      sub = 'Last 30 days · daily breakdown';
    }

    const total = data.reduce((s, v) => s + v, 0);

    res.json({ range, total, totalLabel, sub, data, xlabels });
  } catch (error) {
    console.error('Collection trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get payment methods breakdown
// @route   GET /api/dashboard/payment-methods
// @access  Private
router.get('/payment-methods', protect, async (req, res) => {
  try {
    const paymentBreakdown = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: '$source',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const mpesaData = paymentBreakdown.find(p => p._id === 'MPESA') || { amount: 0, count: 0 };
    const bankData = paymentBreakdown.find(p => p._id === 'BANK_TRANSFER' || p._id === 'BANK') || { amount: 0, count: 0 };
    const cashData = paymentBreakdown.find(p => p._id === 'CASH') || { amount: 0, count: 0 };

    const totalAmount = mpesaData.amount + bankData.amount + cashData.amount;
    const mpesaPercentage = totalAmount > 0 
      ? Math.round((mpesaData.amount / totalAmount) * 100)
      : 0;
    const bankPercentage = totalAmount > 0 
      ? Math.round((bankData.amount / totalAmount) * 100)
      : 0;

    res.json({
      mpesa: {
        percentage: mpesaPercentage,
        amount: mpesaData.amount,
        count: mpesaData.count
      },
      bank: {
        percentage: bankPercentage,
        amount: bankData.amount,
        count: bankData.count
      },
      cash: {
        percentage: 100 - mpesaPercentage - bankPercentage,
        amount: cashData.amount,
        count: cashData.count
      }
    });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
