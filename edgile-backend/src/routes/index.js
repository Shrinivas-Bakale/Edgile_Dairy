const express = require("express");
const router = express.Router();

// Import auth routes first (we know these exist)
const authRoutes = require("./auth");
router.use("/auth", authRoutes);

// Get the individual auth routes for direct mounting
const adminAuthRoutes = require("./auth/adminAuth");
const facultyAuthRoutes = require("./auth/facultyAuth");

// Mount auth routes by role - this creates alternative paths that match frontend URLs
router.use("/admin/auth", adminAuthRoutes);
router.use("/faculty/auth", facultyAuthRoutes);

// Initialize route variables
let facultyRoutes;
let adminRoutes;
let universityRoutes;

// Try to load other route modules, but handle if they don't exist
try {
  console.log("Attempting to load faculty routes...");
  facultyRoutes = require("./faculty/index");
  router.use("/faculty", facultyRoutes);
  console.log("Faculty routes loaded successfully");
} catch (err) {
  console.log("Faculty routes not available:", err.message);
  facultyRoutes = express.Router(); // Create empty router as fallback
}

try {
  console.log("Attempting to load admin routes...");
  adminRoutes = require("./admin/index");
  router.use("/admin", adminRoutes);
  console.log("Admin routes loaded successfully");
} catch (err) {
  console.log("Admin routes not available:", err.message);
  adminRoutes = express.Router(); // Create empty router as fallback
}

try {
  console.log("Attempting to load university routes...");
  universityRoutes = require("./universityRoutes");
  router.use("/universities", universityRoutes);
  console.log("University routes loaded successfully");
} catch (err) {
  console.log("University routes not available:", err.message);
  universityRoutes = express.Router(); // Create empty router as fallback
}

// University verification endpoint (publicly accessible)
const Admin = require("../models/Admin");
console.log("Admin model loaded:", Admin ? "Yes" : "No");

const { check, validationResult } = require("express-validator");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// Email configuration - simplified for this endpoint
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true,
});

// Import specific route modules
const adminDashboardRoutes = require("./admin/dashboardRoutes");
const adminClassroomRoutes = require("./admin/classroomRoutes");
const adminSubjectRoutes = require("./admin/subjectRoutes");
const adminAttendanceRoutes = require("./admin/attendanceRoutes");
const facultyProfileRoutes = require("./faculty/profile");
const facultyAttendanceRoutes = require("./faculty/attendanceRoutes");

// Mount routes
// Admin routes
router.use("/admin", adminDashboardRoutes);
router.use("/admin", adminClassroomRoutes);
router.use("/admin", adminSubjectRoutes);
router.use("/admin/attendance", adminAttendanceRoutes);

// Faculty routes
router.use("/faculty/profile", facultyProfileRoutes);
router.use("/faculty/attendance", facultyAttendanceRoutes);

// Prevent duplicate mounting
// These were already mounted earlier in the try/catch blocks
// So we don't need to mount them again

module.exports = router;
