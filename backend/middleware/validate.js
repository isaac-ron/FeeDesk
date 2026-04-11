const Joi = require('joi');

// ============================================
// GENERIC VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Returns Express middleware that validates req.body against a Joi schema.
 * On failure, responds 400 with the first validation error message.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: true, stripUnknown: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message.replace(/"/g, ''),
    });
  }
  next();
};

// ============================================
// REUSABLE FIELD PATTERNS
// ============================================

const kenyanPhone = Joi.string().pattern(/^254\d{9}$/).messages({
  'string.pattern.base': 'Phone number must be in format 254XXXXXXXXX',
});

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const password = Joi.string().min(8).max(128).messages({
  'string.min': 'Password must be at least 8 characters',
});

// ============================================
// AUTH SCHEMAS
// ============================================

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: password.required(),
  role: Joi.string().valid('super_admin', 'admin', 'bursar', 'principal', 'teacher'),
  school: objectId,
});

// ============================================
// STUDENT SCHEMAS
// ============================================

const createStudentSchema = Joi.object({
  admissionNumber: Joi.string().trim().uppercase().min(1).max(30).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  classLevel: Joi.string().trim().required(),
  stream: Joi.string().trim().allow('', null),
  guardianName: Joi.string().trim().min(2).max(100).required(),
  guardianPhone: kenyanPhone.required(),
  guardianEmail: Joi.string().email().allow('', null),
  school: objectId,
});

const updateStudentSchema = Joi.object({
  admissionNumber: Joi.string().trim().uppercase().min(1).max(30),
  name: Joi.string().trim().min(2).max(100),
  classLevel: Joi.string().trim(),
  stream: Joi.string().trim().allow('', null),
  guardianName: Joi.string().trim().min(2).max(100),
  guardianPhone: kenyanPhone,
  guardianEmail: Joi.string().email().allow('', null),
  status: Joi.string().valid('Active', 'Suspended', 'Alumni', 'Transferred'),
}).min(1);

// ============================================
// FEE SCHEMAS
// ============================================

const createFeeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('TUITION', 'BOARDING', 'TRANSPORT', 'LUNCH', 'ACTIVITY', 'EXAM', 'OTHER').required(),
  term: Joi.string().valid('TERM_1', 'TERM_2', 'TERM_3', 'ANNUAL').required(),
  academicYear: Joi.string().pattern(/^\d{4}$/).required().messages({
    'string.pattern.base': 'Academic year must be a 4-digit year (e.g. 2026)',
  }),
  classLevel: Joi.string().trim().default('ALL'),
  description: Joi.string().trim().max(500).allow('', null),
  dueDate: Joi.date().iso().allow(null),
  school: objectId,
});

const updateFeeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  amount: Joi.number().positive(),
  type: Joi.string().valid('TUITION', 'BOARDING', 'TRANSPORT', 'LUNCH', 'ACTIVITY', 'EXAM', 'OTHER'),
  term: Joi.string().valid('TERM_1', 'TERM_2', 'TERM_3', 'ANNUAL'),
  academicYear: Joi.string().pattern(/^\d{4}$/),
  classLevel: Joi.string().trim(),
  description: Joi.string().trim().max(500).allow('', null),
  dueDate: Joi.date().iso().allow(null),
  isActive: Joi.boolean(),
}).min(1);

// ============================================
// PAYMENT SCHEMAS
// ============================================

const recordBankPaymentSchema = Joi.object({
  transactionId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  reference: Joi.string().trim().required(),
  source: Joi.string().valid('BANK_TRANSFER', 'BANK_AGENT'),
  paidBy: Joi.string().trim().max(100),
});

const recordCashPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  reference: Joi.string().trim().required(),
  receiptNumber: Joi.string().trim(),
  paidBy: Joi.string().trim().max(100),
});

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  createStudentSchema,
  updateStudentSchema,
  createFeeSchema,
  updateFeeSchema,
  recordBankPaymentSchema,
  recordCashPaymentSchema,
};
