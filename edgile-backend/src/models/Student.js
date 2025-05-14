const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentSchema = new mongoose.Schema(
  {
    registerNumber: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@klebcahubli\.in$/,
        "Invalid email! Use your college email (@klebcahubli.in)",
      ],
    },
    password: {
      type: String,
      required: function() {
        return this.isVerified; // Only required after verification
      },
    },
    phone: {
      type: String,
      match: [/^\d{10}$/, "Invalid phone"],
      required: function() {
        return this.isVerified; // Only required after verification
      },
    },
    classYear: { 
      type: Number, 
      min: 1, 
      max: 3,
      required: function() {
        return this.isVerified; // Only required after verification
      },
    },
    semester: { 
      type: Number, 
      min: 1, 
      max: 6,
      required: function() {
        return this.isVerified; // Only required after verification
      },
    },
    // Reference to class
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    // Reference to the university admin
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    // University code for easier reference
    universityCode: {
      type: String,
      required: true,
      trim: true
    },
    division: {
      type: String,
      enum: ["A1", "A2", "A3", "A4", "A5", "A6"],
      required: function() {
        return this.isVerified; // Only required after verification
      },
    },
    role: { type: String, default: "student", enum: ["student"] },
    status: {
      type: String,
      enum: ["active", "graduated", "inactive", "pending"],
      default: "pending",
    },
    backlogs: [{ type: String }],
    // For tracking promotion history (for undo functionality)
    previousClassYear: { type: Number },
    previousSemester: { type: Number },
    previousStatus: { type: String },
    lastPromotedAt: { type: Date },
    // For login OTP
    otp: { type: String },
    otpExpires: { type: Date },
    // For email verification during registration
    emailVerificationOTP: { type: String },
    emailOtpExpires: { type: Date },
    otpVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    // For password reset
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpires: { type: Date },
    resetPasswordOTPVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for unique student within a university
studentSchema.index({ registerNumber: 1, university: 1 }, { unique: true });
// Compound index for unique email within a university
studentSchema.index({ email: 1, university: 1 }, { unique: true });

// Hash password before saving
studentSchema.pre('save', async function(next) {
  const student = this;
  
  // Only hash the password if it has been modified (or is new)
  if (!student.isModified('password') || !student.password) return next();
  
  try {
    console.log(`Pre-save hook triggered for student: ${student.email}`);
    console.log(`Password before hashing length: ${student.password.length}`);
    
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password
    student.password = await bcrypt.hash(student.password, salt);
    
    console.log(`Password after hashing length: ${student.password.length}`);
    console.log(`Password hash starts with: ${student.password.substring(0, 10)}...`);
    next();
  } catch (error) {
    console.error(`Error hashing password: ${error.message}`);
    next(error);
  }
});

// Method to compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log(`comparePassword called for student: ${this.email}`);
    console.log(`Candidate password length: ${candidatePassword.length}`);
    console.log(`Stored hash length: ${this.password.length}`);
    
    const result = await bcrypt.compare(candidatePassword, this.password);
    console.log(`Password comparison result: ${result}`);
    return result;
  } catch (error) {
    console.error(`Error comparing password: ${error.message}`);
    throw new Error(error);
  }
};

module.exports = mongoose.model("Student", studentSchema);
