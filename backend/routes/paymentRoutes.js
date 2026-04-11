const express = require('express');
const router = express.Router();
const {
  mpesaConfirmation,
  mpesaValidation,
  mpesaRegisterUrl,
  stkPush,
  stkCallback,
  stkQueryStatus,
  recordBankPayment,
  recordCashPayment,
  getPaymentStats,
  bankWebhookHandler,
  registerBankWebhook,
  reconcileBankTransactions
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const { callbackLimiter, safaricomOnly } = require('../middleware/securityMiddleware');
const { validate, recordBankPaymentSchema, recordCashPaymentSchema } = require('../middleware/validate');

// ============================================
// M-PESA C2B CALLBACKS (Public - Safaricom only)
// ============================================
router.post('/validation', callbackLimiter, safaricomOnly, mpesaValidation);
router.post('/confirmation', callbackLimiter, safaricomOnly, mpesaConfirmation);

// STK Push callback (Public - Safaricom only)
router.post('/stkcallback', callbackLimiter, safaricomOnly, stkCallback);

// ============================================
// BANK WEBHOOKS (Public - Bank APIs only)
// ============================================
router.post('/bank/webhook/:provider', callbackLimiter, bankWebhookHandler);

// ============================================
// PROTECTED ROUTES (Require authentication)
// ============================================
router.use(protect);

// M-PESA URL Registration (Admin only)
router.post('/register', mpesaRegisterUrl);

// STK Push (initiate payment prompt on customer phone)
router.post('/stkpush', stkPush);
router.post('/stkquery', stkQueryStatus);

// Bank Integration Management (Admin only, requires tenant validation)
router.use(tenantMiddleware);
router.post('/bank/register/:provider', registerBankWebhook);
router.get('/bank/reconcile/:provider', reconcileBankTransactions);

// Manual payment recording
router.post('/bank', validate(recordBankPaymentSchema), recordBankPayment);
router.post('/cash', validate(recordCashPaymentSchema), recordCashPayment);
router.get('/stats', getPaymentStats);

module.exports = router;