/**
 * Tier-1 Equity (Jenga/Finserve) smoke test — proves our app can AUTHENTICATE
 * with the Jenga API.
 *
 * Mints an OAuth token through the SAME code path the reconciliation-pull flow
 * uses (bankService → EquityBankService.getAccessToken → POST
 * /identity-sandbox/v2/token with username/password + Api-Key header).
 *
 * NOTE: Equity's load-bearing path is INBOUND IPN (Jenga POSTs credit
 * notifications to our callback with HTTP Basic Auth, validated locally by
 * `EquityBankService.validateWebhook` — already unit-tested). This token test
 * only proves OUTBOUND auth (needed for the optional bank-statement pull). A
 * green run still confirms our Jenga creds + reachability are good.
 *
 * Read-only. Nothing sensitive is printed — only the access-token length.
 *
 * Usage (PowerShell) — Option A, creds saved on the school:
 *   $env:MONGO_URI='mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/schoolpay'
 *   $env:SCHOOL_QUERY='<school code or name>'
 *   node test-equity-token.js
 *
 * Usage — Option B, creds straight from env (from developer.jengahq.io):
 *   $env:JENGA_USERNAME='...'; $env:JENGA_PASSWORD='...'; $env:JENGA_API_KEY='...'
 *   node test-equity-token.js
 *
 * Host defaults to https://uat.finserve.africa; override with $env:EQUITY_API_URL.
 */
require('./config/env');
const mongoose = require('mongoose');
const bankService = require('./services/bankService');

(async () => {
  const baseUrl = process.env.EQUITY_API_URL || 'https://uat.finserve.africa';
  const tokenPath = process.env.EQUITY_TOKEN_PATH || '/authentication/api/v3/authenticate/merchant';
  console.log(`[equity-smoke] Token endpoint: ${baseUrl}${tokenPath}`);

  let school;
  let credSource;
  const schoolQuery = process.env.SCHOOL_QUERY;

  if (process.env.MONGO_URI && schoolQuery) {
    const School = require('./models/School');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`[equity-smoke] Connected — db="${mongoose.connection.name}"`);

    school = await School.findOne({
      $or: [
        { code: schoolQuery.toUpperCase() },
        { name: { $regex: schoolQuery, $options: 'i' } },
      ],
    }).select('name code bankIntegration');

    if (!school) {
      console.error(`[equity-smoke] No school matched "${schoolQuery}"`);
      await mongoose.disconnect();
      process.exit(2);
    }

    const c = school.bankIntegration?.credentials || {};
    credSource = `school "${school.name}" (${school.code}) → bankIntegration.credentials`;
    const mc = c.merchantCode || c.username;
    const cs = c.consumerSecret || c.password;
    console.log(
      `[equity-smoke] provider=${school.bankIntegration?.provider} ` +
        `merchantCode=${mc ? 'set' : 'MISSING'} ` +
        `consumerSecret=${cs ? 'set' : 'MISSING'} ` +
        `apiKey=${c.apiKey ? 'set' : 'MISSING'}`
    );
  } else {
    school = { bankIntegration: { credentials: {} } };
    credSource = 'env (JENGA_MERCHANT_CODE/CONSUMER_SECRET or legacy USERNAME/PASSWORD, + JENGA_API_KEY)';
    const mc = process.env.JENGA_MERCHANT_CODE || process.env.JENGA_USERNAME;
    const cs = process.env.JENGA_CONSUMER_SECRET || process.env.JENGA_PASSWORD;
    if (!mc || !cs || !process.env.JENGA_API_KEY) {
      console.error(
        '[equity-smoke] Missing Jenga v3 creds in env. All three are required from the\n' +
          '[equity-smoke] developer.jengahq.io app credentials page (NOT your portal login):\n' +
          '[equity-smoke]   JENGA_MERCHANT_CODE   (merchantCode)\n' +
          '[equity-smoke]   JENGA_CONSUMER_SECRET (consumerSecret)\n' +
          '[equity-smoke]   JENGA_API_KEY         (the Api-Key header)\n' +
          '[equity-smoke] (Legacy JENGA_USERNAME/PASSWORD are accepted as merchantCode/consumerSecret.)'
      );
      process.exit(2);
    }
  }
  console.log(`[equity-smoke] Credential source: ${credSource}`);

  const equity = bankService.getBankProvider('EQUITY');
  try {
    const token = await equity.getAccessToken(school);
    console.log('\n[equity-smoke] ✅ SUCCESS — our app authenticated with Equity Jenga.');
    console.log(`[equity-smoke]    access_token received: ${token?.length || 0} chars (value not printed)`);
    process.exitCode = 0;
  } catch (err) {
    console.error('\n[equity-smoke] ❌ FAILED to authenticate. See the "[EQUITY] Token error" line above for Jenga\'s response.');
    console.error(`[equity-smoke]    ${err.message}`);
    console.error('[equity-smoke]    Common causes: missing Api-Key, wrong host (prod vs UAT), bad creds, or no network egress.');
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
})();
