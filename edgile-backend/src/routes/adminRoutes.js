const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");
const { toggleFacultyStatus } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const logger = require("../utils/logger"); // ✅ Winston Logger
const crypto = require("crypto");
const adminController = require('../controllers/adminController');

const router = express.Router();

// Test route to verify server is running
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes are working!" });
});

// Middleware to log every request
router.use((req, res, next) => {
    console.log(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);
    next();
  });

// 📌 Register Admin
router.post("/register", async (req, res) => {
    try {
        logger.info("📥 Incoming Admin Registration Request", { requestBody: req.body });

        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
            });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ name, email, password: hashedPassword });
        await newAdmin.save();

        logger.info("✅ Admin Registered Successfully", { adminEmail: email });
        res.status(201).json({ message: "Admin registered successfully" });
    } catch (error) {
        logger.error("🔥 Error in Admin Register", { error: error.message });
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// 📌 Admin Login
router.post("/login", async (req, res) => {
    try {
        logger.info("🔑 Admin Login Attempt", { requestBody: req.body });

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Create user object without sensitive data
        const user = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: 'admin',
            createdAt: admin.createdAt,
            permissions: admin.permissions || []
        };

        logger.info("✅ Admin Logged In Successfully", { adminEmail: email });
        res.status(200).json({ 
            success: true,
            message: "Login successful", 
            token,
            user
        });
    } catch (error) {
        logger.error("❌ Error logging in admin", { error: error.message });
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// 📌 Get Admin Profile
router.get("/profile", protect, adminOnly, async (req, res) => {
  try {
    logger.info("📥 Fetching admin profile", { adminId: req.user._id });
    
    const admin = await Admin.findById(req.user._id).select('-password');
    if (!admin) {
      logger.warn("❌ Admin not found", { adminId: req.user._id });
      return res.status(404).json({ 
        success: false,
        message: "Admin not found" 
      });
    }

    logger.info("✅ Admin profile fetched successfully");
    res.json({
      success: true,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        createdAt: admin.createdAt,
        permissions: admin.permissions || []
      }
    });
  } catch (error) {
    logger.error("🔥 Error fetching admin profile", { error: error.message });
    res.status(500).json({ 
      success: false,
      message: "Error fetching profile data" 
    });
  }
});

// 📌 Toggle Faculty Status (Activate/Deactivate) - Admin Only
router.put("/faculty/:id/toggle-status", protect, adminOnly, toggleFacultyStatus);

// 📌 Admin Dashboard - Only Admins
router.get("/dashboard", protect, adminOnly, (req, res) => {
    res.json({ message: `Welcome, Admin ${req.user.name}!`, admin: req.user });
  });

// 📌 Verify Super Admin Code
router.post("/verify-super-admin-code", async (req, res) => {
  try {
    console.log("🔍 Received request to /verify-super-admin-code");
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    
    logger.info("📥 Received super admin code verification request", { 
      body: req.body,
      headers: req.headers,
      url: req.originalUrl,
      method: req.method
    });
    
    const { superAdminCode } = req.body;
    if (!superAdminCode) {
      console.log("❌ No super admin code provided");
      return res.status(400).json({ msg: "Super admin code is required", success: false });
    }

    logger.info("🔍 Attempting to verify super admin code");

    // Verify the super admin code
    const correctSuperAdminCode = process.env.SUPER_ADMIN_CODE;
    if (!correctSuperAdminCode) {
      console.log("❌ SUPER_ADMIN_CODE not set in environment");
      logger.error("❌ SUPER_ADMIN_CODE is not set in environment variables");
      return res.status(500).json({ msg: "Server configuration error", success: false });
    }
    
    // Using fixed-length buffers to prevent length-based attacks
    const codeBuffer = Buffer.from(superAdminCode.padEnd(32).slice(0, 32), 'utf8');
    const correctCodeBuffer = Buffer.from(correctSuperAdminCode.padEnd(32).slice(0, 32), 'utf8');
    
    const isValidCode = crypto.timingSafeEqual(codeBuffer, correctCodeBuffer);
    
    if (!isValidCode) {
      console.log("❌ Invalid super admin code provided");
      logger.warn(`⚠️ Invalid super admin code verification attempt`);
      return res.status(403).json({ msg: "Invalid super admin code", success: false });
    }

    // Log successful verification without revealing the code
    console.log("✅ Super admin code verified successfully");
    logger.info(`✅ Super admin code verified successfully`);
    
    // Return success without any sensitive information
    res.json({ 
      msg: "Super admin code verified successfully",
      success: true
    });
  } catch (err) {
    console.error("🔥 Error in verify-super-admin-code:", err);
    logger.error("🔥 Error verifying super admin code:", err.message);
    res.status(500).json({ msg: "Server error", success: false });
  }
});

// 📌 Admin Profile endpoint
router.get("/auth/profile", protect, adminOnly, async (req, res) => {
  try {
    logger.info("Fetching admin profile", { adminId: req.user._id });
    
    // Find admin by ID but exclude the password field
    const admin = await Admin.findById(req.user._id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    // Return admin data
    return res.json({
      success: true,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        createdAt: admin.createdAt,
        permissions: admin.permissions || []
      }
    });
  } catch (error) {
    logger.error("Error fetching admin profile", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile data"
    });
  }
});

router.post('/students/promote', protect, adminController.promoteStudents);

module.exports = router;
