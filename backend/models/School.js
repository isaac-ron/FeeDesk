const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'School code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  paybillNumber: {
    type: String,
    required: [true, 'M-PESA Paybill number is required'],
    validate: {
      validator: function(v) {
        return /^\d{5,7}$/.test(v);
      },
      message: props => `${props.value} is not a valid paybill number!`
    }
  },
  accountNumber: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    validate: {
      validator: function(v) {
        return /^254\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Kenyan phone number! Use format 2547XXXXXXXX`
    }
  },
  address: {
    street: String,
    city: String,
    county: String,
    postalCode: String
  },
  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    branch: String
  },
  // Bank API Integration Configuration
  bankIntegration: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['EQUITY', 'KCB', 'COOP', 'NONE'],
      default: 'NONE'
    },
    credentials: {
      // Encrypted credentials for bank API
      apiKey: String,
      apiSecret: String,
      merchantId: String,
      accountNumber: String,
      callbackUrl: String,
      // Equity Jenga (Finserve) API
      username: String,
      password: String,
      publicKey: String,  // Jenga PEM — used to verify IPN signatures
      privateKey: String, // Merchant PEM — used to sign outbound transfers
      // Webhook-level Basic Auth (Jenga Account Alerts push these creds)
      webhookUsername: String,
      webhookPassword: String,
      // KCB BUNI
      consumerKey: String,
      consumerSecret: String,
      kcbPublicKey: String, // KCB PEM — used to verify IPN signatures
      organizationCode: String,
      accessToken: String // Cached token
    },
    lastSync: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  logo: {
    type: String // URL to logo image
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'],
    default: 'TRIAL'
  },
  subscriptionExpiry: {
    type: Date
  },
  maxStudents: {
    type: Number,
    default: 500 // Default limit for trial
  },
  settings: {
    currency: {
      type: String,
      default: 'KES'
    },
    timezone: {
      type: String,
      default: 'Africa/Nairobi'
    },
    academicYearStart: {
      type: Number, // Month (1-12)
      default: 1 // January
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  smsTemplates: {
    feeReminder: {
      type: String,
      default: 'Dear Parent, this is a reminder that {studentName} ({admissionNumber}) has an outstanding fee balance of KES {balance}. Please pay via Paybill {paybill}, Acc: {admissionNumber}. Thank you.'
    },
    paymentReceipt: {
      type: String,
      default: 'Dear Parent, we confirm receipt of KES {amount} for {studentName} ({admissionNumber}). New balance: KES {balance}. Thank you.'
    },
    welcome: {
      type: String,
      default: 'Welcome to {schoolName}. Your child {studentName} has been registered with admission number {admissionNumber}.'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
schoolSchema.index({ code: 1 }, { unique: true });
schoolSchema.index({ isActive: 1 });
schoolSchema.index({ subscriptionStatus: 1 });

// Virtual for student count
schoolSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'school',
  count: true
});

// Method to check if school can add more students
schoolSchema.methods.canAddStudent = async function() {
  const Student = require('./Student');
  const count = await Student.countDocuments({ school: this._id, status: 'Active' });
  return count < this.maxStudents;
};

// Method to check if school subscription is valid
schoolSchema.methods.isSubscriptionValid = function() {
  if (this.subscriptionStatus === 'SUSPENDED' || this.subscriptionStatus === 'EXPIRED') {
    return false;
  }
  if (this.subscriptionExpiry && this.subscriptionExpiry < new Date()) {
    return false;
  }
  return true;
};

module.exports = mongoose.model('School', schoolSchema);