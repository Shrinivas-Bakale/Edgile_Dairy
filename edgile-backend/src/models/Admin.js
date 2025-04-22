const mongoose = require("mongoose");
const crypto = require("crypto");
const { Schema } = mongoose;

const AdminSchema = new Schema(
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
    universityName: {
      type: String,
      required: true,
      trim: true
    },
    universityCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'pending'
    },
    role: {
      type: String,
      default: 'admin'
    },
    resetOTP: {
      type: String
    },
    otpExpires: {
      type: Date
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Create virtual for university ID (same as admin ID)
AdminSchema.virtual('universityId').get(function() {
  return this._id;
});

// Method to convert document to JSON
AdminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  delete admin.resetOTP;
  delete admin.otpExpires;
  return admin;
};

// Generate unique university code before saving
AdminSchema.pre("save", function (next) {
  // Only generate code if it doesn't exist or if university name changed
  if (!this.universityCode || this.isModified("universityName")) {
    // Create a base from university name (first 3 chars uppercase)
    let baseCode = this.universityName.substring(0, 3).toUpperCase();
    
    // Add random alphanumeric characters (6 chars)
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    
    this.universityCode = `${baseCode}-${randomPart}`;
  }
  next();
});

module.exports = mongoose.model("Admin", AdminSchema);
