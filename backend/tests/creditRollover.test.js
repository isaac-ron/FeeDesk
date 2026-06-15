const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Stub the data layer BEFORE requiring the service under test ──────────────
// creditService destructures recomputeStudentBalance + acquireLock at module
// load, so the stubs must be installed first.
const balanceService = require('../services/balanceService');
balanceService.recomputeStudentBalance = async () => 0;
const lockService = require('../services/lockService');
lockService.acquireLock = async () => async () => {}; // no-op lock + release

const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const LedgerEntry = require('../models/LedgerEntry');
const { applyStudentCredit, getAvailableCredit } = require('../services/creditService');

// Fabricated fee row whose save() mirrors StudentFee.recomputeStatus().
const makeRow = (id, charged, paid = 0, { dueDate = null, createdAt = id } = {}) => ({
  _id: id,
  school: 'sch',
  term: 'term',
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

// Fabricated overpayment transaction holding spendable credit.
const makeTxn = (id, unallocated, { creditApplied = 0, createdAt = id } = {}) => ({
  _id: id,
  transactionId: id,
  unallocatedAmount: unallocated,
  creditApplied,
  createdAt,
  async save() {},
});

let rows = [];
let txns = [];
let ledger = [];

beforeEach(() => {
  rows = [];
  txns = [];
  ledger = [];

  // Honour the status filter + Mongo sort so ordering + "only owing rows" behave.
  StudentFee.find = () => ({
    sort: () =>
      rows
        .filter((r) => r.status === 'UNPAID' || r.status === 'PARTIAL')
        .sort(
          (a, b) =>
            (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) ||
            (a.createdAt ?? 0) - (b.createdAt ?? 0)
        ),
  });
  Transaction.find = async () => [...txns];
  LedgerEntry.insertMany = async (docs) => { ledger.push(...docs); };
});

test('applies overpayment credit to an unpaid row → PAID, credit consumed', async () => {
  rows = [makeRow('f1', 1000)];
  txns = [makeTxn('t1', 1000)];

  const res = await applyStudentCredit({ studentId: 's1' });

  assert.equal(res.applied, 1000);
  assert.equal(res.rowsAffected, 1);
  assert.equal(rows[0].amountPaid, 1000);
  assert.equal(rows[0].status, 'PAID');
  assert.equal(txns[0].creditApplied, 1000);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].type, 'payment');
  assert.equal(ledger[0].amount, 1000);
  assert.equal(ledger[0].payment, 't1');
});

test('is idempotent — a second run spends nothing', async () => {
  rows = [makeRow('f1', 1000)];
  txns = [makeTxn('t1', 1000)];

  await applyStudentCredit({ studentId: 's1' });
  const second = await applyStudentCredit({ studentId: 's1' });

  assert.equal(second.applied, 0);
  assert.equal(txns[0].creditApplied, 1000); // not double-spent
});

test('consumes credit oldest-first across multiple transactions', async () => {
  rows = [makeRow('f1', 1500)];
  txns = [makeTxn('t1', 1000, { createdAt: 1 }), makeTxn('t2', 1000, { createdAt: 2 })];

  const res = await applyStudentCredit({ studentId: 's1' });

  assert.equal(res.applied, 1500);
  assert.equal(rows[0].status, 'PAID');
  assert.equal(txns[0].creditApplied, 1000); // older fully drained
  assert.equal(txns[1].creditApplied, 500);  // newer partially drained
});

test('credit beyond outstanding leaves the remainder spendable', async () => {
  rows = [makeRow('f1', 400)];
  txns = [makeTxn('t1', 1000)];

  const res = await applyStudentCredit({ studentId: 's1' });

  assert.equal(res.applied, 400);
  assert.equal(rows[0].status, 'PAID');
  assert.equal(txns[0].creditApplied, 400);
  assert.equal(await getAvailableCredit('s1'), 600); // 600 still on the books
});

test('does nothing when there is no credit', async () => {
  rows = [makeRow('f1', 1000)];
  txns = [];
  const res = await applyStudentCredit({ studentId: 's1' });
  assert.equal(res.applied, 0);
  assert.equal(rows[0].amountPaid, 0);
});

test('does nothing when there are no owing rows (credit untouched)', async () => {
  rows = [];
  txns = [makeTxn('t1', 1000)];
  const res = await applyStudentCredit({ studentId: 's1' });
  assert.equal(res.applied, 0);
  assert.equal(txns[0].creditApplied, 0);
});

test('settles fractional amounts exactly (no float-drift PARTIAL)', async () => {
  rows = [makeRow('f1', 100.1)];
  txns = [makeTxn('t1', 100.1)];
  const res = await applyStudentCredit({ studentId: 's1' });
  assert.equal(res.applied, 100.1);
  assert.equal(rows[0].status, 'PAID');
  assert.equal(txns[0].creditApplied, 100.1);
});

test('spreads one credit across several owing rows, oldest-due-first', async () => {
  rows = [
    makeRow('newer', 500, 0, { dueDate: 200 }),
    makeRow('older', 500, 0, { dueDate: 100 }),
  ];
  txns = [makeTxn('t1', 700)];

  const res = await applyStudentCredit({ studentId: 's1' });

  assert.equal(res.applied, 700);
  assert.equal(rows.find((r) => r._id === 'older').status, 'PAID');     // 500
  assert.equal(rows.find((r) => r._id === 'newer').amountPaid, 200);    // 200
  assert.equal(rows.find((r) => r._id === 'newer').status, 'PARTIAL');
  assert.equal(txns[0].creditApplied, 700);
});
