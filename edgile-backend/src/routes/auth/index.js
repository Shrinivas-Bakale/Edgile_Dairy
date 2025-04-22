const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const RegistrationCode = require('../../models/RegistrationCode');
const Admin = require('../../models/Admin');
const Student = require('../../models/Student');
const Faculty = require('../../models/Faculty');
const { protect } = require('../../middleware/authMiddleware');

// Import route modules
const facultyAuthRoutes = require('./facultyAuth');
const studentAuthRoutes = require('./studentAuth');
const adminAuthRoutes = require('./adminAuth');

// Add me endpoint to get current user info
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no user ID'
      });
    }
    
    let user = null;
    
    // Find user based on role
    if (userRole === 'admin') {
      user = await Admin.findById(userId).select('-password');
    } else if (userRole === 'student') {
      user = await Student.findById(userId).select('-password');
    } else if (userRole === 'faculty') {
      user = await Faculty.findById(userId).select('-password');
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        role: userRole
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add verify-code route to handle the frontend request
router.post('/verify-code', async (req, res) => {
  try {
    console.log('Verify code request received:', req.body);
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }
    
    // Look for a registration code
    const registrationCode = await RegistrationCode.findOne({ code });
    
    if (!registrationCode) {
      console.log(`Invalid code: ${code}`);
      return res.status(404).json({
        success: false,
        message: 'Invalid registration code'
      });
    }
    
    // Check if code is already used
    if (registrationCode.used) {
      return res.status(400).json({
        success: false,
        message: 'This registration code has already been used'
      });
    }
    
    // Check if code is active
    if (!registrationCode.active) {
      return res.status(400).json({
        success: false,
        message: 'This registration code is inactive'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Registration code verified',
      type: registrationCode.type
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mount routes
router.use('/faculty', facultyAuthRoutes);
router.use('/student', studentAuthRoutes);
router.use('/admin', adminAuthRoutes);

module.exports = router; 