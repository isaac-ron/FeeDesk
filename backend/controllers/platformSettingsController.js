const PlatformSettings = require('../models/PlatformSettings');
const { invalidatePlatformSettingsCache } = require('../services/platformConfig');

const mask = (val) => {
  if (!val) return '';
  const s = String(val);
  if (s.length <= 4) return '••••';
  return `••••${s.slice(-4)}`;
};

const toSafe = (doc) => ({
  smsGateway: {
    provider: doc.smsGateway.provider,
    apiKey: mask(doc.smsGateway.apiKey),
    apiKeySet: !!doc.smsGateway.apiKey,
    partnerId: doc.smsGateway.partnerId,
    shortcode: doc.smsGateway.shortcode,
  },
  mpesa: {
    environment: doc.mpesa.environment,
    consumerKey: mask(doc.mpesa.consumerKey),
    consumerKeySet: !!doc.mpesa.consumerKey,
    consumerSecret: mask(doc.mpesa.consumerSecret),
    consumerSecretSet: !!doc.mpesa.consumerSecret,
    shortcode: doc.mpesa.shortcode,
    passkey: mask(doc.mpesa.passkey),
    passkeySet: !!doc.mpesa.passkey,
    callbackUrl: doc.mpesa.callbackUrl,
  },
  branding: doc.branding,
  updatedAt: doc.updatedAt,
});

exports.getSettings = async (req, res) => {
  try {
    const doc = await PlatformSettings.getSingleton();
    res.json({ success: true, data: toSafe(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merge updates: blank string for a secret field = "leave unchanged"
const mergeSecret = (current, incoming) => {
  if (incoming === undefined) return current;
  if (incoming === '') return current;
  return incoming;
};

exports.updateSettings = async (req, res) => {
  try {
    const doc = await PlatformSettings.getSingleton();
    const { smsGateway = {}, mpesa = {}, branding = {} } = req.body;

    if (smsGateway.provider !== undefined) doc.smsGateway.provider = smsGateway.provider;
    doc.smsGateway.apiKey = mergeSecret(doc.smsGateway.apiKey, smsGateway.apiKey);
    if (smsGateway.partnerId !== undefined) doc.smsGateway.partnerId = smsGateway.partnerId;
    if (smsGateway.shortcode !== undefined) doc.smsGateway.shortcode = smsGateway.shortcode;

    if (mpesa.environment !== undefined) doc.mpesa.environment = mpesa.environment;
    doc.mpesa.consumerKey = mergeSecret(doc.mpesa.consumerKey, mpesa.consumerKey);
    doc.mpesa.consumerSecret = mergeSecret(doc.mpesa.consumerSecret, mpesa.consumerSecret);
    if (mpesa.shortcode !== undefined) doc.mpesa.shortcode = mpesa.shortcode;
    doc.mpesa.passkey = mergeSecret(doc.mpesa.passkey, mpesa.passkey);
    if (mpesa.callbackUrl !== undefined) doc.mpesa.callbackUrl = mpesa.callbackUrl;

    if (branding.platformName !== undefined) doc.branding.platformName = branding.platformName;
    if (branding.supportEmail !== undefined) doc.branding.supportEmail = branding.supportEmail;
    if (branding.supportPhone !== undefined) doc.branding.supportPhone = branding.supportPhone;

    doc.updatedBy = req.user._id;
    await doc.save();
    invalidatePlatformSettingsCache();

    res.json({ success: true, data: toSafe(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
