const express = require('express');
const router = express.Router();

// Import auth routes first (we know these exist)
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

// Get the individual auth routes for direct mounting
const studentAuthRoutes = require('./auth/studentAuth');
const adminAuthRoutes = require('./auth/adminAuth');
const facultyAuthRoutes = require('./auth/facultyAuth');

// Mount auth routes by role - this creates alternative paths that match frontend URLs
router.use('/student/auth', studentAuthRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/faculty/auth', facultyAuthRoutes);

// Initialize route variables
let facultyRoutes;
let studentRoutes;
let adminRoutes;
let universityRoutes;

// Try to load other route modules, but handle if they don't exist
try {
  console.log('Attempting to load faculty routes...');
  facultyRoutes = require('./faculty/index');
  router.use('/faculty', facultyRoutes);
  console.log('Faculty routes loaded successfully');
} catch (err) {
  console.log('Faculty routes not available:', err.message);
  facultyRoutes = express.Router(); // Create empty router as fallback
}

try {
  console.log('Attempting to load student routes...');
  studentRoutes = require('./student/index');
  router.use('/student', studentRoutes);
  console.log('Student routes loaded successfully');
} catch (err) {
  console.log('Student routes not available:', err.message);
  studentRoutes = express.Router(); // Create empty router as fallback
}

try {
  console.log('Attempting to load admin routes...');
  adminRoutes = require('./admin/index');
  router.use('/admin', adminRoutes);
  console.log('Admin routes loaded successfully');
} catch (err) {
  console.log('Admin routes not available:', err.message);
  adminRoutes = express.Router(); // Create empty router as fallback
}

try {
  console.log('Attempting to load university routes...');
  universityRoutes = require('./universityRoutes');
  router.use('/universities', universityRoutes);
  console.log('University routes loaded successfully');
} catch (err) {
  console.log('University routes not available:', err.message);
  universityRoutes = express.Router(); // Create empty router as fallback
}

// University verification endpoint (publicly accessible)
const Admin = require('../models/Admin');
console.log('Admin model loaded:', Admin ? 'Yes' : 'No');

const Student = require('../models/Student');
console.log('Student model loaded:', Student ? 'Yes' : 'No');

const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email configuration - simplified for this endpoint
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secure: true
});

// Helper to generate OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// University code verification - publicly accessible endpoint
router.post('/verify-code', [
  check('universityCode', 'University code is required').not().isEmpty(),
  check('email', 'Valid email is required').isEmail(),
  check('name', 'Name is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      return res.status(400).json({ 
        success: false,
        message: errorMessages[0],
        errors: errors.array()
      });
    }

    const { universityCode, email, name } = req.body;

    // Find university by code (case-insensitive)
    const university = await Admin.findOne({ 
      universityCode: { $regex: new RegExp('^' + universityCode + '$', 'i') }
    });

    if (!university) {
      logger.warn(`Invalid university code used: ${universityCode}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid university code'
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ 
      email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    });
    
    if (existingStudent) {
      logger.warn(`Email already registered: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'This email is already registered. Please use a different email or reset your password.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // 10 minutes

    // Save temporary student data
    const tempStudent = new Student({
      name,
      email,
      universityCode,
      university: university._id,
      resetOTP: otp,
      otpExpires,
      status: 'pending'
    });

    await tempStudent.save();
    logger.info(`Temporary student created: ${email}`);

    // Send OTP email
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

    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`);

    res.json({
      success: true,
      message: 'OTP sent successfully to your email',
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

// Import specific route modules
const adminDashboardRoutes = require('./admin/dashboardRoutes');
const adminClassroomRoutes = require('./admin/classroomRoutes');
const adminSubjectRoutes = require('./admin/subjectRoutes');
const adminAttendanceRoutes = require('./admin/attendanceRoutes');
const studentAttendanceRoutes = require('./student/attendanceRoutes');
const facultyProfileRoutes = require('./faculty/profile');
const facultyAttendanceRoutes = require('./faculty/attendanceRoutes');

// Mount routes
// Admin routes
router.use('/admin', adminDashboardRoutes);
router.use('/admin', adminClassroomRoutes);
router.use('/admin', adminSubjectRoutes);
router.use('/admin/attendance', adminAttendanceRoutes);

// Student routes - use the previously loaded router or the specific routes
router.use('/student/attendance', studentAttendanceRoutes);

// Faculty routes
router.use('/faculty/profile', facultyProfileRoutes);
router.use('/faculty/attendance', facultyAttendanceRoutes);

// Prevent duplicate mounting
// These were already mounted earlier in the try/catch blocks
// So we don't need to mount them again

module.exports = router; 