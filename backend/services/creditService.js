const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const LedgerEntry = require('../models/LedgerEntry');
const { recomputeStudentBalance } = require('./balanceService');
const { acquireLock } = require('./lockService');
const { round2 } = require('./paymentAllocationService');

// Overpayment credit rollover.
//
// When a parent overpays, allocatePayment fills every current fee row and
// parks the remainder on Transaction.unallocatedAmount. That credit used to sit
// there forever. This service draws it down against the student's unpaid rows —
// e.g. when the next term's fees are published — so "extra paid this term"
// automatically pays next term / next year.
//
// Bookkeeping: spendable credit on a txn = unallocatedAmount - creditApplied.
// Consuming credit increments creditApplied, which makes the whole thing
// idempotent: re-running finds nothing left to spend.
//
// CONCURRENCY/ATOMICITY: we hold the SAME per-student advisory lock the payment
// allocator uses (`alloc:<studentId>`), so a fresh payment and a credit
// drawdown can't interleave and clobber each other's amountPaid writes. Within
// the operation we persist credit consumption (on the source txns) BEFORE the
// fee rows, so a mid-write failure can only ever under-apply (recoverable),
// never double-spend the school's money. Full Mongo-session atomicity is the
// same staged hardening tracked for the allocator and would apply here too.

const availableOn = (t) => round2(Math.max(0, (t.unallocatedAmount || 0) - (t.creditApplied || 0)));

// Load a student's COMPLETED credit transactions that still have spendable
// overpayment, oldest first (credit is consumed FIFO).
const loadCreditTxns = async (studentId) => {
  const txns = await Transaction.find({
    student: studentId,
    type: 'CREDIT',
    status: 'COMPLETED',
    unallocatedAmount: { $gt: 0 },
  });
  return txns
    .filter((t) => availableOn(t) > 0)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
};

// Total spendable overpayment credit a student is holding.
const getAvailableCredit = async (studentId) => {
  const txns = await loadCreditTxns(studentId);
  return round2(txns.reduce((s, t) => s + availableOn(t), 0));
};

const applyLocked = async ({ studentId, performedBy }) => {
  const creditTxns = await loadCreditTxns(studentId);
  let credit = round2(creditTxns.reduce((s, t) => s + availableOn(t), 0));
  if (credit <= 0) return { applied: 0, rowsAffected: 0 };

  const rows = await StudentFee.find({
    student: studentId,
    status: { $in: ['UNPAID', 'PARTIAL'] },
  }).sort({ dueDate: 1, createdAt: 1 });

  const ledger = [];
  const touchedRows = [];
  const touchedTxns = new Set();
  let ti = 0; // FIFO pointer into creditTxns
  let totalApplied = 0;

  for (const row of rows) {
    if (credit <= 0) break;
    let need = round2(Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0)));
    if (need <= 0) continue;

    let rowTouched = false;
    while (need > 0 && ti < creditTxns.length) {
      const src = creditTxns[ti];
      const avail = availableOn(src);
      if (avail <= 0) { ti++; continue; }

      const chunk = round2(Math.min(need, avail));
      if (chunk <= 0) { ti++; continue; }

      src.creditApplied = round2((src.creditApplied || 0) + chunk);
      row.amountPaid = round2((row.amountPaid || 0) + chunk);
      need = round2(need - chunk);
      credit = round2(credit - chunk);
      totalApplied = round2(totalApplied + chunk);
      touchedTxns.add(src);
      rowTouched = true;

      ledger.push({
        school: row.school,
        student: studentId,
        studentFee: row._id,
        term: row.term,
        type: 'payment',
        amount: chunk,
        balanceAfter: round2((row.amountPaid || 0) - (row.amountCharged || 0)),
        payment: src._id,
        performedBy,
        note: `Credit applied from overpayment (${src.transactionId || src._id})`,
      });
    }
    if (rowTouched) touchedRows.push(row);
  }

  if (totalApplied <= 0) return { applied: 0, rowsAffected: 0 };

  // Persist credit consumption first (anti double-spend), then the rows, then
  // the audit ledger (best-effort, mirroring the publish flow).
  for (const t of touchedTxns) await t.save();
  for (const r of touchedRows) await r.save(); // recomputeStatus via pre('save')
  if (ledger.length) {
    try {
      await LedgerEntry.insertMany(ledger, { ordered: false });
    } catch (e) {
      console.error('[creditService] ledger insert failed:', e.message);
    }
  }
  await recomputeStudentBalance(studentId);

  return { applied: totalApplied, rowsAffected: touchedRows.length };
};

// Draw a single student's overpayment credit against their unpaid fee rows.
const applyStudentCredit = async ({ studentId, performedBy = null }) => {
  if (!studentId) return { applied: 0, rowsAffected: 0 };
  const release = await acquireLock(`alloc:${studentId}`);
  try {
    return await applyLocked({ studentId, performedBy });
  } finally {
    await release();
  }
};

// Publish-flow helper: apply credit for many students, skipping the (typical)
// majority that hold none. Returns how many students had credit applied.
const applyCreditForStudents = async (studentIds, { performedBy = null } = {}) => {
  if (!studentIds || !studentIds.length) return 0;
  const withCredit = await Transaction.find({
    student: { $in: studentIds },
    type: 'CREDIT',
    status: 'COMPLETED',
    unallocatedAmount: { $gt: 0 },
  }).distinct('student');

  let count = 0;
  for (const sid of withCredit) {
    const { applied } = await applyStudentCredit({ studentId: sid, performedBy });
    if (applied > 0) count++;
  }
  return count;
};

module.exports = { getAvailableCredit, applyStudentCredit, applyCreditForStudents };
