const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
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

    console.log("[DEBUG] Verifying JWT token");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[DEBUG] JWT decoded:", JSON.stringify(decoded));

    // Extract permissions from token if available
    if (decoded.permissions) {
      req.userPermissions = decoded.permissions;
      console.log("[DEBUG] Permissions from token:", req.userPermissions);
    } else {
      req.userPermissions = [];
      console.log("[DEBUG] No permissions in token");
    }

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
      if (!user) {
        logger.warn(`⚠️ Admin not found with ID: ${decoded.id}`);
        return res.status(401).json({ message: "Admin not found" });
      }
      // Add default admin permissions if not in token
      if (!req.userPermissions || req.userPermissions.length === 0) {
        req.userPermissions = [
          "admin:all",
          "admin:dashboard",
          "admin:users:manage",
          "admin:settings",
          "admin:reports",
        ];
      }
      // Set university to universityCode for admin users
      user.university = user.universityCode;
    } else if (decoded.role === "faculty") {
      user = await Faculty.findById(decoded.id);
      if (!user) {
        logger.warn(`⚠️ Faculty not found with ID: ${decoded.id}`);
        return res.status(401).json({ message: "Faculty not found" });
      }
      // Add default faculty permissions if not in token
      if (!req.userPermissions || req.userPermissions.length === 0) {
        req.userPermissions = [
          "faculty:profile",
          "faculty:dashboard",
          "faculty:courses:view",
          "faculty:students:view",
          "faculty:attendance:manage",
          "faculty:timetable:view",
        ];
      }
    } else {
      logger.warn(`⚠️ Invalid role in token: ${decoded.role}`);
      return res.status(401).json({ message: "Invalid role in token" });
    }

    // Add user data to request
    req.user = {
      id: user._id,
      _id: user._id, // For compatibility with different code patterns
      role: decoded.role,
      ...user._doc,
      permissions: req.userPermissions,
      universityCode:
        user.universityCode || user.university?.code || "KLE-F104ED", // Add university code
      university: user.universityCode || user.university?.code || "KLE-F104ED", // Set university to university code for compatibility
    };

    // Helper function for permission checking
    req.hasPermission = (permission) => {
      // If user has admin:all permission, they can do anything
      if (req.userPermissions.includes("admin:all")) return true;

      // Check for specific permission
      return req.userPermissions.includes(permission);
    };

    // Helps determine if a user has faculty access
    req.isFaculty = decoded.role === "faculty";
    // Helps determine if a user has admin access
    req.isAdmin = decoded.role === "admin";

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("⚠️ Invalid JWT token:", error.message);
      return res.status(401).json({ message: "Invalid authentication token" });
    }
    if (error.name === "TokenExpiredError") {
      logger.warn("⚠️ JWT token expired");
      return res.status(401).json({ message: "Authentication token expired" });
    }
    logger.error("🔥 JWT Verification Error:", error);
    res.status(500).json({ message: "Server error" });
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

// ✅ Check Permission Middleware
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Check if user exists and has permissions
      if (!req.user || !req.user.permissions) {
        logger.warn("⚠️ Permission check failed - No user or permissions");
        return res
          .status(403)
          .json({ message: "Access denied - Insufficient permissions" });
      }

      // Check if user has the required permission
      if (!req.user.permissions.includes(requiredPermission)) {
        logger.warn(
          `⚠️ Permission denied: ${req.user.role} tried to access ${requiredPermission}`
        );
        return res
          .status(403)
          .json({ message: "Access denied - Insufficient permissions" });
      }

      // Permission granted
      next();
    } catch (error) {
      logger.error("🔥 Permission Check Error:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  };
};

// ✅ Restrict To Role Middleware
exports.restrictTo = (role) => {
  return (req, res, next) => {
    try {
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        logger.warn("⚠️ Role check failed - No user or role");
        return res
          .status(403)
          .json({ message: "Access denied - Authentication required" });
      }

      // Check if user has the required role
      if (req.user.role !== role) {
        logger.warn(
          `⚠️ Role denied: ${req.user.role} tried to access ${role} route`
        );
        return res
          .status(403)
          .json({ message: `Access denied - ${role} access only` });
      }

      // Role allowed, continue
      next();
    } catch (error) {
      logger.error("🔥 Role Check Error:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  };
};
