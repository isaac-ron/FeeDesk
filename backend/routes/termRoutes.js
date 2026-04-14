const express = require('express');
const router = express.Router();
const {
  listTerms,
  getActiveTerm,
  createTerm,
  updateTerm,
  activateTerm,
  archiveTerm,
  deleteTerm,
} = require('../controllers/termController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(listTerms).post(createTerm);
router.get('/active', getActiveTerm);
router.route('/:id').put(updateTerm).delete(deleteTerm);
router.post('/:id/activate', activateTerm);
router.post('/:id/archive', archiveTerm);

module.exports = router;
