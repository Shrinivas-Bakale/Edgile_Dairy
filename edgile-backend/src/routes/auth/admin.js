const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const Admin = require('../../models/Admin');
const adminAuthMiddleware = require('../../middleware/adminAuthMiddleware');
const logger = require('../../utils/logger');

// @route   POST /api/auth/admin/login
// @desc    Login admin and get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if admin exists
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      
      if (!admin) {
        logger.warn(`Login attempt with non-existent admin email: ${email}`);
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Check if admin is active
      if (admin.status !== 'active') {
        logger.warn(`Login attempt with inactive admin account: ${email}`);
        return res.status(403).json({ msg: 'Account is not active. Please contact support.' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        logger.warn(`Invalid password attempt for admin: ${email}`);
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Create and return JWT token
      const payload = {
        id: admin.id,
        role: 'admin'
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          
          logger.info(`Admin login successful: ${email}`);
          
          res.json({
            token,
            admin: {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              universityName: admin.universityName,
              universityCode: admin.universityCode
            }
          });
        }
      );
    } catch (error) {
      logger.error(`Admin login error: ${error.message}`);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/auth/admin/me
// @desc    Get current admin data
// @access  Private
router.get('/me', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    logger.info(`Admin profile accessed: ${admin.email}`);
    
    res.json({ admin });
  } catch (error) {
    logger.error(`Error fetching admin profile: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// @route   PUT /api/auth/admin/profile
// @desc    Update admin profile
// @access  Private
router.put(
  '/profile',
  [
    adminAuthMiddleware,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
    ]
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;

    try {
      // Check if email already exists and belongs to different admin
      if (email.toLowerCase() !== req.user.email.toLowerCase()) {
        const emailExists = await Admin.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: req.user.id } 
        });
        
        if (emailExists) {
          logger.warn(`Admin profile update failed - email already in use: ${email}`);
          return res.status(400).json({ msg: 'Email already in use' });
        }
      }

      // Update admin profile
      const admin = await Admin.findById(req.user.id);
      
      if (!admin) {
        logger.warn(`Admin not found with ID: ${req.user.id}`);
        return res.status(404).json({ msg: 'Admin not found' });
      }
      
      admin.name = name;
      admin.email = email.toLowerCase();
      
      await admin.save();
      
      logger.info(`Admin profile updated: ${admin.email}`);
      
      res.json({
        msg: 'Profile updated successfully',
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          universityName: admin.universityName,
          universityCode: admin.universityCode
        }
      });
    } catch (error) {
      logger.error(`Error updating admin profile: ${error.message}`);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/auth/admin/password
// @desc    Update admin password
// @access  Private
router.put(
  '/password',
  [
    adminAuthMiddleware,
    [
      check('currentPassword', 'Current password is required').exists(),
      check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
    ]
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      // Get admin
      const admin = await Admin.findById(req.user.id);
      
      if (!admin) {
        logger.warn(`Admin not found with ID: ${req.user.id}`);
        return res.status(404).json({ msg: 'Admin not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        logger.warn(`Admin password update failed - incorrect current password: ${admin.email}`);
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);
      
      await admin.save();
      
      logger.info(`Admin password updated: ${admin.email}`);
      
      res.json({ msg: 'Password updated successfully' });
    } catch (error) {
      logger.error(`Error updating admin password: ${error.message}`);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/auth/admin/forgot-password
// @desc    Request password reset for admin
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Find admin by email
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      
      if (!admin) {
        // Don't reveal that email doesn't exist for security
        logger.info(`Password reset requested for non-existent admin email: ${email}`);
        return res.json({ msg: 'If the email exists, a reset code has been sent' });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = Date.now() + 3600000; // 1 hour
      
      // Save OTP to admin
      admin.resetOTP = otp;
      admin.otpExpires = otpExpires;
      await admin.save();
      
      // Here you would typically send an email with OTP
      // For now, we'll just log it for development purposes
      logger.info(`Password reset OTP for admin ${email}: ${otp}`);
      
      res.json({ 
        msg: 'If the email exists, a reset code has been sent',
        // Include OTP in response for development only, remove in production
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    } catch (error) {
      logger.error(`Error in admin forgot password: ${error.message}`);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/auth/admin/reset-password
// @desc    Reset admin password with OTP
// @access  Public
router.post(
  '/reset-password',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty(),
    check('newPassword', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    try {
      // Find admin by email
      const admin = await Admin.findOne({ 
        email: email.toLowerCase(),
        resetOTP: otp,
        otpExpires: { $gt: Date.now() }
      });
      
      if (!admin) {
        logger.warn(`Invalid or expired OTP for admin password reset: ${email}`);
        return res.status(400).json({ msg: 'Invalid or expired reset code' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);
      
      // Clear OTP
      admin.resetOTP = undefined;
      admin.otpExpires = undefined;
      
      await admin.save();
      
      logger.info(`Admin password reset successful: ${email}`);
      
      res.json({ msg: 'Password has been reset successfully' });
    } catch (error) {
      logger.error(`Error in admin password reset: ${error.message}`);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  }
);

module.exports = router; 