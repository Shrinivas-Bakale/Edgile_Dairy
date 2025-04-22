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

// Try to load other route modules, but handle if they don't exist
try {
  console.log('Attempting to load faculty routes...');
  const facultyRoutes = require('./faculty/index');
  router.use('/faculty', facultyRoutes);
  console.log('Faculty routes loaded successfully');
} catch (err) {
  console.log('Faculty routes not available:', err.message);
}

try {
  console.log('Attempting to load student routes...');
  const studentRoutes = require('./student/index');
  router.use('/student', studentRoutes);
  console.log('Student routes loaded successfully');
} catch (err) {
  console.log('Student routes not available:', err.message);
}

try {
  console.log('Attempting to load admin routes...');
  const adminRoutes = require('./admin/index');
  router.use('/admin', adminRoutes);
  console.log('Admin routes loaded successfully');
} catch (err) {
  console.log('Admin routes not available:', err.message);
}

try {
  console.log('Attempting to load university routes...');
  const universityRoutes = require('./universityRoutes');
  router.use('/universities', universityRoutes);
  console.log('University routes loaded successfully');
} catch (err) {
  console.log('University routes not available:', err.message);
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

// Add the new route to get university information by code
router.get('/admin/university-by-code/:universityCode', async (req, res) => {
  try {
    const { universityCode } = req.params;
    
    if (!universityCode) {
      return res.status(400).json({ success: false, message: 'University code is required' });
    }
    
    const university = await Admin.findOne({ universityCode });
    
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }
    
    res.status(200).json({
      success: true,
      university: {
        _id: university._id,
        name: university.name,
        email: university.email,
        universityName: university.universityName,
        universityCode: university.universityCode
      }
    });
  } catch (error) {
    console.error('Error fetching university by code:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update the classroom routes path
router.use('/api/admin', require('./admin/classroomRoutes'));

module.exports = router; 