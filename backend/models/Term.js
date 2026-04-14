const mongoose = require('mongoose');

// A school term with real dates and a lifecycle.
// Replaces the string enum (TERM_1/TERM_2/TERM_3) used by the legacy Fee model,
// which has no dates, no status, and no way to carry a balance forward.
const termSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Term name is required'],
    trim: true
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    validate: {
      validator: (v) => /^\d{4}$/.test(v),
      message: props => `${props.value} is not a valid year! Use format YYYY`
    }
  },
  termNumber: {
    type: Number,
    enum: [1, 2, 3],
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Term start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Term end date is required'],
    validate: {
      validator: function (v) { return !this.startDate || v > this.startDate; },
      message: 'endDate must be after startDate'
    }
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
    default: 'DRAFT',
    index: true
  },
  // When true, unpaid StudentFee rows from this term are carried forward
  // into the next term at lifecycle transition time.
  carryForwardEnabled: {
    type: Boolean,
    default: true
  },
  // Days past term end before balances count as "overdue" for reminder jobs.
  arrearsGraceDays: {
    type: Number,
    default: 14,
    min: 0
  },
  archivedAt: Date
}, { timestamps: true });

// One (school, academicYear, termNumber) combination must be unique.
termSchema.index({ school: 1, academicYear: 1, termNumber: 1 }, { unique: true });

// Enforce exactly one ACTIVE term per school via a partial unique index.
termSchema.index(
  { school: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

module.exports = mongoose.model('Term', termSchema);
