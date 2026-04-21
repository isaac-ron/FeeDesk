const AuditLog = require('../models/AuditLog');

/**
 * Records an audit log entry. Fire-and-forget — never blocks the caller
 * and never throws. Errors are logged to stderr only.
 *
 * @param {Object} opts
 * @param {string} opts.school   - ObjectId of the school
 * @param {string} [opts.user]   - ObjectId of the acting user (null for system actions)
 * @param {string} opts.action   - Dotted action identifier, e.g. 'fee_structure.publish'
 * @param {string} opts.entityType - One of the enum values on AuditLog.entityType
 * @param {string} [opts.entityId] - ObjectId of the affected entity
 * @param {string} opts.description - Human-readable description
 * @param {Object} [opts.metadata]  - Free-form payload (keep small)
 */
const recordAudit = (opts) => {
  AuditLog.create({
    school: opts.school,
    user: opts.user || null,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId || null,
    description: opts.description,
    metadata: opts.metadata || {},
  }).catch((err) => {
    console.error('[AuditLog] Failed to record:', err.message);
  });
};

module.exports = { recordAudit };
