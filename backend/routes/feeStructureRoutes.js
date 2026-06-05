const express = require('express');
const router = express.Router();
const {
  listStructures,
  getStructure,
  createStructure,
  updateStructure,
  publishStructure,
  setStructureCategories,
  deleteStructure,
} = require('../controllers/feeStructureController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(listStructures).post(createStructure);
router.route('/:id').get(getStructure).put(updateStructure).delete(deleteStructure);
router.post('/:id/publish', publishStructure);
router.put('/:id/categories', setStructureCategories);

module.exports = router;
