const PlatformSettings = require('../models/PlatformSettings');

let cached = null;
let cachedAt = 0;
const TTL_MS = 60 * 1000;

const loadFromDb = async () => {
  try {
    return await PlatformSettings.getSingleton();
  } catch {
    return null;
  }
};

const getPlatformSettings = async () => {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  cached = await loadFromDb();
  cachedAt = now;
  return cached;
};

const invalidatePlatformSettingsCache = () => {
  cached = null;
  cachedAt = 0;
};

const pick = (dbVal, envVal) => (dbVal && String(dbVal).trim()) || envVal || '';

const getSmsCredentials = async () => {
  const doc = await getPlatformSettings();
  const apiKey = pick(doc?.smsGateway?.apiKey, process.env.TEXTSMS_API_KEY);
  const partnerId = pick(doc?.smsGateway?.partnerId, process.env.TEXTSMS_PARTNER_ID);
  const shortcode = pick(doc?.smsGateway?.shortcode, process.env.TEXTSMS_SHORTCODE) || 'SCHOOLPAY';
  if (!apiKey || !partnerId || apiKey === 'your_api_key') return null;
  return { apiKey, partnerId, shortcode };
};

const getMpesaConfig = async () => {
  const doc = await getPlatformSettings();
  const consumerKey = pick(doc?.mpesa?.consumerKey, process.env.MPESA_CONSUMER_KEY);
  const consumerSecret = pick(doc?.mpesa?.consumerSecret, process.env.MPESA_CONSUMER_SECRET);
  const shortcode = pick(doc?.mpesa?.shortcode, process.env.MPESA_SHORTCODE);
  const passkey = pick(doc?.mpesa?.passkey, process.env.MPESA_PASSKEY);
  const callbackUrl = pick(doc?.mpesa?.callbackUrl, process.env.MPESA_CALLBACK_URL);
  const environment = doc?.mpesa?.environment || process.env.MPESA_ENV || 'sandbox';
  if (!consumerKey || !consumerSecret || consumerKey === 'your_consumer_key') return null;
  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl, environment };
};

module.exports = {
  getPlatformSettings,
  invalidatePlatformSettingsCache,
  getSmsCredentials,
  getMpesaConfig,
};
