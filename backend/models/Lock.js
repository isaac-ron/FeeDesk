const mongoose = require('mongoose');

// Tiny advisory-lock collection used to serialize critical sections that do
// read-modify-write on shared documents — specifically per-student payment
// allocation, which otherwise races under worker concurrency (concurrency=5)
// and across the worker/web processes, losing or double-counting allocations.
//
// The _id IS the lock key (e.g. "alloc:<studentId>"), so acquisition is a
// single-document atomic insert. `expiresAt` lets a crashed holder's lock be
// reclaimed; the TTL index sweeps abandoned locks as a backstop (the acquire
// path reclaims expired locks immediately rather than waiting on the ~60s TTL
// monitor). `holder` is a per-acquire token so release only deletes a lock we
// still own.
const lockSchema = new mongoose.Schema(
  {
    _id: { type: String },
    expiresAt: { type: Date, required: true },
    holder: { type: String },
  },
  { versionKey: false }
);

// Backstop sweep of abandoned locks: delete once expiresAt is in the past.
lockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Lock', lockSchema);
