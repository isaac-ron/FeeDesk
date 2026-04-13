const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const { getSettings, updateSettings } = require('../controllers/platformSettingsController');

router.use(protect, requireSuperAdmin);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
