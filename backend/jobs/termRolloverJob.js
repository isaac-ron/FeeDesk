const cron = require('node-cron');
const Term = require('../models/Term');
const School = require('../models/School');

// Automatic term rollover by the official Kenyan school calendar dates.
//
// Terms are created ahead of time as DRAFT (Term 1 Jan–Apr, Term 2 May–Aug,
// Term 3 Sep–Nov). This job promotes the DRAFT term to ACTIVE once its
// startDate has passed, and archives the previously ACTIVE term — so the
// "current term" rolls over on its own without a bursar clicking Activate.
//
// Gap-free rule: the term that should be current is the one with the LATEST
// startDate that is <= now. It stays ACTIVE through the holiday until the next
// term's startDate arrives. We only promote DRAFT terms (never resurrect a
// manually ARCHIVED one), so manual overrides are respected.

const rolloverSchool = async (schoolId, now = new Date()) => {
  const terms = await Term.find({ school: schoolId }).sort({ startDate: 1 });
  if (!terms.length) return null;

  // The term that should be current: latest startDate that has already passed.
  const started = terms.filter((t) => t.startDate && t.startDate <= now);
  if (!started.length) return null;
  const current = started[started.length - 1];

  if (current.status === 'ACTIVE') return null;     // already correct
  if (current.status === 'ARCHIVED') return null;   // respect manual archive

  // Promote the DRAFT current term; archive whatever was ACTIVE before it.
  const previouslyActive = terms.filter(
    (t) => t.status === 'ACTIVE' && t._id.toString() !== current._id.toString()
  );
  for (const t of previouslyActive) {
    t.status = 'ARCHIVED';
    t.archivedAt = now;
    await t.save();
  }

  current.status = 'ACTIVE';
  await current.save();

  console.log(`⏰ [CRON] Term rollover: "${current.name} ${current.academicYear}" is now ACTIVE for school ${schoolId}`);
  return current._id;
};

const runTermRollover = async () => {
  console.log('⏰ [CRON] Term rollover job started');
  try {
    const schools = await School.find({ isActive: true }).select('_id');
    let rolled = 0;
    for (const school of schools) {
      const changed = await rolloverSchool(school._id);
      if (changed) rolled++;
    }
    console.log(`⏰ [CRON] Term rollover complete — ${rolled} school(s) rolled over`);
  } catch (error) {
    console.error('❌ [CRON] Term rollover job failed:', error.message);
  }
};

// Default: daily at 00:30 Africa/Nairobi. Override via TERM_ROLLOVER_CRON.
const startTermRolloverJob = () => {
  const schedule = process.env.TERM_ROLLOVER_CRON || '30 0 * * *';

  if (!cron.validate(schedule)) {
    console.error(`❌ [CRON] Invalid TERM_ROLLOVER_CRON: "${schedule}" — job NOT scheduled`);
    return null;
  }

  const job = cron.schedule(schedule, runTermRollover, { timezone: 'Africa/Nairobi' });
  console.log(`✅ [CRON] Term rollover job scheduled: "${schedule}" (Africa/Nairobi)`);
  // Run once at boot so a fresh deploy converges immediately.
  runTermRollover();
  return job;
};

module.exports = { startTermRolloverJob, runTermRollover, rolloverSchool };
