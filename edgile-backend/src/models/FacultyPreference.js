const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FacultyPreferenceSchema = new Schema({
  faculty: {
    type: Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty ID is required']
  },
  facultyName: {
    type: String,
    required: [true, 'Faculty name is required']
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject ID is required']
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required']
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required']
  },
  year: {
    type: String,
    enum: ['First', 'Second', 'Third', 'Fourth'],
    required: [true, 'Year is required']
  },
  semester: {
    type: Number,
    enum: [1, 2, 3, 4, 5, 6, 7, 8],
    required: [true, 'Semester is required']
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
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
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
FacultyPreferenceSchema.index({ faculty: 1, academicYear: 1 });
FacultyPreferenceSchema.index({ subject: 1, academicYear: 1 });
FacultyPreferenceSchema.index({ university: 1, year: 1, semester: 1 });

// Ensure faculty can only express preference for a subject once per academic year
FacultyPreferenceSchema.index(
  { faculty: 1, subject: 1, academicYear: 1 }, 
  { unique: true }
);

FacultyPreferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FacultyPreference', FacultyPreferenceSchema); 