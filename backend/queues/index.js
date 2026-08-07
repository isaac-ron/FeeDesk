const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

// Lazy-initialised queues — created on first access so Redis connection
// is only established when the app actually needs it.
let paymentQueue = null;
let smsQueue = null;

const getPaymentQueue = () => {
  if (!paymentQueue) {
    paymentQueue = new Queue('payment.received', {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }
  return paymentQueue;
};

const getSmsQueue = () => {
  if (!smsQueue) {
    smsQueue = new Queue('sms.send', {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }
  return smsQueue;
};

/**
 * Enqueue with a hard deadline.
 *
 * BullMQ requires `maxRetriesPerRequest: null`, and ioredis's offline queue is
 * on by default, so when Redis is unreachable a command does not fail — it sits
 * in memory waiting for a reconnection that may never come. `queue.add()` then
 * never settles, the webhook handler awaits forever, and the provider gets no
 * response at all. Observed in the wild on 2026-08-07: a genuine Safaricom C2B
 * callback arrived while Redis was down and the request hung, leaving the event
 * stuck at RECEIVED with no reply sent.
 *
 * A hang is the one failure mode the edge handlers cannot classify — their
 * catch block never runs, so neither the 503 nor the FAILED marking happens.
 * Racing against a deadline converts it into an ordinary infrastructure error,
 * which the existing handling already knows what to do with.
 *
 * If the enqueue later succeeds after we have given up, nothing breaks: the job
 * carries the same jobId, and the worker's idempotency check plus the unique
 * { school, transactionId } index make a double-credit impossible.
 */
const addWithDeadline = (queue, name, data, opts, ms = 5000) => {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Enqueue timed out after ${ms}ms — Redis unreachable`)),
      ms
    );
  });
  return Promise.race([queue.add(name, data, opts), deadline]).finally(() => clearTimeout(timer));
};

module.exports = { getPaymentQueue, getSmsQueue, addWithDeadline };
