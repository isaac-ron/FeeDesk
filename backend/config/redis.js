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

  connection.on('connect', () => console.log('Redis connected'));
  connection.on('error', (err) => console.error('Redis error:', err.message));

  return connection;
};

module.exports = { getRedisConnection };
