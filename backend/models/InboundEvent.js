const mongoose = require('mongoose');

// Durable record of every inbound payment notification, written at the HTTP edge
// BEFORE any parsing, matching or queueing can fail.
//
// Why this exists: the webhook handlers used to normalise → enqueue → 200. If
// Redis or Mongo was unreachable at that moment the payload was gone — and the
// handler still answered 200, so the provider never re-sent it. A real payment
// vanished with no trace anywhere in the system. This collection is that trace,
// and `scripts/replayInboundEvents.js` is how you get the payment back.
//
// This is an append-only log. Repeat deliveries of the same transaction are
// stored as separate rows on purpose — "how many times did Safaricom send this,
// and what did we do each time" is exactly the question you need answered when
// a bursar says a payment is missing.
//
// Retention: rows are kept indefinitely. They are small, and a full term of
// history is what makes replay and after-the-fact reconciliation possible. Add a
// TTL index only alongside a deliberate retention policy.
const inboundEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['MPESA', 'KCB', 'EQUITY', 'COOP'],
    required: true,
    index: true
  },
  // How the notification reached us. Distinguishes the two MPESA paths, which
  // carry different payload shapes for the same underlying money movement.
  channel: {
    type: String,
    enum: ['C2B', 'STK', 'BANK_IPN'],
    required: true
  },
  // Provider's own transaction id (MPESA receipt code / bank reference). Null
  // when the payload was too malformed to find one — those rows are still worth
  // keeping, because an unparseable payload is a parser bug worth seeing.
  externalRef: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  // Resolved where possible. Null for MPESA C2B (the worker resolves school by
  // paybill) and for any payload we rejected before school lookup.
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    default: null,
    index: true
  },
  // Denormalised for triage — lets you eyeball a suspect window without parsing
  // rawBody. Never used for accounting; the Transaction is the source of truth.
  amount: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: [
      'RECEIVED',   // persisted at the edge, nothing attempted yet
      'ENQUEUED',   // handed to BullMQ successfully
      'PROCESSED',  // PaymentWorker finished with it
      'DUPLICATE',  // a Transaction with this ref already existed
      'REJECTED',   // permanently unprocessable — malformed, unknown school,
                    // bad signature, non-success IPN. Never replay these blindly.
      'FAILED'      // infrastructure failure (Redis/Mongo/unknown). Replayable —
                    // this is the status the replay script targets.
    ],
    default: 'RECEIVED',
    required: true,
    index: true
  },
  // Verbatim provider payload. The whole point of the collection — this is what
  // gets re-parsed when a normaliser bug is fixed, and re-enqueued on replay.
  rawBody: {
    type: Object,
    required: true
  },
  // Selected request headers, for diagnosing signature/auth failures.
  // `authorization` is redacted before storage: Equity's Jenga IPN authenticates
  // with HTTP Basic, and that is a reusable credential we must not persist.
  // Per-payload signature headers are kept — they are not reusable secrets.
  headers: {
    type: Object,
    default: {}
  },
  sourceIp: {
    type: String,
    default: null
  },
  // Why this row is REJECTED or FAILED. Free text, read by humans during triage.
  error: {
    type: String,
    default: null
  },
  // Incremented each time the replay script re-enqueues this event, so a row
  // that keeps failing is visible rather than silently retried forever.
  replayCount: {
    type: Number,
    default: 0
  },
  enqueuedAt: { type: Date, default: null },
  processedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Triage queries: "what failed today", "what came in from Equity this week".
inboundEventSchema.index({ status: 1, createdAt: -1 });
inboundEventSchema.index({ provider: 1, createdAt: -1 });
inboundEventSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model('InboundEvent', inboundEventSchema);
