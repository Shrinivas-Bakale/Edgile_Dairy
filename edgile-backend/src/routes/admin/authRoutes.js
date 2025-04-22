const express = require('express');
const router = express.Router();
const Admin = require('../../models/Admin');
const RegistrationCode = require('../../models/RegistrationCode');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../../middleware/authMiddleware');
const { sendEmail } = require('../../utils/email');
const { generateOTP } = require('../../utils/otp');

// Add these routes to handle registration codes

// Get all registration codes
router.get('/registration-codes', authMiddleware, async (req, res) => {
  try {
    const codes = await RegistrationCode.find({})
      .sort({ createdAt: -1 })
      .exec();
    
    res.status(200).json({
      success: true,
      registrationCodes: codes
    });
  } catch (error) {
    console.error('Error fetching registration codes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch registration codes', 
      error: error.message 
    });
  }
});

// Generate a new registration code
router.post('/registration-code', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['student', 'faculty'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration code type. Must be "student" or "faculty".'
      });
    }
    
    // Generate a unique code
    const prefix = type === 'student' ? 'STU' : 'FAC';
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${prefix}-${randomPart}`;
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create new registration code
    const newCode = new RegistrationCode({
      code,
      type,
      used: false,
      createdBy: req.user._id,
      university: req.user.university || req.user._id, // Fallback to user ID if university not set
      expiresAt,
      isActive: true
    });
    
    await newCode.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration code generated successfully',
      registrationCode: newCode
    });
  } catch (error) {
    console.error('Error generating registration code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate registration code', 
      error: error.message 
    });
  }
});

// Verify a registration code
router.get('/verify-registration-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const registrationCode = await RegistrationCode.findOne({ code });
    
    if (!registrationCode) {
      return res.status(404).json({
        success: false,
        message: 'Registration code not found'
      });
    }
    
    if (registrationCode.used) {
      return res.status(400).json({
        success: false,
        message: 'Registration code has already been used'
      });
    }
    
    if (!registrationCode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Registration code is not active'
      });
    }
    
    if (new Date() > new Date(registrationCode.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Registration code has expired'
      });
    }
    
    // Code is valid
    res.status(200).json({
      success: true,
      message: 'Registration code is valid',
      registrationCode
    });
  } catch (error) {
    console.error('Error verifying registration code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify registration code', 
      error: error.message 
    });
  }
}); 