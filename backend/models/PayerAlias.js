const mongoose = require('mongoose');

// Learned payer→student mapping (matching ladder Tier 0). Created whenever a
// bursar manually matches a suspense payment, so the NEXT payment carrying the
// same signal auto-matches. Each row maps one signal to one student:
//   • kind 'REF'   — a normalized reference the payer typed that does NOT
//                    belong to any real admission number (a consistent typo).
//   • kind 'PHONE' — a payer MSISDN, only stored when it maps to a single
//                    student (sibling-shared numbers are never aliased).
const payerAliasSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  // Normalized signal: a normalized reference token OR a 254XXXXXXXXX phone.
  signal: {
    type: String,
    required: true
  },
  kind: {
    type: String,
    enum: ['REF', 'PHONE'],
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// One mapping per (school, signal). Upserted on manual match.
payerAliasSchema.index({ school: 1, signal: 1 }, { unique: true });

module.exports = mongoose.model('PayerAlias', payerAliasSchema);
