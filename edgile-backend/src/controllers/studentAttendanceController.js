const { AttendanceRecord, AttendanceStatus } = require('../models/AttendanceRecord');
const AttendanceSettings = require('../models/AttendanceSettings');
const Subject = require('../models/Subject');
const Student = require('../models/Student');

/**
 * Get attendance records for a student
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user.id; // From auth middleware
    const { startDate, endDate, subjectId } = req.query;

    // Parse dates with validation
    let start, end;
    try {
      start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
      end = endDate ? new Date(endDate) : new Date();
      
      // Set time to beginning and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      // Validate date objects
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Build query
    const query = {
      student: studentId,
      date: { $gte: start, $lte: end }
    };

    // Add subject filter if provided
    if (subjectId) {
      query.subject = subjectId;
    }

    // Get attendance records
    const records = await AttendanceRecord.find(query)
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved',
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        records
      }
    });
  } catch (error) {
    console.error('Error in getMyAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records',
      error: error.message
    });
  }
};

/**
 * Get attendance statistics for a student
 */
exports.getMyAttendanceStats = async (req, res) => {
  try {
    const studentId = req.user.id; // From auth middleware
    const university = req.user.university;

    // Get attendance settings for minimum threshold
    const settings = await AttendanceSettings.findOne({ university });
    const minAttendanceRequired = settings ? settings.minAttendancePercentage : 75;
    
    // Get student details
    const student = await Student.findById(studentId).populate('class');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get subjects for student's class
    const subjects = await Subject.find({ class: student.class });
    
    // Calculate overall statistics
    const overallStats = {
      totalClasses: 0,
      totalPresent: 0,
      attendancePercentage: 0
    };
    
    // Calculate subject-wise statistics
    const subjectStats = [];
    
    for (const subject of subjects) {
      // Get attendance records for this subject
      const records = await AttendanceRecord.find({
        student: studentId,
        subject: subject._id
      });
      
      if (records.length === 0) continue;
      
      let present = 0, absent = 0, late = 0, excused = 0;
      
      // Count each status
      for (const record of records) {
        switch (record.status) {
          case AttendanceStatus.PRESENT:
            present++;
            break;
          case AttendanceStatus.ABSENT:
            absent++;
            break;
          case AttendanceStatus.LATE:
            late++;
            break;
          case AttendanceStatus.EXCUSED:
            excused++;
            break;
        }
      }
      
      const totalClasses = records.length;
      const totalPresent = present + late + excused; // Count late and excused as present
      const attendancePercentage = totalClasses > 0 
        ? (totalPresent / totalClasses * 100)
        : 0;
      
      // Add to overall totals
      overallStats.totalClasses += totalClasses;
      overallStats.totalPresent += totalPresent;
      
      // Add subject statistics
      subjectStats.push({
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.code
        },
        totalClasses,
        present,
        absent,
        late,
        excused,
        attendancePercentage: attendancePercentage.toFixed(1),
        isBelowThreshold: attendancePercentage < minAttendanceRequired
      });
    }
    
    // Calculate overall attendance percentage
    overallStats.attendancePercentage = overallStats.totalClasses > 0
      ? (overallStats.totalPresent / overallStats.totalClasses * 100)
      : 0;
    
    // Sort subjects by attendance percentage (ascending)
    subjectStats.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
    
    return res.status(200).json({
      success: true,
      message: 'Attendance statistics retrieved',
      data: {
        minAttendanceRequired,
        overallStats,
        subjectStats
      }
    });
  } catch (error) {
    console.error('Error in getMyAttendanceStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance statistics',
      error: error.message
    });
  }
};

/**
 * Get today's attendance record for a student
 */
exports.getTodayAttendance = async (req, res) => {
  try {
    const studentId = req.user.id; // From auth middleware
    
    // Get today's date (local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get attendance records for today
    const records = await AttendanceRecord.find({
      student: studentId,
      date: { $gte: today, $lt: tomorrow }
    })
    .populate('subject', 'name code')
    .populate('faculty', 'name')
    .sort({ slotNumber: 1 });
    
    return res.status(200).json({
      success: true,
      message: 'Today\'s attendance records retrieved',
      data: records
    });
  } catch (error) {
    console.error('Error in getTodayAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve today\'s attendance',
      error: error.message
    });
  }
}; 