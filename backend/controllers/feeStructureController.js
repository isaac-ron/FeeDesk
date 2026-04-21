const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const Student = require('../models/Student');
const Term = require('../models/Term');
const LedgerEntry = require('../models/LedgerEntry');
const { recomputeManyStudentBalances } = require('../services/balanceService');
const { recordAudit } = require('../services/auditService');

const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

const resolveSchool = (req) =>
  req.user.role === 'super_admin' ? req.body.school : req.user.school;

const ensureOwnership = (req, doc) => {
  if (!doc) return { ok: false, status: 404, message: 'Not found' };
  if (req.user.role === 'super_admin') return { ok: true };
  if (doc.school.toString() !== req.user.school.toString()) {
    return { ok: false, status: 403, message: 'Access denied' };
  }
  return { ok: true };
};

const listStructures = async (req, res) => {
  try {
    const { term, classLevel, status } = req.query;
    const query = { ...schoolFilter(req) };
    if (term) query.term = term;
    if (classLevel) query.classLevel = classLevel;
    if (status) query.status = status;
    const structures = await FeeStructure.find(query)
      .populate('term', 'name academicYear termNumber status')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: structures.length, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStructure = async (req, res) => {
  try {
    const doc = await FeeStructure.findById(req.params.id).populate('term');
    const check = ensureOwnership(req, doc);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStructure = async (req, res) => {
  try {
    const schoolId = resolveSchool(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School is required' });

    const { term, classLevel, amount, label } = req.body;

    const termDoc = await Term.findById(term);
    if (!termDoc) return res.status(400).json({ success: false, message: 'Term not found' });
    if (termDoc.school.toString() !== schoolId.toString()) {
      return res.status(403).json({ success: false, message: 'Term belongs to another school' });
    }
    if (termDoc.status === 'ARCHIVED') {
      return res.status(400).json({ success: false, message: 'Cannot create a structure on an archived term' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a non-negative number' });
    }

    const structure = await FeeStructure.create({
      school: schoolId,
      term,
      classLevel,
      amount: numericAmount,
      label: label || 'Term fees',
      status: 'DRAFT',
    });
    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A structure already exists for this term and class' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Editing a PUBLISHED structure: only rewrites amountCharged on StudentFee
// rows that are still fully unpaid (amountPaid === 0), so historical
// partially-paid invoices aren't retroactively changed.
const updateStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    const check = ensureOwnership(req, structure);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    if (structure.status === 'ARCHIVED') {
      return res.status(400).json({ success: false, message: 'Cannot edit an archived structure' });
    }

    const { amount, label, classLevel } = req.body;
    if (classLevel && structure.status === 'DRAFT') structure.classLevel = classLevel;
    if (label !== undefined) structure.label = label;

    let amountChanged = false;
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a non-negative number' });
      }
      amountChanged = numericAmount !== structure.amount;
      structure.amount = numericAmount;
    }
    await structure.save();

    if (structure.status === 'PUBLISHED' && amountChanged) {
      await StudentFee.updateMany(
        { feeStructure: structure._id, amountPaid: 0 },
        { $set: { amountCharged: structure.amount, name: structure.label || 'Term fees' } }
      );
      const affected = await StudentFee.find({ feeStructure: structure._id, amountPaid: 0 }).select('student');
      await recomputeManyStudentBalances(affected.map((r) => r.student));
    }

    res.json({ success: true, data: structure });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Generates one StudentFee row per active student in the target class.
const publishStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    const check = ensureOwnership(req, structure);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    if (structure.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: `Only DRAFT structures can be published (current: ${structure.status})` });
    }
    if (!structure.amount || structure.amount <= 0) {
      return res.status(400).json({ success: false, message: 'Cannot publish a structure with zero amount' });
    }

    const studentQuery = { school: structure.school, status: 'Active' };
    if (structure.classLevel !== 'ALL') studentQuery.classLevel = structure.classLevel;
    const students = await Student.find(studentQuery).select('_id');

    const label = structure.label || 'Term fees';
    const rows = students.map((student) => ({
      school: structure.school,
      student: student._id,
      term: structure.term,
      feeStructure: structure._id,
      // Use the structure's own _id as a stable placeholder — keeps the
      // (student, feeStructure, feeItemId) unique index functional in the
      // flat-fee world where there is only one row per structure.
      feeItemId: structure._id,
      name: label,
      type: 'TUITION',
      amountCharged: structure.amount,
      isRequired: true,
    }));

    if (rows.length) {
      await StudentFee.insertMany(rows, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err; // ignore duplicates from partial re-publish
      });
    }

    // Create 'charge' ledger entries for every StudentFee row just created.
    // These are the debit side of the ledger — negative amount means "owes".
    const insertedFees = await StudentFee.find({
      feeStructure: structure._id,
      school: structure.school,
    }).select('_id student term amountCharged');

    const ledgerRows = insertedFees.map((sf) => ({
      school: structure.school,
      student: sf.student,
      studentFee: sf._id,
      term: sf.term,
      type: 'charge',
      amount: -sf.amountCharged, // negative = debit
      balanceAfter: -sf.amountCharged, // first entry for this fee line
      performedBy: req.user._id,
      note: `Fee charged: ${label}`,
    }));

    if (ledgerRows.length) {
      await LedgerEntry.insertMany(ledgerRows, { ordered: false }).catch((err) => {
        // Log but don't fail the publish — the StudentFees are the critical path
        console.error('[Publish] Ledger insert error:', err.message);
      });
    }

    structure.status = 'PUBLISHED';
    structure.publishedAt = new Date();
    structure.publishedBy = req.user._id;
    structure.studentsInvoiced = students.length;
    await structure.save();

    await recomputeManyStudentBalances(students.map((s) => s._id));

    recordAudit({
      school: structure.school,
      user: req.user._id,
      action: 'fee_structure.publish',
      entityType: 'FEE_STRUCTURE',
      entityId: structure._id,
      description: `Published fee structure "${label}" for ${structure.classLevel} — ${students.length} student(s) invoiced`,
      metadata: { amount: structure.amount, classLevel: structure.classLevel, studentsInvoiced: students.length },
    });

    res.json({ success: true, data: structure, studentsInvoiced: students.length, rowsCreated: rows.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    const check = ensureOwnership(req, structure);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
    if (structure.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT structures can be deleted' });
    }
    await structure.deleteOne();
    res.json({ success: true, message: 'Structure deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listStructures,
  getStructure,
  createStructure,
  updateStructure,
  publishStructure,
  deleteStructure,
};
