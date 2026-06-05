// Real-concurrency proof for per-student payment allocation.
//
// Boots an in-memory MongoDB **replica set** (so this also doubles as the
// staging rig for the future Mongo-session atomicity work) and fires many
// concurrent allocatePayment() calls for the SAME student — the exact race the
// worker hits at concurrency=5. Asserts money-conservation invariants that hold
// only if allocations are serialized:
//
//   • no row is ever paid beyond its charge
//   • Σ(allocations recorded on transactions) === Σ(amountPaid on rows)
//       → i.e. no double-counting; recorded allocations equal money truly applied
//   • Σ(allocations) === min(total charged, total paid)   → dues covered exactly
//   • Σ(allocations) + Σ(unallocatedAmount) === total paid → every shilling lands
//
// Run with:  npm run test:concurrency
// (Kept out of the fast `npm test` suite — it downloads a mongod binary on first
//  run and is slower.)

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const Student = require('../../models/Student');
const StudentFee = require('../../models/StudentFee');
const Transaction = require('../../models/Transaction');
const Lock = require('../../models/Lock');
const { allocatePayment, round2 } = require('../../services/paymentAllocationService');

let replset;

before(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri(), { dbName: 'alloc_concurrency' });
  await Promise.all([Student.init(), StudentFee.init(), Transaction.init(), Lock.init()]);
}, { timeout: 120000 });

after(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

beforeEach(async () => {
  await Promise.all([
    Student.deleteMany({}),
    StudentFee.deleteMany({}),
    Transaction.deleteMany({}),
    Lock.deleteMany({}),
  ]);
});

// Seed a student (no School model needed — a stand-in ObjectId is fine) with the
// given list of charged amounts as separate fee rows.
const seedStudent = async (charges) => {
  const school = new mongoose.Types.ObjectId();
  const term = new mongoose.Types.ObjectId();
  const feeStructure = new mongoose.Types.ObjectId();
  const student = await Student.create({
    school,
    admissionNumber: 'ADM-100',
    name: 'Race Test',
    guardianName: 'Guardian',
    guardianPhone: '254700000000',
  });
  for (let i = 0; i < charges.length; i++) {
    await StudentFee.create({
      school,
      student: student._id,
      term,
      feeStructure,
      feeItemId: new mongoose.Types.ObjectId(),
      name: `Item ${i}`,
      type: 'tuition',
      amountCharged: charges[i],
      amountPaid: 0,
    });
  }
  return { school, student };
};

// Fire `count` payments of `each` concurrently against the student.
const blastConcurrentPayments = async ({ school, student }, count, each) => {
  const txns = [];
  for (let i = 0; i < count; i++) {
    txns.push(
      await Transaction.create({
        school,
        student: student._id,
        transactionId: `T-${i}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount: each,
        source: 'MPESA',
        reference: 'ADM-100',
        status: 'PENDING',
      })
    );
  }
  // The actual concurrency: all allocations in flight at once.
  await Promise.all(
    txns.map((t) => allocatePayment({ studentId: student._id, amount: each, transaction: t }))
  );
};

const assertConserved = async (student, { totalCharged, totalPaid }) => {
  const rows = await StudentFee.find({ student: student._id });
  const sumRowsPaid = round2(rows.reduce((s, r) => s + r.amountPaid, 0));
  for (const r of rows) {
    assert.ok(
      r.amountPaid <= r.amountCharged + 1e-9,
      `row over-applied: ${r.amountPaid} > charged ${r.amountCharged}`
    );
  }

  const txns = await Transaction.find({ student: student._id });
  const sumAlloc = round2(
    txns.reduce((s, t) => s + t.allocations.reduce((a, x) => a + x.amount, 0), 0)
  );
  const sumUnalloc = round2(txns.reduce((s, t) => s + (t.unallocatedAmount || 0), 0));

  // No double-counting: recorded allocations equal money actually on the rows.
  assert.equal(sumAlloc, sumRowsPaid, 'Σ allocations must equal Σ amountPaid on rows');
  // Dues covered exactly (up to what was paid).
  assert.equal(sumAlloc, Math.min(totalCharged, totalPaid), 'dues not covered exactly');
  // Conservation: every shilling is either applied or held as credit.
  assert.equal(round2(sumAlloc + sumUnalloc), totalPaid, 'money not conserved');
};

test('20 concurrent full-amount payments on a single 1000 due → exactly one allocates, rest credit', async () => {
  const ctx = await seedStudent([1000]);
  await blastConcurrentPayments(ctx, 20, 1000); // 20 × 1000 = 20000 paid, 1000 owed
  await assertConserved(ctx.student, { totalCharged: 1000, totalPaid: 20000 });
});

test('12 concurrent partial payments draining three rows → rows fully paid, no money lost', async () => {
  const ctx = await seedStudent([500, 500, 500]); // 1500 owed
  await blastConcurrentPayments(ctx, 12, 250); // 12 × 250 = 3000 paid
  await assertConserved(ctx.student, { totalCharged: 1500, totalPaid: 3000 });

  const rows = await StudentFee.find({ student: ctx.student._id });
  for (const r of rows) assert.equal(r.status, 'PAID');
});

test('exact-coverage swarm: 10 concurrent payments summing to the exact balance', async () => {
  const ctx = await seedStudent([300, 700]); // 1000 owed
  await blastConcurrentPayments(ctx, 10, 100); // 10 × 100 = 1000 paid, exact
  await assertConserved(ctx.student, { totalCharged: 1000, totalPaid: 1000 });

  const rows = await StudentFee.find({ student: ctx.student._id });
  for (const r of rows) assert.equal(r.status, 'PAID');
});
