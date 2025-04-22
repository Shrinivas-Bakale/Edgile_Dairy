const express = require("express");
const Faculty = require("../models/Faculty");
const { protect, facultyOnly } = require("../middleware/roleMiddleware");
const { adminOnly } = require("../middleware/authMiddleware");
const logger = require("../utils/logger"); // Winston Logger
const { check, validationResult } = require('express-validator');
const { authMiddleware: auth } = require('../middleware/auth');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const ClassroomUnavailability = require('../models/ClassroomUnavailability');

const router = express.Router();

// 📌 Get All Faculty - Admin Only
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const facultyList = await Faculty.find({});
    logger.info("✅ Faculty List Fetched Successfully");
    res.json(facultyList);
  } catch (error) {
    logger.error("🔥 Error Fetching Faculty:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Faculty Dashboard - Only Logged-in Faculty
router.get("/dashboard", protect, facultyOnly, (req, res) => {
  res.json({ message: `Welcome, ${req.user.name}!`, faculty: req.user });
});

/**
 * @route GET /api/faculty/courses
 * @desc Get all courses assigned to a faculty member
 * @access Private (Faculty only)
 */
router.get('/courses', auth, async (req, res) => {
  try {
    // Get faculty details from token
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    console.log('Faculty data:', {
      id: faculty._id,
      name: faculty.name, 
      university: faculty.university
    });

    // Get subjects for the faculty's university 
    // In a real implementation, this would filter by subjects assigned to this faculty
    const subjects = await Subject.find({ 
      university: faculty.university,
      archived: false
    }).sort({ year: 1, semester: 1, subjectName: 1 });

    logger.info(`Faculty ${faculty.name} retrieved ${subjects.length} courses`);
    
    res.json({
      success: true,
      courses: subjects
    });
  } catch (error) {
    logger.error(`Error retrieving faculty courses: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/faculty/courses/:id
 * @desc Get a specific course by ID
 * @access Private (Faculty only)
 */
router.get('/courses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get faculty details from token
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get the subject
    const subject = await Subject.findOne({
      _id: id,
      university: faculty.university
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    logger.info(`Faculty ${faculty.name} retrieved course: ${subject.subjectName}`);
    
    res.json({
      success: true,
      course: subject
    });
  } catch (error) {
    logger.error(`Error retrieving course: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/faculty/classrooms
 * @desc Get all classrooms (read-only)
 * @access Private (Faculty only)
 */
router.get('/classrooms', auth, async (req, res) => {
  try {
    // Get faculty details from token
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get classrooms for the faculty's university
    const classrooms = await Classroom.find({ 
      university: faculty.university,
      status: { $ne: 'maintenance' }  // Exclude classrooms under maintenance
    }).sort({ name: 1 });

    logger.info(`Faculty ${faculty.name} retrieved ${classrooms.length} classrooms`);
    
    res.json({
      success: true,
      classrooms
    });
  } catch (error) {
    logger.error(`Error retrieving classrooms: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/faculty/classrooms/:id
 * @desc Get classroom details by ID
 * @access Private (Faculty only)
 */
router.get('/classrooms/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get faculty details from token
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get the classroom
    const classroom = await Classroom.findOne({
      _id: id,
      university: faculty.university
    });

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    logger.info(`Faculty ${faculty.name} retrieved classroom: ${classroom.name}`);
    
    res.json({
      success: true,
      classroom
    });
  } catch (error) {
    logger.error(`Error retrieving classroom: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/faculty/classrooms/:id/availability
 * @desc Get classroom availability
 * @access Private (Faculty only)
 */
router.get('/classrooms/:id/availability', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    // Get faculty details from token
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get the classroom
    const classroom = await Classroom.findOne({
      _id: id,
      university: faculty.university
    });

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Get unavailability records for this classroom on the specified date
    const unavailabilityRecords = await ClassroomUnavailability.find({
      classroom: classroom._id,
      startTime: {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lt: new Date(date + 'T23:59:59.999Z')
      }
    });

    logger.info(`Faculty ${faculty.name} retrieved classroom availability for: ${classroom.name}`);
    
    res.json({
      success: true,
      classroom,
      availability: unavailabilityRecords
    });
  } catch (error) {
    logger.error(`Error retrieving classroom availability: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
