const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  floor: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  capacity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  universityCode: {
    type: String,
    required: false
  },
  universityName: {
    type: String,
    required: false
  },
  status: { 
    type: String, 
    enum: ['available', 'unavailable', 'maintenance'], 
    default: 'available' 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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

ClassroomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if classroom is available at a specific time
ClassroomSchema.methods.isAvailableAt = async function(startDate, endDate) {
  const ClassroomUnavailability = mongoose.model('ClassroomUnavailability');
  
  const overlapping = await ClassroomUnavailability.findOne({
    classroom: this._id,
    $or: [
      // Case 1: Start date falls within an unavailability period
      { 
        startDate: { $lte: startDate },
        $or: [
          { endDate: { $gte: startDate } },
          { endDate: null } // Open-ended unavailability
        ]
      },
      // Case 2: End date falls within an unavailability period
      {
        startDate: { $lte: endDate },
        $or: [
          { endDate: { $gte: endDate } },
          { endDate: null } // Open-ended unavailability
        ]
      },
      // Case 3: Unavailability period falls completely within requested period
      {
        startDate: { $gte: startDate },
        endDate: { $lte: endDate }
      }
    ]
  });
  
  return !overlapping;
};

module.exports = mongoose.model('Classroom', ClassroomSchema); 