const Term = require('../models/Term');

const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

const resolveSchool = (req) =>
  req.user.role === 'super_admin' ? req.body.school : req.user.school;

// GET /api/terms
const listTerms = async (req, res) => {
  try {
    const { status, academicYear } = req.query;
    const query = { ...schoolFilter(req) };
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    const terms = await Term.find(query).sort({ academicYear: -1, termNumber: -1 });
    res.json({ success: true, count: terms.length, data: terms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/terms/active
const getActiveTerm = async (req, res) => {
  try {
    const term = await Term.findOne({ ...schoolFilter(req), status: 'ACTIVE' });
    res.json({ success: true, data: term });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/terms
const createTerm = async (req, res) => {
  try {
    const schoolId = resolveSchool(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School is required' });
    const term = await Term.create({ ...req.body, school: schoolId, status: 'DRAFT' });
    res.status(201).json({ success: true, data: term });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/terms/:id
const updateTerm = async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ success: false, message: 'Term not found' });
    if (req.user.role !== 'super_admin' && term.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (term.status === 'ARCHIVED') {
      return res.status(400).json({ success: false, message: 'Cannot edit an archived term' });
    }
    delete req.body.school;
    delete req.body.status;
    Object.assign(term, req.body);
    await term.save();
    res.json({ success: true, data: term });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/terms/:id/activate
// Activates a DRAFT term and archives the currently ACTIVE term (if any).
const activateTerm = async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ success: false, message: 'Term not found' });
    if (req.user.role !== 'super_admin' && term.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (term.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: `Only DRAFT terms can be activated (current: ${term.status})` });
    }

    const current = await Term.findOne({ school: term.school, status: 'ACTIVE' });
    if (current) {
      current.status = 'ARCHIVED';
      current.archivedAt = new Date();
      await current.save();
    }

    term.status = 'ACTIVE';
    await term.save();

    res.json({ success: true, data: term, previousTerm: current?._id || null });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/terms/:id/archive
const archiveTerm = async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ success: false, message: 'Term not found' });
    if (req.user.role !== 'super_admin' && term.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    term.status = 'ARCHIVED';
    term.archivedAt = new Date();
    await term.save();
    res.json({ success: true, data: term });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/terms/:id — only DRAFT terms can be deleted
const deleteTerm = async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ success: false, message: 'Term not found' });
    if (req.user.role !== 'super_admin' && term.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (term.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT terms can be deleted' });
    }
    await term.deleteOne();
    res.json({ success: true, message: 'Term deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listTerms,
  getActiveTerm,
  createTerm,
  updateTerm,
  activateTerm,
  archiveTerm,
  deleteTerm,
};
