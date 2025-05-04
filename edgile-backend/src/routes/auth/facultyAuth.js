const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Faculty = require("../../models/Faculty");
const Admin = require("../../models/Admin");
const router = express.Router();
const nodemailer = require("nodemailer");
const facultyAuthMiddleware = require("../../middleware/facultyAuthMiddleware");
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const logger = require("../../utils/logger"); // Winston Logger
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const RegistrationCode = require('../../models/RegistrationCode');
const registrationLogger = require('../../utils/registrationLogger');

// ✅ Password Validation Function
const validatePassword = (password) => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// 📌 Faculty Registration (Created by Admin)
router.post("/register", adminAuthMiddleware, async (req, res) => {
  try {
    const { name, email, password, department, employeeId, subjects } = req.body;

    if (!name || !email || !password || !department || !employeeId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Validate password BEFORE hashing
    logger.info(`🔍 Validating password for ${email}`);
    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    // Get the admin's details (university info)
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`⚠️ Admin not found for ID: ${req.user.id}`);
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if faculty with same email already exists in this university
    let existingFaculty = await Faculty.findOne({
      email: email.toLowerCase(),
      university: admin._id
    });
    if (existingFaculty) {
      logger.warn(`⚠️ Faculty already exists: ${email}`);
      return res.status(400).json({ message: "Faculty with this email already exists" });
    }

    // Check if faculty with same employee ID already exists in this university
    existingFaculty = await Faculty.findOne({
      employeeId,
      university: admin._id
    });
    if (existingFaculty) {
      logger.warn(`⚠️ Faculty with employee ID ${employeeId} already exists`);
      return res.status(400).json({ message: "Faculty with this employee ID already exists" });
    }

    // ✅ Hash password AFTER validation
    logger.info("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    const newFaculty = new Faculty({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      department,
      employeeId,
      subjects: subjects || [],
      universityCode: admin.universityCode,
      university: admin._id
    });

    await newFaculty.save();
    logger.info(`✅ Faculty Registered: ${newFaculty.email} at ${admin.universityName}`);
    
    // Log the registration
    await registrationLogger.logFacultyRegistration(newFaculty, admin, 'admin-created');

    // Send credentials email
    try {
      await sendCredentialsEmail(
        email, 
        name, 
        employeeId, 
        password, 
        admin.universityName
      );
      logger.info(`✉️ Credentials email sent to new faculty: ${email}`);
    } catch (emailErr) {
      logger.error(`❌ Failed to send credentials email: ${emailErr.message}`);
      // Continue even if email fails, but log it
    }

    res.status(201).json({ 
      message: "Faculty registered successfully",
      faculty: {
        id: newFaculty._id,
        name: newFaculty.name,
        email: newFaculty.email,
        department: newFaculty.department,
      }
    });
  } catch (error) {
    logger.error("🔥 Faculty Registration Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Faculty Login
router.post("/login", async (req, res) => {
  try {
    logger.info("[DEBUG] Faculty login request body:", req.body);
    const { email, password, universityCode } = req.body;

    if (!email) {
      logger.warn("[DEBUG] Missing email");
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
      logger.warn("[DEBUG] Missing password");
      return res.status(400).json({ message: "Password is required" });
    }
    if (!universityCode) {
      logger.warn("[DEBUG] Missing university code");
      return res.status(400).json({ message: "University code is required" });
    }

    // Find university by code
    const university = await Admin.findOne({ universityCode });
    logger.info("[DEBUG] University lookup result:", university);
    if (!university) {
      logger.warn("[DEBUG] Invalid university code");
      return res.status(401).json({ message: "Invalid university code" });
    }

    // Find faculty by email and university
    const faculty = await Faculty.findOne({ email: email.toLowerCase(), university: university._id });
    logger.info("[DEBUG] Faculty lookup result:", faculty);
    if (!faculty) {
      logger.warn("[DEBUG] Faculty not found for email and university");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    logger.info("[DEBUG] Password match:", isMatch);
    if (!isMatch) {
      logger.warn("[DEBUG] Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check registration status
    if ((faculty.status === "pending" || !faculty.registrationCompleted) && faculty.isFirstLogin) {
      const token = jwt.sign(
        {
          id: faculty._id.toString(),
          role: "faculty",
          universityId: faculty.university,
          requiresRegistration: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(200).json({
        token,
        message: "Login successful - Registration completion required",
        user: {
          id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          role: "faculty",
          department: faculty.department,
          universityName: faculty.universityName,
          status: faculty.status,
          employeeId: faculty.employeeId,
          registrationCompleted: false,
          requiresRegistration: true,
          isFirstLogin: true,
        },
      });
    }
    // Only block login if registration is not complete and not first login
    if (!faculty.registrationCompleted && !faculty.isFirstLogin) {
      return res.status(401).json({ message: "Registration not completed. Please contact administration." });
    }

    if (faculty.status !== "active") {
      return res.status(401).json({ message: `Your account is ${faculty.status}. Please contact administration.` });
    }

    // Update last login time and first login status
    const isFirstLogin = faculty.isFirstLogin;
    faculty.lastLoginAt = new Date();
    faculty.isFirstLogin = false;
    await faculty.save();

    const token = jwt.sign(
      {
        id: faculty._id.toString(),
        role: "faculty",
        universityId: faculty.university,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      message: "Login successful",
      user: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        role: "faculty",
        department: faculty.department,
        universityName: faculty.universityName,
        isFirstLogin: isFirstLogin,
        passwordChangeRequired: faculty.passwordChangeRequired,
        employeeId: faculty.employeeId,
        registrationCompleted: faculty.registrationCompleted,
      },
    });
  } catch (error) {
    logger.error("🔥 Faculty Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send credentials email to new faculty
const sendCredentialsEmail = async (
  email, 
  name, 
  employeeId, 
  password, 
  universityName
) => {
  // Create a transporter using environment variables
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Email content
  const mailOptions = {
    from: `"Edgile University" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Faculty Account Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568; text-align: center;">Welcome to ${universityName}</h2>
        <p style="color: #4a5568;">Hello ${name},</p>
        <p style="color: #4a5568;">You have been registered as a faculty member at ${universityName}. Here are your login credentials:</p>
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>
        </div>
        <p style="color: #e53e3e; font-weight: bold;">Please change your password immediately after your first login for security reasons.</p>
        <p style="color: #4a5568;">You can login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color: #4299e1;">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #718096; font-size: 0.8rem;">
          <p>&copy; ${new Date().getFullYear()} ${universityName}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  // Send the email
  return transporter.sendMail(mailOptions);
};

// 📌 Generate OTP for Password Reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, universityCode } = req.body;
    
    if (!email || !universityCode) {
      return res.status(400).json({ message: "Email and university code are required" });
    }
    
    // Verify university exists
    const university = await Admin.findOne({ universityCode });
    if (!university) {
      logger.warn(`⚠️ Invalid university code: ${universityCode}`);
      return res.status(400).json({ message: "Invalid university code" });
    }
    
    const faculty = await Faculty.findOne({ 
      email: email.toLowerCase(),
      university: university._id
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Generate OTP (6-digit numeric code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    faculty.resetOTP = otp;
    faculty.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins expiry

    await faculty.save();

    // Send OTP via Email
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${university.universityName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a5568; text-align: center;">Password Reset Request</h2>
          <p style="color: #4a5568;">Hello ${faculty.name},</p>
          <p style="color: #4a5568;">We received a request to reset your password for your faculty account at ${university.universityName}. Please use the following OTP to reset your password:</p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #2d3748; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #4a5568;">This code will expire in 10 minutes.</p>
          <p style="color: #4a5568;">If you did not request this password reset, please ignore this email and ensure your account is secure.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #718096; font-size: 0.8rem;">
            <p>&copy; ${new Date().getFullYear()} ${university.universityName}. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`📩 OTP Sent to: ${email}`);

    res.status(200).json({ message: "OTP sent to registered email" });
  } catch (error) {
    logger.error("🔥 Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Protected route - Only logged-in faculty can access
router.get("/dashboard", facultyAuthMiddleware, async (req, res) => {
  try {
    // Fetch complete faculty data including university reference
    const faculty = await Faculty.findById(req.user.id).select('-password');
    
    // Get university name
    const university = await Admin.findById(faculty.university);
    
    res.json({ 
      message: "Welcome Faculty!", 
      faculty: {
        ...faculty.toObject(),
        universityName: university ? university.universityName : "Unknown University"
      }
    });
  } catch (error) {
    logger.error("🔥 Faculty Dashboard Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Get Current Faculty Profile (for auth verification)
router.get("/me", facultyAuthMiddleware, async (req, res) => {
  try {
    // Fetch faculty with university data
    const faculty = await Faculty.findById(req.user.id).select('-password');
    
    // Get university name
    const university = await Admin.findById(faculty.university);
    
    // Return a sanitized version of the faculty data
    res.status(200).json({
      _id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      department: faculty.department || 'Not specified',
      employeeId: faculty.employeeId,
      status: faculty.status,
      university: {
        id: university._id,
        name: university.universityName,
        code: university.universityCode
      },
      role: "faculty"
    });
    logger.info(`✅ Faculty Profile Retrieved: ${faculty.email}`);
  } catch (error) {
    logger.error("🔥 Get Faculty Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secure: true // Use TLS
});

// Helper function to generate random OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Faculty registration request
router.post('/register', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Valid email is required').isEmail(),
  check('universityCode', 'University code is required').not().isEmpty(),
  check('department', 'Department is required').not().isEmpty(),
  check('employeeId', 'Employee ID is required').not().isEmpty(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, email, universityCode, department, employeeId, password } = req.body;

    // Verify university code
    const code = await RegistrationCode.findOne({ 
      code: universityCode,
      type: 'faculty',
      used: false,
      isActive: true
    });

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired university code'
      });
    }

    // Check if email already exists
    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if employee ID already exists
    const existingEmployeeId = await Faculty.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create faculty member
    const faculty = new Faculty({
      name,
      email,
      universityCode,
      department,
      employeeId,
      password: hashedPassword,
      status: 'pending', // Requires admin approval
      role: 'faculty'
    });

    await faculty.save();

    // Send notification to admin
    const admin = await Admin.findOne({ universityCode });
    if (admin) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: 'New Faculty Registration Request',
        html: `
          <h1>New Faculty Registration Request</h1>
          <p>A new faculty member has requested registration:</p>
          <ul>
            <li>Name: ${name}</li>
            <li>Email: ${email}</li>
            <li>Department: ${department}</li>
            <li>Employee ID: ${employeeId}</li>
          </ul>
          <p>Please review and approve this request in the admin dashboard.</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for admin approval.',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        status: faculty.status
      }
    });

  } catch (error) {
    console.error('Error in faculty registration:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Request password reset
router.post('/forgot-password', [
  check('email', 'Valid email is required').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Find faculty
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      return res.status(400).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    faculty.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    faculty.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await faculty.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset - Edgile',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Reset password
router.post('/reset-password/:token', [
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find faculty with valid token
    const faculty = await Faculty.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!faculty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    faculty.password = await bcrypt.hash(password, salt);
    faculty.resetPasswordToken = undefined;
    faculty.resetPasswordExpires = undefined;

    await faculty.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Send notification to admin
const sendAdminNotification = async (facultyData) => {
  try {
    const admin = await Admin.findOne({ role: 'admin' });
    if (!admin) {
      logger.warn('No admin found to send notification');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "New Faculty Registration Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">New Faculty Registration Request</h2>
          <p>A new faculty member has requested registration:</p>
          <ul>
            <li><strong>Name:</strong> ${facultyData.name}</li>
            <li><strong>Email:</strong> ${facultyData.email}</li>
            <li><strong>University:</strong> ${facultyData.university}</li>
            <li><strong>Department:</strong> ${facultyData.department}</li>
            <li><strong>Employee ID:</strong> ${facultyData.employeeId}</li>
          </ul>
          <p>Please review and approve/reject this request.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Admin notification sent for faculty registration: ${facultyData.email}`);
  } catch (error) {
    logger.error('Error sending admin notification:', { error: error.message, facultyEmail: facultyData.email });
    throw new Error('Failed to send admin notification');
  }
};

// 📌 Change Password (First Login Flow)
router.post("/change-password", facultyAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate request
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    
    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character."
      });
    }
    
    // Find faculty by id - use req.faculty.id instead of req.user.id
    const faculty = await Faculty.findById(req.faculty._id);
    if (!faculty) {
      logger.warn(`⚠️ Faculty not found for password change: ${req.faculty._id}`);
      return res.status(404).json({ message: "Faculty not found" });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, faculty.password);
    if (!isMatch) {
      logger.warn(`⚠️ Password change failed: Incorrect current password - ${faculty.email}`);
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    
    // Check if new password is the same as current
    const isSamePassword = await bcrypt.compare(newPassword, faculty.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    faculty.password = hashedPassword;
    faculty.passwordChangeRequired = false;
    faculty.passwordLastChanged = Date.now();
    
    await faculty.save();

    logger.info(`✅ Password changed for faculty: ${faculty.email}`);
    
    res.status(200).json({
      message: "Password changed successfully"
    });
  } catch (error) {
    logger.error("🔥 Faculty Password Change Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
