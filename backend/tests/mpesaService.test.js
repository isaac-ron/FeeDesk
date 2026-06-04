const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalisePhone,
  generateTimestamp,
  parseStkCallback,
} = require('../services/mpesaService');

test('normalisePhone: accepts every common Kenyan format → 2547/2541…', () => {
  assert.equal(normalisePhone('0712345678'), '254712345678');
  assert.equal(normalisePhone('0112345678'), '254112345678');
  assert.equal(normalisePhone('254712345678'), '254712345678');
  assert.equal(normalisePhone('+254 712 345 678'), '254712345678');
  // Already-canonical passes through; non-digits are stripped.
  assert.equal(normalisePhone('254-712-345-678'), '254712345678');
});

test('generateTimestamp: 14-digit YYYYMMDDHHmmss', () => {
  const ts = generateTimestamp();
  assert.match(ts, /^\d{14}$/);
  // Month and day fields are within range (sanity, not exact time).
  const month = Number(ts.slice(4, 6));
  const day = Number(ts.slice(6, 8));
  assert.ok(month >= 1 && month <= 12, `month ${month}`);
  assert.ok(day >= 1 && day <= 31, `day ${day}`);
});

test('parseStkCallback: successful payment extracts flat metadata', () => {
  const body = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'm-1',
        CheckoutRequestID: 'c-1',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 1500 },
            { Name: 'MpesaReceiptNumber', Value: 'QBX3841KP' },
            { Name: 'TransactionDate', Value: 20260603104200 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
      },
    },
  };
  const r = parseStkCallback(body);
  assert.equal(r.success, true);
  assert.equal(r.resultCode, 0);
  assert.equal(r.amount, 1500);
  assert.equal(r.mpesaReceiptNumber, 'QBX3841KP');
  assert.equal(r.phoneNumber, '254712345678'); // coerced to string
  assert.equal(r.checkoutRequestId, 'c-1');
});

test('parseStkCallback: cancelled/failed payment has success=false and no amount', () => {
  const body = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'm-2',
        CheckoutRequestID: 'c-2',
        ResultCode: 1032,
        ResultDesc: 'Request cancelled by user',
      },
    },
  };
  const r = parseStkCallback(body);
  assert.equal(r.success, false);
  assert.equal(r.resultCode, 1032);
  assert.equal(r.amount, undefined);
});

test('parseStkCallback: malformed body returns null (no throw)', () => {
  assert.equal(parseStkCallback({}), null);
  assert.equal(parseStkCallback({ Body: {} }), null);
  assert.equal(parseStkCallback(null), null);
});
