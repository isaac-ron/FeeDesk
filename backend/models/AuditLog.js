const mongoose = require('mongoose');

// Append-only record of significant actions taken against a school's data.
// Surfaced by the Settings > Audit log page. Writes should never block the
// caller — the recordAudit helper swallows its own errors and logs to stderr.
const auditLogSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Dotted action identifier, e.g. 'fee_structure.publish', 'payment.record',
  // 'sms.bulk_send', 'term.activate', 'user.invite'. Keep these stable —
  // the frontend filters on them.
  action: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['FEE_STRUCTURE', 'TERM', 'PAYMENT', 'STUDENT', 'USER', 'SMS_CAMPAIGN', 'SCHOOL', 'OTHER'],
    required: true
  },
  entityId: mongoose.Schema.Types.ObjectId,
  description: { type: String, required: true },
  // Free-form payload for the action (before/after snapshots, filter params,
  // recipient counts, etc.). Keep it small — don't dump entire documents.
  metadata: { type: Object, default: {} }
}, { timestamps: true });

auditLogSchema.index({ school: 1, createdAt: -1 });
auditLogSchema.index({ school: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
