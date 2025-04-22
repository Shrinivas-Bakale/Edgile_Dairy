const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['core', 'lab', 'elective'],
    default: 'core',
    lowercase: true
  },
  totalDuration: {
    type: Number,
    required: [true, 'Total duration in hours is required'],
    min: [1, 'Duration must be at least 1 hour']
  },
  weeklyHours: {
    type: Number,
    required: [true, 'Weekly hours is required'],
    min: [1, 'Weekly hours must be at least 1']
  },
  year: {
    type: String,
    enum: ['First', 'Second', 'Third'],
    required: [true, 'Year is required']
  },
  semester: {
    type: Number,
    enum: [1, 2, 3, 4, 5, 6],
    required: [true, 'Semester is required']
  },
  university: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'University is required']
  },
  universityCode: {
    type: String,
    required: [true, 'University code is required']
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Creator ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required']
  }
});

// Create a compound index for efficient filtering
SubjectSchema.index({ university: 1, year: 1, semester: 1, archived: 1 });

// Create a compound index to ensure uniqueness of subject code per semester and year
SubjectSchema.index({ university: 1, subjectCode: 1, year: 1, semester: 1, academicYear: 1 }, { unique: true });

// Pre-save middleware to update the weeklyHours based on totalDuration
SubjectSchema.pre('save', function(next) {
  // Assuming 12 weeks in a semester (3 months)
  if (this.totalDuration) {
    this.weeklyHours = Math.ceil(this.totalDuration / 12);
  }
  
  // Update the updatedAt timestamp
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('Subject', SubjectSchema); 