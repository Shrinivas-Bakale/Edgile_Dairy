const express = require('express');
const router = express.Router();
const Timetable = require('../../models/Timetable');
const Classroom = require('../../models/Classroom');
const Subject = require('../../models/Subject');
const Faculty = require('../../models/Faculty');
const Student = require('../../models/Student');
const logger = require('../../utils/logger');
const { studentAuthMiddleware, validateStudent } = require('../../middleware/studentMiddleware');

// Get student profile
router.get('/profile', studentAuthMiddleware, async (req, res) => {
  try {
    console.log('Student profile request received');
    
    // req.student is loaded by the middleware
    const student = req.student;
    
    if (!student) {
      console.log('No student found in request object');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    console.log(`Returning profile for student: ${student._id}`);
    
    // Return sanitized profile data
    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        classYear: student.classYear || student.year,
        semester: student.semester,
        division: student.division,
        universityCode: student.universityCode,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error getting profile',
      error: error.message
    });
  }
});

// Get courses for the current student
router.get('/courses', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get the student's year and semester
    const { year, semester } = student;
    
    if (!year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Student year and semester information is missing'
      });
    }
    
    console.log(`Fetching courses for student year: ${year}, semester: ${semester}`);
    
    // Find subjects for this year and semester
    const subjects = await Subject.find({
      year,
      semester: parseInt(semester)
    });
    
    // Transform subjects to match the expected format in the frontend
    const courses = subjects.map(subject => ({
      _id: subject._id,
      subjectName: subject.name,
      subjectCode: subject.subjectCode,
      type: subject.type || 'core',
      totalDuration: subject.totalDuration || 48,
      weeklyHours: subject.weeklyHours || 3,
      year: subject.year,
      semester: subject.semester,
      description: subject.description
    }));
    
    return res.status(200).json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
});

// Get published timetable for student's class
router.get('/timetable', validateStudent, async (req, res) => {
  try {
    const { year, semester, division, academicYear } = req.query;
    
    if (!year || !semester || !division || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Year, semester, division, and academic year are required'
      });
    }
    
    // Find the published timetable for this class
    const timetable = await Timetable.findOne({
      year,
      semester: parseInt(semester),
      division,
      status: 'published'
    });
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'No published timetable found for your class'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error fetching student timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
});

// Get classroom details
router.get('/classroom/:id', validateStudent, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    
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
    logger.error(`Error fetching classroom details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch classroom details'
    });
  }
});

// Get subjects for a specific year and semester
router.get('/subjects', validateStudent, async (req, res) => {
  try {
    const { year, semester } = req.query;
    
    if (!year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Year and semester are required'
      });
    }
    
    const subjects = await Subject.find({
      year,
      semester: parseInt(semester)
    });
    
    return res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    logger.error(`Error fetching subjects: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Get all published timetables for students
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

// Get faculty details by IDs
router.get('/faculty-details', validateStudent, async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.status(400).json({
        success: false,
        message: 'Faculty IDs are required'
      });
    }
    
    const facultyIds = ids.split(',');
    const faculty = await Faculty.find({
      _id: { $in: facultyIds }
    }).select('name email');
    
    return res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    logger.error(`Error fetching faculty details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty details'
    });
  }
}); 

module.exports = router; 