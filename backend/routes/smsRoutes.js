const express = require('express');
const router = express.Router();
const {
  listCampaigns,
  previewCampaign,
  sendCampaign,
  listCampaignLogs,
  listLogs,
} = require('../controllers/smsCampaignController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/campaigns', listCampaigns);
router.post('/campaigns', sendCampaign);
router.post('/campaigns/preview', previewCampaign);
router.get('/campaigns/:id/logs', listCampaignLogs);
router.get('/logs', listLogs);

module.exports = router;
