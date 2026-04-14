const mongoose = require('mongoose');

// A bulk-reminder send job. Captures the filter the bursar chose, the
// template used, and aggregate counts as the campaign runs. Each recipient
// gets its own SmsLog row referencing this campaign.
//
// The template is stored as a raw string with {placeholders}. At send time,
// the worker substitutes per-student variables so every parent receives a
// personalised message (student name, outstanding balance, class, due date).
const smsCampaignSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, trim: true }, // optional label for the history list

  // Recipient filter. All fields optional; the worker ANDs whichever are set.
  filter: {
    classLevel: String,           // e.g. 'Grade 10' or 'ALL'
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
    minOutstanding: Number,       // only students owing at least this much
    daysOverdue: Number,          // dueDate older than today - N days
    lastReminderOlderThanDays: Number, // skip parents reminded more recently
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }] // explicit list override
  },

  // Templated message body with {placeholders} such as
  // {parent_name}, {student_name}, {admission_number}, {balance}, {due_date},
  // {class}, {school_name}, {paybill}. Rendered per-student at send time.
  messageTemplate: { type: String, required: true },

  scheduledAt: Date,          // null = send immediately
  startedAt: Date,
  completedAt: Date,

  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },

  // Aggregates updated as SmsLog rows land. Denormalised so the history
  // table doesn't need a group-by on every render.
  recipientCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 }
}, { timestamps: true });

smsCampaignSchema.index({ school: 1, createdAt: -1 });
smsCampaignSchema.index({ school: 1, status: 1 });

module.exports = mongoose.model('SmsCampaign', smsCampaignSchema);
