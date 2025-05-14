const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    universityCode: {
      type: String,
      required: true,
      trim: true
    },
    universityName: {
      type: String,
      required: true,
      trim: true
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    role: {
      type: String,
      default: "faculty",
    },
    permissions: {
      type: [String],
      default: [
        'faculty:profile',
        'faculty:dashboard',
        'faculty:courses:view',
        'faculty:students:view',
        'faculty:attendance:manage',
        'faculty:timetable:view'
      ]
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    subjects: {
      type: [String],
      default: []
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: { type: Boolean, default: true },
    classesAssigned: { type: [String], default: [] },
    resetOTP: { type: String },
    otpExpires: { type: Date },
    phone: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    address: {
      type: String,
      trim: true
    },
    qualification: {
      type: String,
      trim: true
    },
    specialization: {
      type: String,
      trim: true
    },
    experience: {
      type: String,
      trim: true
    },
    researchInterests: {
      type: [String],
      default: []
    },
    profileImage: {
      type: String,
      default: ''
    },
    registrationCompleted: {
      type: Boolean,
      default: false
    },
    registrationCompletionToken: String,
    registrationCompletionExpires: Date,
    isFirstLogin: {
      type: Boolean,
      default: true
    },
    passwordLastChanged: {
      type: Date,
      default: Date.now
    },
    passwordChangeRequired: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
  },
  { timestamps: true }
);

// Create compound index for faculty uniqueness within a university
facultySchema.index(
  { email: 1, university: 1 },
  { unique: true }
);

facultySchema.index(
  { employeeId: 1, university: 1 },
  { unique: true }
);

// Update timestamp on save
facultySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Faculty", facultySchema);
