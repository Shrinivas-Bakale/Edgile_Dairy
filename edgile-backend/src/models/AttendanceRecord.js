const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  EXCUSED: "EXCUSED",
};

const attendanceRecordSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    universityId: {
      type: Schema.Types.ObjectId,
      ref: "University",
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },
    faculty: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
    },
    university: {
      type: Schema.Types.ObjectId,
      ref: "University",
    },
    date: {
      type: Date,
      required: true,
    },
    slotNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.ABSENT,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for unique records
attendanceRecordSchema.index(
  { classId: 1, subjectId: 1, date: 1, slotNumber: 1 },
  { unique: true }
);

// Add indexes for common queries
attendanceRecordSchema.index({ classId: 1, date: 1 });
attendanceRecordSchema.index({ facultyId: 1, date: 1 });
attendanceRecordSchema.index({ universityId: 1 });

// Export the model and the attendance status enum
module.exports = {
  AttendanceRecord: mongoose.model("AttendanceRecord", attendanceRecordSchema),
  AttendanceStatus,
};
