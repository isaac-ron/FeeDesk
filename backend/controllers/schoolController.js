const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

/**
 * @desc    Get all schools (Super Admin only)
 * @route   GET /api/schools
 * @access  Private/Super Admin
 */
exports.getAllSchools = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const { isActive, subscriptionStatus, search } = req.query;
    
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (subscriptionStatus) filter.subscriptionStatus = subscriptionStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const schools = await School.find(filter)
      .select('-__v')
      .sort({ name: 1 });

    // Get student counts for each school
    const schoolsWithCounts = await Promise.all(
      schools.map(async (school) => {
        const studentCount = await Student.countDocuments({ 
          school: school._id,
          status: 'Active'
        });
        return {
          ...school.toObject(),
          studentCount
        };
      })
    );

    res.json({
      success: true,
      count: schoolsWithCounts.length,
      data: schoolsWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get single school details
 * @route   GET /api/schools/:id
 * @access  Private/Super Admin
 */
exports.getSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get additional statistics
    const [studentCount, activeStudents, userCount, totalRevenue] = await Promise.all([
      Student.countDocuments({ school: school._id }),
      Student.countDocuments({ school: school._id, status: 'Active' }),
      User.countDocuments({ school: school._id, isActive: true }),
      Transaction.aggregate([
        { 
          $match: { 
            school: school._id, 
            status: 'COMPLETED',
            type: 'CREDIT'
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        ...school.toObject(),
        statistics: {
          students: {
            total: studentCount,
            active: activeStudents
          },
          users: userCount,
          revenue: totalRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Create new school
 * @route   POST /api/schools
 * @access  Private/Super Admin
 */
exports.createSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    // Check for duplicate code
    const existingSchool = await School.findOne({ 
      code: req.body.code.toUpperCase() 
    });

    if (existingSchool) {
      return res.status(400).json({
        success: false,
        message: 'School code already exists'
      });
    }

    const school = await School.create(req.body);

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update school
 * @route   PUT /api/schools/:id
 * @access  Private/Super Admin
 */
exports.updateSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    // Check if school code is being changed
    if (req.body.code) {
      const existingSchool = await School.findOne({
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingSchool) {
        return res.status(400).json({
          success: false,
          message: 'School code already exists'
        });
      }
    }

    const school = await School.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    res.json({
      success: true,
      message: 'School updated successfully',
      data: school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete/deactivate school
 * @route   DELETE /api/schools/:id
 * @access  Private/Super Admin
 */
exports.deleteSchool = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Soft delete - just deactivate instead of removing
    school.isActive = false;
    school.subscriptionStatus = 'SUSPENDED';
    await school.save();

    res.json({
      success: true,
      message: 'School deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get platform-wide statistics
 * @route   GET /api/schools/stats/platform
 * @access  Private/Super Admin
 */
exports.getPlatformStats = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const [
      schoolStats,
      totalStudents,
      activeStudents,
      totalUsers,
      revenueStats
    ] = await Promise.all([
      // School statistics
      School.aggregate([
        {
          $group: {
            _id: '$subscriptionStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Student statistics
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      
      // User statistics
      User.countDocuments({ isActive: true }),
      
      // Revenue statistics
      Transaction.aggregate([
        { 
          $match: { 
            status: 'COMPLETED',
            type: 'CREDIT'
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 }
          }
        }
      ])
    ]);

    // Get top schools by revenue
    const topSchools = await Transaction.aggregate([
      { 
        $match: { 
          status: 'COMPLETED',
          type: 'CREDIT'
        } 
      },
      {
        $group: {
          _id: '$school',
          revenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'schools',
          localField: '_id',
          foreignField: '_id',
          as: 'schoolDetails'
        }
      },
      { $unwind: '$schoolDetails' },
      {
        $project: {
          schoolId: '$_id',
          schoolName: '$schoolDetails.name',
          schoolCode: '$schoolDetails.code',
          revenue: 1,
          transactionCount: 1
        }
      }
    ]);

    // Format school stats
    const schoolStatusBreakdown = {};
    schoolStats.forEach(stat => {
      schoolStatusBreakdown[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        schools: {
          total: await School.countDocuments(),
          active: await School.countDocuments({ isActive: true }),
          byStatus: schoolStatusBreakdown
        },
        students: {
          total: totalStudents,
          active: activeStudents
        },
        users: {
          active: totalUsers
        },
        revenue: {
          total: revenueStats[0]?.totalRevenue || 0,
          transactionCount: revenueStats[0]?.totalTransactions || 0
        },
        topSchools
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update school subscription
 * @route   PUT /api/schools/:id/subscription
 * @access  Private/Super Admin
 */
exports.updateSubscription = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const { subscriptionStatus, subscriptionExpiry, maxStudents } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    if (subscriptionStatus) school.subscriptionStatus = subscriptionStatus;
    if (subscriptionExpiry) school.subscriptionExpiry = subscriptionExpiry;
    if (maxStudents) school.maxStudents = maxStudents;

    await school.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get school users
 * @route   GET /api/schools/:id/users
 * @access  Private/Super Admin
 */
exports.getSchoolUsers = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const users = await User.find({ school: req.params.id })
      .select('-password')
      .sort({ role: 1, name: 1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get current user's school
 * @route   GET /api/schools/me
 * @access  Private
 */
exports.getMySchool = async (req, res) => {
  try {
    if (!req.user.school) {
      return res.status(400).json({ success: false, message: 'No school associated with this account' });
    }

    const school = await School.findById(req.user.school);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({ success: true, data: school });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update current user's school settings
 * @route   PUT /api/schools/me
 * @access  Private (admin, bursar, principal)
 */
exports.updateMySchool = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'bursar', 'principal', 'super_admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.user.school) {
      return res.status(400).json({ success: false, message: 'No school associated with this account' });
    }

    // Prevent changing sensitive fields via this endpoint
    const { _id, code, isActive, subscriptionStatus, subscriptionExpiry, maxStudents, ...updates } = req.body;

    const school = await School.findByIdAndUpdate(
      req.user.school,
      updates,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({ success: true, message: 'Settings updated', data: school });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
