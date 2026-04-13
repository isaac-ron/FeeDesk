const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const {
  getAllSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  getPlatformStats,
  updateSubscription,
  getSchoolUsers,
  getMySchool,
  updateMySchool
} = require('../controllers/schoolController');

router.use(protect);

// Current user's school settings (must be before /:id routes)
router.route('/me')
  .get(getMySchool)
  .put(updateMySchool);

// Platform statistics (super admin only)
router.get('/stats/platform', requireSuperAdmin, getPlatformStats);

// School CRUD operations (super admin only)
router.route('/')
  .get(requireSuperAdmin, getAllSchools)
  .post(requireSuperAdmin, createSchool);

router.route('/:id')
  .get(requireSuperAdmin, getSchool)
  .put(requireSuperAdmin, updateSchool)
  .delete(requireSuperAdmin, deleteSchool);

router.put('/:id/subscription', requireSuperAdmin, updateSubscription);
router.get('/:id/users', requireSuperAdmin, getSchoolUsers);

module.exports = router;
