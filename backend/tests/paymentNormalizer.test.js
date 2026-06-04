const { test } = require('node:test');
const assert = require('node:assert/strict');

const { normalise } = require('../services/paymentNormalizer');

// A representative Safaricom C2B confirmation body.
const c2bBody = {
  TransID: 'QBX3841KP',
  TransAmount: '1500.00',
  BillRefNumber: 'adm-4022',
  BusinessShortCode: '600100',
  MSISDN: '254712345678',
  FirstName: 'Alice',
  MiddleName: '',
  LastName: 'Wanjiku',
  TransTime: '20260603104200',
};

test('normalise(MPESA): maps C2B fields into the internal shape', () => {
  const n = normalise('MPESA', c2bBody);
  assert.equal(n.provider, 'MPESA');
  assert.equal(n.ref, 'QBX3841KP');
  assert.equal(n.amount, 1500); // parseFloat of "1500.00"
  assert.equal(n.phone, '254712345678');
  assert.equal(n.accountRef, 'ADM-4022'); // trimmed + upper-cased
  assert.equal(n.paidBy, 'Alice Wanjiku'); // empty middle name dropped
  assert.equal(n.sourceLabel, 'MPESA');
  assert.equal(n.rawPayload, c2bBody);
});

test('normalise(MPESA): accountRef is upper-cased and trimmed for matching', () => {
  const n = normalise('MPESA', { ...c2bBody, BillRefNumber: '  adm-9 ' });
  assert.equal(n.accountRef, 'ADM-9');
});

test('normalise(MPESA): masked/invalid MSISDN yields null phone (not a crash)', () => {
  assert.equal(normalise('MPESA', { ...c2bBody, MSISDN: '2547*****678' }).phone, null);
  assert.equal(normalise('MPESA', { ...c2bBody, MSISDN: '' }).phone, null);
});

test('normalise(MPESA): TransTime parsed to ISO; missing TransTime falls back to now', () => {
  const n = normalise('MPESA', c2bBody);
  assert.equal(new Date(n.receivedAt).toISOString(), n.receivedAt); // valid ISO
  const noTime = normalise('MPESA', { ...c2bBody, TransTime: undefined });
  assert.ok(!Number.isNaN(new Date(noTime.receivedAt).getTime()));
});

test('normalise: unknown provider throws', () => {
  assert.throws(() => normalise('VENMO', {}), /Unknown payment provider/);
});
