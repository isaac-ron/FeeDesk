const mongoose = require('mongoose');

const stkPushLogSchema = new mongoose.Schema(
  {
    checkoutRequestId: { type: String, required: true, unique: true, index: true },
    merchantRequestId: { type: String, index: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    admissionNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    phoneNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'TIMEOUT'],
      default: 'PENDING',
      index: true,
    },
    resultCode: { type: Number },
    resultDesc: { type: String },
    mpesaReceiptNumber: { type: String, index: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StkPushLog', stkPushLogSchema);
