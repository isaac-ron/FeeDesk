const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Don't return password by default in queries
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'bursar', 'principal', 'teacher'],
    default: 'bursar'
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function() {
      // School is required for all roles except super_admin
      return this.role !== 'super_admin';
    },
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
userSchema.index({ school: 1, role: 1 });
userSchema.index({ school: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);