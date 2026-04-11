const express = require('express');
const router = express.Router();
const {
  getFees,
  getFee,
  createFee,
  updateFee,
  deleteFee,
  getFeesSummary
} = require('../controllers/feeController');
const { protect } = require('../middleware/authMiddleware');
const { validate, createFeeSchema, updateFeeSchema } = require('../middleware/validate');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getFees)
  .post(validate(createFeeSchema), createFee);

router.get('/summary/:academicYear', getFeesSummary);

router.route('/:id')
  .get(getFee)
  .put(validate(updateFeeSchema), updateFee)
  .delete(deleteFee);

module.exports = router;