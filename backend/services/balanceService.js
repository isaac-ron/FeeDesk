const mongoose = require('mongoose');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');

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

module.exports = { recomputeStudentBalance, recomputeManyStudentBalances };
