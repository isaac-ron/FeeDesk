const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/requireRole');

router.use(protect);
router.use(tenantMiddleware);

router.get('/', requireRole('admin', 'principal'), getAuditLogs);

module.exports = router;
