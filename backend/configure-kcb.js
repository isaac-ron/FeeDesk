/**
 * One-shot script to configure a school's KCB BUNI bank integration.
 *
 * Sensitive values come from env vars — nothing is committed to disk.
 *
 * Usage (PowerShell):
 *   $env:MONGO_URI='...'
 *   $env:SCHOOL_QUERY='Kenya High School'
 *   $env:KCB_ACCOUNT_NUMBER='1100194977404'
 *   $env:KCB_ORGANIZATION_CODE=''
 *   $env:KCB_CONSUMER_KEY='...'
 *   $env:KCB_CONSUMER_SECRET='...'
 *   $env:KCB_PUBLIC_KEY_FILE='C:\path\to\kcb_pub.pem'   # optional
 *   $env:APPLY='true'
 *   node backend/configure-kcb.js
 *
 * SCHOOL_QUERY matches School.name (case-insensitive partial) OR School.code
 * (exact, uppercased). Dry-runs unless APPLY=true.
 *
 * After saving, KCB IPN lands on:
 *   POST {API_BASE_URL}/api/payments/bank/webhook/kcb
 * Bill-Validation lands on:
 *   POST {API_BASE_URL}/api/payments/bank/validate/kcb
 * Share both URLs with buni@kcbgroup.com for BUNI-side registration.
 */
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const School = require('./models/School');

const required = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`[configure-kcb] Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
};

(async () => {
  const mongoUri = required('MONGO_URI');
  const schoolQuery = required('SCHOOL_QUERY');
  const accountNumber = required('KCB_ACCOUNT_NUMBER');
  const organizationCode = required('KCB_ORGANIZATION_CODE');
  const consumerKey = process.env.KCB_CONSUMER_KEY;
  const consumerSecret = process.env.KCB_CONSUMER_SECRET;
  const publicKeyFile = process.env.KCB_PUBLIC_KEY_FILE;
  const publicKey = publicKeyFile ? fs.readFileSync(publicKeyFile, 'utf8').trim() : '';
  const apply = process.env.APPLY === 'true';

  await mongoose.connect(mongoUri);
  console.log('[configure-kcb] Connected to Mongo');

  const query = {
    $or: [
      { name: { $regex: schoolQuery, $options: 'i' } },
      { code: schoolQuery.toUpperCase() },
    ],
  };
  const matches = await School.find(query).select('_id name code bankIntegration');

  if (matches.length === 0) {
    console.error(`[configure-kcb] No school matched "${schoolQuery}"`);
    process.exit(2);
  }
  if (matches.length > 1) {
    console.error(`[configure-kcb] Ambiguous — ${matches.length} schools matched:`);
    matches.forEach((s) => console.error(`   • ${s.name} (${s.code})`));
    process.exit(3);
  }

  const school = matches[0];
  console.log(`[configure-kcb] Target: ${school.name} (${school.code}) — ${school._id}`);
  console.log(`[configure-kcb] Current bankIntegration:`, JSON.stringify(school.bankIntegration, null, 2));

  if (!apply) {
    console.log('\n[configure-kcb] DRY RUN — set APPLY=true to persist. Would set:');
    console.log(`   provider                         = KCB`);
    console.log(`   enabled                          = true`);
    console.log(`   isActive                         = true`);
    console.log(`   credentials.accountNumber        = ${accountNumber}`);
    console.log(`   credentials.organizationCode     = ${organizationCode}`);
    console.log(`   credentials.consumerKey          = ${consumerKey ? '(set)' : '(from env KCB_CONSUMER_KEY)'}`);
    console.log(`   credentials.consumerSecret       = ${consumerSecret ? '(set)' : '(from env KCB_CONSUMER_SECRET)'}`);
    console.log(`   credentials.kcbPublicKey         = ${publicKey ? `(PEM, ${publicKey.length} chars)` : '(not set — from env KCB_PUBLIC_KEY)'}`);
    await mongoose.disconnect();
    return;
  }

  school.bankIntegration = {
    enabled: true,
    provider: 'KCB',
    isActive: true,
    credentials: {
      ...(school.bankIntegration?.credentials?.toObject?.() || {}),
      accountNumber,
      organizationCode,
      ...(consumerKey ? { consumerKey } : {}),
      ...(consumerSecret ? { consumerSecret } : {}),
      ...(publicKey ? { kcbPublicKey: publicKey } : {}),
    },
    lastSync: school.bankIntegration?.lastSync,
  };

  await school.save();
  console.log(`[configure-kcb] ✅ Saved bankIntegration for ${school.name}`);

  const reloaded = await School.findById(school._id).select('bankIntegration');
  console.log('[configure-kcb] Post-save verification:');
  console.log(`   enabled:          ${reloaded.bankIntegration.enabled}`);
  console.log(`   provider:         ${reloaded.bankIntegration.provider}`);
  console.log(`   isActive:         ${reloaded.bankIntegration.isActive}`);
  console.log(`   accountNumber:    ${reloaded.bankIntegration.credentials.accountNumber}`);
  console.log(`   organizationCode: ${reloaded.bankIntegration.credentials.organizationCode}`);
  console.log(`   consumerKey:      ${reloaded.bankIntegration.credentials.consumerKey ? '(set)' : '(unset → env fallback)'}`);
  console.log(`   kcbPublicKey len: ${reloaded.bankIntegration.credentials.kcbPublicKey?.length || 0}`);

  const baseUrl = process.env.API_BASE_URL || '(set API_BASE_URL)';
  console.log('\n[configure-kcb] IPN endpoints to share with buni@kcbgroup.com:');
  console.log(`   Validation:   POST ${baseUrl}/api/payments/bank/validate/kcb`);
  console.log(`   Notification: POST ${baseUrl}/api/payments/bank/webhook/kcb`);

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('[configure-kcb] ERROR:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
