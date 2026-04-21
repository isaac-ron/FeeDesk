const mongoose = require('mongoose');

// Dynamic class/grade model. Replaces the hardcoded enum on Student.classLevel.
// Each school defines its own classes (e.g. 'Grade 1'–'Grade 8' for primary,
// 'Form 1'–'Form 4' for secondary, or any mix for mixed schools).
const classSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    // e.g. 'Grade 7', 'Form 1', 'PP1', 'Baby Class'
  },
  level: {
    type: Number,
    default: 0,
    // Sort order — lower numbers appear first
  },
}, { timestamps: true });

// One class name per school
classSchema.index({ school: 1, name: 1 }, { unique: true });
// Sort by level within a school
classSchema.index({ school: 1, level: 1 });

module.exports = mongoose.model('Class', classSchema);
