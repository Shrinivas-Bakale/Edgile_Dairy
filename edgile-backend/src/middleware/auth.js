const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");

console.log("Auth middleware file loaded successfully");

// Simple auth middleware function
const authMiddleware = async (req, res, next) => {
  console.log("Auth middleware executing");

  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No authentication token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user based on role
    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === "faculty") {
      user = await Faculty.findById(decoded.id);
    } else {
      return res.status(403).json({ message: "Invalid user role" });
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// Admin-specific authentication middleware
const validateAdmin = async (req, res, next) => {
  console.log("ValidateAdmin middleware executing");

  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user is an admin
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Find the admin user
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Add admin info to request
    req.admin = admin;

    next();
  } catch (error) {
    console.error("ValidateAdmin middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  authMiddleware,
  validateAdmin,
};
