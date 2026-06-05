const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: false, // Not required for suspense transactions
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false, // False initially, in case payment is to "Suspense" (unknown student)
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    enum: ['MPESA', 'BANK_AGENT', 'BANK_TRANSFER', 'CASH', 'CHEQUE'],
    required: true
  },
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT'], // Credit = Payment in, Debit = Reversal/Charge
    default: 'CREDIT'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'PENDING', 'FAILED', 'REVERSED'],
    default: 'COMPLETED'
  },
  reference: {
    type: String, // The account number entered by the payer (e.g., ADM-001)
    required: true
  },
  paidBy: {
    type: String, // Name of the person who made the payment
    trim: true
  },
  phoneNumber: {
    type: String, // Phone number used for M-Pesa payment
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^254\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Kenyan phone number!`
    }
  },
  metadata: {
    type: Object, // Stores the raw payload from Daraja/Bank API for audit trails
    default: {}
  },
  // How this payment was matched to its student (audit + future tuning).
  matchMethod: {
    type: String,
    enum: ['ALIAS', 'EXACT_REF', 'NORMALIZED_REF', 'PHONE', 'MANUAL', 'NONE'],
    default: 'NONE'
  },
  matchConfidence: {
    type: Number,
    default: 0
  },
  // Ranked candidate students for a suspense (unmatched) payment, produced by
  // the matching ladder so the bursar can resolve it in one click.
  suggestedMatches: {
    type: [{
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      score: { type: Number, default: 0 },
      reasons: { type: [String], default: [] }
    }],
    default: []
  },
  // How this payment was split across the student's fee-line ledger rows.
  // Populated by the auto-allocation step after a payment is confirmed.
  // Sum of allocations[].amount should equal `amount` for fully-allocated
  // credits; a shorter sum means there's credit left over (overpayment).
  allocations: {
    type: [{
      studentFee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentFee',
        required: true
      },
      amount: { type: Number, required: true, min: 0 }
    }],
    default: []
  },
  // Overpayment remainder: amount paid beyond every outstanding fee line at
  // allocation time. Persisted (rather than silently dropped) so the excess
  // stays on the books as auditable credit for this payment. A future pass
  // aggregates this into a spendable student credit + auto-applies it to new
  // charges; for now it is captured per-transaction.
  unallocatedAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure transaction IDs are unique per school
transactionSchema.index({ school: 1, transactionId: 1 }, { unique: true });

// Indexes for efficient queries
transactionSchema.index({ school: 1, status: 1 });
transactionSchema.index({ school: 1, student: 1 });
transactionSchema.index({ school: 1, createdAt: -1 });
transactionSchema.index({ school: 1, source: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);