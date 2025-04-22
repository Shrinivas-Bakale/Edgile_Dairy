const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  otpExpiry: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Document will be automatically deleted after 10 minutes
  }
});

// Create indexes for better query performance
OTPSchema.index({ email: 1, otpExpiry: 1 });

// Add a method to check if OTP is valid
OTPSchema.methods.isValid = function() {
  return this.attempts < 3 && new Date() < this.otpExpiry;
};

const OTP = mongoose.model('OTP', OTPSchema);

module.exports = OTP; 