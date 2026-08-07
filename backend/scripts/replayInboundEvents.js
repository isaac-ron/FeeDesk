/**
 * Recover payments that were received but never processed.
 *
 * Every inbound provider notification is written to the InboundEvent log before
 * anything else can fail (see models/InboundEvent.js). When Redis was down, the
 * process died mid-request, or a normaliser bug rejected a real payload, the
 * money is still on disk here — this script re-enqueues it through the normal
 * PaymentWorker pipeline.
 *
 * Safe to run repeatedly: every replayed job carries the same jobId as the
 * original, and the worker's idempotency check plus the unique
 * { school, transactionId } index mean a payment cannot be double-credited.
 * Events whose Transaction already exists are closed out, not re-sent.
 *
 * Dry-runs by default. Pass APPLY=true to actually enqueue.
 *
 * Usage:
 *   MONGO_URI='...' REDIS_URL='...' node backend/scripts/replayInboundEvents.js
 *   MONGO_URI='...' REDIS_URL='...' APPLY=true node backend/scripts/replayInboundEvents.js
 *
 * Filters (all optional, combinable):
 *   PROVIDER=MPESA|KCB|EQUITY|COOP   only this provider
 *   SINCE=2026-08-01                 only events received on/after this date
 *   REF=TGH4X8K9L2                   a single transaction, by provider ref
 *   INCLUDE_REJECTED=true            also replay REJECTED events
 *
 * On INCLUDE_REJECTED: rejected events were judged permanently unprocessable —
 * malformed payloads, unconfigured schools, failed/cancelled STK pushes, and
 * non-success Equity IPNs. Replaying them is deliberate, not routine. Use it
 * after fixing a parser bug or configuring a school's bank integration, and
 * read the dry-run output first: a cancelled STK push is not a payment and
 * re-sending it will simply be rejected again.
 */
require('../config/env');
const mongoose = require('mongoose');
const InboundEvent = require('../models/InboundEvent');
const Transaction = require('../models/Transaction');
const School = require('../models/School');
const StkPushLog = require('../models/StkPushLog');
const mpesaService = require('../services/mpesaService');
const { normalise } = require('../services/paymentNormalizer');
const { getPaymentQueue } = require('../queues');

// Mirrors the school lookup in paymentController.bankWebhookHandler.
const resolveBankSchool = async (provider, body) => {
  let accountIdentifier;
  if (provider === 'EQUITY') {
    accountIdentifier = body?.transaction?.billNumber || body?.bank?.account;
  } else if (provider === 'KCB') {
    accountIdentifier = body.creditAccountIdentifier || body.accountNumber;
  } else if (provider === 'COOP') {
    accountIdentifier = body.AccountNumber || body.accountNumber;
  }
  if (!accountIdentifier) return null;

  return School.findOne({
    'bankIntegration.provider': provider,
    'bankIntegration.credentials.accountNumber': accountIdentifier,
    'bankIntegration.enabled': true,
    'bankIntegration.isActive': true,
  });
};

/**
 * Rebuild the queue job for one stored event. Returns { name, data, jobId } or
 * { skip: reason } when the event cannot be replayed as-is.
 *
 * Deliberately mirrors the live handlers rather than sharing code with them:
 * recovery should be explicit and auditable, and must not drift silently if the
 * edge handlers change shape.
 */
const buildJob = async (event) => {
  const body = event.rawBody || {};

  if (event.channel === 'C2B') {
    const { TransID, BusinessShortCode } = body;
    if (!TransID) return { skip: 'no TransID in stored payload' };
    const normalised = normalise('MPESA', body);
    return {
      name: 'mpesa-c2b',
      data: { ...normalised, paybillNumber: BusinessShortCode, inboundEventId: event._id.toString() },
      jobId: `mpesa-${TransID}`,
      ref: TransID,
    };
  }

  if (event.channel === 'STK') {
    const parsed = mpesaService.parseStkCallback(body);
    if (!parsed) return { skip: 'unparseable STK payload' };
    if (!parsed.success) return { skip: `STK was not successful (${parsed.resultDesc})` };

    const pushLog = await StkPushLog.findOne({ checkoutRequestId: parsed.checkoutRequestId });
    const phone = parsed.phoneNumber ? mpesaService.normalisePhone(parsed.phoneNumber) : null;
    return {
      name: 'mpesa-stk',
      data: {
        provider: 'MPESA',
        ref: parsed.mpesaReceiptNumber,
        amount: parsed.amount,
        phone,
        accountRef: pushLog ? pushLog.admissionNumber : `STK-${parsed.checkoutRequestId}`,
        paidBy: phone || 'STK Payer',
        receivedAt: event.createdAt.toISOString(),
        sourceLabel: 'MPESA (STK)',
        rawPayload: body,
        schoolId: pushLog?.school?.toString() || null,
        pushLogId: pushLog?._id?.toString() || null,
        inboundEventId: event._id.toString(),
      },
      jobId: `stk-${parsed.mpesaReceiptNumber}`,
      ref: parsed.mpesaReceiptNumber,
    };
  }

  if (event.channel === 'BANK_IPN') {
    const school = await resolveBankSchool(event.provider, body);
    if (!school) return { skip: `no active ${event.provider} integration for this account` };

    const normalised = normalise(event.provider, body, school);
    if (event.provider === 'EQUITY' && normalised.status && normalised.status !== 'SUCCESS') {
      return { skip: `non-success IPN status (${normalised.status})` };
    }
    return {
      name: `bank-${event.provider.toLowerCase()}`,
      data: { ...normalised, schoolId: school._id.toString(), inboundEventId: event._id.toString() },
      jobId: `bank-${normalised.ref}`,
      ref: normalised.ref,
    };
  }

  return { skip: `unknown channel ${event.channel}` };
};

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[replay] MONGO_URI not set');
    process.exit(1);
  }

  const apply = process.env.APPLY === 'true';
  const includeRejected = process.env.INCLUDE_REJECTED === 'true';

  // RECEIVED is included alongside FAILED: an event stuck in RECEIVED means the
  // process died between writing it down and enqueuing it, which is exactly the
  // crash this log exists to survive.
  const statuses = ['FAILED', 'RECEIVED'];
  if (includeRejected) statuses.push('REJECTED');

  const query = { status: { $in: statuses } };
  if (process.env.PROVIDER) query.provider = process.env.PROVIDER.toUpperCase();
  if (process.env.REF) query.externalRef = process.env.REF;
  if (process.env.SINCE) {
    const since = new Date(process.env.SINCE);
    if (Number.isNaN(since.getTime())) {
      console.error(`[replay] SINCE is not a valid date: ${process.env.SINCE}`);
      process.exit(1);
    }
    query.createdAt = { $gte: since };
  }

  await mongoose.connect(uri);
  console.log(`[replay] Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`[replay] Statuses: ${statuses.join(', ')}${includeRejected ? '  (including REJECTED)' : ''}`);

  const events = await InboundEvent.find(query).sort({ createdAt: 1 });
  console.log(`[replay] ${events.length} candidate event(s)\n`);

  const stats = { replayed: 0, alreadyProcessed: 0, skipped: 0, errored: 0 };
  const queue = apply ? getPaymentQueue() : null;

  for (const event of events) {
    const label = `${event.provider}/${event.channel} ${event.externalRef || '(no ref)'} @ ${event.createdAt.toISOString()}`;

    try {
      const job = await buildJob(event);

      if (job.skip) {
        console.log(`  SKIP     ${label} — ${job.skip}`);
        stats.skipped++;
        continue;
      }

      // Already recovered by some other route (a provider resend, a manual
      // entry, an earlier replay). Close the row out instead of re-sending.
      const existing = await Transaction.findOne({ transactionId: job.ref });
      if (existing) {
        console.log(`  DONE     ${label} — transaction already exists, closing out`);
        if (apply) {
          await InboundEvent.updateOne(
            { _id: event._id },
            { $set: { status: 'PROCESSED', processedAt: new Date(), externalRef: String(job.ref) } }
          );
        }
        stats.alreadyProcessed++;
        continue;
      }

      if (apply) {
        await queue.add(job.name, job.data, { jobId: job.jobId });
        await InboundEvent.updateOne(
          { _id: event._id },
          {
            $set: { status: 'ENQUEUED', enqueuedAt: new Date(), externalRef: String(job.ref), error: null },
            $inc: { replayCount: 1 },
          }
        );
      }
      console.log(`  ${apply ? 'REPLAY  ' : 'WOULD   '} ${label} — KES ${job.data.amount} → ${job.name}`);
      stats.replayed++;
    } catch (err) {
      console.error(`  ERROR    ${label} — ${err.message}`);
      stats.errored++;
    }
  }

  console.log(
    `\n[replay] ${apply ? 'Replayed' : 'Would replay'}: ${stats.replayed} | ` +
    `already processed: ${stats.alreadyProcessed} | skipped: ${stats.skipped} | errored: ${stats.errored}`
  );
  if (!apply && stats.replayed > 0) console.log('[replay] Re-run with APPLY=true to enqueue.');

  await mongoose.disconnect();
  if (queue) await queue.close();
  process.exit(0);
})();
