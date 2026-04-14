const express = require('express');
const router = express.Router();
const { listFees, waiveFee } = require('../controllers/studentFeeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', listFees);
router.post('/:id/waive', waiveFee);

module.exports = router;
