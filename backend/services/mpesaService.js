const axios = require('axios');

// ============================================
// CONFIGURATION
// ============================================

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

const getBaseUrl = () => {
  return process.env.MPESA_ENV === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
};

const getConfig = () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || consumerKey === 'your_consumer_key') {
    return null;
  }

  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl };
};

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Generate or return cached OAuth access token from Daraja API.
 * Tokens are valid for ~3600 seconds; we refresh 60s early.
 */
const getAccessToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const config = getConfig();
  if (!config) throw new Error('M-PESA credentials not configured');

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

  const response = await axios.get(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000,
    }
  );

  cachedToken = response.data.access_token;
  // Expire 60 seconds early to avoid mid-request token expiry
  const expiresIn = response.data.expires_in || 3600;
  tokenExpiry = now + (expiresIn - 60) * 1000;

  console.log('✅ [MPESA] OAuth token acquired');
  return cachedToken;
};

/**
 * Build authorization header for Daraja API calls.
 */
const authHeader = async () => {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
};

// ============================================
// HELPERS
// ============================================

/**
 * Generate M-PESA API password: Base64(Shortcode + Passkey + Timestamp)
 */
const generatePassword = (shortcode, passkey, timestamp) => {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
};

/**
 * Generate timestamp in YYYYMMDDHHmmss format (Nairobi timezone).
 */
const generateTimestamp = () => {
  const now = new Date();
  // Use UTC+3 for Nairobi
  const offset = now.getTime() + (3 * 60 * 60 * 1000);
  const nairobi = new Date(offset);

  const pad = (n) => String(n).padStart(2, '0');
  return (
    nairobi.getUTCFullYear().toString() +
    pad(nairobi.getUTCMonth() + 1) +
    pad(nairobi.getUTCDate()) +
    pad(nairobi.getUTCHours()) +
    pad(nairobi.getUTCMinutes()) +
    pad(nairobi.getUTCSeconds())
  );
};

/**
 * Normalise phone to 254XXXXXXXXX format for Daraja API.
 */
const normalisePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  return digits;
};

// ============================================
// STK PUSH (Lipa Na M-PESA Online)
// ============================================

/**
 * Initiate an STK Push — sends a payment prompt to the customer's phone.
 *
 * @param {object} params
 * @param {string} params.phoneNumber - Customer phone (07XX, 01XX, or 254XX)
 * @param {number} params.amount      - Amount in KES (integer, minimum 1)
 * @param {string} params.accountRef  - Account reference (e.g. admission number)
 * @param {string} params.description - Transaction description
 * @param {string} [params.callbackUrl] - Override default callback URL
 * @returns {Promise<object>} Daraja response with MerchantRequestID & CheckoutRequestID
 */
const stkPush = async ({ phoneNumber, amount, accountRef, description, callbackUrl }) => {
  const config = getConfig();
  if (!config) throw new Error('M-PESA credentials not configured');

  const timestamp = generateTimestamp();
  const password = generatePassword(config.shortcode, config.passkey, timestamp);
  const phone = normalisePhone(phoneNumber);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: config.shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl || config.callbackUrl,
    AccountReference: accountRef,
    TransactionDesc: description || `Payment for ${accountRef}`,
  };

  console.log(`📱 [MPESA] STK Push to ${phone} for KES ${amount} (ref: ${accountRef})`);

  const headers = await authHeader();
  const response = await axios.post(
    `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers, timeout: 30000 }
  );

  const data = response.data;
  if (data.ResponseCode === '0') {
    console.log(`✅ [MPESA] STK Push accepted — CheckoutRequestID: ${data.CheckoutRequestID}`);
  } else {
    console.warn(`⚠️  [MPESA] STK Push rejected:`, data.ResponseDescription);
  }

  return data;
};

/**
 * Query the status of an STK Push transaction.
 *
 * @param {string} checkoutRequestId - The CheckoutRequestID from stkPush response
 * @returns {Promise<object>} Status result with ResultCode and ResultDesc
 */
const stkQuery = async (checkoutRequestId) => {
  const config = getConfig();
  if (!config) throw new Error('M-PESA credentials not configured');

  const timestamp = generateTimestamp();
  const password = generatePassword(config.shortcode, config.passkey, timestamp);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const headers = await authHeader();
  const response = await axios.post(
    `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
    payload,
    { headers, timeout: 15000 }
  );

  return response.data;
};

// ============================================
// C2B REGISTER URL
// ============================================

/**
 * Register validation & confirmation URLs with Safaricom.
 * This must be called once to tell Safaricom where to send C2B callbacks.
 *
 * @param {object} params
 * @param {string} params.validationUrl   - Full HTTPS URL for validation
 * @param {string} params.confirmationUrl - Full HTTPS URL for confirmation
 * @param {string} [params.responseType]  - "Completed" or "Cancelled" (default: Completed)
 * @returns {Promise<object>} Daraja response
 */
const registerC2bUrls = async ({ validationUrl, confirmationUrl, responseType = 'Completed' }) => {
  const config = getConfig();
  if (!config) throw new Error('M-PESA credentials not configured');

  const payload = {
    ShortCode: config.shortcode,
    ResponseType: responseType,
    ConfirmationURL: confirmationUrl,
    ValidationURL: validationUrl,
  };

  console.log(`🔗 [MPESA] Registering C2B URLs:`, { validationUrl, confirmationUrl });

  const headers = await authHeader();
  const response = await axios.post(
    `${getBaseUrl()}/mpesa/c2b/v1/registerurl`,
    payload,
    { headers, timeout: 15000 }
  );

  const data = response.data;
  if (data.ResponseCode === '0' || data.ResponseDescription?.includes('success')) {
    console.log(`✅ [MPESA] C2B URLs registered successfully`);
  } else {
    console.warn(`⚠️  [MPESA] C2B URL registration response:`, data);
  }

  return data;
};

// ============================================
// TRANSACTION STATUS QUERY
// ============================================

/**
 * Query the status of a completed transaction.
 *
 * @param {object} params
 * @param {string} params.transactionId   - The M-PESA transaction ID (e.g. "QJE81HK5P2")
 * @param {string} params.resultUrl       - Callback URL for async result
 * @param {string} params.timeoutUrl      - Callback URL for timeout
 * @returns {Promise<object>} Daraja acknowledgement
 */
const transactionStatus = async ({ transactionId, resultUrl, timeoutUrl }) => {
  const config = getConfig();
  if (!config) throw new Error('M-PESA credentials not configured');

  const payload = {
    Initiator: process.env.MPESA_INITIATOR_NAME || 'apitest',
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
    CommandID: 'TransactionStatusQuery',
    TransactionID: transactionId,
    PartyA: config.shortcode,
    IdentifierType: '4', // Shortcode
    ResultURL: resultUrl,
    QueueTimeOutURL: timeoutUrl,
    Remarks: 'Transaction status query',
    Occasion: '',
  };

  const headers = await authHeader();
  const response = await axios.post(
    `${getBaseUrl()}/mpesa/transactionstatus/v1/query`,
    payload,
    { headers, timeout: 15000 }
  );

  return response.data;
};

// ============================================
// STK PUSH CALLBACK PARSER
// ============================================

/**
 * Parse an STK Push callback body into a flat object.
 * Safaricom sends: Body.stkCallback.{ MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata }
 *
 * @param {object} body - Raw request body from Safaricom
 * @returns {object} Parsed callback data
 */
const parseStkCallback = (body) => {
  const cb = body?.Body?.stkCallback;
  if (!cb) return null;

  const result = {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    success: cb.ResultCode === 0,
  };

  // Extract metadata items into flat keys
  if (cb.CallbackMetadata?.Item) {
    for (const item of cb.CallbackMetadata.Item) {
      switch (item.Name) {
        case 'Amount':
          result.amount = item.Value;
          break;
        case 'MpesaReceiptNumber':
          result.mpesaReceiptNumber = item.Value;
          break;
        case 'TransactionDate':
          result.transactionDate = item.Value;
          break;
        case 'PhoneNumber':
          result.phoneNumber = String(item.Value);
          break;
      }
    }
  }

  return result;
};

module.exports = {
  getAccessToken,
  stkPush,
  stkQuery,
  registerC2bUrls,
  transactionStatus,
  parseStkCallback,
  normalisePhone,
  generateTimestamp,
};
