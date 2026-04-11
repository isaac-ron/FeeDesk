const Student = require('../models/Student');

// Helper: returns school filter respecting super_admin bypass
const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    const { status, classLevel, search } = req.query;

    let query = { ...schoolFilter(req) };

    if (status) query.status = status;
    if (classLevel) query.classLevel = classLevel;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Ensure student belongs to user's school
    if (req.user.role !== 'super_admin' && student.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private
const createStudent = async (req, res) => {
  try {
    const { admissionNumber, name, classLevel, stream, guardianName, guardianPhone, guardianEmail } = req.body;

    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School is required' });
    }

    // Check if student with admission number exists within this school
    const existingStudent = await Student.findOne({ admissionNumber, school: schoolId });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Student with this admission number already exists in this school' });
    }

    const student = await Student.create({
      admissionNumber,
      name,
      classLevel,
      stream,
      guardianName,
      guardianPhone,
      guardianEmail,
      school: schoolId
    });

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && student.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent changing the school field
    delete req.body.school;

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedStudent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && student.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await student.deleteOne();
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student by admission number
// @route   GET /api/students/admission/:admissionNumber
// @access  Private
const getStudentByAdmission = async (req, res) => {
  try {
    const filter = {
      admissionNumber: req.params.admissionNumber.toUpperCase(),
      ...schoolFilter(req)
    };

    const student = await Student.findOne(filter);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentByAdmission
};
