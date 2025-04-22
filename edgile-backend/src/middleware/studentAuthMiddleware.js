const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const mongoose = require("mongoose");

const studentAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access Denied. No Token Provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Token decoded for student with ID:", decoded.id);

    // Try to find student by ID - could be either _id or registerNumber
    let student;

    // Check if the ID looks like a MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      // First try to find by _id
      student = await Student.findById(decoded.id)
        .select("-password -otp -otpExpires -emailVerificationOTP -emailOtpExpires -resetPasswordOTP -resetPasswordOTPExpires")
        .populate({
          path: 'university',
          select: 'name email contactInfo address'
        })
        .lean();
    }
    
    // If no student found by _id or if ID isn't a valid ObjectId, try by registerNumber
    if (!student) {
      student = await Student.findOne({ registerNumber: decoded.id })
        .select("-password -otp -otpExpires -emailVerificationOTP -emailOtpExpires -resetPasswordOTP -resetPasswordOTPExpires")
        .populate({
          path: 'university',
          select: 'name email contactInfo address'
        })
        .lean();
    }

    if (!student) {
      console.log("Student not found for register number or ID:", decoded.id);
      return res.status(401).json({ message: "Unauthorized. Student not found." });
    }

    if (!student.isVerified) {
      console.log("Student not verified:", decoded.id);
      return res.status(403).json({ message: "Profile incomplete. Complete profile first." });
    }

    // Convert MongoDB ObjectId to string
    if (student._id) {
      student._id = student._id.toString();
    }
    if (student.university && student.university._id) {
      student.university._id = student.university._id.toString();
    }

    // Log the student data for debugging
    console.log("Authenticated student data:", JSON.stringify({
      _id: student._id,
      name: student.name,
      email: student.email,
      registerNumber: student.registerNumber,
      division: student.division,
      classYear: student.classYear,
      semester: student.semester,
      phone: student.phone,
      universityCode: student.universityCode,
      // Don't log full data for security
    }));

    req.student = student; // Attach complete student data to request
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = studentAuthMiddleware;
