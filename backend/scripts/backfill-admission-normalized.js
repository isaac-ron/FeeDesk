/**
 * One-off backfill: populate Student.admissionNumberNormalized for existing
 * students so the matching ladder's normalized-reference tier works against
 * records created before this field existed.
 *
 * Dry-runs by default (reports how many would change). Pass APPLY=true to write.
 *
 * Usage:
 *   MONGO_URI='...' node backend/scripts/backfill-admission-normalized.js
 *   MONGO_URI='...' APPLY=true node backend/scripts/backfill-admission-normalized.js
 */
require('../config/env');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { normalizeRef } = require('../utils/matchUtils');

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[backfill] MONGO_URI not set');
    process.exit(1);
  }
  const apply = process.env.APPLY === 'true';

  await mongoose.connect(uri);
  console.log(`[backfill] Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  const cursor = Student.find({}, { admissionNumber: 1, admissionNumberNormalized: 1 }).cursor();
  let scanned = 0;
  let changed = 0;
  const ops = [];

  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    scanned++;
    const norm = normalizeRef(doc.admissionNumber);
    if (doc.admissionNumberNormalized !== norm) {
      changed++;
      ops.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: { admissionNumberNormalized: norm } } },
      });
      if (apply && ops.length >= 500) {
        await Student.bulkWrite(ops);
        ops.length = 0;
      }
    }
  }
  if (apply && ops.length) await Student.bulkWrite(ops);

  console.log(`[backfill] Scanned ${scanned}, ${apply ? 'updated' : 'would update'} ${changed}`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('[backfill] ERROR:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
