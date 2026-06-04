const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseDelimited, applyMapping, synthRef } = require('../services/statementImportService');

// ── CSV parsing ──────────────────────────────────────────────────────────────
test('parseDelimited reads headers + rows, trimming and handling BOM', () => {
  const csv = '﻿Date,Ref,Amount\n2026-06-01,ADM-4022,5000\n2026-06-02, 4055 ,2000\n';
  const { headers, rows } = parseDelimited(csv);
  assert.deepEqual(headers, ['Date', 'Ref', 'Amount']);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Ref, 'ADM-4022');
  assert.equal(rows[1].Ref, '4055'); // trimmed
});

test('parseDelimited handles quoted fields with embedded commas/quotes/newlines', () => {
  const csv = 'Ref,Narration,Amount\n' +
    '"A1","Pay, fees ""term 1""",1000\n' +
    '"A2","line1\nline2",2000\n';
  const { rows } = parseDelimited(csv);
  assert.equal(rows[0].Narration, 'Pay, fees "term 1"');
  assert.equal(rows[1].Narration, 'line1\nline2');
  assert.equal(rows.length, 2);
});

test('parseDelimited supports a custom delimiter and ignores blank lines', () => {
  const { headers, rows } = parseDelimited('a;b\n1;2\n\n3;4\n', ';');
  assert.deepEqual(headers, ['a', 'b']);
  assert.equal(rows.length, 2);
});

// ── column mapping → canonical credit rows ───────────────────────────────────
const profileSeparate = {
  amountMode: 'separate',
  columns: { txnRef: 'Ref', date: 'Date', credit: 'Credit', debit: 'Debit', reference: 'Narration', payerName: 'Payer' },
};

test('applyMapping (separate columns) flags credits vs debits', () => {
  const rows = [
    { Ref: 'T1', Date: '2026-06-01', Credit: '5000', Debit: '', Narration: 'ADM-4022', Payer: 'Jane' },
    { Ref: 'T2', Date: '2026-06-01', Credit: '', Debit: '300', Narration: 'BANK CHARGE', Payer: '' },
  ];
  const out = applyMapping(rows, profileSeparate);
  assert.equal(out[0].isCredit, true);
  assert.equal(out[0].amount, 5000);
  assert.equal(out[0].reference, 'ADM-4022');
  assert.equal(out[0].payerName, 'Jane');
  assert.ok(out[0].valueDate instanceof Date);
  assert.equal(out[1].isCredit, false); // debit row excluded downstream
});

test('applyMapping (direction mode) uses a credit token', () => {
  const profile = { amountMode: 'direction', creditTokens: ['CR', 'CREDIT'], columns: { amount: 'Amount', direction: 'Type', reference: 'Desc' } };
  const out = applyMapping([
    { Amount: '1000', Type: 'CR', Desc: '4022' },
    { Amount: '50', Type: 'DR', Desc: 'fee' },
  ], profile);
  assert.equal(out[0].isCredit, true);
  assert.equal(out[0].amount, 1000);
  assert.equal(out[1].isCredit, false);
});

test('applyMapping (signed mode) treats positive as credit and strips currency formatting', () => {
  const profile = { amountMode: 'signed', columns: { amount: 'Amount', reference: 'Ref' } };
  const out = applyMapping([
    { Amount: 'KES 1,500.00', Ref: '4022' },
    { Amount: '-200', Ref: 'reversal' },
  ], profile);
  assert.equal(out[0].isCredit, true);
  assert.equal(out[0].amount, 1500);
  assert.equal(out[1].isCredit, false);
  assert.equal(out[1].amount, 200);
});

// ── dedup key ────────────────────────────────────────────────────────────────
test('synthRef is deterministic for the same row (stable dedup when no bank ref)', () => {
  const row = { valueDate: new Date('2026-06-01'), amount: 5000, reference: 'ADM-4022', payerName: 'Jane' };
  assert.equal(synthRef('school1', row), synthRef('school1', row));
  assert.notEqual(synthRef('school1', row), synthRef('school1', { ...row, amount: 5001 }));
});
