const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// matchingService queries Student + PayerAlias. Requiring the models only
// compiles schemas (no DB connection); we override the statics per-test with
// fixtures keyed by query shape. No Mongo needed.
const Student = require('../models/Student');
const PayerAlias = require('../models/PayerAlias');
const { findStudentMatches, normalizeRef, normalizePhone, editDistance } = require('../services/matchingService');

let exactStudent;   // Student.findOne (exact admissionNumber)
let normStudents;   // Student.find({admissionNumberNormalized: {$in}})
let fuzzyStudents;  // Student.find({admissionNumberNormalized: {$regex}})
let phoneStudents;  // Student.find({guardianPhone})
let nameStudents;   // Student.find({$or:[name,guardianName]})
let aliasResult;    // PayerAlias.findOne(...).populate('student')
let lastNormIn;     // captured $in array for the normalized-ref query

beforeEach(() => {
  exactStudent = null;
  normStudents = [];
  fuzzyStudents = [];
  phoneStudents = [];
  nameStudents = [];
  aliasResult = null;
  lastNormIn = null;

  Student.findOne = async () => exactStudent;
  Student.find = (q) => {
    let rows = [];
    if (q && q.admissionNumberNormalized) {
      if (q.admissionNumberNormalized.$in) { lastNormIn = q.admissionNumberNormalized.$in; rows = normStudents; }
      else if (q.admissionNumberNormalized.$regex) rows = fuzzyStudents;
    } else if (q && q.guardianPhone) rows = phoneStudents;
    else if (q && q.$or) rows = nameStudents;
    return { limit: () => Promise.resolve(rows) };
  };
  PayerAlias.findOne = () => ({ populate: () => Promise.resolve(aliasResult) });
});

const stu = (id, name, adm, norm) => ({ _id: id, name, admissionNumber: adm, admissionNumberNormalized: norm });
const school = { _id: 'school1' };

// ── pure helpers ─────────────────────────────────────────────────────────────
test('normalizeRef collapses punctuation/case, strips leading zeros & prefix', () => {
  assert.equal(normalizeRef('ADM-2026-04'), 'ADM202604');
  assert.equal(normalizeRef('04022'), '4022');
  assert.equal(normalizeRef('ADM-4022', { prefix: 'ADM' }), '4022');
  assert.equal(normalizeRef(null), '');
});

test('normalizePhone canonicalises Kenyan formats', () => {
  assert.equal(normalizePhone('0712345678'), '254712345678');
  assert.equal(normalizePhone('712345678'), '254712345678');
  assert.equal(normalizePhone('nope'), null);
});

test('editDistance is bounded and correct for small edits', () => {
  assert.equal(editDistance('4022', '4022'), 0);
  assert.equal(editDistance('4022', '4023'), 1);
  assert.equal(editDistance('4022', '9999', 2), 3); // exceeds max → max+1
});

// ── Tier 0: learned alias ────────────────────────────────────────────────────
test('Tier 0 — a learned alias auto-matches and short-circuits everything', async () => {
  aliasResult = { student: stu('x', 'Xavier', '5001', '5001') };
  exactStudent = stu('other', 'Other', '4022', '4022'); // would also match, but alias wins
  const r = await findStudentMatches({ school, accountRef: '4022', payerPhone: '0712345678' });
  assert.equal(r.method, 'ALIAS');
  assert.equal(r.autoMatch._id, 'x');
  assert.equal(r.confidence, 0.95);
});

// ── Tier 1/2/3 auto-match ────────────────────────────────────────────────────
test('Tier 1 — exact reference auto-matches', async () => {
  exactStudent = stu('a', 'Alice', '4022', '4022');
  const r = await findStudentMatches({ school, accountRef: '4022' });
  assert.equal(r.method, 'EXACT_REF');
  assert.equal(r.confidence, 1);
});

test('Tier 2 — unique normalized reference auto-matches', async () => {
  normStudents = [stu('a', 'Alice', '4022', '4022')];
  const r = await findStudentMatches({ school, accountRef: 'ADM-4022' });
  assert.equal(r.method, 'NORMALIZED_REF');
  assert.equal(r.autoMatch._id, 'a');
});

test('prefix tolerance — a parent omitting the school prefix still matches', async () => {
  // School prefix 'ADM'; parent typed bare "4022"; stored normalized is "ADM4022".
  normStudents = [stu('a', 'Alice', 'ADM-4022', 'ADM4022')];
  const r = await findStudentMatches({ school, accountRef: '4022', prefix: 'ADM' });
  // The query must have included the prefixed variant.
  assert.ok(lastNormIn.includes('ADM4022'), `variants were ${JSON.stringify(lastNormIn)}`);
  assert.equal(r.autoMatch._id, 'a');
  assert.equal(r.method, 'NORMALIZED_REF');
});

test('Tier 3 — unique payer phone auto-matches when no ref match', async () => {
  phoneStudents = [stu('b', 'Brian', '3910', '3910')];
  const r = await findStudentMatches({ school, accountRef: 'garbage', payerPhone: '254700111222' });
  assert.equal(r.method, 'PHONE');
  assert.equal(r.confidence, 0.85);
});

// ── ambiguity → suggestions, never auto ──────────────────────────────────────
test('siblings (shared phone) → no auto-match, both as candidates', async () => {
  phoneStudents = [stu('a', 'Alice', '4022', '4022'), stu('d', 'Dan', '4055', '4055')];
  const r = await findStudentMatches({ school, accountRef: 'unknown', payerPhone: '0712345678' });
  assert.equal(r.autoMatch, null);
  assert.equal(r.candidates.length, 2);
  assert.ok(r.candidates[0].reasons.includes('Payer phone matches guardian'));
});

// ── Tier 4: fuzzy reference (suggestion only) ────────────────────────────────
test('Tier 4 — a near-miss reference surfaces as a fuzzy suggestion', async () => {
  fuzzyStudents = [stu('a', 'Alice', '4022', '4022')];
  const r = await findStudentMatches({ school, accountRef: '4023' }); // 1 edit away
  assert.equal(r.autoMatch, null);
  assert.equal(r.candidates.length, 1);
  assert.ok(r.candidates[0].reasons.includes('Reference looks similar'));
});

// ── Tier 5: name (suggestion only) — load-bearing for bank narratives ────────
test('Tier 5 — payer name surfaces a name suggestion', async () => {
  nameStudents = [stu('a', 'Alice Wanjiku', '4022', '4022')];
  const r = await findStudentMatches({ school, accountRef: 'unknownref', payerName: 'ALICE WANJIKU' });
  assert.equal(r.autoMatch, null);
  const alice = r.candidates.find((c) => c.student._id === 'a');
  assert.ok(alice, 'Alice should be suggested by name');
  assert.ok(alice.reasons.includes('Name match'));
});

test('no signals → NONE with no candidates', async () => {
  const r = await findStudentMatches({ school, accountRef: 'nope' });
  assert.equal(r.autoMatch, null);
  assert.deepEqual(r.candidates, []);
});

test('missing school → safe empty result', async () => {
  const r = await findStudentMatches({ accountRef: '4022' });
  assert.equal(r.autoMatch, null);
  assert.deepEqual(r.candidates, []);
});
