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
