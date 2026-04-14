const mongoose = require('mongoose');

// Per-recipient SMS record. Covers both transactional SMS (payment receipts,
// single-student reminders — campaign is null) and bulk campaign sends.
// Powers the SMS history table and the failed-deliveries retry list.
const smsLogSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmsCampaign',
    default: null,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
    index: true
  },
  // Guardian phone at send time, normalised to 254XXXXXXXXX.
  // Snapshotted so that later guardian-phone edits don't rewrite history.
  recipientPhone: { type: String, required: true },
  recipientName: String, // guardian name snapshot for the history table

  // Fully-rendered message text with all placeholders substituted. Stored
  // verbatim so the bursar can audit exactly what was delivered.
  message: { type: String, required: true },

  type: {
    type: String,
    enum: ['PAYMENT_RECEIPT', 'FEE_REMINDER', 'BULK_REMINDER', 'CUSTOM', 'WELCOME', 'TEST'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['QUEUED', 'SENT', 'FAILED'],
    default: 'QUEUED',
    index: true
  },

  // TextSMS response fields. providerMessageId comes from result.messageid;
  // errorMessage captures result['response-description'] on failure so the
  // retry UI can show the bursar why a send failed.
  providerMessageId: String,
  errorMessage: String,

  sentAt: Date,
  // Per-SMS cost in KES at send time (from TextSMS pricing or a configured
  // per-SMS rate on the school). Used for the "Estimated cost" stats card.
  costKes: Number
}, { timestamps: true });

smsLogSchema.index({ school: 1, createdAt: -1 });
smsLogSchema.index({ school: 1, status: 1 });
smsLogSchema.index({ campaign: 1, status: 1 });

module.exports = mongoose.model('SmsLog', smsLogSchema);
