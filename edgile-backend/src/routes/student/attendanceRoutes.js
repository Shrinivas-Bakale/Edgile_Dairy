const express = require('express');
const router = express.Router();
const { protect, studentOnly } = require('../../middleware/authMiddleware');
const studentAttendanceController = require('../../controllers/studentAttendanceController');
const adminAttendanceController = require('../../controllers/adminAttendanceController');

// Get attendance records for logged in student
router.get('/', protect, studentOnly, studentAttendanceController.getMyAttendance);

// Get attendance statistics for logged in student
router.get('/stats', protect, studentOnly, studentAttendanceController.getMyAttendanceStats);

// Get today's attendance for logged in student
router.get('/today', protect, studentOnly, studentAttendanceController.getTodayAttendance);

// Get subjects for logged in student
router.get('/subjects', protect, studentOnly, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student details with class
    const Student = require('../../models/Student');
    const student = await Student.findById(studentId).populate('class');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get subjects for student's class
    const Subject = require('../../models/Subject');
    const subjects = await Subject.find({ class: student.class._id });
    
    return res.status(200).json({
      success: true,
      message: 'Subjects retrieved successfully',
      data: {
        subjects
      }
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subjects',
      error: error.message
    });
  }
});

// Get attendance by month for calendar view
router.get('/calendar', protect, studentOnly, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    // Calculate date range for the specified month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    // Set time to beginning and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Get attendance records for the month
    const AttendanceRecord = require('../../models/AttendanceRecord').AttendanceRecord;
    const records = await AttendanceRecord.find({
      studentId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('subjectId', 'name code');
    
    // Group records by date
    const calendarData = {};
    
    records.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          records: []
        };
      }
      
      calendarData[dateKey].records.push({
        id: record._id,
        subject: record.subjectId ? {
          id: record.subjectId._id,
          name: record.subjectId.name,
          code: record.subjectId.code
        } : null,
        status: record.status,
        slotNumber: record.slotNumber
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Calendar data retrieved',
      data: Object.values(calendarData)
    });
  } catch (error) {
    console.error('Error retrieving calendar data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve calendar data',
      error: error.message
    });
  }
});

// GET /api/student/attendance/generate-report - Generate attendance report
router.get('/generate-report', adminAttendanceController.generateAttendanceReport);

module.exports = router; 