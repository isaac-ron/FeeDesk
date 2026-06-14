const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const {Server} = require("socket.io");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { apiLimiter, authLimiter } = require('./middleware/securityMiddleware');
const { startFeeReminderJob } = require('./jobs/feeReminderJob');
const { startTermRolloverJob } = require('./jobs/termRolloverJob');
const { startPaymentWorker } = require('./workers/paymentWorker');
const { startSmsWorker } = require('./workers/smsWorker');

const app = express();
const server = http.createServer(app);

// Render (and most PaaS) terminate TLS at a reverse proxy and forward the
// real client IP in X-Forwarded-For. Without this, express-rate-limit
// throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and falls back to keying by
// the proxy IP — which rate-limits *everyone* as one client. Trusting one
// hop is the minimum needed and avoids IP-spoofing via injected XFF.
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS Configuration from environment variables
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost"]; // Fallback for development

// Body Parser Middleware with CORS
app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
// Capture the raw request body so webhook handlers (KCB BUNI, Jenga) can
// verify RSA/HMAC signatures against the exact bytes the bank sent us —
// JSON.stringify after parsing loses whitespace/ordering and breaks verify.
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    if (buf && buf.length) req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// Socket.io Setup with environment-aware CORS
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make io accessible to routes via both app.set and middleware
app.set('io', io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic Route for Testing
app.get('/', (req, res) => {
  res.send('SchoolPay Enterprise API is running...');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const reportRoutes = require('./routes/reportRoutes');
const staffRoutes = require('./routes/staffRoutes');
const platformSettingsRoutes = require('./routes/platformSettingsRoutes');
const termRoutes = require('./routes/termRoutes');
const feeStructureRoutes = require('./routes/feeStructureRoutes');
const studentFeeRoutes = require('./routes/studentFeeRoutes');
const smsRoutes = require('./routes/smsRoutes');
const classRoutes = require('./routes/classRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/fee-structures', feeStructureRoutes);
app.use('/api/student-fees', studentFeeRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mobile', paymentRoutes); // M-PESA specific endpoints (validation, confirmation, register)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/statements', require('./routes/statementRoutes'));
app.use('/api/schools', schoolRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/platform/settings', platformSettingsRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;

// Connect to DB then listen
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

    // Start scheduled jobs
    startFeeReminderJob();
    startTermRolloverJob();

    // Start BullMQ workers (requires Redis).
    // Workers are optional — if Redis is unavailable, the server still runs
    // but webhook payments won't be processed until Redis is up.
    try {
      startPaymentWorker(io);
      startSmsWorker();
      console.log('BullMQ workers started');
    } catch (err) {
      console.error('BullMQ worker startup failed (Redis may be unavailable):', err.message);
      console.error('Webhook payments will NOT be processed until Redis is connected.');
    }
  });
});
