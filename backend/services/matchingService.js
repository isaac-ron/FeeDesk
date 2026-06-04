const Student = require('../models/Student');
const PayerAlias = require('../models/PayerAlias');
const { normalizeRef, normalizePhone } = require('../utils/matchUtils');

// Matching ladder for inbound payments. Given the signals a payment carries
// (the typed account reference, the payer's phone, the payer's name), find the
// student it belongs to — or, if ambiguous, return ranked candidates for the
// bursar to resolve in one click.
//
// Tiers (in order):
//   0. ALIAS          — a learned (school, signal)→student mapping (Phase 2)
//   1. EXACT_REF      — admissionNumber === accountRef (verbatim)
//   2. NORMALIZED_REF — normalized(accountRef) === admissionNumberNormalized,
//                       trying prefix-included/omitted variants
//   3. PHONE          — payer phone === a student's guardianPhone
// Suggestion-only tiers (never auto-match), used to build candidates:
//   4. FUZZY_REF      — small edit-distance against admissionNumberNormalized
//   5. NAME           — payer name tokens vs student/guardian name
//
// Auto-match is conservative: only when a signal points to exactly ONE student
// with no conflicting evidence. Siblings, collisions, and ref-vs-phone
// disagreements fall through to suggestions.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Bounded Levenshtein — returns the true distance, or max+1 once it provably
// exceeds `max` (cheap early-out for the fuzzy tier).
const editDistance = (a, b, max = 2) => {
  a = String(a); b = String(b);
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
};

// Build normalized-reference variants so a parent who omits/includes the school
// admission prefix still matches (e.g. prefix 'ADM': "4022" ↔ stored "ADM4022").
const refVariants = (accountRef, prefix) => {
  const out = new Set();
  const base = normalizeRef(accountRef);
  if (base) out.add(base);
  if (prefix) {
    const stripped = normalizeRef(accountRef, { prefix });
    if (stripped) out.add(stripped);
    const P = normalizeRef(prefix);
    if (P && base && !base.startsWith(P)) out.add(P + base);
  }
  return [...out];
};

/**
 * @param {object} params
 * @param {object} params.school      resolved School doc (or its _id)
 * @param {string} params.accountRef  reference the payer typed (admission no)
 * @param {string} [params.payerPhone] payer MSISDN, if the channel provides it
 * @param {string} [params.payerName]  payer/depositor name (for suggestions)
 * @param {string} [params.prefix]     school admission prefix to tolerate
 */
const findStudentMatches = async ({ school, accountRef, payerPhone, payerName, prefix } = {}) => {
  const schoolId = school?._id || school;
  if (!schoolId) return { autoMatch: null, method: 'NONE', confidence: 0, candidates: [] };

  const cleanRef = String(accountRef || '').trim().toUpperCase();
  const phone = normalizePhone(payerPhone);
  const variants = refVariants(accountRef, prefix);

  // Tier 0 — learned alias (phone or any ref variant)
  const aliasSignals = [...variants];
  if (phone) aliasSignals.push(phone);
  if (aliasSignals.length) {
    const alias = await PayerAlias.findOne({ school: schoolId, signal: { $in: aliasSignals } }).populate('student');
    if (alias && alias.student) {
      return { autoMatch: alias.student, method: 'ALIAS', confidence: 0.95, candidates: [] };
    }
  }

  // Tier 1 — exact reference
  if (cleanRef) {
    const exact = await Student.findOne({ school: schoolId, admissionNumber: cleanRef });
    if (exact) return { autoMatch: exact, method: 'EXACT_REF', confidence: 1, candidates: [] };
  }

  // Tier 2 — normalized reference (variants)
  const normMatches = variants.length
    ? await Student.find({ school: schoolId, admissionNumberNormalized: { $in: variants } }).limit(10)
    : [];

  // Tier 3 — payer phone → guardianPhone
  const phoneMatches = phone
    ? await Student.find({ school: schoolId, guardianPhone: phone }).limit(10)
    : [];

  const byId = new Map();
  const add = (s, reason, weight) => {
    const id = String(s._id);
    if (!byId.has(id)) byId.set(id, { student: s, reasons: [], score: 0 });
    const e = byId.get(id);
    if (!e.reasons.includes(reason)) { e.reasons.push(reason); e.score += weight; }
  };
  normMatches.forEach((s) => add(s, 'Reference match', 0.6));
  phoneMatches.forEach((s) => add(s, 'Payer phone matches guardian', 0.5));

  // Auto-match decision — only when unambiguous.
  const uniqueNorm = normMatches.length === 1 ? normMatches[0] : null;
  const uniquePhone = phoneMatches.length === 1 ? phoneMatches[0] : null;
  const sameStudent = uniqueNorm && uniquePhone && String(uniqueNorm._id) === String(uniquePhone._id);

  let autoMatch = null, method = 'NONE', confidence = 0;
  if (sameStudent) {
    autoMatch = uniqueNorm; method = 'NORMALIZED_REF'; confidence = 0.97;
  } else if (uniqueNorm && !uniquePhone) {
    autoMatch = uniqueNorm; method = 'NORMALIZED_REF'; confidence = 0.9;
  } else if (uniquePhone && normMatches.length === 0) {
    autoMatch = uniquePhone; method = 'PHONE'; confidence = 0.85;
  }

  if (autoMatch) {
    const candidates = [...byId.values()]
      .map((c) => ({ student: c.student, score: round2(c.score), reasons: c.reasons }))
      .filter((c) => String(c.student._id) !== String(autoMatch._id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { autoMatch, method, confidence, candidates };
  }

  // No auto-match — enrich candidates with suggestion-only tiers.
  // Tier 4 — fuzzy reference (edit distance ≤ 2)
  const base = variants[0];
  if (base && base.length >= 3) {
    const pool = await Student.find({
      school: schoolId,
      admissionNumberNormalized: { $regex: `^${escapeRegex(base.slice(0, 2))}` },
    }).limit(50);
    for (const s of pool) {
      const d = editDistance(base, s.admissionNumberNormalized || '', 2);
      if (d >= 1 && d <= 2) add(s, 'Reference looks similar', 0.35 - d * 0.1);
    }
  }

  // Tier 5 — payer name vs student/guardian name
  if (payerName) {
    const tokens = String(payerName).toUpperCase().split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length) {
      const re = tokens.map(escapeRegex).join('|');
      const pool = await Student.find({
        school: schoolId,
        $or: [{ name: { $regex: re, $options: 'i' } }, { guardianName: { $regex: re, $options: 'i' } }],
      }).limit(20);
      for (const s of pool) {
        const hay = `${s.name || ''} ${s.guardianName || ''}`.toUpperCase();
        const overlap = tokens.filter((t) => hay.includes(t)).length;
        if (overlap) add(s, 'Name match', 0.2 + overlap * 0.1);
      }
    }
  }

  const candidates = [...byId.values()]
    .map((c) => ({ student: c.student, score: round2(c.score), reasons: c.reasons }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { autoMatch: null, method: 'NONE', confidence: 0, candidates };
};

/**
 * Learn from a manual match so future payments auto-resolve (Tier 0).
 * - REF alias: only when the typed reference doesn't already belong to a real
 *   admission number (so we never hijack a valid reference).
 * - PHONE alias: only when the payer phone maps to a single student (never
 *   alias a sibling-shared number).
 */
const learnFromMatch = async ({ school, originalRef, payerPhone, studentId, userId }) => {
  const schoolId = school?._id || school;
  if (!schoolId || !studentId) return;

  const writes = [];
  const normRef = normalizeRef(originalRef);
  if (normRef) {
    const collides = await Student.countDocuments({ school: schoolId, admissionNumberNormalized: normRef });
    if (collides === 0) writes.push({ signal: normRef, kind: 'REF' });
  }
  const phone = normalizePhone(payerPhone);
  if (phone) {
    const shared = await Student.countDocuments({ school: schoolId, guardianPhone: phone });
    if (shared <= 1) writes.push({ signal: phone, kind: 'PHONE' });
  }

  for (const w of writes) {
    try {
      await PayerAlias.updateOne(
        { school: schoolId, signal: w.signal },
        { $set: { student: studentId, kind: w.kind, createdBy: userId } },
        { upsert: true }
      );
    } catch (e) {
      // Non-fatal — a learned alias is a nice-to-have, never block the match.
      console.error('[matching] alias learn failed:', e.message);
    }
  }
};

module.exports = { findStudentMatches, learnFromMatch, normalizeRef, normalizePhone, editDistance };
