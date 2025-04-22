const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");

exports.protect = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No authentication token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === "faculty") {
      user = await Faculty.findById(decoded.id);
    } else {
      user = await Student.findOne({ registerNumber: decoded.id });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid token. User not found." });
    }

    req.user = user;
    req.user.role = decoded.role;
    next();
  } catch (error) {
    console.error("🔥 Auth Middleware Error:", error);
    res.status(401).json({ message: "Authentication failed. Invalid or expired token." });
  }
};

exports.adminOnly = async (req, res, next) => {
  const admin = await Admin.findById(req.user.id);
  if (!admin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ✅ Faculty-Only Access
exports.facultyOnly = async (req, res, next) => {
  const faculty = await Faculty.findById(req.user.id);
  if (!faculty) {
    return res.status(403).json({ message: "Faculty access required" });
  }
  next();
};

// ✅ Student-Only Access
exports.studentOnly = async (req, res, next) => {
  const student = await Student.findOne({ registerNumber: req.user.id });
  if (!student) {
    return res.status(403).json({ message: "Student access required" });
  }
  req.student = student;
  next();
};