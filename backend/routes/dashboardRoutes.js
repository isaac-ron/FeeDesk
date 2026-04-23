const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const SmsLog = require('../models/SmsLog');
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

    const smsFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school };
    const smsSent = await SmsLog.countDocuments({ ...smsFilter, status: 'SENT' });

    res.json({
      totalCollectedToday,
      totalCollectedTodayChange: todayChange,
      outstandingBalance,
      outstandingPercentage,
      activeStudents,
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
// @route   GET /api/dashboard/trends
// @access  Private
router.get('/trends', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          createdAt: { $gte: startDate },
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

    const totalRevenue = transactions[0]?.total || 0;

    // Group by week
    const weeklyData = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          createdAt: { $gte: startDate },
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: { $week: '$createdAt' },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const weeks = weeklyData.map((week, index) => ({
      label: `Week ${index + 1}`,
      amount: week.amount
    }));

    // Daily data for chart
    const dailyData = await Transaction.aggregate([
      {
        $match: {
          school: req.user.school,
          createdAt: { $gte: startDate },
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      totalRevenue,
      weeks,
      dailyData: dailyData.map(day => ({
        day: day._id,
        amount: day.amount
      }))
    });
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
