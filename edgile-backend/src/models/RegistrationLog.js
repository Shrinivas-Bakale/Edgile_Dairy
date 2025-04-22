const mongoose = require('mongoose');

const registrationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Faculty', 'Student']
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true,
      enum: ['faculty', 'student']
    },
    // Student specific fields
    registerNumber: {
      type: String
    },
    semester: {
      type: String
    },
    division: {
      type: String
    },
    year: {
      type: String
    },
    // Faculty specific fields
    employeeId: {
      type: String
    },
    department: {
      type: String
    },
    // Common fields
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    universityName: {
      type: String,
      required: true
    },
    universityCode: {
      type: String,
      required: true
    },
    registeredBy: {
      type: String,
      enum: ['admin', 'self'],
      default: 'admin'
    },
    registrationMethod: {
      type: String,
      enum: ['admin-created', 'self-registration', 'import'],
      default: 'admin-created'
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'suspended', 'graduated'],
      default: 'active'
    }
  },
  { 
    timestamps: true 
  }
);

// Create index for efficient queries on most common searches
registrationLogSchema.index({ userRole: 1, createdAt: -1 });
registrationLogSchema.index({ universityId: 1, createdAt: -1 });
registrationLogSchema.index({ registerNumber: 1 });
registrationLogSchema.index({ employeeId: 1 });
registrationLogSchema.index({ semester: 1 });
registrationLogSchema.index({ createdAt: -1 }); // For date-based queries

module.exports = mongoose.model('RegistrationLog', registrationLogSchema); 