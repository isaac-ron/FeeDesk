const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentByAdmission,
  importStudents
} = require('../controllers/studentController');
const { getStudentLedger } = require('../controllers/studentFeeController');
const { protect } = require('../middleware/authMiddleware');
const { validate, createStudentSchema, updateStudentSchema } = require('../middleware/validate');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getStudents)
  .post(validate(createStudentSchema), createStudent);

router.post('/import', importStudents);

router.route('/:id')
  .get(getStudent)
  .put(validate(updateStudentSchema), updateStudent)
  .delete(deleteStudent);

router.get('/admission/:admissionNumber', getStudentByAdmission);
router.get('/:studentId/ledger', getStudentLedger);

module.exports = router;