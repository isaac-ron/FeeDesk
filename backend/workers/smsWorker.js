const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const { sendPaymentReceipt, sendFeeReminder, sendSms } = require('../services/smsService');
const SmsLog = require('../models/SmsLog');

// SMSWorker — processes SMS jobs asynchronously via BullMQ.
//
// Job types:
//   'payment_receipt' — send payment confirmation SMS
//   'fee_reminder'    — send balance reminder SMS
//   'custom'          — send arbitrary message
//
// Each job creates an SmsLog entry for delivery tracking.

const processSms = async (job) => {
  const { type } = job.data;

  console.log(`[SMSWorker] Processing ${type} SMS job ${job.id}`);

  let success = false;
  let recipientPhone = null;
  let messageBody = null;

  switch (type) {
    case 'payment_receipt': {
      const { guardianPhone, transactionPhone, studentName, amount, newBalance, reference, source } = job.data;
      recipientPhone = guardianPhone || transactionPhone;
      success = await sendPaymentReceipt({
        guardianPhone,
        transactionPhone,
        studentName,
        amount,
        newBalance,
        reference,
        source,
      });
      messageBody = `Payment receipt for ${studentName} — KES ${amount}`;
      break;
    }

    case 'fee_reminder': {
      const { guardianPhone: gp, studentName: sn, outstandingBalance, dueDate } = job.data;
      recipientPhone = gp;
      success = await sendFeeReminder({
        guardianPhone: gp,
        studentName: sn,
        outstandingBalance,
        dueDate,
      });
      messageBody = `Fee reminder for ${sn} — KES ${outstandingBalance}`;
      break;
    }

    case 'custom': {
      const { phone, message } = job.data;
      recipientPhone = phone;
      messageBody = message;
      success = await sendSms(phone, message);
      break;
    }

    default:
      console.warn(`[SMSWorker] Unknown SMS type: ${type}`);
      return { status: 'skipped', type };
  }

  // Log the SMS attempt (best-effort — don't let log failure break the worker)
  try {
    if (job.data.schoolId && recipientPhone) {
      await SmsLog.create({
        school: job.data.schoolId,
        student: job.data.studentId || null,
        recipientPhone,
        recipientName: job.data.recipientName || null,
        message: messageBody || '',
        type: type === 'payment_receipt' ? 'PAYMENT_RECEIPT' :
              type === 'fee_reminder' ? 'FEE_REMINDER' : 'CUSTOM',
        status: success ? 'SENT' : 'FAILED',
        sentAt: success ? new Date() : null,
        errorMessage: success ? null : 'SMS delivery returned false',
      });
    }
  } catch (err) {
    console.error(`[SMSWorker] SmsLog write failed: ${err.message}`);
  }

  return { status: success ? 'sent' : 'failed', type, recipientPhone };
};

const startSmsWorker = () => {
  const worker = new Worker('sms.send', processSms, {
    connection: getRedisConnection(),
    concurrency: 3, // limit SMS API concurrency
  });

  worker.on('completed', (job, result) => {
    console.log(`[SMSWorker] Job ${job.id} done: ${result.status} (${result.type})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SMSWorker] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[SMSWorker] Started — listening for sms.send jobs');
  return worker;
};

module.exports = { startSmsWorker };
