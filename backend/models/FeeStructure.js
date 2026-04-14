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
  classLevel: {
    type: String,
    required: true,
    enum: ['Grade 10', 'Grade 11', 'Grade 12', 'ALL']
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

feeStructureSchema.index(
  { school: 1, term: 1, classLevel: 1 },
  { unique: true }
);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
