const mongoose = require('mongoose');
const logger = require('../utils/logger');

const slotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  subjectCode: {
    type: String,
    required: false,
    default: ''
  },
  subjectName: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: ['Core', 'Lab', 'Elective', ''],
    default: ''
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  }
});

const daySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: [true, 'Day is required']
  },
  slots: [slotSchema]
});

const historyEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required']
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'ChangedBy is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: Object
  }
});

const timetableSchema = new mongoose.Schema({
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'University is required']
  },
  year: {
    type: String,
    enum: ['First', 'Second', 'Third'],
    required: [true, 'Year is required']
  },
  semester: {
    type: Number,
    min: 1,
    max: 6,
    required: [true, 'Semester is required']
  },
  division: {
    type: String,
    required: [true, 'Division is required']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    default: function() {
      const now = new Date();
      const year = now.getFullYear();
      if (now.getMonth() >= 6) { // July and after
        return `${year}-${year + 1}`;
      } else {
        return `${year - 1}-${year}`;
      }
    }
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: false
  },
  classroomName: {
    type: String,
    required: false
  },
  days: [daySchema],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  history: [historyEntrySchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updatedAt field
timetableSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set publishedAt date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  next();
});

// Method to add a history entry
timetableSchema.methods.addHistoryEntry = function(action, changedBy, details) {
  this.history.push({
    action,
    changedBy,
    timestamp: Date.now(),
    details
  });
};

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable; 