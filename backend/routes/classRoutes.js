const express = require('express');
const router = express.Router();
const { listClasses, createClass, updateClass, deleteClass } = require('../controllers/classController');
const { protect } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

router.use(protect);

router.get('/', listClasses);
router.post('/', requireRole('admin', 'principal', 'bursar'), createClass);
router.patch('/:id', requireRole('admin', 'principal'), updateClass);
router.delete('/:id', requireRole('admin', 'principal'), deleteClass);

module.exports = router;
