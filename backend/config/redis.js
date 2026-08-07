const IORedis = require('ioredis');

// Lazy singleton — created on first call, reused after.
// BullMQ requires an ioredis-compatible connection.
let connection = null;

const getRedisConnection = () => {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  // ioredis retries forever, emitting an error per attempt. Logging each one
  // buries the startup output in a wall of identical stack traces that reads
  // like a crash — the server is in fact running fine, just queue-less. So log
  // the first occurrence of each distinct failure with something actionable,
  // then count the repeats until the connection recovers.
  let lastCode = null;
  let repeats = 0;

  connection.on('connect', () => {
    if (repeats > 0) console.log(`Redis reconnected (after ${repeats} suppressed ${lastCode} errors)`);
    else console.log('Redis connected');
    lastCode = null;
    repeats = 0;
  });

  connection.on('error', (err) => {
    // AggregateError (the shape ECONNREFUSED arrives in) has an empty .message,
    // so err.message alone prints nothing useful. Prefer the code.
    const code = err.code || err.constructor?.name || 'UNKNOWN';
    if (code === lastCode) { repeats++; return; }

    lastCode = code;
    repeats = 0;
    if (code === 'ECONNREFUSED') {
      console.error(
        `Redis unreachable at ${redisUrl} (ECONNREFUSED). The API still serves requests, ` +
        'but payment webhooks cannot be queued until Redis is up. ' +
        'Start it with: docker compose up -d redis'
      );
    } else {
      console.error(`Redis error [${code}]: ${err.message || '(no message)'}`);
    }
  });

  return connection;
};

/**
 * Verify Redis is configured so BullMQ jobs cannot be evicted.
 *
 * BullMQ keeps queued jobs as ordinary Redis keys. Under any `allkeys-*`
 * eviction policy, memory pressure lets Redis silently delete a queued payment
 * — no error, no log, no job. `noeviction` makes Redis refuse the write instead,
 * which surfaces as a loud enqueue failure the webhook edge can catch and record
 * (see models/InboundEvent.js). Loud beats silent when it is someone's fees.
 *
 * Many managed providers (Azure Cache for Redis among them) disable the CONFIG
 * command, so this is a best-effort check: it warns, never throws, and never
 * blocks startup. Where CONFIG is unavailable the policy must be set on the
 * provider side — for Azure that is the "Maxmemory policy" advanced setting.
 */
const verifyRedisEvictionPolicy = async () => {
  try {
    const conn = getRedisConnection();
    const [, policy] = await conn.config('GET', 'maxmemory-policy');
    const [, maxmemory] = await conn.config('GET', 'maxmemory');

    if (policy === 'noeviction') {
      console.log(`Redis eviction policy OK: ${policy}`);
      return { ok: true, policy };
    }

    // maxmemory=0 means unlimited, so nothing is evicted today — but the policy
    // is still a loaded gun the moment a memory cap gets set.
    const unlimited = String(maxmemory) === '0';
    console.warn(
      `⚠️  Redis maxmemory-policy is "${policy}", not "noeviction". ` +
      (unlimited
        ? 'maxmemory is currently 0 (unlimited) so nothing is being evicted yet, but queued payments would be at risk the moment a limit is set.'
        : `maxmemory is ${maxmemory} — queued payment jobs CAN be silently evicted under memory pressure.`)
    );
    return { ok: false, policy };
  } catch (err) {
    console.warn(
      `⚠️  Could not verify Redis maxmemory-policy (${err.message}). ` +
      'Managed Redis often blocks CONFIG — confirm the policy is "noeviction" on the provider side.'
    );
    return { ok: null, policy: null };
  }
};

module.exports = { getRedisConnection, verifyRedisEvictionPolicy };
