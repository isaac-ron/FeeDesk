const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Stub the data layer BEFORE requiring the service under test ──────────────
// allocatePayment destructures recomputeStudentBalance at module-load, so the
// stub must be in place first. It also calls StudentFee.find(...).sort(...),
// which we override per-test to return fabricated fee rows (no Mongo needed).
const balanceService = require('../services/balanceService');
balanceService.recomputeStudentBalance = async () => 0;

const StudentFee = require('../models/StudentFee');
const { allocatePayment, round2 } = require('../services/paymentAllocationService');

// Fabricate a StudentFee-like row with a save() that mimics recomputeStatus.
const makeRow = (id, charged, paid = 0, { dueDate = null, createdAt = id } = {}) => ({
  _id: id,
  amountCharged: charged,
  amountPaid: paid,
  dueDate,
  createdAt,
  status: paid <= 0 ? 'UNPAID' : paid >= charged ? 'PAID' : 'PARTIAL',
  async save() {
    this.status = this.amountPaid <= 0 ? 'UNPAID'
      : this.amountPaid >= this.amountCharged ? 'PAID'
      : 'PARTIAL';
  },
});

// Install rows as the result of StudentFee.find().sort(). sort() mimics Mongo's
// { dueDate: 1, createdAt: 1 } so ordering behaviour is exercised too.
let currentRows = [];
beforeEach(() => {
  currentRows = [];
  StudentFee.find = () => ({
    sort: () =>
      [...currentRows].sort(
        (a, b) =>
          (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) ||
          (a.createdAt ?? 0) - (b.createdAt ?? 0)
      ),
  });
});

const fakeTxn = () => ({ allocations: [], async save() {} });

test('round2 tames floating-point drift', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(100.005), 100.01);
  assert.equal(round2('1500.00'), 1500);
});

test('exact payment clears a single row → PAID, nothing unallocated', async () => {
  currentRows = [makeRow('a', 1000)];
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 1000, transaction: fakeTxn() });
  assert.equal(unallocated, 0);
  assert.deepEqual(allocations, [{ studentFee: 'a', amount: 1000 }]);
  assert.equal(currentRows[0].status, 'PAID');
});

test('partial payment leaves the row PARTIAL', async () => {
  currentRows = [makeRow('a', 1000)];
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 400, transaction: fakeTxn() });
  assert.equal(unallocated, 0);
  assert.deepEqual(allocations, [{ studentFee: 'a', amount: 400 }]);
  assert.equal(currentRows[0].amountPaid, 400);
  assert.equal(currentRows[0].status, 'PARTIAL');
});

test('drains multiple rows oldest-due-first across the payment', async () => {
  // Provided out of order; sort() must apply dueDate then createdAt.
  currentRows = [
    makeRow('newer', 1000, 0, { dueDate: 200 }),
    makeRow('older', 1000, 0, { dueDate: 100 }),
  ];
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 1500, transaction: fakeTxn() });
  assert.equal(unallocated, 0);
  // Older row filled first (1000), then 500 into the newer row.
  assert.deepEqual(allocations, [
    { studentFee: 'older', amount: 1000 },
    { studentFee: 'newer', amount: 500 },
  ]);
  assert.equal(currentRows.find((r) => r._id === 'older').status, 'PAID');
  assert.equal(currentRows.find((r) => r._id === 'newer').status, 'PARTIAL');
});

test('respects existing amountPaid when computing outstanding', async () => {
  currentRows = [makeRow('a', 1000, 600)]; // 400 outstanding
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 1000, transaction: fakeTxn() });
  // Only 400 fits; 600 overpayment is returned as unallocated.
  assert.deepEqual(allocations, [{ studentFee: 'a', amount: 400 }]);
  assert.equal(unallocated, 600);
  assert.equal(currentRows[0].status, 'PAID');
});

test('overpayment beyond all dues is returned as unallocated remainder', async () => {
  currentRows = [makeRow('a', 500), makeRow('b', 500, 0, { createdAt: 2 })];
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 1200, transaction: fakeTxn() });
  assert.equal(allocations.length, 2);
  assert.equal(unallocated, 200);
});

test('fractional amounts settle exactly (no phantom PARTIAL from float drift)', async () => {
  currentRows = [makeRow('a', 100.1)];
  const { unallocated } = await allocatePayment({ studentId: 's1', amount: 100.1, transaction: fakeTxn() });
  assert.equal(unallocated, 0);
  assert.equal(currentRows[0].status, 'PAID'); // would be PARTIAL without round2
});

test('rejects non-positive amounts without touching rows', async () => {
  currentRows = [makeRow('a', 1000)];
  for (const bad of [0, -50, null, undefined, NaN]) {
    const { allocations } = await allocatePayment({ studentId: 's1', amount: bad, transaction: fakeTxn() });
    assert.deepEqual(allocations, []);
  }
  assert.equal(currentRows[0].amountPaid, 0);
});

test('writes the allocations array onto the transaction', async () => {
  currentRows = [makeRow('a', 1000)];
  const txn = fakeTxn();
  await allocatePayment({ studentId: 's1', amount: 1000, transaction: txn });
  assert.deepEqual(txn.allocations, [{ studentFee: 'a', amount: 1000 }]);
});

test('persists the overpayment remainder on transaction.unallocatedAmount (not dropped)', async () => {
  currentRows = [makeRow('a', 500), makeRow('b', 500, 0, { createdAt: 2 })];
  const txn = fakeTxn();
  const { unallocated } = await allocatePayment({ studentId: 's1', amount: 1200, transaction: txn });
  assert.equal(unallocated, 200);
  assert.equal(txn.unallocatedAmount, 200); // captured as credit, not silently lost
});

test('clears transaction.unallocatedAmount to 0 when fully allocated', async () => {
  currentRows = [makeRow('a', 1000)];
  const txn = fakeTxn();
  await allocatePayment({ studentId: 's1', amount: 1000, transaction: txn });
  assert.equal(txn.unallocatedAmount, 0);
});

test('records full amount as unallocated when the student has no outstanding rows', async () => {
  currentRows = []; // nothing owed → entire payment is overpayment/credit
  const txn = fakeTxn();
  const { allocations, unallocated } = await allocatePayment({ studentId: 's1', amount: 750, transaction: txn });
  assert.deepEqual(allocations, []);
  assert.equal(unallocated, 750);
  assert.equal(txn.unallocatedAmount, 750);
});
