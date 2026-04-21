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

module.exports = { getPaymentQueue, getSmsQueue };
