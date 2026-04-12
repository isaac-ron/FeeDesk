const cron = require('node-cron');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const School = require('../models/School');
const { sendBulkReminders } = require('../services/smsService');

/**
 * Determine the current academic term based on the month.
 * Kenya school calendar: Term 1 (Jan-Apr), Term 2 (May-Aug), Term 3 (Sep-Dec)
 */
const getCurrentTerm = () => {
  const month = new Date().getMonth() + 1;
  if (month <= 4) return 'TERM_1';
  if (month <= 8) return 'TERM_2';
  return 'TERM_3';
};

/**
 * Build fee reminder recipients for a single school.
 * Finds active students with outstanding balances (currentBalance < 0 means they owe).
 */
const buildRecipients = async (school) => {
  const currentYear = String(new Date().getFullYear());
  const currentTerm = getCurrentTerm();

  // Get active fees for this school/term so we can include due dates
  const fees = await Fee.find({
    school: school._id,
    academicYear: currentYear,
    term: { $in: [currentTerm, 'ANNUAL'] },
    isActive: true,
  }).sort({ dueDate: 1 });

  const nearestDueDate = fees.find(f => f.dueDate)?.dueDate || null;

  // Students who owe money (currentBalance < 0 means outstanding)
  const students = await Student.find({
    school: school._id,
    status: 'Active',
    currentBalance: { $lt: 0 },
  }).select('name guardianPhone currentBalance');

  return students
    .filter(s => s.guardianPhone)
    .map(s => ({
      guardianPhone: s.guardianPhone,
      studentName: s.name,
      outstandingBalance: Math.abs(s.currentBalance),
      dueDate: nearestDueDate,
    }));
};

/**
 * Main job: iterate over all active schools that have SMS enabled,
 * gather students with balances, and send bulk reminders.
 */
const runFeeReminders = async () => {
  console.log('⏰ [CRON] Fee reminder job started');

  try {
    const schools = await School.find({
      isActive: true,
      'settings.smsNotifications': true,
    });

    if (schools.length === 0) {
      console.log('⏰ [CRON] No schools with SMS enabled — skipping');
      return;
    }

    let totalSent = 0;
    let totalSkipped = 0;

    for (const school of schools) {
      const recipients = await buildRecipients(school);

      if (recipients.length === 0) {
        console.log(`⏰ [CRON] ${school.name}: no outstanding balances — skipping`);
        continue;
      }

      console.log(`⏰ [CRON] ${school.name}: sending reminders to ${recipients.length} guardians`);
      const { sent, skipped } = await sendBulkReminders(recipients);
      totalSent += sent;
      totalSkipped += skipped;
    }

    console.log(`⏰ [CRON] Fee reminder job complete — sent: ${totalSent}, skipped: ${totalSkipped}`);
  } catch (error) {
    console.error('❌ [CRON] Fee reminder job failed:', error.message);
  }
};

/**
 * Schedule the fee reminder cron job.
 *
 * Default: every Monday and Thursday at 8:00 AM EAT.
 * Override via FEE_REMINDER_CRON env variable (standard cron syntax).
 */
const startFeeReminderJob = () => {
  const schedule = process.env.FEE_REMINDER_CRON || '0 8 * * 1,4'; // Mon & Thu 8 AM

  if (!cron.validate(schedule)) {
    console.error(`❌ [CRON] Invalid FEE_REMINDER_CRON: "${schedule}" — job NOT scheduled`);
    return null;
  }

  const job = cron.schedule(schedule, runFeeReminders, {
    timezone: 'Africa/Nairobi',
  });

  console.log(`✅ [CRON] Fee reminder job scheduled: "${schedule}" (Africa/Nairobi)`);
  return job;
};

module.exports = { startFeeReminderJob, runFeeReminders };
