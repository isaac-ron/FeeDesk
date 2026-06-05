const mongoose = require('mongoose');
const Lock = require('../models/Lock');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Acquire a short advisory lock for `key`. Returns an async release() function;
// always call it in a finally.
//
// Degrades to a no-op when:
//   • Mongo is not connected — the fast unit tests run allocatePayment against
//     stubbed models with no live connection, and there's no cross-process
//     concurrency to guard in that mode; or
//   • ALLOC_LOCK_DISABLED=1 — a test-only escape hatch used to demonstrate the
//     race the lock prevents.
//
// Correctness: acquisition is atomic. We try to INSERT the lock doc (unique
// _id); on duplicate we try to STEAL it only if it has expired (an atomic
// conditional update). Both are single-document atomic in Mongo, so two racers
// can never both win.
const acquireLock = async (key, { ttlMs = 10000, timeoutMs = 8000, retryMs = 30 } = {}) => {
  if (process.env.ALLOC_LOCK_DISABLED === '1') return async () => {};
  if (mongoose.connection.readyState !== 1) return async () => {};

  const deadline = Date.now() + timeoutMs;
  // Token so release() only deletes a lock we still own (not one reclaimed from
  // us via TTL+steal after our own lease expired).
  const token = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  for (;;) {
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      await Lock.create({ _id: key, expiresAt, holder: token });
      return makeRelease(key, token);
    } catch (err) {
      if (!err || err.code !== 11000) throw err;
      // Held — reclaim only if the current holder's lease has expired.
      const stolen = await Lock.findOneAndUpdate(
        { _id: key, expiresAt: { $lt: new Date() } },
        { $set: { expiresAt, holder: token } }
      );
      if (stolen) return makeRelease(key, token);
    }
    if (Date.now() >= deadline) {
      throw new Error(`acquireLock timeout for "${key}" after ${timeoutMs}ms`);
    }
    await sleep(retryMs);
  }
};

const makeRelease = (key, token) => async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await Lock.deleteOne({ _id: key, holder: token });
  } catch (_) {
    /* best-effort — the TTL index will sweep it if delete fails */
  }
};

module.exports = { acquireLock };
