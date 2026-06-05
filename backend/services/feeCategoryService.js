// Pro-rata fee categories — PRESENTATION-LAYER only.
//
// A fee structure's flat `amount` can be broken into named categories, each a
// fixed PERCENTAGE share summing to 100 (e.g. Tuition 60, Boarding 30, Activity
// 10). Nothing here touches the payment/allocation money path. It only:
//   • parses a `category,percent` CSV/sheet,
//   • validates the shares, and
//   • DERIVES a per-category paid/outstanding breakdown for a statement from the
//     existing StudentFee amountCharged / amountPaid.
//
// Pro-rata property: paidᵢ = shareᵢ × amountPaid and chargedᵢ = shareᵢ ×
// amountCharged, so every category shows the same proportion paid.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Split one CSV line, honouring double-quoted fields ("Co-curricular, sports").
const splitCsvLine = (line) => {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
};

// Parse a `category,percent` CSV/sheet into [{ name, percent }].
// Tolerates an optional header row, surrounding quotes/whitespace, a trailing
// '%' on the percent, and blank lines. Throws on malformed rows.
const parseCategoryCsv = (text) => {
  if (typeof text !== 'string' || !text.trim()) throw new Error('CSV is empty');
  const rows = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = splitCsvLine(line);
    if (parts.length < 2) {
      throw new Error(`Each row needs "category,percent" — got: ${line}`);
    }
    const name = parts[0].trim();
    const percentStr = parts[1].trim().replace(/%$/, '').trim();
    const percent = Number(percentStr);
    if (!Number.isFinite(percent)) {
      if (rows.length === 0) continue; // tolerate a header row
      throw new Error(`Invalid percent "${parts[1]}" for "${name}"`);
    }
    if (!name) throw new Error('Category name cannot be empty');
    rows.push({ name, percent });
  }
  if (!rows.length) throw new Error('No category rows found');
  return rows;
};

// Validate a category list: non-empty unique names, each percent in (0,100],
// percents summing to 100 (within a cent of rounding tolerance). Returns a
// normalised copy. Throws with a human-readable message on the first problem.
const validateCategories = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('At least one category is required');
  }
  const seen = new Set();
  let sum = 0;
  for (const c of categories) {
    const name = (c && c.name ? String(c.name) : '').trim();
    const percent = Number(c && c.percent);
    if (!name) throw new Error('Category name cannot be empty');
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate category: ${name}`);
    seen.add(key);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error(`Percent for "${name}" must be between 0 and 100`);
    }
    sum += percent;
  }
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Category percentages must sum to 100 (got ${round2(sum)})`);
  }
  return categories.map((c) => ({ name: String(c.name).trim(), percent: round2(c.percent) }));
};

// Distribute `total` across categories by percent using largest-remainder
// rounding so the per-category amounts sum EXACTLY to round2(total) — no
// sub-cent drift and no missing penny on a statement.
const allocateByPercent = (total, categories) => {
  const totalCents = Math.round(round2(total) * 100);
  const raw = categories.map((c) => (Number(c.percent) / 100) * totalCents);
  const floorCents = raw.map((r) => Math.floor(r));
  let leftover = totalCents - floorCents.reduce((a, b) => a + b, 0);
  // Hand out the leftover whole-cents to the largest fractional parts first.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const cents = [...floorCents];
  for (let k = 0; k < order.length && leftover > 0; k++) {
    cents[order[k].i] += 1;
    leftover--;
  }
  return cents.map((c) => c / 100);
};

// Build the per-category statement breakdown from the flat StudentFee amounts.
// Returns [] when there are no categories (callers fall back to the flat line).
// chargedᵢ sums exactly to amountCharged; paidᵢ sums exactly to amountPaid.
const deriveCategoryBreakdown = (categories, amountCharged, amountPaid) => {
  if (!Array.isArray(categories) || categories.length === 0) return [];
  const chargedArr = allocateByPercent(amountCharged, categories);
  const paidArr = allocateByPercent(amountPaid, categories);
  return categories.map((c, i) => ({
    name: c.name,
    percent: round2(c.percent),
    charged: chargedArr[i],
    paid: paidArr[i],
    outstanding: Math.max(0, round2(chargedArr[i] - paidArr[i])),
  }));
};

module.exports = {
  parseCategoryCsv,
  validateCategories,
  allocateByPercent,
  deriveCategoryBreakdown,
  round2,
};
