process.on('unhandledRejection', (r) => console.log('>>> UNHANDLED REJECTION:', r?.code || r?.message));
const { verifyRedisEvictionPolicy } = require('c:/Users/Administrator/Desktop/FeeDesk/feedesk/backend/config/redis');
verifyRedisEvictionPolicy();
setTimeout(() => { console.log('>>> survived 8s'); process.exit(0); }, 8000);
