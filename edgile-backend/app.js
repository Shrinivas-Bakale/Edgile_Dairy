const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { check, validationResult } = require("express-validator");
const crypto = require("crypto");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const routes = require("./src/routes");
const logger = require("./src/utils/logger");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Enable CORS with configuration - moving this before other middleware to ensure it's applied first
app.use(
  cors({
    origin: "http://localhost:3000", // Set to your frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Add a custom middleware to handle CORS preflight for all routes
app.options(
  "*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); // Set security headers with CORS-friendly config
app.use(xss()); // Sanitize inputs

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased to 1000 requests per window for better handling
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Apply rate limiting to all requests
app.use(limiter);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // Create a write stream for access logs
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, "access.log"),
    { flags: "a" }
  );
  app.use(morgan("combined", { stream: accessLogStream }));
}

// Set strictQuery to suppress deprecation warning
mongoose.set("strictQuery", false);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  const requestUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log(
    `Incoming request: ${req.method} ${requestUrl} from ${
      req.headers.origin || "Unknown"
    }`
  );

  // Add CORS headers on every response to ensure they're present
  if (req.headers.origin) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Log CORS-related headers for debugging
  console.log("CORS Debug - Request headers:", {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
  });

  next();
});

// Import Routes
try {
  console.log("Loading routes...");
  const adminRoutes = require("./src/routes/adminRoutes");
  const facultyRoutes = require("./src/routes/facultyRoutes");
  const studentRoutes = require("./src/routes/studentRoutes");
  const universityRoutes = require("./src/routes/universityRoutes");
  const videoLibraryRoutes = require("./src/routes/videoLibraryRoutes");
  const groupRoutes = require("./src/routes/groupRoutes");
  const healthRoutes = require("./src/routes/health");

  // Register Routes
  console.log("Registering routes...");
  app.use("/api/admin", adminRoutes);
  app.use("/api/faculty", facultyRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/universities", universityRoutes);
  app.use("/api/video-library", videoLibraryRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/health", healthRoutes);
  console.log("Routes registered successfully");
} catch (error) {
  console.error("Error loading routes:", error);
  process.exit(1);
}

// Email configuration
try {
  console.log("Configuring email transport...");
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: true, // Use TLS
  });
  console.log("Email transport configured successfully");
} catch (error) {
  console.error("Error configuring email transport:", error);
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
    environment: process.env.NODE_ENV,
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Edgile API is running...",
    endpoints: {
      health: "/health",
      test: "/api/test",
      admin: "/api/admin",
      faculty: "/api/faculty",
      student: "/api/student",
      universities: "/api/universities",
      videoLibrary: "/api/video-library",
      groups: "/api/groups",
    },
  });
});

// Test route
app.get("/api/test", (req, res) => {
  console.log("Test route hit");
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
  });
});

// CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  console.log("CORS test endpoint hit");
  res.json({
    success: true,
    message: "CORS is configured correctly!",
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      method: req.method,
    },
  });
});

// Mount API routes
app.use("/api", routes);

// Serve report files
app.use("/reports", express.static(path.join(__dirname, "../reports")));

// 404 middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
