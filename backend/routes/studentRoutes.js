const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentByAdmission
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { validate, createStudentSchema, updateStudentSchema } = require('../middleware/validate');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getStudents)
  .post(validate(createStudentSchema), createStudent);

router.route('/:id')
  .get(getStudent)
  .put(validate(updateStudentSchema), updateStudent)
  .delete(deleteStudent);

router.get('/admission/:admissionNumber', getStudentByAdmission);

module.exports = router;