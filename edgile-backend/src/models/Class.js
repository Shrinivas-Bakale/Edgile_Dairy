const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
  universityCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  division: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  facultyId: {
    type: Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  academicYear: {
    type: String,
    required: true
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'Student'
  }],
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create an index for faster queries
classSchema.index({ 
  universityCode: 1, 
  year: 1, 
  division: 1, 
  semester: 1,
  academicYear: 1
});

module.exports = mongoose.model('Class', classSchema); 