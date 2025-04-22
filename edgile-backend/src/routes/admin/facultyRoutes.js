const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { validateAdmin } = require('../../middleware/auth');

// Get models from mongoose
const Admin = mongoose.model('Admin');
const Faculty = mongoose.model('Faculty');

// Apply middleware to all routes
router.use(validateAdmin);

// Get faculty preferences
router.get('/preferences', async (req, res) => {
  try {
    const { university, year, semester, academicYear } = req.query;
    
    // For debugging
    logger.info(`Fetching faculty preferences: university=${university}, year=${year}, semester=${semester}, academicYear=${academicYear}`);
    console.log(`[DEBUG] Fetching faculty preferences: university=${university}, year=${year}, semester=${semester}, academicYear=${academicYear}`);
    
    // Since we don't have actual preferences set up yet, return empty array
    // This will allow the system to work without faculty preferences (which are optional)
    return res.status(200).json({
      success: true,
      data: []
    });
  } catch (error) {
    logger.error(`Error fetching faculty preferences: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching faculty preferences',
      error: error.message
    });
  }
});

// Get all faculty members
router.get('/', async (req, res) => {
  try {
    const { university } = req.query;
    
    // For debugging
    logger.info(`Fetching faculty members: university=${university}`);
    
    // Get admin's university ID if not provided
    let universityId = university;
    if (!universityId) {
      const admin = await Admin.findById(req.user.id);
      if (admin) {
        universityId = admin._id;
        logger.info(`Using admin's university ID: ${universityId}`);
      }
    }
    
    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: 'University ID is required'
      });
    }
    
    // Find all faculty members for this university
    const faculty = await Faculty.find({ university: universityId })
      .select('-password -resetOTP -otpExpires')
      .sort({ createdAt: -1 });
    
    logger.info(`Found ${faculty.length} faculty members for university ${universityId}`);
    
    return res.status(200).json({
      success: true,
      faculty: faculty
    });
  } catch (error) {
    logger.error(`Error fetching faculty members: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching faculty members',
      error: error.message
    });
  }
});

module.exports = router; 