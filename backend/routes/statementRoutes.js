const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  previewStatement,
  importStatement,
  listProfiles,
  saveProfile,
} = require('../controllers/statementController');

// Statements are parsed in memory (never written to disk). 8 MB cap.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.use(protect);

router.get('/profiles', listProfiles);
router.post('/profiles', requireRole('admin', 'bursar'), saveProfile);
router.post('/preview', requireRole('admin', 'bursar'), upload.single('file'), previewStatement);
router.post('/import', requireRole('admin', 'bursar'), upload.single('file'), importStatement);

module.exports = router;
