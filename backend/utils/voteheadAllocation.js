// Automatic votehead allocation + termly split for Kenyan secondary fees.
//
// Two MoE rules drive this, so a bursar enters ONE number (the annual parent
// fee) and never types voteheads or percentages:
//
//   1. Voteheads — fees are reported against fixed MoE expenditure categories.
//      Default weights below are derived from the 2015 national-boarding
//      structure (parent-funded portion, annual total KES 53,554). We use the
//      PARENT column (not the gross 66,424) because FeeDesk bills parents and
//      the dominant Boarding/Meals votehead is 100% parent-funded.
//
//   2. 50:30:20 — "schools shall spread fees over the three terms at the ratio
//      of 50:30:20" (also how capitation is disbursed). Term 1 = 50%,
//      Term 2 = 30%, Term 3 = 20% of the annual total.
//
// Key property: because the same 50:30:20 ratio applies to every votehead, a
// votehead's SHARE of each term equals its share of the year. So the category
// percent list is IDENTICAL across all three terms — we compute it once and
// attach it to each generated FeeStructure. `services/feeCategoryService.js`
// then derives per-category paid/outstanding from these percents at view time.

const TERM_SPLIT = [0.5, 0.3, 0.2]; // Term 1, 2, 3 — official MoE ratio

// 2015 national boarding reference. `parent` = KES the parent pays per year;
// `gross` = full structure incl. government subsidy (kept for reference/audit).
// `scope` marks where the votehead applies. Government-funded or optional
// voteheads carry parent: 0 by default but stay in the list so a school can
// switch them on without retyping.
const VOTEHEAD_REFERENCE = [
  { key: 'bes_meals', name: 'Boarding, Equipment, Stores & Meals',   parent: 32385, gross: 32385, scope: ['boarding'] },
  { key: 'ewc',       name: 'Electricity, Water & Conservancy',      parent: 6302,  gross: 7802,  scope: ['boarding', 'day'] },
  { key: 'pe',        name: 'Personal Emolument',                    parent: 5972,  gross: 8672,  scope: ['boarding', 'day'] },
  { key: 'admin',     name: 'Administration Costs',                  parent: 2516,  gross: 3316,  scope: ['boarding', 'day'] },
  { key: 'rmi',       name: 'Repairs, Maintenance & Improvement',    parent: 2392,  gross: 3192,  scope: ['boarding', 'day'] },
  { key: 'ltt',       name: 'Local Travel & Transport',              parent: 1621,  gross: 2421,  scope: ['boarding', 'day'] },
  { key: 'insurance', name: 'Insurance (Medical & Property)',        parent: 1060,  gross: 1660,  scope: ['boarding', 'day'] },
  { key: 'activity',  name: 'Activity Fees',                         parent: 798,   gross: 1398,  scope: ['boarding', 'day'] },
  { key: 'medical',   name: 'Medical',                               parent: 508,   gross: 786,   scope: ['boarding', 'day'] },
  { key: 'tlm',       name: 'Teaching/Learning Materials & Exams',   parent: 0,     gross: 4792,  scope: ['boarding', 'day'] },
  { key: 'pta',       name: 'Approved PTA Development Projects',      parent: 0,     gross: 0,     scope: ['boarding', 'day'] },
  { key: 'topup',     name: 'Top Up',                                parent: 0,     gross: 0,     scope: ['boarding', 'day'] },
];

const round2 = (n) => Math.round(n * 100) / 100;

// Build the votehead category list (percents summing to exactly 100) for a
// given scope. Re-normalises automatically, so a day school (no boarding/meals)
// gets a valid 100% split across the remaining voteheads.
//   scope   — 'boarding' | 'day'
//   include — extra votehead keys to force in even if parent ref is 0
function buildVoteheadCategories({ scope = 'boarding', include = [] } = {}) {
  const applicable = VOTEHEAD_REFERENCE.filter(
    (v) => v.scope.includes(scope) && (v.parent > 0 || include.includes(v.key))
  );
  const total = applicable.reduce((s, v) => s + (v.parent || 0), 0);
  if (total <= 0) return [];

  const cats = applicable.map((v) => ({
    name: v.name,
    percent: round2((v.parent / total) * 100),
  }));

  // Absorb the rounding drift into the largest line so percents sum to 100.00.
  const drift = round2(100 - cats.reduce((s, c) => s + c.percent, 0));
  if (drift !== 0) {
    const biggest = cats.reduce((a, b) => (b.percent > a.percent ? b : a));
    biggest.percent = round2(biggest.percent + drift);
  }
  return cats;
}

// Split an annual total into the three term amounts (integer KES, exact sum).
function splitAnnualToTerms(annual) {
  const t1 = Math.round(annual * TERM_SPLIT[0]);
  const t2 = Math.round(annual * TERM_SPLIT[1]);
  const t3 = annual - t1 - t2; // term 3 absorbs the remainder → exact reconciliation
  return [t1, t2, t3];
}

// One call → everything needed to publish three fee structures from a single
// annual figure, with no manual votehead or percentage entry.
function generateFeeStructures({ annual, scope = 'boarding', include = [] }) {
  const categories = buildVoteheadCategories({ scope, include });
  const amounts = splitAnnualToTerms(annual);
  return amounts.map((amount, i) => ({
    termIndex: i + 1,
    label: `Term ${i + 1} fees`,
    amount,
    categories, // identical across terms by the 50:30:20 property above
  }));
}

module.exports = {
  TERM_SPLIT,
  VOTEHEAD_REFERENCE,
  buildVoteheadCategories,
  splitAnnualToTerms,
  generateFeeStructures,
};
