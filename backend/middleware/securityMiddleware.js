const rateLimit = require('express-rate-limit');

// ============================================
// RATE LIMITERS
// ============================================

/** General API rate limit — 100 requests per 15 minutes per IP */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Auth endpoints — stricter: 20 attempts per 15 minutes */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

/** Public callback endpoints (M-PESA, bank webhooks) — generous but bounded */
const callbackLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ResultCode: 1, ResultDesc: 'Rate limit exceeded' },
});

// ============================================
// SAFARICOM IP WHITELIST
// ============================================

/**
 * Known Safaricom Daraja callback IP ranges.
 * These can be extended via the SAFARICOM_IPS environment variable
 * (comma-separated list). Set MPESA_IP_WHITELIST_ENABLED=true to enforce.
 *
 * In production, get the authoritative list from Safaricom developer support
 * and set them in your environment.
 */
const DEFAULT_SAFARICOM_IPS = [
  '196.201.214.',   // Safaricom primary range
  '196.201.212.',   // Safaricom secondary range
  '196.201.213.',   // Safaricom additional range
  '41.215.176.',    // Safaricom mobile range
];

const getSafaricomAllowList = () => {
  const envIps = process.env.SAFARICOM_IPS;
  if (envIps) {
    return envIps.split(',').map(ip => ip.trim());
  }
  return DEFAULT_SAFARICOM_IPS;
};

/**
 * Whether the allowlist should be enforced for this process.
 *   - production: enforced BY DEFAULT (Safaricom does not sign C2B callbacks,
 *     so this IP check is the only thing standing between the public
 *     confirmation URL and forged payments). Opt out explicitly with
 *     MPESA_IP_WHITELIST_ENABLED=false only if you have another guard.
 *   - non-production: off unless MPESA_IP_WHITELIST_ENABLED=true, so local
 *     testing via curl/ngrok isn't blocked.
 */
const isWhitelistEnforced = () => {
  const flag = process.env.MPESA_IP_WHITELIST_ENABLED;
  if (process.env.NODE_ENV === 'production') return flag !== 'false';
  return flag === 'true';
};

/**
 * Resolve the true client IP. Relies on `app.set('trust proxy', N)` matching
 * the real number of proxy hops (Render = 1) so that `req.ip` is the IP that
 * actually connected to our trusted edge — NOT a client-supplied, spoofable
 * X-Forwarded-For value. We deliberately do not parse the leftmost XFF entry:
 * an attacker can prepend a fake Safaricom IP there and the platform appends
 * the real one, so the leftmost is untrustworthy.
 */
const resolveClientIp = (req) =>
  String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');

/**
 * Middleware that restricts callbacks to known Safaricom IP ranges.
 * Enforced per isWhitelistEnforced(); otherwise logs and allows.
 */
const safaricomOnly = (req, res, next) => {
  const sourceIp = resolveClientIp(req);
  const allowList = getSafaricomAllowList();
  // Strict prefix match (startsWith), not substring includes — so a value like
  // "1.2.3.4-196.201.214.0" can never satisfy the "196.201.214." prefix.
  const isAllowed = allowList.some((prefix) => sourceIp.startsWith(prefix));

  if (!isAllowed) {
    if (isWhitelistEnforced()) {
      // Loud (error level) so a legit Safaricom range change is visible in logs
      // and can be added to SAFARICOM_IPS rather than silently dropping money.
      console.error(
        `🚫 [MPESA] Blocked callback from non-Safaricom IP: ${sourceIp} ` +
        `(x-forwarded-for: ${req.headers['x-forwarded-for'] || 'none'})`
      );
      return res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
    }
    console.warn(`⚠️  [MPESA] Callback from non-Safaricom IP (whitelist NOT enforced): ${sourceIp}`);
  }

  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  callbackLimiter,
  safaricomOnly,
  // Exported for unit tests
  isWhitelistEnforced,
  resolveClientIp,
  getSafaricomAllowList,
};
