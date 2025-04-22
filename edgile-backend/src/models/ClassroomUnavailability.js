const mongoose = require('mongoose');

const ClassroomUnavailabilitySchema = new mongoose.Schema({
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  classroomName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  isOpenEnded: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    trim: true
  },
  substituteClassroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    default: null
  },
  substituteClassroomName: {
    type: String,
    default: null
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  universityCode: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to set isOpenEnded flag based on endDate
ClassroomUnavailabilitySchema.pre('save', function(next) {
  this.isOpenEnded = this.endDate === null;
  this.updatedAt = Date.now();
  next();
});

// Method to check if a date range overlaps with this unavailability
ClassroomUnavailabilitySchema.methods.overlaps = function(startDate, endDate) {
  // If this unavailability is open-ended (no end date)
  if (!this.endDate) {
    return this.startDate <= endDate;
  }
  
  // If the provided period is open-ended (no end date)
  if (!endDate) {
    return this.startDate <= endDate || this.endDate >= startDate;
  }
  
  // Normal date range overlap check
  return (
    (this.startDate <= startDate && this.endDate >= startDate) || // Start date falls within unavailability
    (this.startDate <= endDate && this.endDate >= endDate) ||     // End date falls within unavailability
    (startDate <= this.startDate && endDate >= this.endDate)      // Unavailability falls within requested period
  );
};

module.exports = mongoose.model('ClassroomUnavailability', ClassroomUnavailabilitySchema); 