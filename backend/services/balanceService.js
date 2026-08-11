const mongoose = require('mongoose');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Term = require('../models/Term');
const School = require('../models/School');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Recomputes Student.currentBalance from the StudentFee ledger.
//
// Sign convention (kept for backward compat with reports/jobs that already
// use `currentBalance < 0` to mean "owes money"):
//   currentBalance = -(sum of outstanding across non-WAIVED rows)
//   balance < 0  → student owes
//   balance = 0  → fully paid / nothing charged
//
// This is the ONE place currentBalance is written. All other controllers
// should call this after mutating StudentFee rows (publish, allocate, waive).
const recomputeStudentBalance = async (studentId) => {
  if (!studentId) return 0;

  const rows = await StudentFee.find({
    student: studentId,
    status: { $ne: 'WAIVED' },
  }).select('amountCharged amountPaid');

  const outstanding = rows.reduce(
    (sum, r) => sum + Math.max(0, (r.amountCharged || 0) - (r.amountPaid || 0)),
    0
  );

  const balance = -outstanding;
  await Student.updateOne({ _id: studentId }, { $set: { currentBalance: balance } });
  return balance;
};

// Bulk variant for publish flows that touch many students at once.
const recomputeManyStudentBalances = async (studentIds) => {
  if (!studentIds || !studentIds.length) return;
  const ids = studentIds.map((id) =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  );

  const agg = await StudentFee.aggregate([
    { $match: { student: { $in: ids }, status: { $ne: 'WAIVED' } } },
    {
      $group: {
        _id: '$student',
        outstanding: {
          $sum: {
            $max: [0, { $subtract: ['$amountCharged', '$amountPaid'] }],
          },
        },
      },
    },
  ]);

  const bulk = ids.map((id) => {
    const row = agg.find((a) => a._id.toString() === id.toString());
    const outstanding = row ? row.outstanding : 0;
    return {
      updateOne: {
        filter: { _id: id },
        update: { $set: { currentBalance: -outstanding } },
      },
    };
  });
  if (bulk.length) await Student.bulkWrite(bulk);
};

// Walks a StudentFee back to the term the debt was originally charged in.
//
// Carry-forward creates a fresh row in the new term pointing at the old one, so
// after two rollovers a Term 1 debt is sitting on a Term 3 row. Guardians need
// to hear "Term 1", not "Term 3" — naming the row's own term would tell them
// the debt is newer than it is. Ancestors belong to the same student, so the
// chain resolves against rows already in memory without further queries. The
// hop limit is a cycle guard, not a real depth limit.
const resolveOriginTerm = (row, rowsById) => {
  let current = row;
  for (let hops = 0; hops < 12 && current?.carriedForwardFrom; hops += 1) {
    const parent = rowsById.get(String(current.carriedForwardFrom));
    if (!parent) break; // ancestor waived or purged — the last known term wins
    current = parent;
  }
  return current?.term || row.term;
};

// Splits a student's outstanding balance into "this term" vs "arrears", and
// attributes the arrears to the terms they actually came from.
//
// Arrears is debt that outlived the term it was charged in. That is either:
//   (a) outstanding on a term that is no longer ACTIVE, or
//   (b) outstanding on an ACTIVE-term row the archive job carried over from an
//       earlier term (carriedForwardFrom set — see StudentFee).
// Everything else is the active term's own charges.
//
// Returns null when the school has no ACTIVE term (or the student is unknown),
// so callers can fall back to a plain total-balance message rather than
// inventing a term label.
const getTermBreakdown = async (studentId) => {
  if (!studentId) return null;

  const student = await Student.findById(studentId).select('school');
  if (!student?.school) return null;

  const [school, term] = await Promise.all([
    School.findById(student.school).select('name'),
    Term.findOne({ school: student.school, status: 'ACTIVE' })
      .select('name academicYear arrearsGraceDays'),
  ]);
  if (!term) return null;

  const rows = await StudentFee.find({
    student: studentId,
    status: { $ne: 'WAIVED' },
  }).select('term amountCharged amountPaid dueDate carriedForwardFrom');

  const rowsById = new Map(rows.map((r) => [String(r._id), r]));

  let termDue = 0;
  let dueDate = null;
  const arrearsByTerm = new Map(); // origin term id -> outstanding

  for (const row of rows) {
    const outstanding = Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0));
    if (outstanding <= 0) continue;

    const isCurrentTermCharge =
      row.term && row.term.equals(term._id) && !row.carriedForwardFrom;

    if (isCurrentTermCharge) {
      termDue += outstanding;
      // Earliest unpaid due date drives the "due by" wording.
      if (row.dueDate && (!dueDate || row.dueDate < dueDate)) dueDate = row.dueDate;
    } else {
      const originId = String(resolveOriginTerm(row, rowsById));
      arrearsByTerm.set(originId, (arrearsByTerm.get(originId) || 0) + outstanding);
    }
  }

  // Name the origin terms so the copy can say "from Term 1" rather than leaving
  // the guardian to guess where the debt came from.
  const originTerms = arrearsByTerm.size
    ? await Term.find({ _id: { $in: [...arrearsByTerm.keys()] } })
        .select('name academicYear termNumber')
    : [];
  const originById = new Map(originTerms.map((t) => [String(t._id), t]));

  const arrearsSources = [...arrearsByTerm.entries()]
    .map(([id, amount]) => {
      const origin = originById.get(id);
      return {
        // Carry the year only when it differs from the active term's, so the
        // common same-year case stays short but cross-year debt is unambiguous.
        label: !origin
          ? 'an earlier term'
          : origin.academicYear === term.academicYear
            ? origin.name
            : `${origin.name} ${origin.academicYear}`,
        year: origin?.academicYear || '',
        termNumber: origin?.termNumber || 0,
        amount: round2(amount),
      };
    })
    .sort((a, b) => a.year.localeCompare(b.year) || a.termNumber - b.termNumber);

  // Arrears are overdue by definition — they outlived the term they were
  // charged in. The current term's own charges are a SEPARATE question: they
  // are only overdue once their due date plus the grace window has passed, and
  // a student can easily owe overdue arrears while this term's fees are not yet
  // due. Callers must not collapse these two into one flag, or copy ends up
  // demanding immediate payment of money that is not yet owed.
  const graceMs = (term.arrearsGraceDays || 0) * 24 * 60 * 60 * 1000;
  const termOverdue = !!dueDate && Date.now() > dueDate.getTime() + graceMs;

  return {
    schoolName: school?.name || '',
    termLabel: term.name,
    termDue: round2(termDue),
    arrears: round2(arrearsSources.reduce((sum, s) => sum + s.amount, 0)),
    arrearsSources,
    dueDate,
    termOverdue,
  };
};

module.exports = { recomputeStudentBalance, recomputeManyStudentBalances, getTermBreakdown };
