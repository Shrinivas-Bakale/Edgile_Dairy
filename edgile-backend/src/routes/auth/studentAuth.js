const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Student = require("../../models/Student");
const nodemailer = require("nodemailer");
const studentAuthMiddleware = require("../../middleware/studentAuthMiddleware");
const bcrypt = require("bcrypt");
const Admin = require("../../models/Admin");
const { check, validationResult } = require("express-validator");
const RegistrationCode = require('../../models/RegistrationCode');
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const registrationLogger = require('../../utils/registrationLogger');

// Debug Admin model
console.log("Admin model loaded:", Admin ? "Yes" : "No");
// Check if Student model is correctly loaded
console.log("Student model loaded:", Student ? "Yes" : "No");

const router = express.Router();

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secure: true // Use TLS
});

// Generate OTP Function (6-digit)
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Send OTP via Email
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Edgile Login",
      text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`OTP sent to ${email}`);
  } catch (error) {
    logger.error('Error sending OTP email:', { error: error.message, email });
    throw new Error('Failed to send OTP email');
  }
};

// Send verification email with OTP
const sendVerificationEmail = async (email, otp, name) => {
  try {
    const mailOptions = {
      from: `"Edgile University" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Edgile Student Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Welcome to Edgile University!</h2>
          <p>Dear ${name},</p>
          <p>Thank you for registering with Edgile University. To complete your registration, please use the following OTP:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending verification email:', { error: error.message, email });
    throw new Error('Failed to send verification email');
  }
};

// In-memory storage for temporary registration data
const tempRegistrations = new Map();

// Helper function to generate a random ID
const generateTempId = () => crypto.randomBytes(16).toString('hex');

// 📌 Student Registration (New Users)
router.post("/register", async (req, res) => {
  logger.info("📝 Student registration request received");

  try {
    const {
      name,
      registerNumber,
      email,
      password,
      division,
      classYear,
      semester,
      universityCode,
    } = req.body;

    // Validate all required fields
    if (!name || !registerNumber || !email || !password || !division || 
        !classYear || !semester || !universityCode) {
      logger.warn("⚠️ Missing required fields for student registration");
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Email validation for school email
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      logger.warn(`⚠️ Invalid email format: ${email}`);
      return res.status(400).json({ msg: "Please provide a valid email address" });
    }

    // Validate class year (1-3)
    const classYearNum = parseInt(classYear);
    if (isNaN(classYearNum) || classYearNum < 1 || classYearNum > 3) {
      logger.warn(`⚠️ Invalid class year: ${classYear}`);
      return res.status(400).json({ msg: "Class year must be between 1 and 3" });
    }

    // Validate semester (1-6)
    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
      logger.warn(`⚠️ Invalid semester: ${semester}`);
      return res.status(400).json({ msg: "Semester must be between 1 and 6" });
    }

    // Validate division
    const validDivisions = ["A1", "A2", "A3", "A4", "A5", "A6"];
    if (!validDivisions.includes(division)) {
      logger.warn(`⚠️ Invalid division: ${division}`);
      return res.status(400).json({ 
        msg: "Please select a valid division", 
        validDivisions 
      });
    }

    // Verify university code and get university reference
    const university = await Admin.findOne({ universityCode });
    if (!university) {
      logger.warn(`⚠️ Invalid university code: ${universityCode}`);
      return res.status(400).json({ msg: "Invalid university code" });
    }

    // Check for existing student by register number under this university
    const existingByRegisterNumber = await Student.findOne({ 
      registerNumber, 
      university: university._id 
    });
    
    if (existingByRegisterNumber) {
      logger.warn(`⚠️ Student with register number ${registerNumber} already exists at this university`);
      return res.status(400).json({ 
        msg: "A student with this register number already exists" 
      });
    }

    // Check for existing student by email under this university
    const existingByEmail = await Student.findOne({ 
      email, 
      university: university._id 
    });
    
    if (existingByEmail) {
      logger.warn(`⚠️ Student with email ${email} already exists at this university`);
      return res.status(400).json({ 
        msg: "A student with this email already exists" 
      });
    }

    // Generate OTP for email verification
    const emailVerificationOTP = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new student object (not verified yet)
    const student = new Student({
      name,
      registerNumber,
      email,
      password: hashedPassword,
      division,
      classYear: classYearNum,
      semester: semesterNum,
      universityCode,
      university: university._id,
      isVerified: false,
      emailVerificationOTP,
      emailOtpExpires: otpExpiry,
      status: "inactive" // Will be set to active after verification
    });

    // Save student
    await student.save();
    
    // Log the registration
    await registrationLogger.logStudentRegistration(student, university, 'self-registration');

    // Send verification email with OTP
    try {
      await sendVerificationEmail(email, emailVerificationOTP, name);
      logger.info(`✉️ Verification email sent to ${email}`);
    } catch (emailErr) {
      logger.error(`❌ Failed to send verification email: ${emailErr.message}`);
      // We continue even if email fails, but log it
    }

    res.status(201).json({
      msg: "Registration initiated. Please verify your email with the OTP sent to your inbox.",
      studentId: student._id
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      logger.error(`❌ Validation error: ${err.message}`);
      return res.status(400).json({ 
        msg: "Validation failed", 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    logger.error(`❌ Server error in student registration: ${err.message}`);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// 📌 Verify OTP and Login
router.post("/login-with-otp", async (req, res) => {
  try {
    const { registerNumber, otp } = req.body;

    if (!registerNumber || !otp) {
      return res
        .status(400)
        .json({ message: "Register Number and OTP required" });
    }

    const student = await Student.findOne({ registerNumber });
    
    if (!student) {
      return res.status(404).json({ message: "Student not found with this register number" });
    }
    
    if (!student.otp) {
      return res.status(400).json({ message: "No OTP requested. Please request a new OTP" });
    }
    
    if (student.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP" });
    }

    if (student.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please check and try again" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { 
        id: student.registerNumber, 
        role: "student" 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    student.otp = undefined;
    student.otpExpires = undefined;
    await student.save();

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { registerNumber } = req.body;

    if (!registerNumber) {
      return res.status(400).json({ message: "Register Number required" });
    }

    const student = await Student.findOne({ registerNumber });
    if (!student) {
      return res.status(400).json({ message: "User not registered" });
    }

    // Generate OTP & Store it directly
    const otp = generateOTP();
    student.otp = otp;
    student.otpExpires = Date.now() + 10 * 60 * 1000;
    await student.save();

    // Send OTP Email
    await sendOTPEmail(student.email, otp);
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Protected Route Example
router.get("/dashboard", studentAuthMiddleware, (req, res) => {
  res.json({ message: "Welcome Student!", student: req.student });
});

// 📌 Get Current Student Profile (for auth verification)
router.get("/me", studentAuthMiddleware, async (req, res) => {
  try {
    // req.student is already loaded by the middleware
    const student = req.student;
    
    // Return a sanitized version of the student data
    res.status(200).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      registerNumber: student.registerNumber,
      classYear: student.classYear,
      semester: student.semester,
      division: student.division,
      phone: student.phone,
      isVerified: student.isVerified
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify Email OTP
router.post("/verify-email", async (req, res) => {
  logger.info("🔍 Email verification request received");
  
  try {
    const { studentId, otp } = req.body;
    
    if (!studentId || !otp) {
      logger.warn("⚠️ Missing studentId or OTP for verification");
      return res.status(400).json({ msg: "Student ID and OTP are required" });
    }
    
    // Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      logger.warn(`⚠️ Student not found for ID: ${studentId}`);
      return res.status(404).json({ msg: "Student not found" });
    }
    
    // Check if already verified
    if (student.isVerified) {
      logger.info(`✅ Student ${studentId} is already verified`);
      return res.status(200).json({ msg: "Email already verified" });
    }
    
    // Check if OTP is expired
    if (new Date() > new Date(student.emailOtpExpires)) {
      logger.warn(`⚠️ Expired OTP for student ${studentId}`);
      return res.status(400).json({ 
        msg: "OTP has expired. Please request a new one",
        expired: true
      });
    }
    
    // Verify OTP
    if (student.emailVerificationOTP !== otp) {
      logger.warn(`⚠️ Invalid OTP attempt for student ${studentId}`);
      return res.status(400).json({ msg: "Invalid OTP" });
    }
    
    // Update student - verified and active
    student.isVerified = true;
    student.status = "active";
    student.emailVerificationOTP = ""; // Clear the OTP
    await student.save();
    
    logger.info(`✅ Student ${studentId} email verified successfully`);
    
    // Generate auth token
    const payload = {
      user: {
        id: student.id,
        role: "student"
      },
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: 360000,
    });
    
    res.status(200).json({
      msg: "Email verified successfully",
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        role: "student"
      }
    });
  } catch (err) {
    logger.error(`❌ Server error in email verification: ${err.message}`);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Resend Email Verification OTP
router.post("/resend-verification", async (req, res) => {
  logger.info("🔄 Request to resend verification OTP");
  
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      logger.warn("⚠️ Missing studentId for resending verification");
      return res.status(400).json({ msg: "Student ID is required" });
    }
    
    // Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      logger.warn(`⚠️ Student not found for ID: ${studentId}`);
      return res.status(404).json({ msg: "Student not found" });
    }
    
    // Check if already verified
    if (student.isVerified) {
      logger.info(`✅ Student ${studentId} is already verified`);
      return res.status(200).json({ msg: "Email already verified" });
    }
    
    // Generate new OTP and update expiry
    const emailVerificationOTP = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    
    // Update student with new OTP
    student.emailVerificationOTP = emailVerificationOTP;
    student.emailOtpExpires = otpExpiry;
    await student.save();
    
    // Send new verification email
    try {
      await sendVerificationEmail(student.email, emailVerificationOTP, student.name);
      logger.info(`✉️ Verification email resent to ${student.email}`);
    } catch (emailErr) {
      logger.error(`❌ Failed to resend verification email: ${emailErr.message}`);
      return res.status(500).json({ 
        msg: "Failed to send verification email", 
        error: emailErr.message 
      });
    }
    
    res.status(200).json({
      msg: "Verification OTP resent successfully",
      studentId: student._id
    });
  } catch (err) {
    logger.error(`❌ Server error in resending verification: ${err.message}`);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Verify OTP only (for email verification step) 
router.post('/verify-otp', async (req, res) => {
  try {
    console.log('🔍 Verify OTP request received:', req.body);
    
    const { studentId, otp } = req.body;
    
    if (!studentId || !otp) {
      console.log('Missing studentId or OTP');
      return res.status(400).json({
        success: false,
        message: 'Student ID and OTP are required'
      });
    }
    
    logger.info(`Verifying OTP for student ID: ${studentId}`);
    
    try {
      // Check if studentId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        logger.warn(`Invalid MongoDB ObjectId format: ${studentId}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID format'
        });
      }
      
      // Find the student in MongoDB
      const student = await Student.findById(studentId);
      
      if (!student) {
        logger.warn(`Student not found with ID: ${studentId}`);
        return res.status(400).json({
          success: false,
          message: 'Student record not found. Please register again.'
        });
      }
      
      // Check if OTP matches any of the stored OTP fields
      const isValidOTP = student.otp === otp || 
                         student.resetOTP === otp || 
                         student.emailVerificationOTP === otp;
                         
      if (!isValidOTP) {
        logger.warn(`Invalid OTP for student: ${studentId}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please check and try again.'
        });
      }
      
      // Check if OTP is expired based on which field matched
      const now = new Date();
      const isExpired = (student.otp === otp && student.otpExpires && student.otpExpires < now) ||
                        (student.resetOTP === otp && student.otpExpires && student.otpExpires < now) ||
                        (student.emailVerificationOTP === otp && student.emailOtpExpires && student.emailOtpExpires < now);
      
      if (isExpired) {
        logger.warn(`Expired OTP for student: ${studentId}`);
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new verification code.'
        });
      }
      
      // Mark OTP as verified
      student.otpVerified = true;
      await student.save();
      
      logger.info(`OTP verified successfully for student: ${studentId}`);
      
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        studentId: student._id
      });
    } catch (err) {
      logger.error(`Error verifying OTP: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: 'Server error during OTP verification'
      });
    }
  } catch (error) {
    logger.error(`OTP verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification', 
      error: error.message
    });
  }
});

// 📌 Verify University Code - Initial step of registration
router.post("/verify-university-code", async (req, res) => {
  logger.info("Student registration university code verification request");
  
  try {
    const { 
      name, 
      email, 
      universityCode
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !universityCode) {
      return res.status(400).json({ 
        success: false,
        message: "Name, email and university code are required"
      });
    }
    
    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      logger.warn(`Invalid email format: ${email}`);
      return res.status(400).json({ 
        success: false,
        message: "Please provide a valid email address" 
      });
    }
    
    // Check university code validity (case-insensitive)
    const university = await Admin.findOne({ 
      universityCode: { $regex: new RegExp('^' + universityCode + '$', 'i') } 
    });
    
    if (!university) {
      logger.warn(`No university found with code: ${universityCode}`);
      return res.status(400).json({ 
        success: false,
        message: "Invalid university code. Please check and try again." 
      });
    }
    
    if (university.status !== 'active') {
      logger.warn(`University found but status is ${university.status}`);
      return res.status(400).json({
        success: false,
        message: "This university code is not active"
      });
    }
    
    logger.info(`Found university: ${university.universityName}`);
    
    // Check if student with this email already exists
    const existingStudent = await Student.findOne({ 
      email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    });
    
    if (existingStudent) {
      // Check if the existing student is verified (has completed registration)
      if (existingStudent.isVerified) {
        logger.warn(`Email already registered and verified: ${email}`);
        return res.status(400).json({ 
          success: false,
          message: "This email is already registered. Please login instead." 
        });
      } else {
        // User has started registration but not completed it
        logger.info(`Incomplete registration found for email: ${email}. Resending OTP.`);
        
        // Generate new OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date();
        otpExpires.setMinutes(otpExpires.getMinutes() + 10); // 10 minutes
        
        // Update the existing record with new OTP
        existingStudent.otp = otp;
        existingStudent.otpExpires = otpExpires;
        existingStudent.otpVerified = false;
        
        // Update other fields if needed
        existingStudent.name = name;
        existingStudent.registerNumber = registerNumber;
        existingStudent.universityCode = universityCode;
        existingStudent.university = university._id;
        
        if (division) existingStudent.division = division;
        if (classYear) existingStudent.classYear = classYear;
        if (semester) existingStudent.semester = semester;
        if (phone) existingStudent.phone = phone;
        
        await existingStudent.save();
        
        // Send email with OTP
        try {
          await sendVerificationEmail(email, otp, name);
          logger.info(`Verification email sent to: ${email} for incomplete registration`);
        } catch (emailError) {
          logger.error(`Failed to send email: ${emailError.message}`);
          // Continue even if email fails
        }
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully. Please complete your registration.',
          studentId: existingStudent._id,
          resuming: true
        });
      }
    }
    
    // Generate OTP for verification
    const otp = generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Create a temporary student (pending verification)
    const student = new Student({
      name,
      email,
      registerNumber,
      universityCode,
      university: university._id,
      otp: otp,
      otpExpires: otpExpires,
      isVerified: false,
      status: "pending"
    });
    
    const savedStudent = await student.save();
    
    // Send verification email
    try {
      await sendVerificationEmail(email, otp, name);
      logger.info(`Verification email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send verification email: ${emailError.message}`);
      // We will continue even if email fails
    }
    
    // Return success response with student ID for next steps
    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      studentId: student._id
    });
  } catch (error) {
    logger.error(`Server error in university code verification: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message
    });
  }
});

// Complete student registration (set password and activate account)
router.post('/complete-registration', async (req, res) => {
  try {
    console.log('🔍 Complete registration request received:', req.body);
    logger.info('Completing student registration...');
    const { studentId, password } = req.body;
    
    if (!studentId || !password) {
      logger.warn('Missing studentId or password in request');
      return res.status(400).json({
        success: false,
        message: 'Student ID and password are required'
      });
    }
    
    console.log('Password received, length:', password.length);
    
    // Check if studentId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      logger.warn(`Invalid MongoDB ObjectId format: ${studentId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }
    
    // Find the student record
    const tempStudent = await Student.findById(studentId);
    
    if (!tempStudent) {
      logger.warn(`Student not found with ID: ${studentId}`);
      return res.status(400).json({
        success: false,
        message: 'Student record not found'
      });
    }
    
    console.log('Found student record:', {
      id: tempStudent._id,
      email: tempStudent.email,
      otpVerified: tempStudent.otpVerified
    });
    
    // Check if OTP was verified
    if (!tempStudent.otpVerified) {
      logger.warn(`Attempting to complete registration for unverified student: ${studentId}`);
      return res.status(400).json({
        success: false,
        message: 'Email verification required before completing registration'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update the existing student record with the password and mark as active
    tempStudent.password = hashedPassword;
    tempStudent.status = 'active';
    tempStudent.isVerified = true;
    
    // Clear OTP fields
    tempStudent.otp = undefined;
    tempStudent.otpExpires = undefined;
    tempStudent.otpVerified = undefined;
    
    try {
      await tempStudent.save();
      logger.info(`Student registration completed successfully: ${tempStudent.email}`);
    } catch (saveError) {
      logger.error(`Error saving student: ${saveError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error saving student data',
        error: saveError.message
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: tempStudent._id,
        role: 'student',
        email: tempStudent.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      success: true,
      message: 'Registration completed successfully',
      token,
      student: {
        id: tempStudent._id,
        name: tempStudent.name,
        email: tempStudent.email,
        registerNumber: tempStudent.registerNumber,
        role: 'student'
      }
    });
    
  } catch (error) {
    logger.error(`Registration completion error: ${error.message}`);
    
    // Check for duplicate key errors from MongoDB
    if (error.code === 11000) {
      let message = 'A user with this information already exists.';
      if (error.keyPattern) {
        if (error.keyPattern.email) {
          message = 'A user with this email already exists.';
        } else if (error.keyPattern.registerNumber) {
          message = 'A user with this register number already exists.';
        }
      }
      return res.status(400).json({
        success: false,
        message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration completion',
      error: error.message
    });
  }
});

// Testing route to verify the endpoint is accessible
router.get('/test', (req, res) => {
  console.log('Student auth test route hit successfully');
  res.status(200).json({
    success: true,
    message: 'Student auth routes are working'
  });
});

// Student verify-code endpoint - uses MongoDB for temporary data storage
router.post('/verify-code', [
  check('universityCode', 'University code is required').not().isEmpty(),
  check('email', 'Valid email is required').isEmail(),
  check('name', 'Name is required').not().isEmpty(),
  check('registerNumber', 'Register number is required').not().isEmpty()
], async (req, res) => {
  try {
    console.log('🔍 Student verify-code request received:', req.body);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      logger.warn(`Validation errors: ${errorMessages.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: errorMessages[0],
        errors: errors.array()
      });
    }

    const { universityCode, email, name, registerNumber, division, classYear, semester, phone } = req.body;

    // Find university
    const university = await Admin.findOne({ 
      universityCode: { $regex: new RegExp('^' + universityCode + '$', 'i') }
    });

    if (!university) {
      logger.warn(`Invalid university code: ${universityCode}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid university code'
      });
    }

    // Check if email already exists in the database
    const existingStudent = await Student.findOne({ 
      email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    });

    if (existingStudent) {
      // Check if the existing student is verified (has completed registration)
      if (existingStudent.isVerified) {
        logger.warn(`Email already registered and verified: ${email}`);
        return res.status(400).json({ 
          success: false,
          message: "This email is already registered. Please login instead." 
        });
      } else {
        // User has started registration but not completed it
        logger.info(`Incomplete registration found for email: ${email}. Resending OTP.`);
        
        // Generate new OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date();
        otpExpires.setMinutes(otpExpires.getMinutes() + 10); // 10 minutes
        
        // Update the existing record with new OTP
        existingStudent.otp = otp;
        existingStudent.otpExpires = otpExpires;
        existingStudent.otpVerified = false;
        
        // Update other fields if needed
        existingStudent.name = name;
        existingStudent.registerNumber = registerNumber;
        existingStudent.universityCode = universityCode;
        existingStudent.university = university._id;
        
        if (division) existingStudent.division = division;
        if (classYear) existingStudent.classYear = classYear;
        if (semester) existingStudent.semester = semester;
        if (phone) existingStudent.phone = phone;
        
        await existingStudent.save();
        
        // Send email with OTP
        try {
          await sendVerificationEmail(email, otp, name);
          logger.info(`Verification email sent to: ${email} for incomplete registration`);
        } catch (emailError) {
          logger.error(`Failed to send email: ${emailError.message}`);
          // Continue even if email fails
        }
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully. Please complete your registration.',
          studentId: existingStudent._id,
          resuming: true
        });
      }
    }

    // Check if register number already exists in the database
    const existingRegister = await Student.findOne({
      registerNumber,
      university: university._id
    });

    if (existingRegister) {
      logger.warn(`Register number already registered: ${registerNumber}`);
      return res.status(400).json({
        success: false,
        message: 'This register number is already registered. Please contact your administrator.'
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // 10 minutes

    // Create temporary MongoDB document
    const tempStudent = new Student({
      name,
      email,
      registerNumber,
      universityCode,
      university: university._id,
      division: division || '',
      classYear: classYear || 1,
      semester: semester || 1,
      phone: phone || '',
      otp,  // Store OTP directly in the student document
      otpExpires,
      status: 'pending',
      isVerified: false
    });
    
    // Save to MongoDB
    await tempStudent.save();
    logger.info(`Temporary student record created for: ${email}`);

    // Send email with OTP
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      secure: true
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Edgile',
      html: `
        <h1>Email Verification</h1>
        <p>Hello ${name},</p>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send email: ${emailError.message}`);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      studentId: tempStudent._id
    });

  } catch (error) {
    logger.error(`Error in verify-code: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

// 📌 Student login route
router.post("/login", async (req, res) => {
  try {
    logger.info("Student login attempt received");
    const { email, password, universityCode } = req.body;
    
    console.log("Login attempt details:", { 
      email, 
      passwordProvided: !!password,
      passwordLength: password ? password.length : 0,
      universityCode 
    });
    
    // Check if required fields are present
    if (!email || !password || !universityCode) {
      logger.warn("Login attempt missing required fields");
      return res.status(400).json({ 
        success: false, 
        message: "Email, password, and university code are required" 
      });
    }
    
    // Find student by email and university code
    const student = await Student.findOne({ 
      email,
      universityCode
    });
    
    if (!student) {
      logger.warn(`Login attempt for non-existent email/university combination: ${email}`);
      console.log("No student found with email and university code combination");
      
      // Check if student exists with just the email to give better feedback
      const studentByEmail = await Student.findOne({ email });
      if (studentByEmail) {
        console.log("Student found with email, but university code doesn't match");
        return res.status(401).json({
          success: false,
          message: "University code is incorrect"
        });
      } else {
        console.log("No student found with this email");
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }
    }
    
    console.log("Student found, checking password");
    console.log(`Student details: ID=${student._id}, Name=${student.name}, Email=${student.email}`);
    
    if (!student.password) {
      logger.error(`Student ${student._id} has no password set!`);
      return res.status(500).json({
        success: false,
        message: "Account setup incomplete. Please reset your password."
      });
    }
    
    console.log(`Stored password hash length: ${student.password.length}`);
    console.log(`Stored password hash: ${student.password.substring(0, 20)}...`);
    console.log(`Provided password length: ${password.length}`);
    console.log(`First character of password: ${password.substring(0, 1)}`);
    console.log(`Last character of password: ${password.substring(password.length - 1)}`);
    
    // Try multiple password validation approaches to ensure compatibility
    let isPasswordValid = false;
    
    try {
      // First try direct bcrypt comparison (most reliable)
      console.log("Using bcrypt.compare directly");
      isPasswordValid = await bcrypt.compare(password, student.password);
      console.log(`Direct bcrypt comparison result: ${isPasswordValid}`);
      
      // For debugging, try to hash the provided password and compare the hash formats
      const debugSalt = await bcrypt.genSalt(10);
      const debugHash = await bcrypt.hash(password, debugSalt);
      console.log(`Debug hash of provided password: ${debugHash.substring(0, 20)}...`);
      console.log(`Hash format similarity check: 
        Stored hash starts with: ${student.password.substring(0, 7)}
        Debug hash starts with: ${debugHash.substring(0, 7)}
      `);
      
      // If that fails, try the model method as fallback
      if (!isPasswordValid && typeof student.comparePassword === 'function') {
        console.log("Direct comparison failed, trying model's comparePassword method");
        isPasswordValid = await student.comparePassword(password);
        console.log(`Model comparePassword result: ${isPasswordValid}`);
      }
    } catch (compareError) {
      logger.error(`Password comparison error: ${compareError.message}`);
      console.error("Error during password comparison:", compareError);
      isPasswordValid = false;
    }
    
    if (!isPasswordValid) {
      logger.warn(`Invalid password attempt for email: ${email}`);
      console.log("Password verification failed");
      
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }
    
    // Password is valid - continue with login
    console.log("Password verification succeeded");
    
    // Check if student is verified
    if (!student.isVerified) {
      logger.warn(`Unverified student attempted login: ${email}`);
      console.log("Student is not verified");
      return res.status(403).json({
        success: false,
        message: "Please complete your registration before logging in",
        studentId: student._id
      });
    }
    
    console.log("Student authentication successful");
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: student._id, 
        role: "student" 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Update last login timestamp
    student.lastLogin = new Date();
    await student.save();
    
    logger.info(`Student login successful: ${email}`);
    
    // Return success with token and user info
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        role: "student",
        division: student.division,
        classYear: student.classYear,
        semester: student.semester,
        phone: student.phone,
        universityCode: student.universityCode
      }
    });
    
  } catch (error) {
    console.error("Detailed login error:", error);
    logger.error(`Student login error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message
    });
  }
});

// 📌 Request Password Reset - Sends OTP via email
router.post('/request-password-reset', async (req, res) => {
  logger.info("🔑 Password reset request received");
  
  try {
    const { email, universityCode } = req.body;
    
    if (!email || !universityCode) {
      logger.warn("⚠️ Missing email or university code for password reset");
      return res.status(400).json({ 
        success: false,
        message: "Email and university code are required" 
      });
    }
    
    // Find the university
    const university = await Admin.findOne({ universityCode });
    if (!university) {
      logger.warn(`⚠️ Invalid university code: ${universityCode}`);
      return res.status(400).json({ 
        success: false,
        message: "Invalid university code" 
      });
    }
    
    // Find student by email and university
    const student = await Student.findOne({ 
      email, 
      university: university._id,
      isVerified: true // Only verified students can reset password
    });
    
    if (!student) {
      logger.warn(`⚠️ Student not found with email: ${email} and university code: ${universityCode}`);
      return res.status(404).json({ 
        success: false,
        message: "No verified student account found with this email and university code" 
      });
    }
    
    // Generate OTP for password reset
    const resetOTP = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Save OTP to student record
    student.resetPasswordOTP = resetOTP;
    student.resetPasswordOTPExpires = otpExpiry;
    await student.save();
    
    // Send OTP via email
    const mailOptions = {
      from: `"Edgile University" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Edgile University Password Reset</h2>
          <p>Dear ${student.name},</p>
          <p>We received a request to reset your password. Please use the following verification code to proceed:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 32px;">${resetOTP}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`✉️ Password reset OTP sent to ${email}`);
    
    res.status(200).json({
      success: true,
      message: "Password reset code sent to your email",
      studentId: student._id
    });
    
  } catch (err) {
    logger.error(`❌ Server error in password reset request: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// 📌 Verify Password Reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  logger.info("🔍 Verify password reset OTP request");
  
  try {
    const { studentId, otp } = req.body;
    
    if (!studentId || !otp) {
      logger.warn("⚠️ Missing studentId or OTP for reset verification");
      return res.status(400).json({ 
        success: false,
        message: "Student ID and OTP are required" 
      });
    }
    
    // Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      logger.warn(`⚠️ Student not found for ID: ${studentId}`);
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }
    
    // Check if reset OTP exists
    if (!student.resetPasswordOTP) {
      logger.warn(`⚠️ No reset OTP found for student ${studentId}`);
      return res.status(400).json({ 
        success: false,
        message: "No password reset was requested. Please request a new one" 
      });
    }
    
    // Check if OTP is expired
    if (new Date() > new Date(student.resetPasswordOTPExpires)) {
      logger.warn(`⚠️ Expired reset OTP for student ${studentId}`);
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired. Please request a new one",
        expired: true
      });
    }
    
    // Verify OTP
    if (student.resetPasswordOTP !== otp) {
      logger.warn(`⚠️ Invalid reset OTP attempt for student ${studentId}`);
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP" 
      });
    }
    
    // OTP is valid - mark as verified but don't clear it yet (needed for final step)
    student.resetPasswordOTPVerified = true;
    await student.save();
    
    logger.info(`✅ Password reset OTP verified for student ${studentId}`);
    
    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password",
      studentId: student._id
    });
    
  } catch (err) {
    logger.error(`❌ Server error in reset OTP verification: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// 📌 Reset Password (after OTP verification)
router.post('/reset-password', async (req, res) => {
  logger.info("🔄 Password reset attempt");
  console.log("Password reset attempt received:", {
    studentId: req.body.studentId,
    passwordProvided: !!req.body.password,
    passwordLength: req.body.password ? req.body.password.length : 0
  });
  
  try {
    const { studentId, password } = req.body;
    
    if (!studentId || !password) {
      logger.warn("⚠️ Missing studentId or password for reset");
      return res.status(400).json({ 
        success: false,
        message: "Student ID and new password are required" 
      });
    }
    
    // Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      logger.warn(`⚠️ Student not found for ID: ${studentId}`);
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }
    
    console.log(`Found student: ${student.name}, Email: ${student.email}`);
    
    // Check if OTP was verified
    if (!student.resetPasswordOTPVerified) {
      logger.warn(`⚠️ Reset OTP not verified for student ${studentId}`);
      return res.status(400).json({ 
        success: false,
        message: "OTP verification required before password reset" 
      });
    }
    
    // Check password requirements (minimum 8 characters)
    if (password.length < 8) {
      logger.warn("⚠️ Password too short");
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 8 characters long" 
      });
    }
    
    try {
      // Hash password using bcrypt directly for consistency
      console.log("Hashing password directly using bcrypt");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log(`Password hashed successfully. Hash length: ${hashedPassword.length}`);
      
      // Update student using the document method to trigger middleware
      console.log("Updating student document with new password");
      student.password = password; // Set the plain password so the middleware can hash it
      student.resetPasswordOTP = undefined;
      student.resetPasswordOTPExpires = undefined;
      student.resetPasswordOTPVerified = false;
      
      // Save the document to trigger the password hashing middleware
      await student.save();
      
      console.log("Student document saved with new password");
      
      // Verify the password was saved correctly
      const updatedStudent = await Student.findById(studentId);
      console.log(`Updated student password hash: ${updatedStudent.password.substring(0, 20)}...`);
      
      // Try a final verification test to make sure password works
      console.log("Testing password verification with new password");
      const verificationResult = await bcrypt.compare(password, updatedStudent.password);
      console.log(`Password verification test: ${verificationResult ? 'Success ✅' : 'Failed ❌'}`);
      
      if (!verificationResult) {
        // If verification fails, try direct update as last resort
        logger.warn(`⚠️ Verification failed! Trying direct password update as fallback`);
        
        // Hash again and update directly
        const emergencySalt = await bcrypt.genSalt(10);
        const emergencyHash = await bcrypt.hash(password, emergencySalt);
        
        await Student.updateOne(
          { _id: studentId },
          { $set: { password: emergencyHash } }
        );
        
        // Test one more time
        const finalStudent = await Student.findById(studentId);
        const finalVerification = await bcrypt.compare(password, finalStudent.password);
        console.log(`Emergency password update verification: ${finalVerification ? 'Success ✅' : 'Failed ❌'}`);
      }
      
      logger.info(`✅ Password reset successful for student ${studentId} (${student.email})`);
      
      res.status(200).json({
        success: true,
        message: "Password reset successful. You can now login with your new password"
      });
    } catch (err) {
      logger.error(`❌ Error during password hashing/saving: ${err.message}`);
      throw err; // Rethrow to be caught by outer catch
    }
    
  } catch (err) {
    logger.error(`❌ Server error in password reset: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// 📌 Get Student Profile
router.get('/profile', studentAuthMiddleware, async (req, res) => {
  try {
    console.log('Student profile request received');
    
    // req.student is loaded by the middleware
    const student = req.student;
    
    if (!student) {
      console.log('No student found in request object');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    
    console.log(`Returning profile for student: ${student._id}`);
    
    // Return sanitized profile data
    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        classYear: student.classYear,
        semester: student.semester,
        division: student.division,
        universityCode: student.universityCode,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error getting profile',
      error: error.message
    });
  }
});

module.exports = router;

