const axios = require('axios');
const crypto = require('crypto');

/**
 * Bank Service — integrations with Kenyan banks for credit-notification
 * (IPN) and reconciliation flows.
 *
 *   • KCB   — BUNI API Gateway   (sandbox.buni.kcbgroup.com)
 *   • EQUITY — Jenga / Finserve   (uat.finserve.africa)
 *   • COOP  — placeholder, manual onboarding or aggregator (Tuma/IntaSend)
 *
 * Each provider exposes the same small interface used by the webhook handler:
 *   getAccessToken(school)
 *   processWebhook(payload, school)        → normalised payment object
 *   validateWebhook(payload, signature, school) → boolean
 *   fetchTransactions(school, from, to)    → array of raw bank txns
 *   registerWebhook(school, callbackUrl)   → provider ack
 *
 * Normalised payment shape:
 *   { transactionId, amount, reference, paidBy, phoneNumber, timestamp,
 *     source: 'BANK_TRANSFER', provider, rawPayload }
 */

class BankService {
  getBankProvider(provider) {
    switch (provider) {
      case 'EQUITY':
        return new EquityBankService();
      case 'KCB':
        return new KCBBankService();
      case 'COOP':
        return new CoopBankService();
      default:
        throw new Error(`Unsupported bank provider: ${provider}`);
    }
  }

  processWebhook(provider, payload, school) {
    return this.getBankProvider(provider).processWebhook(payload, school);
  }

  validateWebhook(provider, payload, signature, school) {
    return this.getBankProvider(provider).validateWebhook(payload, signature, school);
  }

  async fetchTransactions(provider, school, fromDate, toDate) {
    return this.getBankProvider(provider).fetchTransactions(school, fromDate, toDate);
  }

  async registerWebhook(provider, school, callbackUrl) {
    return this.getBankProvider(provider).registerWebhook(school, callbackUrl);
  }
}

// ============================================================
// Shared per-tenant token cache (keyed by credential, not process)
// ============================================================
const bankTokenCache = new Map();

const getCachedToken = (key) => {
  const entry = bankTokenCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.token;
  return null;
};

const setCachedToken = (key, token, expiresInSec) => {
  bankTokenCache.set(key, {
    token,
    expiry: Date.now() + (expiresInSec - 60) * 1000, // 60s safety window
  });
};

/**
 * ===============================================================
 * EQUITY BANK — Jenga API (Finserve Africa)
 * ===============================================================
 * Docs:        https://developer.jengahq.io/
 * Sandbox:     https://uat.finserve.africa
 * Production:  https://api.finserve.africa
 *
 * Auth (Jenga v3): POST /authentication/api/v3/authenticate/merchant
 *       headers: { 'Api-Key': <portal api key>, 'Content-Type': 'application/json' }
 *       body:    { merchantCode, consumerSecret }
 *       → { accessToken, refreshToken, expiresIn (ISO ts), tokenType: 'Bearer' }
 *       (The old "identity v2 token" path is retired — it 404s on finserve.africa.)
 *
 * Outgoing-request signing (required for send-money, not for IPN receipt):
 *   RSA-SHA256 over concatenation of:
 *     source.accountNumber + transfer.amount + transfer.currencyCode + transfer.reference
 *   signed with the merchant's RSA private key, Base64 encoded, sent as
 *   the `signature` header.
 *
 * IPN (receiving credit notifications): per JengaHQ docs, Jenga POSTs JSON
 * to our registered callback URL with HTTP Basic Auth (username/password
 * configured per-IPN in the JengaHQ portal). The body shape is:
 *   { callbackType: "IPN",
 *     customer:    { name, mobileNumber, reference },
 *     transaction: { date, reference, paymentMode, amount, currency,
 *                    billNumber, status: "SUCCESS"|"FAILED", ... },
 *     bank:        { reference, transactionType, account } }
 * `transaction.billNumber` is the school account identifier we resolve
 * against. NOTE: Jenga IPN does NOT send an RSA signature header — auth
 * is Basic Auth only. (Don't conflate with KCB BUNI's signed model.)
 */
class EquityBankService {
  constructor() {
    this.baseUrl = process.env.EQUITY_API_URL || 'https://uat.finserve.africa';
    // Jenga v3 merchant-auth path is identical for UAT and live; only the host
    // differs (uat.finserve.africa vs api.finserve.africa).
    this.tokenPath = process.env.EQUITY_TOKEN_PATH
      || '/authentication/api/v3/authenticate/merchant';
  }

  _creds(school) {
    const c = school?.bankIntegration?.credentials || {};
    return {
      // Jenga v3 merchant auth. Prefer the v3 names; fall back to the legacy
      // username/password names so older configs/.env still resolve.
      merchantCode: c.merchantCode || process.env.JENGA_MERCHANT_CODE
        || c.username || process.env.JENGA_USERNAME,
      consumerSecret: c.consumerSecret || process.env.JENGA_CONSUMER_SECRET
        || c.password || process.env.JENGA_PASSWORD,
      apiKey: c.apiKey || process.env.JENGA_API_KEY,
      privateKey: c.privateKey || process.env.JENGA_PRIVATE_KEY,
      publicKey: c.publicKey || process.env.JENGA_PUBLIC_KEY,
      accountNumber: c.accountNumber,
      // IPN Basic Auth (configured per-IPN in JengaHQ portal)
      webhookUsername: c.webhookUsername || process.env.JENGA_WEBHOOK_USERNAME,
      webhookPassword: c.webhookPassword || process.env.JENGA_WEBHOOK_PASSWORD,
    };
  }

  async getAccessToken(school) {
    const creds = this._creds(school);
    if (!creds.merchantCode || !creds.consumerSecret) {
      throw new Error('Equity Jenga credentials (merchantCode/consumerSecret) not configured');
    }
    if (!creds.apiKey) {
      throw new Error('Equity Jenga Api-Key not configured (required header for v3 merchant auth)');
    }

    const cacheKey = `EQUITY:${creds.merchantCode}`;
    const cached = getCachedToken(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.post(
        `${this.baseUrl}${this.tokenPath}`,
        {
          merchantCode: creds.merchantCode,
          consumerSecret: creds.consumerSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': creds.apiKey,
          },
          timeout: 15000,
        }
      );

      const token = response.data.accessToken || response.data.access_token;
      // v3 returns `expiresIn` as an absolute ISO timestamp (e.g.
      // "2026-06-05T07:03:02Z"); convert to seconds-from-now for the cache.
      // Tolerate a numeric seconds form too, just in case.
      let ttlSec = 3600;
      const exp = response.data.expiresIn ?? response.data.expires_in;
      if (exp != null) {
        const ms = new Date(exp).getTime() - Date.now();
        if (Number.isFinite(ms) && ms > 60000) ttlSec = Math.floor(ms / 1000);
        else if (Number.isFinite(Number(exp)) && Number(exp) > 0) ttlSec = Number(exp);
      }
      setCachedToken(cacheKey, token, ttlSec);
      console.log('✅ [EQUITY] Jenga token acquired');
      return token;
    } catch (error) {
      console.error('❌ [EQUITY] Token error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Equity Jenga');
    }
  }

  /**
   * Jenga outgoing-transaction signature.
   * Concatenate in this exact order — no spaces, no separators:
   *   source.accountNumber + transfer.amount + transfer.currencyCode + transfer.reference
   */
  buildSignature({ accountNumber, amount, currency, reference }, privateKey) {
    const payload = `${accountNumber}${amount}${currency}${reference}`;
    return crypto.createSign('SHA256').update(payload).sign(privateKey, 'base64');
  }

  processWebhook(payload, school) {
    console.log('[EQUITY] IPN payload:', payload);
    const customer = payload?.customer || {};
    const transaction = payload?.transaction || {};
    const bank = payload?.bank || {};

    return {
      transactionId: transaction.reference || bank.reference,
      amount: parseFloat(transaction.amount),
      currency: transaction.currency || 'KES',
      // ★ The admission number the PAYER entered lives in customer.reference.
      //   transaction.billNumber is the SCHOOL's account identifier (used for
      //   tenant routing in bankWebhookHandler) — never the student reference.
      reference: customer.reference,
      schoolAccount: transaction.billNumber || bank.account,
      paidBy: customer.name,
      phoneNumber: customer.mobileNumber,
      timestamp: new Date(transaction.date || Date.now()),
      source: 'BANK_TRANSFER',
      provider: 'EQUITY',
      status: transaction.status,
      paymentMode: transaction.paymentMode,
      remarks: transaction.remarks,
      rawPayload: payload,
    };
  }

  /**
   * Jenga IPN authenticates via HTTP Basic Auth (username/password set
   * per-IPN in the JengaHQ portal). The caller passes the raw value of
   * the `Authorization` header. We compare against the school's stored
   * webhookUsername / webhookPassword using a constant-time check.
   */
  validateWebhook(payload, authHeader, school) {
    const creds = this._creds(school);
    if (!creds.webhookUsername || !creds.webhookPassword) {
      console.warn('[EQUITY] No webhookUsername/webhookPassword configured — cannot validate IPN Basic Auth');
      return false;
    }
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('basic ')) {
      return false;
    }
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      if (idx === -1) return false;
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      const expectedUser = Buffer.from(creds.webhookUsername);
      const expectedPass = Buffer.from(creds.webhookPassword);
      const gotUser = Buffer.from(user);
      const gotPass = Buffer.from(pass);
      if (gotUser.length !== expectedUser.length || gotPass.length !== expectedPass.length) return false;
      return crypto.timingSafeEqual(gotUser, expectedUser)
          && crypto.timingSafeEqual(gotPass, expectedPass);
    } catch (err) {
      console.error('[EQUITY] Basic Auth decode failed:', err.message);
      return false;
    }
  }

  async fetchTransactions(school, fromDate, toDate) {
    try {
      const token = await this.getAccessToken(school);
      const creds = this._creds(school);

      const response = await axios.post(
        `${this.baseUrl}/account-sandbox/v2/accounts/transactions/query`,
        {
          accountNumber: creds.accountNumber,
          fromDate: fromDate.toISOString().split('T')[0],
          toDate: toDate.toISOString().split('T')[0],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      return response.data?.transactions || response.data?.data || [];
    } catch (error) {
      console.error('❌ [EQUITY] Fetch error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Equity Jenga transactions');
    }
  }

  /**
   * Jenga IPN subscription is configured in the developer portal — there is
   * no fully-programmatic subscribe endpoint for all merchants. We attempt
   * the documented webhooks endpoint and fall back to a manual-config hint.
   */
  async registerWebhook(school, callbackUrl) {
    try {
      const token = await this.getAccessToken(school);
      const creds = this._creds(school);

      const response = await axios.post(
        `${this.baseUrl}/account-sandbox/v2/webhooks/subscribe`,
        {
          accountNumber: creds.accountNumber,
          callbackUrl,
          eventType: 'CREDIT',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return response.data;
    } catch (error) {
      const msg = error.response?.data || error.message;
      console.warn('⚠️  [EQUITY] Programmatic webhook subscribe failed — configure manually in Jenga portal:', msg);
      return {
        manual: true,
        message: 'Configure this callback URL in the Jenga developer portal under your app\'s IPN settings.',
        callbackUrl,
      };
    }
  }
}

/**
 * ===============================================================
 * KCB — BUNI API Gateway
 * ===============================================================
 * Docs:        https://sandbox.buni.kcbgroup.com
 * Sandbox:     https://uat.buni.kcbgroup.com
 * Production:  https://buni.kcbgroup.com
 *
 * Auth: POST /token with Basic auth (consumerKey:consumerSecret),
 *       body `grant_type=client_credentials`, form-urlencoded.
 *
 * IPN payload (real-time credit notification) — Account Notification:
 *   {
 *     transactionReference,      // KCB's transaction ID
 *     requestId,                 // KCB's request correlation ID
 *     channelCode,
 *     timestamp,                 // YYYYMMDDHHmm
 *     transactionAmount,         // string
 *     currency,                  // 'KES'
 *     customerReference,         // ★ parent's reference = admission number
 *     customerName,
 *     customerMobileNumber,      // 254...
 *     balance,
 *     narration,
 *     creditAccountIdentifier,   // ★ school's KCB account (routing key)
 *     organizationShortCode,
 *     tillNumber
 *   }
 *
 * IPN ack — KCB expects exactly:
 *   { transactionID, statusCode: '0', statusMessage: 'Notification received successfully' }
 *
 * Signature: header name is `Signature`, value is a SHA256withRSA signature
 * of the raw JSON request body, signed with KCB's private key. We verify it
 * using KCB's public key (fetched once from the BUNI portal and stored as
 * `kcbPublicKey` in the school's credentials or `KCB_PUBLIC_KEY` in env).
 */
class KCBBankService {
  constructor() {
    this.baseUrl = process.env.KCB_API_URL || 'https://uat.buni.kcbgroup.com';
    // BUNI prod hosts the OAuth issuer on a separate hostname
    // (accounts.buni.kcbgroup.com) from the API gateway. Allow full override.
    this.tokenUrl = process.env.KCB_TOKEN_URL || `${this.baseUrl}/token`;
  }

  _creds(school) {
    const c = school?.bankIntegration?.credentials || {};
    return {
      consumerKey: c.consumerKey || process.env.KCB_CONSUMER_KEY,
      consumerSecret: c.consumerSecret || process.env.KCB_CONSUMER_SECRET,
      // KCB's PEM public key used to verify IPN signatures
      kcbPublicKey: c.kcbPublicKey || process.env.KCB_PUBLIC_KEY,
      accountNumber: c.accountNumber,
      // BUNI gateway "organizationShortCode" — the paybill-like value KCB
      // echoes back on both Validation and IPN payloads.
      organizationCode: c.organizationCode,
    };
  }

  async getAccessToken(school) {
    const creds = this._creds(school);
    if (!creds.consumerKey || !creds.consumerSecret) {
      throw new Error('KCB BUNI credentials (consumerKey/consumerSecret) not configured');
    }

    const cacheKey = `KCB:${creds.consumerKey}`;
    const cached = getCachedToken(cacheKey);
    if (cached) return cached;

    try {
      const basic = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64');
      const response = await axios.post(
        this.tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        }
      );

      const token = response.data.access_token;
      const expiresIn = Number(response.data.expires_in) || 3600;
      setCachedToken(cacheKey, token, expiresIn);
      console.log('✅ [KCB] BUNI token acquired');
      return token;
    } catch (error) {
      console.error('❌ [KCB] Token error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with KCB BUNI');
    }
  }

  processWebhook(payload, school) {
    console.log('[KCB] IPN payload:', payload);
    const {
      transactionReference,
      transactionAmount,
      currency,
      customerReference,
      customerName,
      customerMobileNumber,
      narration,
      timestamp,
      creditAccountIdentifier,
    } = payload;

    return {
      transactionId: transactionReference,
      amount: parseFloat(transactionAmount),
      currency: currency || 'KES',
      // ★ The parent's reference (admission number) — this is what we match
      //   against Student.admissionNumber. `creditAccountIdentifier` is the
      //   school's KCB account and is used upstream for tenant routing.
      reference: customerReference,
      schoolAccount: creditAccountIdentifier,
      paidBy: customerName || 'KCB Transfer',
      phoneNumber: customerMobileNumber || null,
      narration: narration || null,
      timestamp: this._parseKcbTimestamp(timestamp),
      source: 'BANK_TRANSFER',
      provider: 'KCB',
      rawPayload: payload,
    };
  }

  // KCB timestamp format is `YYYYMMDDHHmm` (sometimes with seconds).
  _parseKcbTimestamp(ts) {
    if (!ts) return new Date();
    const s = String(ts);
    if (s.length < 12) return new Date();
    const yr = s.slice(0, 4);
    const mo = s.slice(4, 6);
    const da = s.slice(6, 8);
    const hr = s.slice(8, 10);
    const mi = s.slice(10, 12);
    const se = s.slice(12, 14) || '00';
    // KCB timestamps are Nairobi local time (UTC+3)
    return new Date(`${yr}-${mo}-${da}T${hr}:${mi}:${se}+03:00`);
  }

  /**
   * Verify the `Signature` header: SHA256withRSA over the raw JSON body,
   * signed with KCB's private key, decoded from Base64. We verify with
   * KCB's published public key.
   *
   * NOTE: Express lowercases header names — handler passes us
   * `req.headers['signature']`.
   */
  validateWebhook(payload, signature, school) {
    const creds = this._creds(school);
    if (!creds.kcbPublicKey) {
      console.warn('[KCB] No public key configured — cannot verify IPN signature');
      return false;
    }
    if (!signature) return false;

    try {
      const verifier = crypto.createVerify('RSA-SHA256');
      // KCB signs the raw JSON body as-is. We re-serialise with no
      // whitespace — if verification fails in practice we'll need to
      // switch to using the raw request string (see handler note).
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      verifier.update(body);
      verifier.end();
      return verifier.verify(creds.kcbPublicKey, signature, 'base64');
    } catch (err) {
      console.error('[KCB] Signature verify failed:', err.message);
      return false;
    }
  }

  /**
   * IPN (Bill-Notification) ack — KCB spec requires exactly these three
   * fields. The sample response in the spec uses "Notification received"
   * for success; we mirror that wording so BUNI log-grepping matches.
   */
  ackResponse(payload, { success = true, message } = {}) {
    return {
      transactionID: payload?.requestId || payload?.transactionReference || '',
      statusCode: success ? '0' : '1',
      statusMessage: message || (success ? 'Notification received' : 'Rejected'),
    };
  }

  /**
   * Bill-Validation response — KCB POSTs
   *   { requestId, customerReference, organizationReference }
   * and expects this shape back (all fields mandatory per spec):
   *   { transactionID, statusCode, statusMessage, CustomerName,
   *     billAmount, currency, billType, creditAccountIdentifier }
   *
   * billType:
   *   FIXED   — parent must pay exactly billAmount (we currently do not
   *             pin the amount; schools collect whatever a parent chooses)
   *   PARTIAL — parent may pay any amount up to/over billAmount
   */
  billValidationResponse(payload, { success = true, message, student, school } = {}) {
    const base = {
      transactionID: payload?.requestId || '',
      statusCode: success ? '0' : '1',
      statusMessage: message || (success ? 'Success' : 'Rejected'),
      CustomerName: '',
      billAmount: '0.00',
      currency: 'KES',
      billType: 'PARTIAL',
      creditAccountIdentifier: '',
    };

    if (!success) return base;

    const outstanding = Math.max(0, Number(student?.currentBalance || 0));
    return {
      ...base,
      CustomerName: student?.name || 'School Fee Payer',
      billAmount: outstanding.toFixed(2),
      billType: 'PARTIAL',
      creditAccountIdentifier:
        school?.bankIntegration?.credentials?.accountNumber || payload?.organizationReference || '',
    };
  }

  async fetchTransactions(school, fromDate, toDate) {
    try {
      const token = await this.getAccessToken(school);
      const creds = this._creds(school);

      const response = await axios.get(
        `${this.baseUrl}/accounts/${creds.accountNumber}/transactions`,
        {
          params: {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      return response.data?.transactions || response.data?.data || [];
    } catch (error) {
      console.error('❌ [KCB] Fetch error:', error.response?.data || error.message);
      throw new Error('Failed to fetch KCB BUNI transactions');
    }
  }

  /**
   * BUNI IPN endpoints are typically configured in the developer portal
   * per-app rather than subscribed programmatically. We still expose this
   * method so the UI has a single "register webhook" button — it returns
   * a manual-config hint instead of failing.
   */
  async registerWebhook(school, callbackUrl) {
    console.log(`[KCB] IPN callback URL (configure in BUNI portal): ${callbackUrl}`);
    return {
      manual: true,
      message: 'Register this callback URL in the BUNI developer portal under your app\'s IPN settings.',
      callbackUrl,
    };
  }
}

/**
 * ===============================================================
 * CO-OPERATIVE BANK — placeholder
 * ===============================================================
 * Co-op's direct API requires a 2–4 week manual approval process (Excel
 * test-case workbook → email review). For pilot we either accept that
 * lead time or route through an aggregator (Tuma / IntaSend) and treat
 * their webhook as a "COOP" source. The methods below are kept as stubs
 * so `BankService.getBankProvider('COOP')` doesn't throw, but they will
 * refuse real traffic until implemented against a chosen path.
 */
class CoopBankService {
  async getAccessToken() {
    throw new Error('Co-op Bank integration not yet implemented — use aggregator path (Tuma/IntaSend) or complete COOP Connect onboarding first');
  }

  processWebhook(payload) {
    return {
      transactionId: payload.MessageReference || payload.TransactionID,
      amount: parseFloat(payload.Amount || payload.TransAmount || 0),
      reference: payload.AccountNumber || payload.BillRefNumber,
      paidBy: payload.SenderName,
      phoneNumber: payload.PhoneNumber || payload.MSISDN,
      timestamp: new Date(payload.TransactionDate || payload.TransTime || Date.now()),
      source: 'BANK_TRANSFER',
      provider: 'COOP',
      rawPayload: payload,
    };
  }

  validateWebhook() {
    return false;
  }

  async fetchTransactions() {
    throw new Error('Co-op reconciliation not implemented');
  }

  async registerWebhook(school, callbackUrl) {
    return {
      manual: true,
      message: 'Co-op integration pending — either complete COOP Connect onboarding or route via Tuma/IntaSend aggregator.',
      callbackUrl,
    };
  }
}

module.exports = new BankService();
