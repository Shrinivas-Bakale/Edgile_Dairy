const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const logger = require("../utils/logger"); // Winston Logger

console.log('adminAuthMiddleware loaded'); // Debug log

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    let token = req.header('x-auth-token');

    // If x-auth-token header is not present, try Authorization header with Bearer token
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove "Bearer " prefix
      }
    }

    // Check if no token
    if (!token) {
      logger.warn('No authentication token provided for admin route');
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add debug logging
    console.log('Token decoded:', {
      id: decoded.id,
      role: decoded.role,
      exp: decoded.exp
    });
    
    // Check if the token belongs to an admin
    if (decoded.role !== 'admin') {
      logger.warn(`User with role ${decoded.role} attempted to access admin route`);
      return res.status(403).json({ msg: 'Not authorized as admin' });
    }

    // Find admin by id
    const admin = await Admin.findById(decoded.id).select('-password');
    
    // Check if admin exists
    if (!admin) {
      logger.warn(`Admin not found with ID: ${decoded.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    // Check if admin is active
    if (admin.status !== 'active') {
      logger.warn(`Inactive admin attempted to access route: ${admin.email}`);
      return res.status(403).json({ msg: 'Admin account is not active' });
    }

    // Set user info in request object
    req.user = {
      id: decoded.id,
      email: admin.email,
      role: 'admin'
    };

    next();
  } catch (err) {
    logger.error(`Admin auth middleware error: ${err.message}`);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired' });
    }
    
    res.status(500).json({ msg: 'Server Error' });
  }
};
