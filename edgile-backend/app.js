const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const routes = require('./src/routes');
const logger = require('./src/utils/logger');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet()); // Set security headers
app.use(xss()); // Sanitize inputs

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// Enable CORS with configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Create a write stream for access logs
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Set strictQuery to suppress deprecation warning
mongoose.set('strictQuery', false);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  console.log(`Incoming request: ${req.method} ${requestUrl} from ${req.headers.origin || 'Unknown'}`);
  next();
});

// Import Routes
try {
  console.log('Loading routes...');
  const adminAuthRoutes = require('./src/routes/auth/adminAuth');
  const studentAuthRoutes = require('./src/routes/auth/studentAuth');
  const facultyAuthRoutes = require('./src/routes/auth/facultyAuth');
  const adminDashboardRoutes = require('./src/routes/admin/dashboardRoutes');
  const adminRoutes = require('./src/routes/admin/index');
  const adminClassroomRoutes = require('./src/routes/admin/classroomRoutes');
  const adminSubjectRoutes = require('./src/routes/admin/subjectRoutes');
  const facultyProfileRoutes = require('./src/routes/faculty/profile');
  const universityRoutes = require('./src/routes/universityRoutes');
  const facultyRoutes = require('./src/routes/facultyRoutes');
  const studentRoutes = require('./src/routes/studentRoutes');

  // Register Routes
  console.log('Registering routes...');
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/student/auth', studentAuthRoutes);
  app.use('/api/faculty/auth', facultyAuthRoutes);
  app.use('/api/faculty/profile', facultyProfileRoutes);
  app.use('/api/admin', adminDashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminClassroomRoutes);
  app.use('/api/admin', adminSubjectRoutes);
  app.use('/api/universities', universityRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/student', studentRoutes);
  console.log('Routes registered successfully');
} catch (error) {
  console.error('Error loading routes:', error);
  process.exit(1);
}

// Email configuration
try {
  console.log('Configuring email transport...');
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    secure: true // Use TLS
  });
  console.log('Email transport configured successfully');
} catch (error) {
  console.error('Error configuring email transport:', error);
}

// Helper function to generate random OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: "Edgile API",
    version: "1.0.0",
    environment: process.env.NODE_ENV
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({ 
    message: "Edgile API is running...",
    endpoints: {
      health: "/health",
      test: "/api/test",
      admin: {
        verifySuperAdmin: "/api/admin/auth/verify-super-admin-code",
        generateOtp: "/api/admin/auth/generate-otp",
        verifyOtp: "/api/admin/auth/verify-otp",
        login: "/api/admin/auth/login"
      }
    }
  });
});

// Test route
app.get("/api/test", (req, res) => {
  console.log("Test route hit");
  res.json({ 
    message: "API is working!",
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api', routes);

// 404 middleware
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Resource not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { 
    path: req.path,
    method: req.method,
    stack: err.stack
  });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

module.exports = app;