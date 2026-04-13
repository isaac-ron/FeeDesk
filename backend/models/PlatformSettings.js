const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'platform', unique: true, immutable: true },

  smsGateway: {
    provider: { type: String, default: 'textsms' },
    apiKey: { type: String, default: '' },
    partnerId: { type: String, default: '' },
    shortcode: { type: String, default: 'SCHOOLPAY' },
  },

  mpesa: {
    environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    consumerKey: { type: String, default: '' },
    consumerSecret: { type: String, default: '' },
    shortcode: { type: String, default: '' },
    passkey: { type: String, default: '' },
    callbackUrl: { type: String, default: '' },
  },

  branding: {
    platformName: { type: String, default: 'SchoolPay' },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

platformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ singleton: 'platform' });
  if (!doc) doc = await this.create({ singleton: 'platform' });
  return doc;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
