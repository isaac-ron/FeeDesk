const AuditLog = require('../models/AuditLog');

// @desc    List audit log entries for the current school
// @route   GET /api/audit-logs
// @access  Private (admin, principal)
const getAuditLogs = async (req, res) => {
  try {
    const schoolId = req.user.role === 'super_admin' ? req.query.school : req.user.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School is required' });
    }

    const filter = { school: schoolId };

    // Optional filters
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
    if (req.query.user) filter.user = req.query.user;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAuditLogs };
