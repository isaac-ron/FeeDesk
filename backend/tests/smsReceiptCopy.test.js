const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildPaymentReceiptBody, toGsm7 } = require('../services/smsService');
const { formatNairobiShortDate } = require('../utils/time');

// Receipt copy is billed per 160-character GSM-7 segment and is read by
// guardians on feature phones. These assertions guard three things: that old
// debt is attributed to the term it came from, that nothing demands money which
// is not yet due, and that the body never silently falls out of GSM-7 (which
// would cut the segment from 160 characters to 70).

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';

/** GSM-7 septet count, or null when the text would force UCS-2. */
const gsmUnits = (text) => {
  let units = 0;
  for (const ch of text) {
    if (GSM_EXT.includes(ch)) units += 2;
    else if (GSM_BASIC.includes(ch)) units += 1;
    else return null;
  }
  return units;
};

const base = { studentName: 'John Kamau', amount: 5000, reference: 'SJ45KL9821' };

const breakdown = (over = {}) => ({
  schoolName: 'Riverside Academy',
  termLabel: 'Term 2',
  termDue: 0,
  arrears: 0,
  arrearsSources: [],
  dueDate: new Date('2026-09-05T00:00:00Z'),
  termOverdue: false,
  ...over,
});

const source = (label, amount) => ({ label, amount });

test('the school name opens the message, not a product name', () => {
  const body = buildPaymentReceiptBody({ ...base, amount: 12500, breakdown: breakdown() });

  assert.match(body, /^Riverside Academy: /);
  // Each school sends under its own sender ID, so a product name here would
  // read to the guardian as an SMS from a stranger.
  assert.doesNotMatch(body, /SchoolPay/);
});

test('a fully settled term says so plainly and asks for nothing', () => {
  const body = buildPaymentReceiptBody({ ...base, amount: 12500, breakdown: breakdown() });

  assert.match(body, /Term 2 fees are now fully paid\./);
  assert.doesNotMatch(body, /unpaid|balance|overdue/i);
});

test('a term balance is stated with its due date', () => {
  const body = buildPaymentReceiptBody({ ...base, breakdown: breakdown({ termDue: 12500 }) });

  assert.match(body, /Term 2 balance is KES 12,500, due 05 Sep\./);
  assert.doesNotMatch(body, /overdue/);
});

test('arrears name the term they came from', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({ termDue: 12500, arrears: 8200, arrearsSources: [source('Term 1', 8200)] }),
  });

  assert.match(body, /KES 8,200 from Term 1 still unpaid/);
  assert.match(body, /Total to clear: KES 20,700\./);
  // Bookkeeping shorthand is meaningless to a guardian deciding what to pay.
  assert.doesNotMatch(body, /b\/f|arrears|REMINDER/i);
});

test('debt from a previous academic year carries its year', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({ termDue: 12500, arrears: 8200, arrearsSources: [source('Term 3 2025', 8200)] }),
  });

  assert.match(body, /KES 8,200 from Term 3 2025 still unpaid/);
});

test('two source terms are itemised so either can be cleared on its own', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({
      termDue: 12500,
      arrears: 14700,
      arrearsSources: [source('Term 3 2025', 6500), source('Term 1', 8200)],
    }),
  });

  assert.match(body, /KES 6,500 from Term 3 2025 and KES 8,200 from Term 1 still unpaid/);
  assert.match(body, /Total to clear: KES 27,200\./);
});

test('more than two source terms collapse rather than sprawl', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({
      termDue: 12500,
      arrears: 26000,
      arrearsSources: [
        source('Term 1 2025', 5000),
        source('Term 2 2025', 6000),
        source('Term 3 2025', 7000),
        source('Term 1', 8000),
      ],
    }),
  });

  assert.match(body, /KES 26,000 from earlier terms still unpaid/);
  assert.doesNotMatch(body, /Term 2 2025/);
});

test('overdue arrears do not mark a term charge that is not yet due', () => {
  // The case a single message-level "overdue" flag gets wrong: the guardian owes
  // old debt AND this term's fees, but this term's fees are not due until
  // 05 Sep. Calling the whole total overdue duns them for money they do not
  // yet owe.
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({ termDue: 12500, arrears: 8200, arrearsSources: [source('Term 1', 8200)] }),
  });

  assert.match(body, /Term 2 balance is KES 12,500, due 05 Sep\./);
  assert.doesNotMatch(body, /overdue/);
});

test('an overdue term charge is named as overdue', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({ termDue: 12500, termOverdue: true }),
  });

  assert.match(body, /Term 2 balance is KES 12,500, now overdue\./);
});

test('a settled term alongside old debt reports both truthfully', () => {
  const body = buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({ arrears: 8200, arrearsSources: [source('Term 1', 8200)] }),
  });

  assert.match(body, /Term 2 fees are fully paid\./);
  assert.match(body, /KES 8,200 from Term 1 still unpaid/);
  // The regression this guards: reporting a "KES 0" term balance.
  assert.doesNotMatch(body, /KES 0/);
  // With one figure outstanding, a total would just repeat it.
  assert.doesNotMatch(body, /Total to clear/);
});

test('overpayment is reported as credit, not as a zero balance', () => {
  // currentBalance is stored as -(outstanding) and is never positive, so the
  // credit has to come from the transaction's unallocated remainder.
  const body = buildPaymentReceiptBody({ ...base, amount: 15000, breakdown: breakdown(), credit: 2000 });

  assert.match(body, /KES 2,000 is held as credit\./);
  assert.doesNotMatch(body, /KES 0/);
});

test('with no ACTIVE term the copy falls back to a plain total, naming no term', () => {
  const body = buildPaymentReceiptBody({ ...base, breakdown: null, newBalance: -20700 });

  assert.match(body, /Balance remaining: KES 20,700\./);
  assert.doesNotMatch(body, /Term/);
  assert.doesNotMatch(body, /unpaid/);
});

test('a zero balance never reads as "KES 0"', () => {
  const body = buildPaymentReceiptBody({ ...base, breakdown: null, newBalance: 0 });

  assert.match(body, /Fees are now fully paid\./);
  assert.doesNotMatch(body, /KES 0/);
});

test('typographic characters are folded to ASCII before hitting the wire', () => {
  // A single em dash forces UCS-2, cutting the segment from 160 to 70 septets
  // and roughly tripling the bill for every message that carries one.
  const wire = toGsm7(buildPaymentReceiptBody({
    ...base,
    studentName: 'John — Kamau',
    breakdown: breakdown({ termDue: 12500 }),
  }));

  assert.doesNotMatch(wire, /—/);
  assert.match(wire, /John - Kamau/);
  assert.notEqual(gsmUnits(wire), null, 'body must stay within GSM-7');
});

test('everyday receipts stay within a single 160-character segment', () => {
  const single = [
    { ...base, amount: 12500, breakdown: breakdown() },
    { ...base, amount: 15000, breakdown: breakdown(), credit: 2000 },
    { ...base, breakdown: breakdown({ termDue: 12500 }) },
    { ...base, breakdown: breakdown({ arrears: 8200, arrearsSources: [source('Term 1', 8200)] }) },
    { ...base, breakdown: null, newBalance: -20700 },
  ];

  for (const args of single) {
    const units = gsmUnits(toGsm7(buildPaymentReceiptBody(args)));
    assert.notEqual(units, null, 'body must stay within GSM-7');
    assert.ok(units <= 160, `expected a single segment, got ${units} septets`);
  }
});

test('the worst case — term balance plus arrears — stays within two segments', () => {
  const units = gsmUnits(toGsm7(buildPaymentReceiptBody({
    ...base,
    breakdown: breakdown({
      termDue: 12500,
      arrears: 14700,
      arrearsSources: [source('Term 3 2025', 6500), source('Term 1', 8200)],
    }),
  })));

  assert.notEqual(units, null, 'body must stay within GSM-7');
  assert.ok(units <= 306, `expected at most two segments, got ${units} septets`);
});

test('short date formatting is pinned to Nairobi and to a 3-letter month', () => {
  // 21:30Z on the 5th is already the 6th in Nairobi. "Sept" on some ICU builds
  // would silently add a character to every message carrying a due date.
  assert.equal(formatNairobiShortDate('2026-09-05T21:30:00Z'), '06 Sep');
  assert.equal(formatNairobiShortDate('2026-09-05T00:00:00Z'), '05 Sep');
});
