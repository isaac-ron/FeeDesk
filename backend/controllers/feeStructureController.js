const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const Student = require('../models/Student');
const Term = require('../models/Term');
const LedgerEntry = require('../models/LedgerEntry');
const { recomputeManyStudentBalances } = require('../services/balanceService');
const { recordAudit } = require('../services/auditService');
const { parseCategoryCsv, validateCategories } = require('../services/feeCategoryService');
const { generateFeeStructures } = require('../utils/voteheadAllocation');

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

    // Roll any existing overpayment credit forward onto the fees just published,
    // so a student who overpaid a previous term auto-pays this one. Never let a
    // credit hiccup fail the publish itself.
    try {
      const { applyCreditForStudents } = require('../services/creditService');
      await applyCreditForStudents(students.map((s) => s._id), { performedBy: req.user._id });
    } catch (e) {
      console.error('[Publish] credit rollover failed:', e.message);
    }

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

// PUT /api/fee-structures/:id/categories
// Body: { categories: [{ name, percent }] }  OR  { csv: "category,percent\n..." }
// Presentation-only: sets the pro-rata category shares. Safe on DRAFT or
// PUBLISHED (it never changes the charged amount or any payment); blocked on
// ARCHIVED. Pass an empty `categories` array to clear them.
const setStructureCategories = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    const check = ensureOwnership(req, structure);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
    if (structure.status === 'ARCHIVED') {
      return res.status(400).json({ success: false, message: 'Cannot edit an archived structure' });
    }

    // Allow an explicit clear.
    if (Array.isArray(req.body?.categories) && req.body.categories.length === 0) {
      structure.categories = [];
      await structure.save();
      return res.json({ success: true, data: structure });
    }

    let categories;
    if (typeof req.body?.csv === 'string') {
      categories = parseCategoryCsv(req.body.csv);
    } else if (Array.isArray(req.body?.categories)) {
      categories = req.body.categories;
    } else {
      return res.status(400).json({ success: false, message: 'Provide `categories` (array) or `csv` (text)' });
    }

    let normalized;
    try {
      normalized = validateCategories(categories);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    structure.categories = normalized;
    await structure.save();

    recordAudit({
      school: structure.school,
      user: req.user._id,
      action: 'fee_structure.set_categories',
      entityType: 'FEE_STRUCTURE',
      entityId: structure._id,
      description: `Set ${normalized.length} pro-rata categor${normalized.length === 1 ? 'y' : 'ies'} on "${structure.label || 'Term fees'}"`,
      metadata: { categories: normalized },
    });

    res.json({ success: true, data: structure });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/fee-structures/generate
// Body: { academicYear, classLevel, annual, scope ('boarding'|'day'), label?, preview? }
//
// One annual figure in → three DRAFT structures out (Term 1/2/3 at 50:30:20),
// each pre-filled with the standard MoE voteheads as pro-rata categories. No
// manual percentages or votehead typing. Pass `preview: true` to compute the
// plan without persisting (so the UI can show it before committing).
const generateStructures = async (req, res) => {
  try {
    const schoolId = resolveSchool(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School is required' });

    const { academicYear, classLevel = 'ALL', annual, scope = 'boarding', label, preview } = req.body;

    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'academicYear is required' });
    }
    if (!['boarding', 'day'].includes(scope)) {
      return res.status(400).json({ success: false, message: 'scope must be "boarding" or "day"' });
    }
    const annualNum = Number(annual);
    if (!Number.isFinite(annualNum) || annualNum <= 0) {
      return res.status(400).json({ success: false, message: 'annual must be a positive number' });
    }

    // The (up to) three terms for this academic year.
    const terms = await Term.find({ school: schoolId, academicYear }).sort({ termNumber: 1 });
    if (!terms.length) {
      return res.status(400).json({ success: false, message: `No terms found for ${academicYear}. Create the terms first.` });
    }
    const termByNumber = new Map(terms.map((t) => [t.termNumber, t]));

    // Heuristic: 50:30:20 term amounts + identical votehead category list.
    const planned = generateFeeStructures({ annual: annualNum, scope });

    const plan = [];
    for (const item of planned) {
      const term = termByNumber.get(item.termIndex);
      const base = { termNumber: item.termIndex, amount: item.amount, categories: item.categories };
      if (!term) {
        plan.push({ ...base, termId: null, termName: null, state: 'missing_term' });
        continue;
      }
      const exists = await FeeStructure.exists({ school: schoolId, term: term._id, classLevel });
      plan.push({
        ...base,
        termId: term._id,
        termName: term.name,
        termStatus: term.status,
        state: exists ? 'exists' : term.status === 'ARCHIVED' ? 'archived_term' : 'ready',
      });
    }

    if (preview) {
      return res.json({ success: true, preview: true, classLevel, scope, annual: annualNum, plan });
    }

    // Commit: create DRAFT structures only where ready.
    const created = [];
    const skipped = [];
    for (const p of plan) {
      if (p.state !== 'ready') {
        const reason = {
          missing_term: 'No matching term',
          exists: 'Structure already exists',
          archived_term: 'Term is archived',
        }[p.state] || 'Skipped';
        skipped.push({ termNumber: p.termNumber, reason });
        continue;
      }
      try {
        const doc = await FeeStructure.create({
          school: schoolId,
          term: p.termId,
          classLevel,
          amount: p.amount,
          label: label || `Term ${p.termNumber} fees`,
          categories: p.categories,
          status: 'DRAFT',
        });
        created.push(doc);
      } catch (e) {
        if (e.code === 11000) skipped.push({ termNumber: p.termNumber, reason: 'Structure already exists' });
        else throw e;
      }
    }

    if (created.length) {
      recordAudit({
        school: schoolId,
        user: req.user._id,
        action: 'fee_structure.generate',
        entityType: 'FEE_STRUCTURE',
        entityId: created[0]._id,
        description: `Generated ${created.length} DRAFT structure(s) for ${classLevel} (${academicYear}) from annual KES ${annualNum.toLocaleString()} — ${scope}`,
        metadata: { academicYear, classLevel, annual: annualNum, scope, created: created.length, voteheads: created[0].categories?.length || 0 },
      });
    }

    res.status(created.length ? 201 : 200).json({ success: true, created, skipped, count: created.length });
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
  setStructureCategories,
  generateStructures,
  deleteStructure,
};
