const axios = require('axios');
const { getSmsCredentials } = require('./platformConfig');
const { formatNairobiShortDate } = require('../utils/time');

const TEXTSMS_BASE_URL = 'https://sms.textsms.co.ke/api/services';

/**
 * Replace typographic characters that fall outside GSM-7 with plain ASCII.
 *
 * A single em dash (used liberally in this codebase's log strings, and easy to
 * paste into copy) forces the whole message to UCS-2, which cuts the segment
 * size from 160 characters to 70 and roughly triples the bill. Only known
 * offenders are mapped — anything else is left alone so accented names are not
 * mangled.
 */
const GSM7_SUBSTITUTIONS = [
  [/[‒-―−]/g, '-'],   // figure/en/em dash, horizontal bar, minus
  [/[‘’‚‛]/g, "'"], // curly single quotes
  [/[“”„‟]/g, '"'], // curly double quotes
  [/…/g, '...'],                 // ellipsis
  [/ /g, ' '],                   // non-breaking space
  [/[•·]/g, '-'],           // bullets
];

const toGsm7 = (text) =>
  GSM7_SUBSTITUTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), String(text));

/** "KES 12,500" — locale pinned so thousands separators can't drift by host. */
const money = (amount) => `KES ${Number(amount || 0).toLocaleString('en-US')}`;

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
      message: toGsm7(message),
      shortcode: creds.shortcode,
      mobile: phone,
      pass_type: 'plain',
    }, { timeout: 15000 });

    const result = response.data?.responses?.[0];
    if (result?.['response-code'] === 200) {
      console.log(`✅ [SMS] Sent to ${phone} — messageId: ${result.messageid}`);
      return true;
    } else {
      console.warn(`⚠️  [SMS] Delivery issue for ${phone}:`, result?.['response-description'], `code: ${result?.['response-code']}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [SMS] Failed to send to ${phone}:`, error.message);
    return false;
  }
};

/**
 * Join labels into readable prose: "Term 1", "Term 1 and Term 2",
 * "Term 1, Term 2 and Term 3".
 */
const joinList = (items) => {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

/**
 * Describe old debt in words a guardian can act on.
 *
 * Guardians are not bookkeepers: "Arrears b/f: KES 8,200" tells them neither
 * what b/f means nor which term the money is for, so they cannot tell whether
 * it is a mistake or something they already paid. Naming the source term is the
 * whole point — a parent settling Term 2 needs to see that KES 8,200 of it is
 * really last term's bill.
 *
 * Past three source terms the list is longer than it is useful, so it collapses
 * to "earlier terms" and the statement carries the detail.
 */
const describeArrears = (sources, total) => {
  // Two or fewer sources: name what is owed against each term, so a guardian
  // clearing only the oldest debt knows exactly what that costs. Beyond that
  // the sentence stops being readable, so it collapses to a total and the
  // statement carries the per-term detail.
  if (sources?.length && sources.length <= 2) {
    return joinList(sources.map((s) => `${money(s.amount)} from ${s.label}`));
  }
  return `${money(total)} from earlier terms`;
};

/**
 * Build the body of a payment receipt SMS.
 *
 * Plain paragraph prose rather than a labelled block: guardians read these on
 * feature phones, and a receipt that needs decoding does not get acted on. The
 * school's own name opens the message because each school sends under its own
 * sender ID, so a generic product name would read as a stranger's SMS.
 *
 *   Riverside Academy: KES 5,000 received for John Kamau, ref SJ45KL9821.
 *   Term 2 balance is KES 12,500, due 05 Sep. You also have KES 8,200 unpaid
 *   from Term 1. Total to clear: KES 20,700.
 *
 * `breakdown` comes from balanceService.getTermBreakdown and may be null when
 * the school has no ACTIVE term — the copy then falls back to the undifferentiated
 * `newBalance` total rather than naming a term it cannot identify.
 *
 * Exported for tests and for the SMS campaign preview.
 */
const buildPaymentReceiptBody = ({
  studentName,
  amount,
  reference,
  newBalance = 0,
  breakdown = null,
  credit = 0,
}) => {
  const opener = breakdown?.schoolName ? `${breakdown.schoolName}: ` : '';
  const parts = [`${opener}${money(amount)} received for ${studentName}, ref ${reference}.`];

  // `currentBalance` is stored as -(outstanding), so it is never positive.
  // Overpayment is not a positive balance — it lives on the transaction as an
  // unallocated remainder, which the caller passes in as `credit`.
  const termDue = breakdown ? breakdown.termDue : 0;
  const arrears = breakdown ? breakdown.arrears : 0;
  const outstanding = breakdown ? termDue + arrears : Math.abs(Number(newBalance) || 0);
  const termName = breakdown?.termLabel || 'Fees';

  if (outstanding <= 0) {
    parts.push(breakdown ? `${termName} fees are now fully paid.` : 'Fees are now fully paid.');
    if (Number(credit) > 0) parts.push(`${money(credit)} is held as credit.`);
    parts.push('Thank you.');
    return parts.join(' ');
  }

  if (!breakdown) {
    parts.push(`Balance remaining: ${money(outstanding)}. Thank you.`);
    return parts.join(' ');
  }

  // Timing attaches to the figure it belongs to. A guardian can owe overdue
  // arrears while this term's fees are not yet due, so one blanket "overdue"
  // would demand money that is not yet owed.
  if (termDue > 0) {
    let timing = '';
    if (breakdown.termOverdue) timing = ', now overdue';
    else if (breakdown.dueDate) timing = `, due ${formatNairobiShortDate(breakdown.dueDate)}`;
    parts.push(`${termName} balance is ${money(termDue)}${timing}.`);
  } else {
    parts.push(`${termName} fees are fully paid.`);
  }

  if (arrears > 0) {
    parts.push(`You also have ${describeArrears(breakdown.arrearsSources, arrears)} still unpaid.`);
    // The total only earns its place when it is not just one of the figures above.
    if (termDue > 0) parts.push(`Total to clear: ${money(termDue + arrears)}.`);
  }

  parts.push('Thank you.');
  return parts.join(' ');
};

/**
 * Send a payment receipt SMS to a guardian.
 *
 * Prefers guardianPhone from the student record over the (possibly masked)
 * transaction phone number.
 */
const sendPaymentReceipt = async ({
  guardianPhone,
  transactionPhone,
  studentName,
  amount,
  newBalance,
  reference,
  breakdown = null,
  credit = 0,
}) => {
  const phone = guardianPhone || transactionPhone;
  if (!phone) return false;

  return sendSms(phone, buildPaymentReceiptBody({
    studentName,
    amount,
    reference,
    newBalance,
    breakdown,
    credit,
  }));
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
  buildPaymentReceiptBody,
  sendFeeReminder,
  sendBulkReminders,
  checkBalance,
  normalisePhone,
  toGsm7,
};
