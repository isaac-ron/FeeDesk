const StudentFee = require('../models/StudentFee');
const { recomputeStudentBalance } = require('./balanceService');

// Round to 2 decimal places (cents). All money math is rounded at each step so
// floating-point drift can't (a) leave a row a fraction short of its charge —
// which would keep it PARTIAL forever and show a phantom sub-cent balance — or
// (b) report a meaningless fractional overpayment remainder.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Oldest-due-first allocation. Walks the student's unpaid/partial StudentFee
// rows in order of dueDate (nulls last) then createdAt, draining the payment
// amount across them. Updates amountPaid + status on each row and returns the
// allocations array to be stored on the Transaction.
//
// Any remainder after all rows are fully paid is returned as `unallocated` so
// callers can decide what to do with overpayments (today we just log it).
const allocatePayment = async ({ studentId, amount, transaction }) => {
  const amt = round2(amount);
  if (!studentId || !amt || amt <= 0) {
    return { allocations: [], unallocated: amt || 0 };
  }

  const rows = await StudentFee.find({
    student: studentId,
    status: { $in: ['UNPAID', 'PARTIAL'] },
  }).sort({ dueDate: 1, createdAt: 1 });

  let remaining = amt;
  const allocations = [];

  for (const row of rows) {
    if (remaining <= 0) break;
    const outstanding = round2(Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0)));
    if (outstanding <= 0) continue;
    const applied = round2(Math.min(outstanding, remaining));
    if (applied <= 0) continue;
    row.amountPaid = round2((row.amountPaid || 0) + applied);
    await row.save(); // triggers recomputeStatus via pre('save')
    allocations.push({ studentFee: row._id, amount: applied });
    remaining = round2(remaining - applied);
  }

  if (transaction) {
    transaction.allocations = allocations;
    await transaction.save();
  }

  await recomputeStudentBalance(studentId);

  return { allocations, unallocated: round2(remaining) };
};

module.exports = { allocatePayment, round2 };
