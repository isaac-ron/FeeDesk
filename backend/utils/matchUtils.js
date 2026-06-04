// Shared, dependency-free normalizers for payment matching.
// Used by the Student model (to precompute admissionNumberNormalized), the
// matchingService, and tests. Keep this file free of model/service imports so
// it can't create a require cycle with the Student model.

/**
 * Normalize an admission-number-ish string for forgiving comparison.
 * - uppercases
 * - strips everything that isn't A–Z/0–9 (so "ADM-2026-04", "adm 2026 04",
 *   "ADM/2026/04" all collapse to the same token)
 * - optionally strips a known school prefix (e.g. "ADM")
 * - strips leading zeros (so "04022" === "4022")
 *
 * @param {string} raw
 * @param {{prefix?: string}} [opts]
 * @returns {string} normalized token ('' if input is empty)
 */
const normalizeRef = (raw, { prefix } = {}) => {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (prefix) {
    const p = String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (p && s.startsWith(p)) s = s.slice(p.length);
  }
  // Strip leading zeros, but only when a digit follows (never produce '').
  s = s.replace(/^0+(?=[0-9])/, '');
  return s;
};

/**
 * Normalize a Kenyan phone to canonical 254XXXXXXXXX, or null if unparseable.
 * Accepts 07.., 01.., 7........, 1........, +254.., 254.., with any punctuation.
 * Matches the format stored in Student.guardianPhone (/^254\d{9}$/).
 *
 * @param {string} raw
 * @returns {string|null}
 */
const normalizePhone = (raw) => {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, '');
  if (/^254\d{9}$/.test(d)) return d;
  if (/^0\d{9}$/.test(d)) return `254${d.slice(1)}`;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  return null;
};

module.exports = { normalizeRef, normalizePhone };
