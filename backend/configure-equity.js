/**
 * One-shot script to configure a school's Equity Jenga bank integration.
 *
 * Reads all sensitive values from env vars so nothing is committed to disk.
 *
 * Usage:
 *   MONGO_URI='...' \
 *   SCHOOL_QUERY='SpringView' \
 *   EQUITY_ACCOUNT_NUMBER='1100194977404' \
 *   JENGA_USERNAME='...' \
 *   JENGA_PASSWORD='...' \
 *   JENGA_PUBLIC_KEY_FILE=/tmp/jenga_pub.pem \
 *   node backend/configure-equity.js
 *
 * SCHOOL_QUERY matches against School.name (case-insensitive, partial) OR
 * School.code (exact, uppercased). Dry-runs by default — pass APPLY=true to
 * actually save.
 */
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const School = require('./models/School');

const required = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`[configure-equity] Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
};

(async () => {
  const mongoUri = required('MONGO_URI');
  const schoolQuery = required('SCHOOL_QUERY');
  const accountNumber = required('EQUITY_ACCOUNT_NUMBER');
  const username = required('JENGA_USERNAME');
  const password = required('JENGA_PASSWORD');
  const publicKeyFile = required('JENGA_PUBLIC_KEY_FILE');
  const publicKey = fs.readFileSync(publicKeyFile, 'utf8').trim();
  // IPN Basic Auth — the username/password configured for the IPN in the
  // JengaHQ portal. Without these, validateWebhook can't authenticate inbound
  // IPNs and (with BANK_WEBHOOK_SIGNATURE_REQUIRED=true) they'd be rejected.
  const webhookUsername = process.env.JENGA_WEBHOOK_USERNAME || '';
  const webhookPassword = process.env.JENGA_WEBHOOK_PASSWORD || '';
  const apply = process.env.APPLY === 'true';

  await mongoose.connect(mongoUri);
  console.log('[configure-equity] Connected to Mongo');

  const query = {
    $or: [
      { name: { $regex: schoolQuery, $options: 'i' } },
      { code: schoolQuery.toUpperCase() },
    ],
  };
  const matches = await School.find(query).select('_id name code bankIntegration');

  if (matches.length === 0) {
    console.error(`[configure-equity] No school matched "${schoolQuery}"`);
    process.exit(2);
  }
  if (matches.length > 1) {
    console.error(`[configure-equity] Ambiguous — ${matches.length} schools matched:`);
    matches.forEach((s) => console.error(`   • ${s.name} (${s.code})`));
    process.exit(3);
  }

  const school = matches[0];
  console.log(`[configure-equity] Target: ${school.name} (${school.code}) — ${school._id}`);
  console.log(`[configure-equity] Current bankIntegration:`, JSON.stringify(school.bankIntegration, null, 2));

  if (!apply) {
    console.log('\n[configure-equity] DRY RUN — set APPLY=true to persist. Would set:');
    console.log(`   provider         = EQUITY`);
    console.log(`   enabled          = true`);
    console.log(`   isActive         = true`);
    console.log(`   credentials.accountNumber = ${accountNumber}`);
    console.log(`   credentials.username      = ${username}`);
    console.log(`   credentials.password      = (${password.length} chars)`);
    console.log(`   credentials.publicKey     = (PEM, ${publicKey.length} chars)`);
    console.log(`   credentials.webhookUsername = ${webhookUsername || '(not set)'}`);
    console.log(`   credentials.webhookPassword = ${webhookPassword ? `(${webhookPassword.length} chars)` : '(not set)'}`);
    await mongoose.disconnect();
    return;
  }

  school.bankIntegration = {
    enabled: true,
    provider: 'EQUITY',
    isActive: true,
    credentials: {
      ...(school.bankIntegration?.credentials?.toObject?.() || {}),
      accountNumber,
      username,
      password,
      publicKey,
      // Only overwrite IPN Basic-Auth creds when provided, so re-running the
      // script without them doesn't wipe an existing configuration.
      ...(webhookUsername ? { webhookUsername } : {}),
      ...(webhookPassword ? { webhookPassword } : {}),
    },
    lastSync: school.bankIntegration?.lastSync,
  };

  await school.save();
  console.log(`[configure-equity] ✅ Saved bankIntegration for ${school.name}`);

  const reloaded = await School.findById(school._id).select('bankIntegration');
  console.log('[configure-equity] Post-save verification:');
  console.log(`   enabled:  ${reloaded.bankIntegration.enabled}`);
  console.log(`   provider: ${reloaded.bankIntegration.provider}`);
  console.log(`   isActive: ${reloaded.bankIntegration.isActive}`);
  console.log(`   account:  ${reloaded.bankIntegration.credentials.accountNumber}`);
  console.log(`   username: ${reloaded.bankIntegration.credentials.username}`);
  console.log(`   publicKey length: ${reloaded.bankIntegration.credentials.publicKey?.length || 0}`);
  console.log(`   webhookUsername: ${reloaded.bankIntegration.credentials.webhookUsername || '(not set)'}`);

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('[configure-equity] ERROR:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
