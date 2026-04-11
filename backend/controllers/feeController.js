const Fee = require('../models/Fee');

// Helper: returns school filter respecting super_admin bypass
const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

// @desc    Get all fees
// @route   GET /api/fees
// @access  Private
const getFees = async (req, res) => {
  try {
    const { term, academicYear, classLevel, type, isActive } = req.query;

    let query = { ...schoolFilter(req) };

    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;
    if (classLevel) query.classLevel = classLevel;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const fees = await Fee.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single fee
// @route   GET /api/fees/:id
// @access  Private
const getFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    if (req.user.role !== 'super_admin' && fee.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new fee
// @route   POST /api/fees
// @access  Private
const createFee = async (req, res) => {
  try {
    const { name, amount, type, term, academicYear, classLevel, description, dueDate } = req.body;

    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School is required' });
    }

    const fee = await Fee.create({
      name,
      amount,
      type,
      term,
      academicYear,
      classLevel: classLevel || 'ALL',
      description,
      dueDate,
      school: schoolId
    });

    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update fee
// @route   PUT /api/fees/:id
// @access  Private
const updateFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    if (req.user.role !== 'super_admin' && fee.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent changing the school field
    delete req.body.school;

    const updatedFee = await Fee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedFee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete fee
// @route   DELETE /api/fees/:id
// @access  Private
const deleteFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    if (req.user.role !== 'super_admin' && fee.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await fee.deleteOne();
    res.status(200).json({ success: true, message: 'Fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fees summary
// @route   GET /api/fees/summary/:academicYear
// @access  Private
const getFeesSummary = async (req, res) => {
  try {
    const { academicYear } = req.params;

    const matchStage = {
      academicYear,
      isActive: true,
      ...schoolFilter(req)
    };

    const summary = await Fee.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            term: '$term',
            classLevel: '$classLevel'
          },
          totalAmount: { $sum: '$amount' },
          feeCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.term': 1, '_id.classLevel': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFees,
  getFee,
  createFee,
  updateFee,
  deleteFee,
  getFeesSummary
};
