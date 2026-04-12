const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const Joi = require('joi');

router.use(protect);

// Only admin, bursar, principal (or super_admin) can manage staff
const requireManager = (req, res, next) => {
  const allowed = ['super_admin', 'admin', 'principal'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin or principal only.' });
  }
  next();
};

// Validation schemas
const createStaffSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('admin', 'bursar', 'principal', 'teacher').required(),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('admin', 'bursar', 'principal', 'teacher'),
  isActive: Joi.boolean(),
}).min(1);

// @desc    List staff for current school
// @route   GET /api/staff
// @access  Private
router.get('/', async (req, res) => {
  try {
    const schoolId = req.user.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated' });
    }

    const { role, isActive, search } = req.query;
    const filter = { school: schoolId };
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const staff = await User.find(filter).select('-password').sort({ name: 1 });

    res.json({ success: true, count: staff.length, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    // Ensure same school
    if (req.user.role !== 'super_admin' && user.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create staff member
// @route   POST /api/staff
// @access  Private (admin/principal)
router.post('/', requireManager, validate(createStaffSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const schoolId = req.user.school;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated' });
    }

    // Check duplicate email
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      school: schoolId,
    });

    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ success: true, message: 'Staff member created', data: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (admin/principal)
router.put('/:id', requireManager, validate(updateStaffSchema), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (req.user.role !== 'super_admin' && user.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Don't allow changing password through this endpoint
    const { password, school, ...updates } = req.body;

    // If email is being changed, check for duplicates
    if (updates.email) {
      const exists = await User.findOne({ email: updates.email.toLowerCase(), _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Staff member updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Deactivate staff member
// @route   DELETE /api/staff/:id
// @access  Private (admin/principal)
router.delete('/:id', requireManager, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (req.user.role !== 'super_admin' && user.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent deactivating yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'Staff member deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
