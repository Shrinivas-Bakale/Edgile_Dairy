const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const logger = require("../utils/logger");

// ✅ Protect Route (JWT Authentication)
exports.protect = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      logger.warn("⚠️ Unauthorized access attempt - No token provided");
      return res
        .status(401)
        .json({ message: "No authentication token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // ✅ Log extracted user role
    logger.info(`✅ User Authenticated: ${req.user.role} - ID: ${req.user.id}`);

    next();
  } catch (error) {
    logger.error("🔥 Authentication failed:", error.message);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

// ✅ Admin-Only Access
exports.adminOnly = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      logger.warn(`⚠️ Unauthorized access attempt - Admin required`);
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    logger.error("🔥 Admin Middleware Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Faculty-Only Access
exports.facultyOnly = async (req, res, next) => {
  try {
    if (req.user.role !== "faculty") {
      logger.warn(`⚠️ Unauthorized access attempt - Faculty required`);
      return res.status(403).json({ message: "Faculty access required" });
    }
    next();
  } catch (error) {
    logger.error("🔥 Faculty Middleware Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Student-Only Access
exports.studentOnly = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      logger.warn("⚠️ Unauthorized access attempt - Student access required");
      return res.status(403).json({ message: "Student access required" });
    }
    next();
  } catch (error) {
    logger.error("🔥 Student Middleware Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
