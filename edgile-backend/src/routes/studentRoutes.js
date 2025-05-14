const express = require("express");
const { protect, adminOnly, studentOnly } = require("../middleware/authMiddleware"); // ✅ Import `studentOnly`
const { getAllStudents, getStudentByRegisterNumber } = require("../controllers/studentController");
const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");
const Student = require("../models/Student");
const Subject = require('../models/Subject');
const logger = require('../utils/logger');
const Timetable = require('../models/Timetable');
const Classroom = require('../models/Classroom');
const Faculty = require('../models/Faculty');

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

/**
 * @route GET /api/student/timetables
 * @desc Get all published timetables for students
 * @access Private (Student only)
 */
router.get('/timetables', studentAuthMiddleware, async (req, res) => {
  try {
    console.log('Fetching all published timetables for student');
    
    // Find all published timetables without any restrictions
    // we're only filtering by published status to ensure students can't see drafts
    const timetables = await Timetable.find({
      status: 'published'
    })
    .populate('classroomId')
    .populate('university', 'name email')
    .sort({ createdAt: -1 });
    
    console.log(`Found ${timetables.length} published timetables`);
    
    // If no timetables found, still return success but with empty array
    if (timetables.length === 0) {
      console.log('No published timetables found');
      return res.status(200).json({
        success: true,
        data: [],
        totalPublished: 0,
        message: 'No published timetables available'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: timetables,
      totalPublished: timetables.length,
      message: 'Timetables found successfully'
    });
  } catch (error) {
    console.error(`Error fetching all timetables: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetables. Please try again later.',
      error: error.message
    });
  }
});

/**
 * @route GET /api/student/classroom/:id
 * @desc Get classroom details by ID
 * @access Private (Student only)
 */
router.get('/classroom/:id', studentAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching classroom details for ID:', id);
    
    if (!id || id === '[object Object]') {
      return res.status(400).json({
        success: false,
        message: 'Invalid classroom ID provided'
      });
    }
    
    const classroom = await Classroom.findById(id);
    
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    console.error('Error fetching classroom details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch classroom details',
      error: error.message
    });
  }
});

/**
 * @route GET /api/student/faculty-details
 * @desc Get faculty details by IDs
 * @access Private (Student only)
 */
router.get('/faculty-details', studentAuthMiddleware, async (req, res) => {
  try {
    const { ids } = req.query;
    
    console.log('Fetching faculty details for IDs:', ids);
    
    if (!ids) {
      return res.status(400).json({
        success: false,
        message: 'Faculty IDs are required'
      });
    }
    
    const facultyIds = ids.split(',');
    
    // Fetch faculty members from the database
    const faculty = await Faculty.find({
      _id: { $in: facultyIds }
    }).select('name email');
    
    console.log(`Found ${faculty.length} faculty members`);
    
    return res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error('Error fetching faculty details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty details',
      error: error.message
    });
  }
});

module.exports = router;
