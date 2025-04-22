const mongoose = require("mongoose");

const registrationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'type',
    },
    usedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Create compound index for code uniqueness within a university
registrationCodeSchema.index(
  { code: 1, university: 1 },
  { unique: true }
);

// Add method to check if code is valid
registrationCodeSchema.methods.isValid = function() {
  return this.isActive && !this.used && new Date() < this.expiresAt;
};

module.exports = mongoose.model("RegistrationCode", registrationCodeSchema); 