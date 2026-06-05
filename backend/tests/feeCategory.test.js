const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCategoryCsv,
  validateCategories,
  allocateByPercent,
  deriveCategoryBreakdown,
  round2,
} = require('../services/feeCategoryService');

// ── parseCategoryCsv ─────────────────────────────────────────────────────────
test('parseCategoryCsv parses name,percent rows', () => {
  assert.deepEqual(parseCategoryCsv('Tuition,60\nBoarding,30\nActivity,10'), [
    { name: 'Tuition', percent: 60 },
    { name: 'Boarding', percent: 30 },
    { name: 'Activity', percent: 10 },
  ]);
});

test('parseCategoryCsv tolerates a header row, % sign, quoted commas, blank lines', () => {
  const csv = 'category,percent\nTuition,60%\n\n"Co-curricular, sports",40\n';
  assert.deepEqual(parseCategoryCsv(csv), [
    { name: 'Tuition', percent: 60 },
    { name: 'Co-curricular, sports', percent: 40 },
  ]);
});

test('parseCategoryCsv rejects empty input, single-column and mid-list bad percents', () => {
  assert.throws(() => parseCategoryCsv(''), /empty/i);
  assert.throws(() => parseCategoryCsv('JustOneColumn'), /category,percent/);
  // First numeric row is real; the second is malformed → surfaced.
  assert.throws(() => parseCategoryCsv('Tuition,60\nBoarding,abc'), /Invalid percent/);
});

// ── validateCategories ───────────────────────────────────────────────────────
test('validateCategories accepts shares summing to 100 and trims names', () => {
  assert.deepEqual(
    validateCategories([{ name: ' Tuition ', percent: 60 }, { name: 'Boarding', percent: 40 }]),
    [{ name: 'Tuition', percent: 60 }, { name: 'Boarding', percent: 40 }]
  );
});

test('validateCategories rejects sums that are not 100', () => {
  assert.throws(
    () => validateCategories([{ name: 'A', percent: 50 }, { name: 'B', percent: 40 }]),
    /sum to 100/
  );
});

test('validateCategories rejects duplicates, empty names, out-of-range and empty list', () => {
  assert.throws(() => validateCategories([{ name: 'A', percent: 50 }, { name: 'a', percent: 50 }]), /Duplicate/);
  assert.throws(() => validateCategories([{ name: '', percent: 100 }]), /name cannot be empty/);
  assert.throws(() => validateCategories([{ name: 'A', percent: 0 }, { name: 'B', percent: 100 }]), /between 0 and 100/);
  assert.throws(() => validateCategories([]), /At least one/);
});

test('validateCategories tolerates a cent of rounding in the sum (33.33×2 + 33.34)', () => {
  assert.equal(
    validateCategories([
      { name: 'A', percent: 33.33 },
      { name: 'B', percent: 33.33 },
      { name: 'C', percent: 33.34 },
    ]).length,
    3
  );
});

// ── allocateByPercent (exact, no missing cent) ───────────────────────────────
test('allocateByPercent splits a round total exactly', () => {
  assert.deepEqual(allocateByPercent(40000, [{ percent: 60 }, { percent: 30 }, { percent: 10 }]), [24000, 12000, 4000]);
});

test('allocateByPercent uses largest-remainder so awkward splits still sum exact', () => {
  const parts = allocateByPercent(100, [{ percent: 33.33 }, { percent: 33.33 }, { percent: 33.34 }]);
  assert.equal(round2(parts.reduce((a, b) => a + b, 0)), 100);
  assert.deepEqual(parts, [33.33, 33.33, 33.34]);
});

test('allocateByPercent conserves to the cent on a non-round total', () => {
  const parts = allocateByPercent(100.01, [{ percent: 50 }, { percent: 50 }]);
  assert.equal(round2(parts.reduce((a, b) => a + b, 0)), 100.01);
});

// ── deriveCategoryBreakdown (the pro-rata statement payoff) ───────────────────
test('deriveCategoryBreakdown shows the same proportion paid across every category', () => {
  const cats = [
    { name: 'Tuition', percent: 60 },
    { name: 'Boarding', percent: 30 },
    { name: 'Activity', percent: 10 },
  ];
  assert.deepEqual(deriveCategoryBreakdown(cats, 40000, 20000), [
    { name: 'Tuition', percent: 60, charged: 24000, paid: 12000, outstanding: 12000 },
    { name: 'Boarding', percent: 30, charged: 12000, paid: 6000, outstanding: 6000 },
    { name: 'Activity', percent: 10, charged: 4000, paid: 2000, outstanding: 2000 },
  ]);
});

test('deriveCategoryBreakdown: charged and paid each sum exactly to the row totals', () => {
  const cats = [{ name: 'A', percent: 33.33 }, { name: 'B', percent: 33.33 }, { name: 'C', percent: 33.34 }];
  const b = deriveCategoryBreakdown(cats, 1000, 333.33);
  assert.equal(round2(b.reduce((s, x) => s + x.charged, 0)), 1000);
  assert.equal(round2(b.reduce((s, x) => s + x.paid, 0)), 333.33);
});

test('deriveCategoryBreakdown: zero paid → all outstanding; no categories → []', () => {
  assert.deepEqual(deriveCategoryBreakdown([{ name: 'A', percent: 100 }], 5000, 0), [
    { name: 'A', percent: 100, charged: 5000, paid: 0, outstanding: 5000 },
  ]);
  assert.deepEqual(deriveCategoryBreakdown([], 5000, 1000), []);
});
