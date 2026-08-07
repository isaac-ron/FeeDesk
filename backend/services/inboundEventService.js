const InboundEvent = require('../models/InboundEvent');

// Lifecycle helpers for the inbound edge log (models/InboundEvent.js).
//
// Contract, and it matters:
//   - recordInbound() THROWS on failure. If we cannot durably record an inbound
//     payment we must not pretend we received it — the caller's job is to answer
//     the provider with a retryable error rather than a cheerful 200.
//   - every mark*() helper NEVER throws. They are best-effort status updates on
//     a row that already exists; a failed bookkeeping write must not take down a
//     response we would otherwise have sent correctly.

// Headers worth keeping for diagnosing auth/signature rejections. Whitelisted
// rather than blacklisted so a provider adding a header never leaks it by
// default. `authorization` is recorded as presence-only: knowing Equity did or
// did not send Basic Auth is diagnostic, storing the credential is a liability.
const SAFE_HEADERS = [
  'content-type',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'x-buni-signature',
  'x-kcb-signature',
  'x-signature',
  'signature',
];

const pickHeaders = (headers = {}) => {
  const out = {};
  for (const key of SAFE_HEADERS) {
    if (headers[key] !== undefined) out[key] = headers[key];
  }
  if (headers.authorization !== undefined) out.authorization = '[redacted]';
  return out;
};

/**
 * Persist an inbound provider notification before anything else can fail.
 * @throws if the write fails — caller must treat that as "we did not receive it".
 * @returns {Promise<InboundEvent>}
 */
const recordInbound = async ({ provider, channel, req, externalRef = null, school = null, amount = null }) =>
  InboundEvent.create({
    provider,
    channel,
    externalRef: externalRef ? String(externalRef) : null,
    school: school || null,
    amount: Number.isFinite(amount) ? amount : null,
    status: 'RECEIVED',
    rawBody: req.body ?? {},
    headers: pickHeaders(req.headers),
    sourceIp: req.ip || req.connection?.remoteAddress || null,
  });

// Best-effort status transition. Swallows its own errors by design — see the
// contract note above.
const mark = async (event, status, patch = {}) => {
  if (!event?._id) return;
  try {
    await InboundEvent.updateOne({ _id: event._id }, { $set: { status, ...patch } });
  } catch (err) {
    console.error(`[InboundEvent] Failed to mark ${event._id} as ${status}: ${err.message}`);
  }
};

const markEnqueued = (event, patch = {}) =>
  mark(event, 'ENQUEUED', { enqueuedAt: new Date(), ...patch });

const markDuplicate = (event, patch = {}) =>
  mark(event, 'DUPLICATE', { processedAt: new Date(), ...patch });

// Permanently unprocessable. Not replayed by the replay script.
const markRejected = (event, reason, patch = {}) =>
  mark(event, 'REJECTED', { error: reason, processedAt: new Date(), ...patch });

// Infrastructure failure. This is what replayInboundEvents.js picks up.
const markFailed = (event, reason, patch = {}) =>
  mark(event, 'FAILED', { error: reason, ...patch });

/**
 * Called by the PaymentWorker once a job reaches a terminal state, so the edge
 * log agrees with what actually happened downstream. Matched on externalRef
 * because the worker receives job data, not the event row.
 */
const markProcessedByRef = async (externalRef, { error = null } = {}) => {
  if (!externalRef) return;
  try {
    await InboundEvent.updateMany(
      { externalRef: String(externalRef), status: { $in: ['RECEIVED', 'ENQUEUED'] } },
      { $set: { status: error ? 'FAILED' : 'PROCESSED', processedAt: new Date(), error } }
    );
  } catch (err) {
    console.error(`[InboundEvent] Failed to close out ${externalRef}: ${err.message}`);
  }
};

module.exports = {
  recordInbound,
  markEnqueued,
  markDuplicate,
  markRejected,
  markFailed,
  markProcessedByRef,
  pickHeaders,
};
