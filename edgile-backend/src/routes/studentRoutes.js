const express = require("express");
const { protect, adminOnly, studentOnly } = require("../middleware/authMiddleware"); // ✅ Import `studentOnly`
const { getAllStudents, getStudentByRegisterNumber } = require("../controllers/studentController");
const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");
const Student = require("../models/Student");
const Subject = require('../models/Subject');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to log every request
router.use((req, res, next) => {
    console.log(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});

// 📌 Get Student Profile (Protected)
router.get("/profile", studentAuthMiddleware, async (req, res) => {
  try {
    console.log("Fetching profile for student:", req.student.registerNumber);
    
    // Get all student data and populate the university field
    const student = await Student.findOne({ registerNumber: req.student.registerNumber })
      .select("-password -otp -otpExpires -emailVerificationOTP -emailOtpExpires -resetPasswordOTP -resetPasswordOTPExpires")
      .populate({
        path: 'university',
        select: 'name email contactInfo address'
      })
      .lean(); // Use lean() to get a plain JavaScript object

    if (!student) {
      console.log("Student not found for registerNumber:", req.student.registerNumber);
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Convert MongoDB ObjectId to string
    if (student._id) {
      student._id = student._id.toString();
    }
    if (student.university && student.university._id) {
      student.university._id = student.university._id.toString();
    }

    // Ensure numeric fields are numbers not strings
    if (student.classYear) {
      student.classYear = Number(student.classYear);
    }
    if (student.semester) {
      student.semester = Number(student.semester);
    }

    // Add additional data like department based on division if needed
    const enrichedStudent = {
      ...student,
      department: getDepartmentFromDivision(student.division),
    };

    console.log("Student profile found:", student.name);
    console.log("Returning data:", JSON.stringify(enrichedStudent, null, 2));
    
    res.status(200).json({ success: true, student: enrichedStudent });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Helper function to determine department from division
function getDepartmentFromDivision(division) {
  if (!division) return null;
  
  switch (division) {
    case 'A1':
    case 'A2':
      return 'Computer Science';
    case 'A3':
    case 'A4':
      return 'Information Science';
    case 'A5':
    case 'A6':
      return 'Electronics & Communication';
    default:
      return 'General Engineering';
  }
}

// 📌 Update Student Contact Info (Protected)
router.put("/update", studentAuthMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;
    const updateFields = {};

    // Validate phone if provided
    if (phone !== undefined) {
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: "Invalid phone number" });
      }
      updateFields.phone = phone;
    }

    // If no valid fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    console.log("Updating student profile:", req.student.registerNumber, updateFields);

    const student = await Student.findOneAndUpdate(
      { registerNumber: req.student.registerNumber },
      updateFields,
      { new: true }
    )
    .select("-password -otp -otpExpires -emailVerificationOTP -emailOtpExpires -resetPasswordOTP -resetPasswordOTPExpires")
    .populate({
      path: 'university',
      select: 'name email contactInfo address'
    })
    .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Convert MongoDB ObjectId to string
    if (student._id) {
      student._id = student._id.toString();
    }
    if (student.university && student.university._id) {
      student.university._id = student.university._id.toString();
    }

    // Ensure numeric fields are numbers not strings
    student.classYear = Number(student.classYear);
    student.semester = Number(student.semester);

    // Add department info
    const enrichedStudent = {
      ...student,
      department: getDepartmentFromDivision(student.division),
    };

    console.log("Updated student data:", JSON.stringify(enrichedStudent, null, 2));
    res.status(200).json({ success: true, message: "Profile updated successfully", student: enrichedStudent });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// 📌 Get All Students (Admin Only)
router.get("/all", protect, getAllStudents);

// 📌 Student Dashboard
router.get("/dashboard", protect, studentOnly, (req, res) => {
  res.json({ message: `Welcome, ${req.student.name}!`, student: req.student });
});

/**
 * @route GET /api/student/courses
 * @desc Get all courses for a student
 * @access Private (Student only)
 */
router.get('/courses', studentAuthMiddleware, async (req, res) => {
  try {
    // Get student details from middleware
    const student = req.student;
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Log student data for debugging
    console.log('Student data:', {
      id: student._id,
      name: student.name,
      university: student.university,
      classYear: student.classYear,
      year: student.year,
      semester: student.semester
    });

    // Map classYear to the year field in the Subject model
    let yearMapping = {
      1: 'First',
      2: 'Second',
      3: 'Third'
    };
    
    let yearValue = yearMapping[student.classYear] || 'First';
    
    // Get subjects for the student's year, semester, and university
    const subjects = await Subject.find({ 
      university: student.university,
      year: yearValue,
      semester: student.semester,
      archived: false
    }).sort({ subjectName: 1 });

    logger.info(`Student ${student.name} retrieved ${subjects.length} courses for year ${yearValue}, semester ${student.semester}`);
    
    res.json({
      success: true,
      courses: subjects
    });
  } catch (error) {
    logger.error(`Error retrieving student courses: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/student/courses/:id
 * @desc Get a specific course by ID
 * @access Private (Student only)
 */
router.get('/courses/:id', studentAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student details from middleware
    const student = req.student;
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Map classYear to the year field in the Subject model
    let yearMapping = {
      1: 'First',
      2: 'Second',
      3: 'Third'
    };
    
    let yearValue = yearMapping[student.classYear] || 'First';

    // Get the subject
    const subject = await Subject.findOne({
      _id: id,
      university: student.university
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if the subject is for this student's year and semester
    const isEnrolled = 
      (subject.year === yearValue) && 
      (subject.semester === student.semester) &&
      !subject.archived;
    
    logger.info(`Student ${student.name} retrieved course: ${subject.subjectName}, isEnrolled: ${isEnrolled}`);
    
    res.json({
      success: true,
      course: subject,
      isEnrolled
    });
  } catch (error) {
    logger.error(`Error retrieving course: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
