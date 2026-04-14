const StudentFee = require('../models/StudentFee');
const { recomputeStudentBalance } = require('./balanceService');

// Oldest-due-first allocation. Walks the student's unpaid/partial StudentFee
// rows in order of dueDate (nulls last) then createdAt, draining the payment
// amount across them. Updates amountPaid + status on each row and returns the
// allocations array to be stored on the Transaction.
//
// Any remainder after all rows are fully paid is returned as `unallocated` so
// callers can decide what to do with overpayments (today we just log it).
const allocatePayment = async ({ studentId, amount, transaction }) => {
  if (!studentId || !amount || amount <= 0) {
    return { allocations: [], unallocated: amount || 0 };
  }

  const rows = await StudentFee.find({
    student: studentId,
    status: { $in: ['UNPAID', 'PARTIAL'] },
  }).sort({ dueDate: 1, createdAt: 1 });

  let remaining = Number(amount);
  const allocations = [];

  for (const row of rows) {
    if (remaining <= 0) break;
    const outstanding = Math.max(0, (row.amountCharged || 0) - (row.amountPaid || 0));
    if (outstanding <= 0) continue;
    const applied = Math.min(outstanding, remaining);
    row.amountPaid = (row.amountPaid || 0) + applied;
    await row.save(); // triggers recomputeStatus via pre('save')
    allocations.push({ studentFee: row._id, amount: applied });
    remaining -= applied;
  }

  if (transaction) {
    transaction.allocations = allocations;
    await transaction.save();
  }

  await recomputeStudentBalance(studentId);

  return { allocations, unallocated: remaining };
};

module.exports = { allocatePayment };
