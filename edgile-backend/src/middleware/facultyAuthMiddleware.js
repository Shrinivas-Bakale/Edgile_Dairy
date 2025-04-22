const jwt = require("jsonwebtoken");
const Faculty = require("../models/Faculty");
const dotenv = require("dotenv");
const logger = require("../utils/logger");

dotenv.config();

const facultyAuthMiddleware = async (req, res, next) => {
  try {
    logger.info("🔍 Headers Received:", req.headers);

    const authHeader = req.headers.authorization;
    logger.info("🔍 Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access Denied. No Token Provided." });
    }

    const token = authHeader.split(" ")[1];
    logger.info("🔍 Extracted Token:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info("🔍 Decoded Token:", decoded);

    const faculty = await Faculty.findById(decoded.id);
    if (!faculty) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    // Allow access to registration completion and password change routes for pending accounts
    const allowedRoutes = [
      'profile/complete',
      '/complete',
      'change-password',
      'auth/profile'
    ];
    
    // More flexible path matching that handles various URL structures
    const isAllowedRoute = allowedRoutes.some(route => {
      return req.path.includes(route);
    });
    
    // Add debug logging
    console.log('Path check:', {
      currentPath: req.path,
      allowedRoutes,
      isAllowed: isAllowedRoute,
      facultyStatus: faculty.status,
      facultyEmail: faculty.email,
      fullUrl: req.originalUrl
    });
    
    // Only restrict access if the faculty status is pending and the route is not allowed
    if (faculty.status === 'pending' && !faculty.registrationCompleted && !isAllowedRoute) {
      logger.warn(`⚠️ Access denied to non-registration route for pending faculty: ${faculty.email}`);
      return res.status(403).json({ 
        message: "Please complete your registration and change your password first",
        requiresRegistration: true
      });
    }

    req.faculty = faculty;
    logger.info(`✅ Faculty Authenticated: ${faculty.email}`);

    next();
  } catch (error) {
    logger.error("🔥 Auth Error:", error);
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = facultyAuthMiddleware;
