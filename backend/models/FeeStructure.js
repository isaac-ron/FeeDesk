const mongoose = require('mongoose');

// A fee structure is the flat term fee for one (term, classLevel).
// Kenyan schools publish fixed per-class fees (e.g. "Grade 10 = KES 25,000
// for Term 1"), so we track one amount per class rather than a line-item
// builder. Moves DRAFT → PUBLISHED when the bursar confirms; publishing
// generates one StudentFee row per active student in the class.
const feeStructureSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  term: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: true,
    index: true
  },
  // Dynamic class reference — links to Class collection
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
  },
  // Legacy string field — kept for backward compat
  classLevel: {
    type: String,
    default: 'ALL',
  },
  label: {
    type: String,
    trim: true,
    default: 'Term fees'
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Fee amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
    index: true
  },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentsInvoiced: { type: Number, default: 0 }
}, { timestamps: true });

// Unique constraint: one structure per (school, term, class).
// Uses classLevel for legacy data, classId for new data.
feeStructureSchema.index(
  { school: 1, term: 1, classLevel: 1 },
  { unique: true, sparse: true }
);
feeStructureSchema.index(
  { school: 1, term: 1, classId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
