const { test } = require('node:test');
const assert = require('node:assert/strict');

// bankService is a singleton; processWebhook for KCB/EQUITY needs no DB.
const bankService = require('../services/bankService');
const { normalise } = require('../services/paymentNormalizer');

// ── KCB BUNI Account Notification (flat) ─────────────────────────────────────
const kcbBody = {
  transactionReference: 'FT00026252',
  requestId: 'REQ-1',
  channelCode: '202',
  timestamp: '202606031042',
  transactionAmount: '5000.00',
  currency: 'KES',
  customerReference: 'ADM-4022',   // ★ admission number the payer entered
  customerName: 'Jane Wanjiku',
  customerMobileNumber: '254712345678',
  narration: 'School fees',
  creditAccountIdentifier: '1234567890', // ★ school's KCB account (routing)
};

test('KCB processWebhook maps customerReference → reference, creditAccountIdentifier → schoolAccount', () => {
  const r = bankService.processWebhook('KCB', kcbBody, {});
  assert.equal(r.provider, 'KCB');
  assert.equal(r.transactionId, 'FT00026252');
  assert.equal(r.amount, 5000);
  assert.equal(r.reference, 'ADM-4022');      // matched against admissionNumber
  assert.equal(r.schoolAccount, '1234567890'); // used for tenant routing
  assert.equal(r.paidBy, 'Jane Wanjiku');
  assert.equal(r.phoneNumber, '254712345678');
});

test('normalise(KCB) yields an upper-cased accountRef + canonical phone', () => {
  const n = normalise('KCB', kcbBody, {});
  assert.equal(n.provider, 'KCB');
  assert.equal(n.accountRef, 'ADM-4022');
  assert.equal(n.amount, 5000);
  assert.equal(n.phone, '254712345678');
});

// ── Equity Jenga IPN (nested) ────────────────────────────────────────────────
const jengaBody = {
  callbackType: 'IPN',
  customer: { name: 'Brian Otieno', mobileNumber: '254700111222', reference: 'ADM-3910' }, // ★ admission no
  transaction: {
    date: '2026-06-03', reference: 'JEN-998877', paymentMode: 'EAZZY',
    amount: '7000', currency: 'KES', billNumber: '0100200300', // ★ school account
    status: 'SUCCESS',
  },
  bank: { reference: 'BNK-1', transactionType: 'CREDIT', account: '0100200300' },
};

test('Equity processWebhook reads admission no from customer.reference (NOT billNumber)', () => {
  const r = bankService.processWebhook('EQUITY', jengaBody, {});
  assert.equal(r.provider, 'EQUITY');
  assert.equal(r.transactionId, 'JEN-998877');
  assert.equal(r.amount, 7000);
  assert.equal(r.reference, 'ADM-3910');     // ★ the fix — was billNumber before
  assert.equal(r.schoolAccount, '0100200300'); // routing key (billNumber)
  assert.equal(r.paidBy, 'Brian Otieno');
  assert.equal(r.phoneNumber, '254700111222');
  assert.equal(r.status, 'SUCCESS');
});

test('normalise(EQUITY) yields accountRef from customer.reference + canonical phone', () => {
  const n = normalise('EQUITY', jengaBody, {});
  assert.equal(n.provider, 'EQUITY');
  assert.equal(n.accountRef, 'ADM-3910'); // trimmed + upper-cased
  assert.equal(n.amount, 7000);
  assert.equal(n.phone, '254700111222');
  assert.equal(n.sourceLabel, 'EQUITY BANK');
});

// ── Equity Jenga IPN — full payload exactly as Equity documents it ───────────
// Every field from the vendor's own sample, including the ones we ignore, so a
// shape change shows up here rather than in production.
const jengaDocSample = (over = {}) => ({
  callbackType: 'IPN',
  customer: { name: 'John Doe', mobileNumber: '254712345678', reference: '071648816466242' },
  transaction: {
    date: '2023-10-11 14:15:20',
    reference: '328411183176',
    paymentMode: 'MPESA',
    amount: 150,
    currency: 'KES',
    billNumber: 'INVZCF',
    servedBy: 'EQ',
    additionalInfo: 'CARD',
    orderAmount: 150,
    serviceCharge: 5.25,
    orderCurrency: 'KES',
    status: 'SUCCESS',
    remarks: '00:Approved',
    ...over,
  },
  bank: { reference: '328411183176', transactionType: 'C', account: null },
});

test('Equity: vendor sample payload maps every field we depend on', () => {
  const n = normalise('EQUITY', jengaDocSample(), {});
  assert.equal(n.ref, '328411183176');          // transaction.reference
  assert.equal(n.amount, 150);                  // numeric, not the string form
  assert.equal(n.accountRef, '071648816466242'); // customer.reference (payer)
  assert.equal(n.paidBy, 'John Doe');
  assert.equal(n.phone, '254712345678');
  assert.equal(n.status, 'SUCCESS');
  assert.equal(n.paymentMode, 'MPESA');
  assert.equal(n.rawPayload.transaction.serviceCharge, 5.25); // nothing dropped
});

test('Equity: schoolAccount falls back to bank.account when billNumber is absent', () => {
  const body = jengaDocSample();
  delete body.transaction.billNumber;
  body.bank.account = '0100200300';
  const r = bankService.processWebhook('EQUITY', body, {});
  assert.equal(r.schoolAccount, '0100200300');
});

test('Equity: every documented paymentMode survives normalisation', () => {
  for (const mode of ['CARD', 'MPESA', 'PWE', 'EQUITEL', 'PAYPAL']) {
    const n = normalise('EQUITY', jengaDocSample({ paymentMode: mode }), {});
    assert.equal(n.paymentMode, mode);
    assert.equal(n.amount, 150);
  }
});

test('Equity: FAILED status is preserved so the edge handler can drop it', () => {
  // bankWebhookHandler refuses to enqueue anything whose status !== SUCCESS.
  // If this ever normalised to undefined, failed payments would be allocated.
  const n = normalise('EQUITY', jengaDocSample({ status: 'FAILED' }), {});
  assert.equal(n.status, 'FAILED');
});

test('Equity: transaction.date is read as Nairobi time on ANY server timezone', () => {
  // Regression guard. Jenga sends "YYYY-MM-DD HH:mm:ss" with no zone, and it is
  // EAT. A bare new Date() resolves it against the host timezone, so this same
  // payment used to land 3 hours late on a UTC host (Render/Docker) — and after
  // 21:00 EAT, on the wrong DAY, which silently corrupts daily reconciliation.
  // Asserting an absolute instant makes this fail anywhere the offset is lost.
  const n = normalise('EQUITY', jengaDocSample(), {});
  assert.equal(new Date(n.receivedAt).toISOString(), '2023-10-11T11:15:20.000Z');
});

test('Equity: a date that already carries a zone is respected, not double-shifted', () => {
  const n = normalise('EQUITY', jengaDocSample({ date: '2023-10-11T14:15:20Z' }), {});
  assert.equal(new Date(n.receivedAt).toISOString(), '2023-10-11T14:15:20.000Z');
});

test('Equity: an unparseable date degrades to "now" rather than Invalid Date', () => {
  // An Invalid Date would reach Transaction.createdAt and poison every
  // date-ranged report; falling back to now keeps the payment usable.
  const n = normalise('EQUITY', jengaDocSample({ date: 'not-a-date' }), {});
  assert.ok(!Number.isNaN(new Date(n.receivedAt).getTime()));
});
