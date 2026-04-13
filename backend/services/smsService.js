const axios = require('axios');
const { getSmsCredentials } = require('./platformConfig');

const TEXTSMS_BASE_URL = 'https://sms.textsms.co.ke/api/services';

const getCredentials = async () => {
  const creds = await getSmsCredentials();
  if (!creds) console.warn('⚠️  [SMS] TextSMS credentials not configured — SMS sending disabled.');
  return creds;
};

/**
 * Normalise a phone number to 254XXXXXXXXX format (no + prefix — TextSMS expects this).
 * Returns null if the number cannot be parsed (e.g. masked M-PESA numbers).
 */
const normalisePhone = (phone) => {
  if (!phone) return null;

  const digits = String(phone).replace(/\D/g, '');

  // Reject masked numbers (e.g. "2547*****126" — fewer than 9 meaningful digits)
  if (digits.length < 9) return null;

  // Already in 254XXXXXXXXX format
  if (digits.startsWith('254') && digits.length === 12) return digits;

  // 07XXXXXXXX or 01XXXXXXXX — prefix with 254
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  // Strip leading + if present (already stripped by replace above)
  if (digits.startsWith('254') && digits.length >= 12) return digits.slice(0, 12);

  return null;
};

/**
 * Send a single SMS via TextSMS Kenya.
 *
 * @param {string} to      - Recipient phone number (any reasonable format)
 * @param {string} message - Message body
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
const sendSms = async (to, message) => {
  const creds = await getCredentials();
  if (!creds) return false;

  const phone = normalisePhone(to);
  if (!phone) {
    console.warn(`⚠️  [SMS] Cannot send — invalid/masked number: ${to}`);
    return false;
  }

  try {
    const response = await axios.post(`${TEXTSMS_BASE_URL}/sendsms/`, {
      apikey: creds.apiKey,
      partnerID: creds.partnerId,
      message,
      shortcode: creds.shortcode,
      mobile: phone,
      pass_type: 'plain',
    }, { timeout: 15000 });

    const result = response.data?.responses?.[0];
    if (result?.['respose-code'] === 200) {
      console.log(`✅ [SMS] Sent to ${phone} — messageId: ${result.messageid}`);
      return true;
    } else {
      console.warn(`⚠️  [SMS] Delivery issue for ${phone}:`, result?.['response-description'], `code: ${result?.['respose-code']}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [SMS] Failed to send to ${phone}:`, error.message);
    return false;
  }
};

/**
 * Send a payment receipt SMS to a guardian.
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

/**
 * Check TextSMS account balance.
 * @returns {Promise<object|null>} Balance info or null on failure
 */
const checkBalance = async () => {
  const creds = await getCredentials();
  if (!creds) return null;

  try {
    const response = await axios.post(`${TEXTSMS_BASE_URL}/getbalance/`, {
      apikey: creds.apiKey,
      partnerID: creds.partnerId,
    }, { timeout: 10000 });

    return response.data;
  } catch (error) {
    console.error('❌ [SMS] Balance check failed:', error.message);
    return null;
  }
};

module.exports = {
  sendSms,
  sendPaymentReceipt,
  sendFeeReminder,
  sendBulkReminders,
  checkBalance,
  normalisePhone,
};
