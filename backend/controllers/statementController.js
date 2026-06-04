const School = require('../models/School');
const StatementProfile = require('../models/StatementProfile');
const { parseFile, applyMapping, processCreditRows } = require('../services/statementImportService');
const { recordAudit } = require('../services/auditService');

const getSchool = async (req) => (req.user.school ? School.findById(req.user.school) : null);

// @desc    Parse an uploaded statement and return headers + a few sample rows
//          so the bursar can map columns. Does NOT import anything.
// @route   POST /api/statements/preview
const previewStatement = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const delimiter = req.body.delimiter || ',';
    const { headers, rows } = parseFile(req.file.originalname, req.file.buffer, delimiter);
    if (!headers.length) {
      return res.status(400).json({ success: false, message: 'Could not read any rows — check the file format/delimiter' });
    }
    res.json({ success: true, data: { headers, sample: rows.slice(0, 5), rowCount: rows.length } });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const resolveMapping = async (req) => {
  if (req.body.profileId) {
    const p = await StatementProfile.findById(req.body.profileId);
    if (p && String(p.school) === String(req.user.school)) return p.toObject();
  }
  if (req.body.mapping) {
    return typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
  }
  return null;
};

// @desc    Import a statement: parse → map → dedup → match (ladder) → allocate.
// @route   POST /api/statements/import
const importStatement = async (req, res) => {
  try {
    const school = await getSchool(req);
    if (!school) return res.status(400).json({ success: false, message: 'No school context for import' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const mapping = await resolveMapping(req);
    if (!mapping || !mapping.columns) {
      return res.status(400).json({ success: false, message: 'A column mapping (or profileId) is required' });
    }

    const { rows } = parseFile(req.file.originalname, req.file.buffer, mapping.delimiter || ',');
    const canonical = applyMapping(rows, mapping);
    const summary = await processCreditRows(school, canonical, {
      userId: req.user._id,
      source: mapping.source || 'BANK_TRANSFER',
    });

    // Optionally persist this mapping as a reusable profile.
    if (req.body.saveAs) {
      try {
        await StatementProfile.findOneAndUpdate(
          { school: school._id, name: req.body.saveAs },
          { $set: { ...mapping, school: school._id, name: req.body.saveAs, createdBy: req.user._id } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch { /* non-fatal */ }
    }

    recordAudit({
      school: school._id,
      user: req.user._id,
      action: 'statement.import',
      entityType: 'STATEMENT',
      description: `Imported statement: ${summary.imported} new (${summary.autoMatched} auto-matched, ${summary.suspense} suspense), ${summary.duplicates} duplicates`,
      metadata: summary,
    });

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// @desc    List saved statement profiles for the school
// @route   GET /api/statements/profiles
const listProfiles = async (req, res) => {
  try {
    const profiles = await StatementProfile.find({ school: req.user.school }).sort({ name: 1 });
    res.json({ success: true, data: profiles });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc    Create/update a statement profile
// @route   POST /api/statements/profiles
const saveProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const doc = await StatementProfile.findOneAndUpdate(
      { school: req.user.school, name },
      { $set: { ...req.body, school: req.user.school, createdBy: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

module.exports = { previewStatement, importStatement, listProfiles, saveProfile };
