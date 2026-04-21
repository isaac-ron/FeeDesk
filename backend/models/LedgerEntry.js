const mongoose = require('mongoose');

// Append-only financial ledger. NEVER update or delete rows in this collection.
// All balance corrections are new entries of type 'adjustment'.
//
// This is the source of truth for all balance calculations. The
// StudentFee.amountPaid and Student.currentBalance fields are derived
// materialisations that are recomputed from this ledger.
//
// Sign convention:
//   amount < 0  →  debit  (charges, carry-forwards — increases what student owes)
//   amount > 0  →  credit (payments, adjustments — decreases what student owes)
const ledgerEntrySchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  studentFee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFee',
    required: true,
  },
  term: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['charge', 'payment', 'adjustment', 'refund', 'carry_forward'],
  },
  amount: {
    type: Number,
    required: true,
    // Positive = credit (payment received), Negative = debit (charge invoiced)
  },
  balanceAfter: {
    type: Number,
    required: true,
    // Running balance for this student+studentFee after this entry.
    // Positive means student has a credit; negative means student owes.
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  note: {
    type: String,
    default: null,
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }, // no updatedAt — append-only
});

// Query patterns:
// "Full ledger for student X in term Y" — the primary UI query
ledgerEntrySchema.index({ student: 1, term: 1, createdAt: 1 });
// "All entries for a specific fee line" — for per-fee-item detail view
ledgerEntrySchema.index({ studentFee: 1, createdAt: 1 });
// "All entries in a school" — for audit/export
ledgerEntrySchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
