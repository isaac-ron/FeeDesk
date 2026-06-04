const mongoose = require('mongoose');

// A saved column-mapping for one bank's statement layout, so a bursar maps the
// columns once and re-uses it for every future upload from that bank. This is
// what makes statement-import universal without coding a parser per bank.
const statementProfileSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true }, // e.g. "Co-op Bank CSV"
  // What payment source to tag imported rows with.
  source: {
    type: String,
    enum: ['MPESA', 'BANK_TRANSFER', 'BANK_AGENT', 'CASH', 'CHEQUE'],
    default: 'BANK_TRANSFER'
  },
  delimiter: { type: String, default: ',' },
  // How credit vs debit is encoded in this statement:
  //   'separate'  — distinct credit & debit columns
  //   'direction' — one amount column + a type column with a credit token
  //   'signed'    — one amount column; sign decides (positive = credit by default)
  amountMode: {
    type: String,
    enum: ['separate', 'direction', 'signed'],
    default: 'separate'
  },
  creditTokens: { type: [String], default: ['CR', 'C', 'CREDIT'] },
  creditWhenPositive: { type: Boolean, default: true }, // for 'signed' mode
  // Header-name → canonical-field map. Values are the column headers in the file.
  columns: {
    txnRef: String,     // bank transaction reference (idempotency key)
    date: String,       // value/transaction date
    amount: String,     // single amount column (direction/signed modes)
    credit: String,     // credit column (separate mode)
    debit: String,      // debit column (separate mode)
    direction: String,  // type/direction column (direction mode)
    reference: String,  // narration / account ref (admission number lives here)
    payerName: String,  // depositor/sender name
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

statementProfileSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StatementProfile', statementProfileSchema);
