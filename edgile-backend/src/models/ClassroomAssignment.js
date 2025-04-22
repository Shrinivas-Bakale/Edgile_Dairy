const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const logger = require('../utils/logger');

const ClassroomAssignmentSchema = new Schema({
  classroomId: {
    type: Schema.Types.ObjectId,
    ref: 'Classroom',
    required: [true, 'Classroom ID is required']
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
    required: [true, 'Academic year is required']
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
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Assigner ID is required']
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

// Create indexes for efficient queries
ClassroomAssignmentSchema.index({ classroomId: 1, academicYear: 1 });
ClassroomAssignmentSchema.index({ university: 1, year: 1, semester: 1, division: 1 });

// Ensure a classroom can only be assigned to one class per academic year
ClassroomAssignmentSchema.index(
  { classroomId: 1, academicYear: 1 },
  { unique: true }
);

// Ensure a class (year-semester-division) can only be assigned one classroom per academic year
ClassroomAssignmentSchema.index(
  { university: 1, year: 1, semester: 1, division: 1, academicYear: 1 },
  { unique: true }
);

ClassroomAssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ClassroomAssignment', ClassroomAssignmentSchema); 