const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attendanceSettingsSchema = new Schema({
  university: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  minAttendancePercentage: {
    type: Number,
    required: true,
    default: 75,
    min: 0,
    max: 100
  },
  lateGracePeriodMinutes: {
    type: Number,
    default: 10,
    min: 0
  },
  countLateAsPresent: {
    type: Boolean,
    default: true
  },
  countExcusedAsPresent: {
    type: Boolean,
    default: true
  },
  autoMarkAbsent: {
    type: Boolean,
    default: true
  },
  allowEditAfterHours: {
    type: Number,
    default: 24,
    min: 0
  },
  warningThresholds: [{
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    notifyStudent: {
      type: Boolean,
      default: true
    },
    notifyParent: {
      type: Boolean,
      default: true
    },
    notifyFaculty: {
      type: Boolean,
      default: true
    },
    notifyAdmin: {
      type: Boolean,
      default: true
    }
  }],
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

// Create a unique index for each university
attendanceSettingsSchema.index({ university: 1 }, { unique: true });

// Update the updatedAt field on save
attendanceSettingsSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("AttendanceSettings", attendanceSettingsSchema); 