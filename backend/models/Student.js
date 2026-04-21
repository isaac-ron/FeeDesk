const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true
    },
    admissionNumber: {
        type: String,
        required: [true, 'Admission number is required'],
        trim: true,
        uppercase: true,
        index: true
    },
    name:{
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    // Dynamic class reference — preferred. Links to the Class collection.
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        default: null,
        index: true
    },
    // Legacy string field — kept for backward compat with existing data.
    // New students should use classId instead. The enum restriction is
    // removed so any class name works during the transition.
    classLevel: {
        type: String,
        default: null,
    },
    stream: {
        type: String,
        trim: true
    },
    guardianName: {
    type: String,
    required: [true, 'Guardian name is required']
  },
  guardianPhone: {
    type: String,
    required: [true, 'Guardian phone number is required'],
    validate: {
      validator: function(v) {
        // Basic validation for Kenyan numbers (254...)
        return /^254\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Kenyan phone number! Use format 2547XXXXXXXX`
    }
  },
  guardianEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Alumni', 'Transferred'],
    default: 'Active'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index to ensure admission numbers are unique per school
studentSchema.index({ school: 1, admissionNumber: 1 }, { unique: true });

// Index for efficient queries by school
studentSchema.index({ school: 1, status: 1 });
studentSchema.index({ school: 1, classLevel: 1 });
studentSchema.index({ school: 1, classId: 1 });

module.exports = mongoose.model('Student', studentSchema);
