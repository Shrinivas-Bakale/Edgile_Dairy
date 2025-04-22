const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');
const RegistrationCode = require('../../models/RegistrationCode');
const { protect } = require('../../middleware/authMiddleware');
const Faculty = require('../../models/Faculty');
const mongoose = require('mongoose');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Verify access code
router.post('/verify-access-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    
    // Check if the access code matches the configured value
    if (accessCode === process.env.ADMIN_ACCESS_CODE) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid access code' });
    }
  } catch (error) {
    console.error('Error verifying access code:', error);
    res.status(500).json({ message: 'Error verifying access code' });
  }
});

// Generate OTP
router.post('/generate-otp', async (req, res) => {
  try {
    const { email, name, universityName, superAdminCode } = req.body;

    if (!email || !name || !universityName) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, name and university name are required' 
      });
    }
    
    // Check if super admin code is correct (if required in your system)
    if (process.env.SUPER_ADMIN_CODE_REQUIRED === 'true') {
      if (!superAdminCode || superAdminCode !== process.env.SUPER_ADMIN_CODE) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid super admin code' 
        });
      }
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'An admin with this email already exists' 
      });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with expiry (5 minutes) and registration details
    otpStore.set(email, {
      otp,
      name,
      universityName,
      expiry: Date.now() + 5 * 60 * 1000
    });

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Edgile Admin Registration - OTP Verification',
      html: `
        <h1>Admin Registration Verification</h1>
        <p>Hello ${name},</p>
        <p>Your OTP for admin registration is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 5 minutes.</p>
        <p>Please do not share this OTP with anyone.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating OTP' 
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, OTP, and password are required' 
      });
    }
    
    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters long' 
      });
    }
    
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must contain at least one uppercase letter' 
      });
    }
    
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must contain at least one lowercase letter' 
      });
    }
    
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must contain at least one number' 
      });
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must contain at least one special character' 
      });
    }
    
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: 'No OTP found for this email. Please request a new one.' 
      });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP' 
      });
    }

    // Get stored registration details
    const { name, universityName } = storedData;

    // Check if admin already exists (double check)
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'An admin with this email already exists' 
      });
    }

    // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      universityName,
      status: 'active',
      role: 'admin',
      // Generate a university code based on university name
      universityCode: `${universityName.substring(0, 3).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    });

    // Save the admin to the database
    await newAdmin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newAdmin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Clear the OTP
    otpStore.delete(email);

    // Return success with token and user data
    return res.json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: 'admin',
        universityName: newAdmin.universityName,
        universityCode: newAdmin.universityCode
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error verifying OTP' 
    });
  }
});

// Check if an admin email already exists
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    
    // Return whether the email exists
    return res.json({
      success: true,
      exists: !!admin
    });
  } catch (error) {
    console.error('Error checking email existence:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking email existence' 
    });
  }
});

// Debug route to check token validity
router.get('/check-token', async (req, res) => {
  try {
    // Extract token from request header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) // Remove "Bearer " prefix
      : null;
    
    console.log('Token check requested');
    console.log('Authorization header exists:', !!authHeader);
    console.log('Token provided:', !!token);
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided',
        details: { 
          authHeader: authHeader ? 'Present' : 'Missing' 
        } 
      });
    }
    
    try {
      // Verify token without accessing database
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token is valid. Decoded info:', { 
        id: decoded.id,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
      
      res.json({
        success: true,
        message: 'Token is valid',
        decoded: {
          id: decoded.id,
          role: decoded.role,
          exp: new Date(decoded.exp * 1000).toISOString()
        }
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.name, jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired',
          details: { 
            expiredAt: jwtError.expiredAt 
          } 
        });
      } else {
        return res.status(401).json({ 
          message: 'Invalid token',
          details: { 
            error: jwtError.message 
          } 
        });
      }
    }
  } catch (error) {
    console.error('Token check error:', error);
    res.status(500).json({ message: 'Error checking token' });
  }
});

// Get admin profile - Improved with better error handling
router.get('/profile', async (req, res) => {
  try {
    // Extract token from request header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) // Remove "Bearer " prefix
      : null;
    
    console.log('Profile request received');
    console.log('Authorization header exists:', !!authHeader);
    console.log('Token extracted:', !!token);
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Authentication token required',
        details: { reason: 'Token missing from request' } 
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified for user ID:', decoded.id);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.name, jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired',
          details: { expiredAt: jwtError.expiredAt } 
        });
      } else {
        return res.status(401).json({ 
          message: 'Invalid token',
          details: { error: jwtError.message } 
        });
      }
    }
    
    // Find admin by ID
    const admin = await Admin.findById(decoded.id);
    
      if (!admin) {
      return res.status(404).json({ 
        message: 'Admin not found',
        details: { userId: decoded.id }
      });
    }
    
    console.log('Admin found, returning profile for:', admin.email);
    
    // Return admin profile
    res.json({
      success: true,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        universityName: admin.universityName,
        universityCode: admin.universityCode,
        status: admin.status,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ 
      message: 'Error fetching profile',
      details: { error: error.message }
    });
  }
});

// Registration Code Routes

// Get all registration codes
router.get('/registration-codes', protect, async (req, res) => {
  try {
    // Fetch registration codes and populate the usedBy field
    const codes = await RegistrationCode.find({})
      .sort({ createdAt: -1 })
      .lean() // Use lean for better performance
      .exec();
    
    // Process codes to populate usedBy information
    const processedCodes = await Promise.all(codes.map(async (code) => {
      // If code is not used, no need to process
      if (!code.used || !code.usedBy) {
        return code;
      }
      
      try {
        // Check the type and fetch the appropriate user
        if (code.type === 'faculty') {
          const faculty = await Faculty.findById(code.usedBy).select('name email employeeId').lean();
          if (faculty) {
            code.usedBy = {
              id: faculty._id,
              name: faculty.name,
              email: faculty.email,
              employeeId: faculty.employeeId,
              role: 'faculty'
            };
          }
        } else if (code.type === 'student') {
          // Assuming you have a Student model with a registerNumber field
          const Student = require('../../models/Student');
          const student = await Student.findById(code.usedBy).select('name email registerNumber').lean();
          if (student) {
            code.usedBy = {
              id: student._id,
              name: student.name,
              email: student.email,
              registerNumber: student.registerNumber,
              role: 'student'
            };
          }
        }
      } catch (err) {
        console.error(`Error populating usedBy for code ${code.code}:`, err);
        // If we can't find the user, keep the ID but add a placeholder
        if (typeof code.usedBy === 'string' || code.usedBy instanceof mongoose.Types.ObjectId) {
          code.usedBy = {
            id: code.usedBy,
            role: code.type
          };
        }
      }
      
      return code;
    }));
    
    res.status(200).json({
      success: true,
      registrationCodes: processedCodes
    });
  } catch (error) {
    console.error('Error fetching registration codes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch registration codes', 
      error: error.message 
    });
  }
});

// Generate a new registration code
router.post('/registration-code', protect, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['student', 'faculty'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration code type. Must be "student" or "faculty".'
      });
    }
    
    // Generate a unique code
    const prefix = type === 'student' ? 'STU' : 'FAC';
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${prefix}-${randomPart}`;
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create new registration code
    const newCode = new RegistrationCode({
      code,
      type,
      used: false,
      createdBy: req.user.id, // Using id from JWT token
      university: req.user.university || req.user.id, // Fallback to user ID if university not set
      expiresAt,
      isActive: true
    });
    
    await newCode.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration code generated successfully',
      registrationCode: newCode
    });
  } catch (error) {
    console.error('Error generating registration code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate registration code', 
      error: error.message 
    });
  }
});

// Verify a registration code
router.get('/verify-registration-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const registrationCode = await RegistrationCode.findOne({ code });
    
    if (!registrationCode) {
      return res.status(404).json({
        success: false,
        message: 'Registration code not found'
      });
    }
    
    if (registrationCode.used) {
      return res.status(400).json({
        success: false,
        message: 'Registration code has already been used'
      });
    }
    
    if (!registrationCode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Registration code is not active'
      });
    }
    
    if (new Date() > new Date(registrationCode.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Registration code has expired'
      });
    }
    
    // Code is valid
    res.status(200).json({
      success: true,
      message: 'Registration code is valid',
      registrationCode
    });
  } catch (error) {
    console.error('Error verifying registration code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify registration code', 
      error: error.message 
    });
  }
});

// Delete a registration code
router.post('/registration-code/delete', protect, async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Registration code ID is required'
      });
    }
    
    const registrationCode = await RegistrationCode.findById(id);
    
    if (!registrationCode) {
      return res.status(404).json({
        success: false,
        message: 'Registration code not found'
      });
    }
    
    // If the code is used, check if it's older than 3 months
    if (registrationCode.used && registrationCode.usedAt) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      if (new Date(registrationCode.usedAt) > threeMonthsAgo) {
        return res.status(400).json({
          success: false,
          message: 'Used registration codes can only be deleted after 3 months'
        });
      }
    }
    
    // Delete the registration code
    await RegistrationCode.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Registration code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting registration code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete registration code', 
      error: error.message 
    });
  }
});

// Faculty Registration (Created by Admin)
router.post('/faculty/register', protect, async (req, res) => {
  try {
    const { name, email, password, department, employeeId, subjects, registrationCode, createdBy } = req.body;

    // Validate required fields
    if (!name || !email || !password || !department || !employeeId || !registrationCode || !createdBy) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Get the admin's details
    const admin = await Admin.findById(createdBy);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify registration code
    const code = await RegistrationCode.findOne({
      code: registrationCode,
      type: 'faculty',
      used: false,
      isActive: true
    });

    if (!code) {
      return res.status(400).json({ message: "Invalid or used registration code" });
    }

    // Check if faculty with same email already exists in this university
    let existingFaculty = await Faculty.findOne({
      email: email.toLowerCase(),
      university: admin._id
    });

    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty with this email already exists" });
    }

    // Check if faculty with same employee ID already exists in this university
    existingFaculty = await Faculty.findOne({
      employeeId,
      university: admin._id
    });

    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty with this employee ID already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new faculty
    const newFaculty = new Faculty({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      department,
      employeeId,
      subjects: subjects || [],
      universityCode: admin.universityCode,
      university: admin._id,
      universityName: admin.universityName,
      status: 'pending',
      registrationCompleted: false,
      role: 'faculty'
    });

    await newFaculty.save();

    // Mark registration code as used
    code.used = true;
    code.usedBy = newFaculty._id;
    code.usedAt = new Date();
    await code.save();

    res.status(201).json({
      message: "Faculty registered successfully",
      faculty: {
        id: newFaculty._id,
        name: newFaculty.name,
        email: newFaculty.email,
        department: newFaculty.department,
        employeeId: newFaculty.employeeId,
        universityName: newFaculty.universityName,
        status: newFaculty.status,
        registrationCompleted: newFaculty.registrationCompleted
      }
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ message: "Server error during faculty registration" });
  }
});

// Send welcome email to faculty
router.post('/faculty/welcome-email', protect, async (req, res) => {
  try {
    const { email, name, password, employeeId } = req.body;

    if (!email || !name || !password || !employeeId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Generate a unique registration completion token
    const completionToken = crypto.randomBytes(32).toString('hex');
    
    // Find the faculty member and update with the completion token
    const faculty = await Faculty.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        registrationCompletionToken: completionToken,
        registrationCompletionExpires: Date.now() + 72 * 60 * 60 * 1000 // 72 hours
      },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Create registration completion link
    const registrationLink = `${process.env.FRONTEND_URL}/faculty/complete-registration/${completionToken}`;

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Edgile - Complete Your Faculty Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Welcome to Edgile!</h2>
          <p>Dear ${name},</p>
          <p>Your faculty account has been created successfully. Here are your credentials:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Employee ID:</strong> ${employeeId}</li>
            <li><strong>Temporary Password:</strong> ${password}</li>
          </ul>
          <p>To complete your registration and set up your profile, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationLink}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Registration
            </a>
          </div>
          <p><strong>Note:</strong> This link will expire in 72 hours for security reasons.</p>
          <p>After completing your registration, you can log in using your email and the temporary password provided above. We recommend changing your password after your first login.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br>The Edgile Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ message: 'Failed to send welcome email' });
  }
});

// Complete faculty registration
router.post('/faculty/complete-registration/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { 
      phone,
      dateOfBirth,
      address,
      qualification,
      specialization,
      experience,
      researchInterests,
      profileImage,
      password
    } = req.body;

    // Find faculty with valid token
    const faculty = await Faculty.findOne({
      registrationCompletionToken: token,
      registrationCompletionExpires: { $gt: Date.now() }
    });

    if (!faculty) {
      return res.status(400).json({ message: 'Invalid or expired registration link' });
    }

    // Update faculty profile with additional information
    faculty.phone = phone;
    faculty.dateOfBirth = dateOfBirth;
    faculty.address = address;
    faculty.qualification = qualification;
    faculty.specialization = specialization;
    faculty.experience = experience;
    faculty.researchInterests = researchInterests || [];
    if (profileImage) faculty.profileImage = profileImage;
    faculty.registrationCompleted = true;
    faculty.isFirstLogin = false;
    faculty.status = 'active';
    faculty.registrationCompletionToken = undefined;
    faculty.registrationCompletionExpires = undefined;

    // If password is provided, update it as well
    if (password) {
      const salt = await bcrypt.genSalt(10);
      faculty.password = await bcrypt.hash(password, salt);
    }

    await faculty.save();

    res.json({
      success: true,
      message: 'Registration completed successfully',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        employeeId: faculty.employeeId
      }
    });
  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ message: 'Failed to complete registration' });
  }
});

module.exports = router;