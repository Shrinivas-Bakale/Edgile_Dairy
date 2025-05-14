const express = require('express');
const router = express.Router();
const facultyController = require('../../controllers/facultyController');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply middleware to all routes to ensure faculty authentication
router.use(authMiddleware.protect);
router.use(authMiddleware.facultyOnly);

// Get faculty dashboard data
router.get('/dashboard', facultyController.getDashboard);

// Get faculty classes
router.get('/classes', facultyController.getClasses);

// Get courses taught by faculty
router.get('/courses', facultyController.getCourses);

// Get course by ID
router.get('/courses/:id', facultyController.getCourseById);

// Get subjects for a class
router.get('/subjects', facultyController.getSubjects);

// Get students for a class
router.get('/students', facultyController.getStudents);

// Get current timetable for faculty
router.get('/timetable/current', facultyController.getCurrentTimetable);

// Get all timetables
router.get('/timetables', facultyController.getTimetables);

// Get timetable for a specific student
router.get('/student-timetable/:studentId', facultyController.getStudentTimetable);

// Get faculty list
router.get('/faculty', facultyController.getFaculty);

// Mark attendance for a class
router.post('/attendance/mark', facultyController.markAttendance);

// Get class attendance records
router.get('/attendance/class', facultyController.getClassAttendance);

// Get absentees list
router.get('/attendance/absentees', facultyController.getAbsentees);

module.exports = router; 