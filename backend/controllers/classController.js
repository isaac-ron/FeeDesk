const Class = require('../models/Class');

const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

const resolveSchool = (req) =>
  req.user.role === 'super_admin' ? req.body.school : req.user.school;

// @desc    List all classes for the school
// @route   GET /api/classes
const listClasses = async (req, res) => {
  try {
    const classes = await Class.find({ ...schoolFilter(req) }).sort({ level: 1, name: 1 });
    res.json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a class
// @route   POST /api/classes
const createClass = async (req, res) => {
  try {
    const schoolId = resolveSchool(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School is required' });

    const { name, level } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Class name is required' });
    }

    const cls = await Class.create({
      school: schoolId,
      name: name.trim(),
      level: level ?? 0,
    });

    res.status(201).json({ success: true, data: cls });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A class with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a class
// @route   PATCH /api/classes/:id
const updateClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    if (req.user.role !== 'super_admin' && cls.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.body.name !== undefined) cls.name = req.body.name.trim();
    if (req.body.level !== undefined) cls.level = req.body.level;
    await cls.save();

    res.json({ success: true, data: cls });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A class with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a class
// @route   DELETE /api/classes/:id
const deleteClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    if (req.user.role !== 'super_admin' && cls.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if any students reference this class before deleting
    const Student = require('../models/Student');
    const count = await Student.countDocuments({ classId: cls._id });
    if (count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${count} student(s) are in this class. Reassign them first.`,
      });
    }

    await cls.deleteOne();
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listClasses, createClass, updateClass, deleteClass };
