/**
 * Tier-1 KCB smoke test — proves our app can AUTHENTICATE with KCB BUNI.
 *
 * Mints an OAuth token through the SAME code path the webhook/fetch flows use
 * (bankService → KCBBankService.getAccessToken). A green run means our service,
 * the stored sandbox credentials, and KCB's UAT auth server actually talk to
 * each other — the one thing the unit tests can't fake.
 *
 * Read-only: connects to Mongo only to READ the school's creds; writes nothing.
 * Nothing sensitive is printed — only the access-token length.
 *
 * Usage (PowerShell) — Option A, use the creds already saved on the school
 * (most faithful, mirrors production cred resolution):
 *   $env:MONGO_URI='mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/schoolpay'
 *   $env:SCHOOL_QUERY='KHS'
 *   node test-kcb-token.js
 *
 * Usage — Option B, creds straight from env, no DB needed:
 *   $env:KCB_CONSUMER_KEY='<sandbox-key>'; $env:KCB_CONSUMER_SECRET='<sandbox-secret>'
 *   node test-kcb-token.js
 *
 * The token host defaults to https://uat.buni.kcbgroup.com; override with
 * $env:KCB_API_URL (gateway) or $env:KCB_TOKEN_URL (full /token URL).
 */
require('./config/env');
const mongoose = require('mongoose');
const bankService = require('./services/bankService');

(async () => {
  const tokenUrl =
    process.env.KCB_TOKEN_URL ||
    `${process.env.KCB_API_URL || 'https://uat.buni.kcbgroup.com'}/token`;
  console.log(`[kcb-smoke] Token endpoint: ${tokenUrl}`);

  let school;
  let credSource;
  const schoolQuery = process.env.SCHOOL_QUERY;

  if (process.env.MONGO_URI && schoolQuery) {
    const School = require('./models/School');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`[kcb-smoke] Connected — db="${mongoose.connection.name}"`);

    school = await School.findOne({
      $or: [
        { code: schoolQuery.toUpperCase() },
        { name: { $regex: schoolQuery, $options: 'i' } },
      ],
    }).select('name code bankIntegration');

    if (!school) {
      console.error(`[kcb-smoke] No school matched "${schoolQuery}"`);
      await mongoose.disconnect();
      process.exit(2);
    }

    const c = school.bankIntegration?.credentials || {};
    credSource = `school "${school.name}" (${school.code}) → bankIntegration.credentials`;
    console.log(
      `[kcb-smoke] provider=${school.bankIntegration?.provider} ` +
        `consumerKey=${c.consumerKey ? 'set' : 'MISSING'} ` +
        `consumerSecret=${c.consumerSecret ? 'set' : 'MISSING'}`
    );
  } else {
    // No DB: stub school so getAccessToken falls through to env creds.
    school = { bankIntegration: { credentials: {} } };
    credSource = 'env (KCB_CONSUMER_KEY / KCB_CONSUMER_SECRET)';
    if (!process.env.KCB_CONSUMER_KEY || !process.env.KCB_CONSUMER_SECRET) {
      console.error(
        '[kcb-smoke] No MONGO_URI+SCHOOL_QUERY and no KCB_CONSUMER_KEY/SECRET in env — nothing to test with.'
      );
      process.exit(2);
    }
  }
  console.log(`[kcb-smoke] Credential source: ${credSource}`);

  const kcb = bankService.getBankProvider('KCB');
  try {
    const token = await kcb.getAccessToken(school);
    console.log('\n[kcb-smoke] ✅ SUCCESS — our app authenticated with KCB BUNI.');
    console.log(`[kcb-smoke]    access_token received: ${token?.length || 0} chars (value not printed)`);
    process.exitCode = 0;
  } catch (err) {
    // KCBBankService already console.error'd KCB's raw response on the line above.
    console.error('\n[kcb-smoke] ❌ FAILED to authenticate. See the "[KCB] Token error" line above for KCB\'s response.');
    console.error(`[kcb-smoke]    ${err.message}`);
    console.error('[kcb-smoke]    Common causes: wrong host (prod vs UAT), bad/rotated creds, or no network egress to KCB.');
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
    // Force-exit so any lingering keep-alive socket doesn't hold the process.
    process.exit(process.exitCode || 0);
  }
})();
