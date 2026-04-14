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

// Minimal CSV parser: handles quoted fields, embedded commas, escaped quotes ("")
const parseCSV = (text) => {
  const rows = [];
  let field = '';
  let row = [];
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => String(v).trim() !== ''));
};

const HEADER_ALIASES = {
  admissionnumber: 'admissionNumber',
  admission: 'admissionNumber',
  'admission no': 'admissionNumber',
  'admission number': 'admissionNumber',
  admno: 'admissionNumber',
  name: 'name',
  fullname: 'name',
  'full name': 'name',
  classlevel: 'classLevel',
  class: 'classLevel',
  grade: 'classLevel',
  stream: 'stream',
  guardianname: 'guardianName',
  'guardian name': 'guardianName',
  parent: 'guardianName',
  guardianphone: 'guardianPhone',
  'guardian phone': 'guardianPhone',
  phone: 'guardianPhone',
  guardianemail: 'guardianEmail',
  'guardian email': 'guardianEmail',
  email: 'guardianEmail',
};

const normalizePhone = (v) => {
  if (!v) return v;
  let p = String(v).replace(/\s|-/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0') && p.length === 10) p = '254' + p.slice(1);
  if (p.startsWith('7') && p.length === 9) p = '254' + p;
  return p;
};

// @desc    Bulk import students from CSV
// @route   POST /api/students/import
// @access  Private
const importStudents = async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ success: false, message: 'CSV content is required' });
    }

    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated' });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must have a header row and at least one data row' });
    }

    const headers = rows[0].map(h => HEADER_ALIASES[String(h || '').trim().toLowerCase()] || null);
    const required = ['admissionNumber', 'name', 'classLevel', 'guardianName', 'guardianPhone'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missing.join(', ')}. Recognized headers: ${Object.keys(HEADER_ALIASES).join(', ')}`,
      });
    }

    const created = [];
    const errors = [];

    for (let r = 1; r < rows.length; r++) {
      const values = rows[r];
      const obj = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = (values[idx] || '').trim();
      });

      if (obj.guardianPhone) obj.guardianPhone = normalizePhone(obj.guardianPhone);
      if (obj.admissionNumber) obj.admissionNumber = obj.admissionNumber.toUpperCase();

      try {
        const dupe = await Student.findOne({ admissionNumber: obj.admissionNumber, school: schoolId });
        if (dupe) {
          errors.push({ row: r + 1, admissionNumber: obj.admissionNumber, reason: 'Admission number already exists' });
          continue;
        }
        const student = await Student.create({ ...obj, school: schoolId });
        created.push({ row: r + 1, _id: student._id, admissionNumber: student.admissionNumber });
      } catch (err) {
        errors.push({ row: r + 1, admissionNumber: obj.admissionNumber, reason: err.message });
      }
    }

    res.status(200).json({
      success: true,
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    });
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
  getStudentByAdmission,
  importStudents,
};
