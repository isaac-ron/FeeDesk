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
 * Middleware that restricts access to known Safaricom IP ranges.
 * Only enforced when MPESA_IP_WHITELIST_ENABLED=true.
 * In development, it logs warnings but allows all traffic through.
 */
const safaricomOnly = (req, res, next) => {
  const enabled = process.env.MPESA_IP_WHITELIST_ENABLED === 'true';
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const forwardedFor = req.headers['x-forwarded-for'] || '';
  const sourceIp = forwardedFor.split(',')[0].trim() || clientIp;

  const allowList = getSafaricomAllowList();
  const isAllowed = allowList.some(prefix => sourceIp.includes(prefix));

  if (!isAllowed) {
    if (enabled) {
      console.warn(`🚫 [MPESA] Blocked callback from non-Safaricom IP: ${sourceIp}`);
      return res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
    }
    // Development: warn but allow
    console.warn(`⚠️  [MPESA] Callback from non-Safaricom IP (allowed in dev): ${sourceIp}`);
  }

  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  callbackLimiter,
  safaricomOnly,
};
