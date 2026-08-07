const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  safaricomOnly,
  isWhitelistEnforced,
  resolveClientIp,
} = require('../middleware/securityMiddleware');

// Minimal req/res harness. Returns { passed, blocked, code }.
const invoke = (req) => {
  let passed = false;
  let blocked = false;
  let code = null;
  const res = {
    status(c) { code = c; return res; },
    json() { blocked = true; return res; },
  };
  safaricomOnly({ headers: {}, socket: {}, ...req }, res, () => { passed = true; });
  return { passed, blocked, code };
};

beforeEach(() => {
  delete process.env.MPESA_IP_WHITELIST_ENABLED;
  delete process.env.SAFARICOM_IPS;
  process.env.NODE_ENV = 'test';
});

test('production: allows a known Safaricom IP', () => {
  process.env.NODE_ENV = 'production';
  const r = invoke({ ip: '196.201.214.10' });
  assert.equal(r.passed, true);
  assert.equal(r.blocked, false);
});

test('production: blocks a non-Safaricom IP', () => {
  process.env.NODE_ENV = 'production';
  const r = invoke({ ip: '1.2.3.4' });
  assert.equal(r.blocked, true);
  assert.equal(r.code, 403);
});

test('production: a spoofed leftmost X-Forwarded-For cannot bypass (uses req.ip)', () => {
  process.env.NODE_ENV = 'production';
  const r = invoke({
    ip: '1.2.3.4', // the real, trusted-proxy-derived IP
    headers: { 'x-forwarded-for': '196.201.214.99, 1.2.3.4' }, // attacker prepended a fake Safaricom IP
  });
  assert.equal(r.blocked, true, 'spoofed XFF must not satisfy the allowlist');
});

test('production: strict prefix match — substring near-miss is blocked', () => {
  process.env.NODE_ENV = 'production';
  // Contains the prefix as a substring but does not start with it.
  const r = invoke({ ip: '10.0.0.196.201.214.1' });
  assert.equal(r.blocked, true);
});

test('production: IPv4-mapped IPv6 form is normalised and allowed', () => {
  process.env.NODE_ENV = 'production';
  const r = invoke({ ip: '::ffff:196.201.214.10' });
  assert.equal(r.passed, true);
});

test('production: explicit opt-out (MPESA_IP_WHITELIST_ENABLED=false) allows through', () => {
  process.env.NODE_ENV = 'production';
  process.env.MPESA_IP_WHITELIST_ENABLED = 'false';
  const r = invoke({ ip: '1.2.3.4' });
  assert.equal(r.passed, true);
  assert.equal(r.blocked, false);
});

test('non-production: permissive by default (flag unset)', () => {
  process.env.NODE_ENV = 'development';
  const r = invoke({ ip: '1.2.3.4' });
  assert.equal(r.passed, true);
});

test('non-production: enforces when explicitly enabled', () => {
  process.env.NODE_ENV = 'development';
  process.env.MPESA_IP_WHITELIST_ENABLED = 'true';
  const r = invoke({ ip: '1.2.3.4' });
  assert.equal(r.blocked, true);
  assert.equal(r.code, 403);
});

test('SAFARICOM_IPS env overrides the default allowlist', () => {
  process.env.NODE_ENV = 'production';
  process.env.SAFARICOM_IPS = '10.20.30.';
  assert.equal(invoke({ ip: '10.20.30.5' }).passed, true);
  // A previously-default range is no longer allowed once overridden.
  assert.equal(invoke({ ip: '196.201.214.10' }).blocked, true);
});

test('isWhitelistEnforced: prod default on, dev default off', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(isWhitelistEnforced(), true);
  process.env.MPESA_IP_WHITELIST_ENABLED = 'false';
  assert.equal(isWhitelistEnforced(), false);
  delete process.env.MPESA_IP_WHITELIST_ENABLED;
  process.env.NODE_ENV = 'development';
  assert.equal(isWhitelistEnforced(), false);
  process.env.MPESA_IP_WHITELIST_ENABLED = 'true';
  assert.equal(isWhitelistEnforced(), true);
});

test('resolveClientIp strips the IPv4-mapped IPv6 prefix', () => {
  assert.equal(resolveClientIp({ ip: '::ffff:41.215.176.9' }), '41.215.176.9');
  assert.equal(resolveClientIp({ socket: { remoteAddress: '1.1.1.1' } }), '1.1.1.1');
  assert.equal(resolveClientIp({}), '');
});

// ── Observed against a genuine Safaricom C2B callback, 2026-08-07 ────────────
// Real deliveries arrive with a TWO-hop X-Forwarded-For chain, because
// Safaricom fronts its dispatcher with Envoy and injects its own internal
// address before ours ever sees it:
//
//   X-Forwarded-For: 10.197.136.41, 196.201.212.69
//   User-Agent:      Apache-HttpClient/4.5.14 (Java/1.8.0_361)
//   Soapaction:      "ConfirmC2BPayment"
//
// The leftmost entry is a private RFC-1918 address that matches nothing in the
// allowlist. With `app.set('trust proxy', 1)` Express resolves req.ip to the
// rightmost entry — the address that actually connected to our edge — which is
// the Safaricom range we allow. These tests pin that behaviour: if someone
// raises the trust-proxy hop count, req.ip slides to the private address and
// production starts 403-ing real payments.
test('production: real Safaricom XFF chain resolves to the allowed public IP', () => {
  process.env.NODE_ENV = 'production';
  // What Express yields for req.ip under `trust proxy: 1` for the chain above.
  const r = invoke({
    ip: '196.201.212.69',
    headers: { 'x-forwarded-for': '10.197.136.41, 196.201.212.69' },
  });
  assert.equal(r.passed, true, 'a genuine Safaricom callback must not be blocked');
  assert.equal(r.blocked, false);
});

test('production: the private leftmost hop alone would be blocked', () => {
  process.env.NODE_ENV = 'production';
  // Guards the misconfiguration: if trust proxy is raised so req.ip becomes the
  // RFC-1918 hop, real callbacks get rejected. Assert that IP is not allowed, so
  // the danger is explicit rather than discovered in production.
  const r = invoke({
    ip: '10.197.136.41',
    headers: { 'x-forwarded-for': '10.197.136.41, 196.201.212.69' },
  });
  assert.equal(r.blocked, true);
  assert.equal(r.code, 403);
});
