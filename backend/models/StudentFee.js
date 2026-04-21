const mongoose = require('mongoose');

// Per-student, per-fee-item ledger row. Created in bulk when a FeeStructure
// is published. Payments land against these rows via Transaction.allocations,
// incrementing amountPaid and recomputing status.
//
// Name, type, and amountCharged are snapshotted at publish time so that
// editing the parent FeeStructure later (e.g. correcting an amount) doesn't
// retroactively rewrite a student's historical charges — only unpaid rows
// are updated by the edit flow.
const studentFeeSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  term: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: true,
    index: true
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: true
  },
  // The subdoc _id of the item inside FeeStructure.items that this row tracks.
  feeItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // Snapshotted at publish. Do not rewrite on structure edits unless the row
  // is still fully unpaid (amountPaid === 0).
  name: { type: String, required: true },
  type: { type: String, required: true },
  amountCharged: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  dueDate: Date,
  isRequired: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ['UNPAID', 'PARTIAL', 'PAID', 'WAIVED'],
    default: 'UNPAID',
    index: true
  },

  // Carry-forward linkage. If a term ends with an outstanding balance and
  // Term.carryForwardEnabled is true, the archive job creates a fresh
  // StudentFee in the next term that points back here via carriedForwardFrom.
  // Used by the student-ledger "carry-forward" banner.
  carriedForwardFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFee',
    default: null
  }
}, { timestamps: true });

// One row per (student, feeStructure, feeItemId). A student cannot be charged
// the same item in the same structure twice.
studentFeeSchema.index(
  { student: 1, feeStructure: 1, feeItemId: 1 },
  { unique: true }
);

// Fast filters for the common queries the UI needs:
// - "everything the student owes in the active term" (student + term + status)
// - "all unpaid rows in this school for the bulk-SMS reminder filter"
studentFeeSchema.index({ school: 1, term: 1, status: 1 });
studentFeeSchema.index({ student: 1, term: 1 });

studentFeeSchema.virtual('outstanding').get(function () {
  return Math.max(0, (this.amountCharged || 0) - (this.amountPaid || 0));
});

// Recompute status from amountPaid vs amountCharged.
// Called by the payment-allocation code after mutating amountPaid.
studentFeeSchema.methods.recomputeStatus = function () {
  if (this.status === 'WAIVED') return;
  if (this.amountPaid <= 0) this.status = 'UNPAID';
  else if (this.amountPaid >= this.amountCharged) this.status = 'PAID';
  else this.status = 'PARTIAL';
};

studentFeeSchema.pre('save', function (next) {
  if (this.isModified('amountPaid') || this.isModified('amountCharged')) {
    this.recomputeStatus();
  }
  next();
});

// Safety net: keep Student.currentBalance consistent with the ledger even when
// a caller forgets to invoke balanceService explicitly. Bulk paths
// (insertMany / updateMany) bypass this — they already batch-recompute via
// recomputeManyStudentBalances after the bulk write.
// Lazy-require balanceService to avoid the StudentFee ↔ balanceService cycle.
studentFeeSchema.post('save', async function (doc) {
  try {
    if (doc && doc.student) {
      const { recomputeStudentBalance } = require('../services/balanceService');
      await recomputeStudentBalance(doc.student);
    }
  } catch (err) {
    console.error('[StudentFee post-save] balance recompute failed:', err.message);
  }
});

studentFeeSchema.set('toJSON', { virtuals: true });
studentFeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
