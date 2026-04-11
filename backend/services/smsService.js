const AfricasTalking = require('africastalking');

let smsClient = null;

/**
 * Lazily initialise Africa's Talking once env vars are available.
 * Returns null if credentials are missing (e.g. in test environments).
 */
const getSmsClient = () => {
  if (smsClient) return smsClient;

  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;

  if (!apiKey || !username || apiKey === 'your_api_key') {
    console.warn('⚠️  [SMS] Africa\'s Talking credentials not configured — SMS sending disabled.');
    return null;
  }

  const AT = AfricasTalking({ apiKey, username });
  smsClient = AT.SMS;
  return smsClient;
};

/**
 * Normalise a phone number to E.164 format (+254XXXXXXXXX).
 * Returns null if the number cannot be parsed (e.g. masked M-PESA numbers).
 */
const normalisePhone = (phone) => {
  if (!phone) return null;

  // Strip all non-digit characters
  const digits = String(phone).replace(/\D/g, '');

  // Reject masked numbers (e.g. "2547*****126" — fewer than 9 meaningful digits)
  if (digits.length < 9) return null;

  // Already in 254XXXXXXXXX format
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;

  // 07XXXXXXXX or 01XXXXXXXX — prefix with 254
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  // +254XXXXXXXXX already (leading + stripped above)
  if (digits.startsWith('254') && digits.length >= 12) return `+${digits.slice(0, 12)}`;

  return null;
};

/**
 * Send a single SMS.
 *
 * @param {string} to   - Recipient phone number (any reasonable format)
 * @param {string} message - Message body (max 160 chars for single SMS)
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
const sendSms = async (to, message) => {
  const client = getSmsClient();
  if (!client) return false;

  const phone = normalisePhone(to);
  if (!phone) {
    console.warn(`⚠️  [SMS] Cannot send — invalid/masked number: ${to}`);
    return false;
  }

  try {
    const senderId = process.env.AFRICASTALKING_SENDER_ID || 'SCHOOLPAY';
    const response = await client.send({
      to: [phone],
      message,
      from: senderId,
    });

    const recipient = response.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') {
      console.log(`✅ [SMS] Sent to ${phone} — messageId: ${recipient.messageId}, cost: ${recipient.cost}`);
      return true;
    } else {
      console.warn(`⚠️  [SMS] Delivery issue for ${phone}:`, recipient?.status, recipient?.statusCode);
      return false;
    }
  } catch (error) {
    console.error(`❌ [SMS] Failed to send to ${phone}:`, error.message);
    return false;
  }
};

/**
 * Send an M-PESA/bank payment receipt to a guardian.
 *
 * Prefers guardianPhone from the student record over the (possibly masked)
 * transaction phone number.
 */
const sendPaymentReceipt = async ({ guardianPhone, transactionPhone, studentName, amount, newBalance, reference, source = 'M-PESA' }) => {
  const phone = guardianPhone || transactionPhone;
  if (!phone) return false;

  const balanceText = newBalance <= 0
    ? `Balance: KES ${Math.abs(newBalance).toLocaleString()} outstanding`
    : `Credit balance: KES ${newBalance.toLocaleString()}`;

  const message =
    `SchoolPay: Payment of KES ${Number(amount).toLocaleString()} received for ${studentName} via ${source}. ` +
    `${balanceText}. Ref: ${reference}. Thank you.`;

  return sendSms(phone, message);
};

/**
 * Send a fee reminder SMS to a guardian.
 */
const sendFeeReminder = async ({ guardianPhone, studentName, outstandingBalance, dueDate }) => {
  if (!guardianPhone) return false;

  const dueDateText = dueDate ? ` by ${new Date(dueDate).toLocaleDateString('en-KE')}` : '';
  const message =
    `SchoolPay Reminder: ${studentName} has an outstanding fee balance of ` +
    `KES ${Number(outstandingBalance).toLocaleString()}${dueDateText}. ` +
    `Please pay via M-PESA Paybill or bank transfer. Thank you.`;

  return sendSms(guardianPhone, message);
};

/**
 * Send bulk fee reminders.
 *
 * @param {Array<{guardianPhone, studentName, outstandingBalance, dueDate}>} recipients
 * @returns {Promise<{sent: number, skipped: number}>}
 */
const sendBulkReminders = async (recipients) => {
  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    const ok = await sendFeeReminder(recipient);
    if (ok) sent++;
    else skipped++;
  }

  console.log(`📊 [SMS] Bulk reminders complete — sent: ${sent}, skipped: ${skipped}`);
  return { sent, skipped };
};

module.exports = {
  sendSms,
  sendPaymentReceipt,
  sendFeeReminder,
  sendBulkReminders,
};
