const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const logger = require('../utils/logger');

/**
 * Authentication middleware for students
 * Verifies JWT token and adds student data to req object
 */
const studentAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('No auth token provided for student route');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the token is for a student
    if (decoded.role !== 'student') {
      logger.warn(`Invalid role access attempt: ${decoded.role} tried to access student route`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student access only.'
      });
    }
    
    // Find the student by ID
    const student = await Student.findById(decoded.id);
    
    if (!student) {
      logger.warn(`Student not found for ID: ${decoded.id}`);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Add student data to request object
    req.student = student;
    req.studentId = student._id;
    req.user = {
      id: student._id,
      role: 'student',
      email: student.email
    };
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    // Check for JWT specific errors
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token for student route');
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired JWT token for student route');
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired. Please login again.'
      });
    }
    
    logger.error(`Error in student auth middleware: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

/**
 * Simplified validation middleware for student routes
 * Used for routes that need basic validation but not full authentication
 */
const validateStudent = async (req, res, next) => {
  try {
    // Check if required query parameters are provided
    if (!req.query.year || !req.query.semester || !req.query.division) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: year, semester, division'
      });
    }
    
    // Validate semester is a number
    const semester = parseInt(req.query.semester);
    if (isNaN(semester)) {
      return res.status(400).json({
        success: false,
        message: 'Semester must be a number'
      });
    }
    
    // Add validated parameters to request
    req.validatedParams = {
      year: req.query.year,
      semester,
      division: req.query.division
    };
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    logger.error(`Error in validateStudent middleware: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during validation'
    });
  }
};

module.exports = {
  studentAuthMiddleware,
  validateStudent
}; 