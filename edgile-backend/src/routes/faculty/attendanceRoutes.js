const express = require('express');
const router = express.Router();
const { protect, facultyOnly } = require('../../middleware/authMiddleware');
const attendanceController = require('../../controllers/attendanceController');
const reportGenerator = require('../../utils/reportGenerator');
const facultyController = require('../../controllers/facultyController');

// Mark attendance for a class
router.post('/mark', protect, facultyOnly, attendanceController.markAttendance);

// Get attendance by class and date
router.get('/class', protect, facultyOnly, attendanceController.getAttendanceByClassAndDate);

// Get daily attendance records
router.get('/daily', protect, facultyOnly, async (req, res) => {
  try {
    const { classId, date, subjectId } = req.query;
    const facultyId = req.user.id;
    
    if (!classId || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class ID and date are required' 
      });
    }
    
    // Parse date
    const attendanceDate = new Date(date);
    const dayStart = new Date(attendanceDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(attendanceDate.setHours(23, 59, 59, 999));
    
    // Get all attendance records for the given date and class
    const query = {
      classId,
      date: { $gte: dayStart, $lte: dayEnd }
    };
    
    if (subjectId) {
      query.subjectId = subjectId;
    }
    
    const AttendanceRecord = require('../../models/AttendanceRecord').AttendanceRecord;
    const Class = require('../../models/Class');
    
    // Get class details
    const classDetails = await Class.findById(classId);
    
    // Get all attendance records for the day
    const records = await AttendanceRecord.find(query)
      .populate('studentId', 'name registerNumber')
      .populate('facultyId', 'name')
      .populate('subjectId', 'name code')
      .sort({ slotNumber: 1 });
    
    // Group by slot number
    const slotMap = {};
    records.forEach(record => {
      const slotNumber = record.slotNumber;
      
      if (!slotMap[slotNumber]) {
        slotMap[slotNumber] = {
          slotNumber,
          subject: record.subjectId,
          faculty: record.facultyId,
          attendance: []
        };
      }
      
      slotMap[slotNumber].attendance.push({
        student: record.studentId,
        status: record.status,
        reason: record.reason
      });
    });
    
    // Convert to array and sort by slot number
    const slots = Object.values(slotMap).sort((a, b) => a.slotNumber - b.slotNumber);
    
    return res.status(200).json({
      success: true,
      message: 'Daily attendance records retrieved',
      data: {
        classId,
        className: classDetails?.name || `${classDetails?.year}-${classDetails?.division} (Sem ${classDetails?.semester})`,
        date: date,
        slots
      }
    });
  } catch (error) {
    console.error('Error retrieving daily attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily attendance records',
      error: error.message
    });
  }
});

// Get attendance statistics for a class
router.get('/stats', protect, facultyOnly, async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    const facultyId = req.user.id;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class ID is required' 
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set time to beginning and end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const AttendanceRecord = require('../../models/AttendanceRecord').AttendanceRecord;
    const Student = require('../../models/Student');
    const Subject = require('../../models/Subject');
    const Class = require('../../models/Class');
    const AttendanceSettings = require('../../models/AttendanceSettings');
    
    // Get attendance settings
    const faculty = await req.user;
    const settings = await AttendanceSettings.findOne({ university: faculty.university });
    
    const minAttendanceRequired = settings?.minAttendancePercentage || 75;
    
    // Get class details
    const classDetails = await Class.findById(classId);
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Get students in the class
    const students = await Student.find({ class: classId });
    
    // Build query for attendance records
    const query = {
      classId,
      date: { $gte: start, $lte: end }
    };
    
    if (subjectId) {
      query.subjectId = subjectId;
      // Get subject details
      const subject = await Subject.findById(subjectId);
      if (subject) {
        subjectName = subject.name;
      }
    }
    
    // Get all attendance records
    const records = await AttendanceRecord.find(query);
    
    // Calculate overall stats
    const overallStats = {
      totalRecords: records.length,
      totalClasses: 0,
      averageAttendance: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0
    };
    
    // Count attendance statuses
    records.forEach(record => {
      switch (record.status) {
        case 'PRESENT':
          overallStats.totalPresent++;
          break;
        case 'ABSENT':
          overallStats.totalAbsent++;
          break;
        case 'LATE':
          overallStats.totalLate++;
          break;
        case 'EXCUSED':
          overallStats.totalExcused++;
          break;
      }
    });
    
    // Calculate stats for each student
    const studentAttendance = [];
    let studentsAtRisk = 0;
    
    for (const student of students) {
      // Get records for this student
      const studentRecords = records.filter(r => r.studentId && r.studentId.toString() === student._id.toString());
      
      if (studentRecords.length === 0) continue;
      
      // Count by status
      const present = studentRecords.filter(r => r.status === 'PRESENT').length;
      const absent = studentRecords.filter(r => r.status === 'ABSENT').length;
      const late = studentRecords.filter(r => r.status === 'LATE').length;
      const excused = studentRecords.filter(r => r.status === 'EXCUSED').length;
      
      const totalClasses = studentRecords.length;
      const totalPresent = present + late + excused; // Count late and excused as present
      const attendanceRate = totalClasses > 0 
        ? Math.round((totalPresent / totalClasses) * 100) 
        : 0;
      
      studentAttendance.push({
        student: {
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber
        },
        totalClasses,
        present,
        absent,
        late,
        excused,
        attendanceRate
      });
      
      if (attendanceRate < minAttendanceRequired) {
        studentsAtRisk++;
      }
    }
    
    // Calculate average attendance
    if (studentAttendance.length > 0) {
      const totalAttendanceRate = studentAttendance.reduce((sum, student) => sum + student.attendanceRate, 0);
      overallStats.averageAttendance = Math.round(totalAttendanceRate / studentAttendance.length);
    }
    
    // Sort students by attendance rate (ascending)
    studentAttendance.sort((a, b) => a.attendanceRate - b.attendanceRate);
    
    return res.status(200).json({
      success: true,
      message: 'Attendance statistics retrieved',
      data: {
        classId,
        className: classDetails?.name || `${classDetails?.year}-${classDetails?.division} (Sem ${classDetails?.semester})`,
        subjectId,
        subjectName,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        minAttendanceRequired,
        studentsAtRisk,
        overallStats,
        students: studentAttendance
      }
    });
  } catch (error) {
    console.error('Error retrieving attendance statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance statistics',
      error: error.message
    });
  }
});

// Get absentees (students with low attendance)
router.get('/absentees', protect, facultyOnly, async (req, res) => {
  try {
    const { classId, subjectId, threshold = 75 } = req.query;
    const facultyId = req.user.id;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class ID is required' 
      });
    }
    
    const AttendanceRecord = require('../../models/AttendanceRecord').AttendanceRecord;
    const Student = require('../../models/Student');
    const Subject = require('../../models/Subject');
    const Class = require('../../models/Class');
    
    // Get class details
    const classDetails = await Class.findById(classId);
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Get students in the class
    const students = await Student.find({ class: classId });
    
    // Get subjects for the class
    const subjects = await Subject.find({ class: classId });
    
    // Build query for attendance records
    const query = { classId };
    if (subjectId) {
      query.subjectId = subjectId;
    }
    
    // Get all attendance records
    const records = await AttendanceRecord.find(query);
    
    // Calculate stats for each student
    const studentAttendance = [];
    let studentsAtRisk = 0;
    
    for (const student of students) {
      // Get records for this student
      const studentRecords = records.filter(r => r.studentId && r.studentId.toString() === student._id.toString());
      
      if (studentRecords.length === 0) continue;
      
      // Count by status
      const present = studentRecords.filter(r => r.status === 'PRESENT').length;
      const absent = studentRecords.filter(r => r.status === 'ABSENT').length;
      const late = studentRecords.filter(r => r.status === 'LATE').length;
      const excused = studentRecords.filter(r => r.status === 'EXCUSED').length;
      
      const totalClasses = studentRecords.length;
      const totalPresent = present + late + excused; // Count late and excused as present
      const overallAttendance = totalClasses > 0 
        ? Math.round((totalPresent / totalClasses) * 100) 
        : 0;
      
      // Skip students with good attendance
      if (overallAttendance >= threshold) continue;
      
      // Calculate consecutive absences
      let maxConsecutiveAbsences = 0;
      let currentConsecutive = 0;
      
      // Sort records by date
      const sortedRecords = [...studentRecords].sort((a, b) => a.date - b.date);
      
      for (const record of sortedRecords) {
        if (record.status === 'ABSENT') {
          currentConsecutive++;
          maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, currentConsecutive);
        } else {
          currentConsecutive = 0;
        }
      }
      
      // Calculate subject-wise attendance
      const subjectAttendance = [];
      
      for (const subject of subjects) {
        const subjectRecords = studentRecords.filter(r => 
          r.subjectId && r.subjectId.toString() === subject._id.toString()
        );
        
        if (subjectRecords.length === 0) continue;
        
        const subjectPresent = subjectRecords.filter(r => r.status === 'PRESENT').length;
        const subjectAbsent = subjectRecords.filter(r => r.status === 'ABSENT').length;
        const subjectLate = subjectRecords.filter(r => r.status === 'LATE').length;
        const subjectExcused = subjectRecords.filter(r => r.status === 'EXCUSED').length;
        
        const subjectTotalClasses = subjectRecords.length;
        const subjectTotalPresent = subjectPresent + subjectLate + subjectExcused;
        const attendancePercentage = subjectTotalClasses > 0 
          ? Math.round((subjectTotalPresent / subjectTotalClasses) * 100) 
          : 0;
        
        // Get latest attendance date
        const lastAttendance = subjectRecords.length > 0 
          ? subjectRecords.sort((a, b) => b.date - a.date)[0].date 
          : null;
        
        subjectAttendance.push({
          subject: {
            id: subject._id,
            name: subject.name,
            code: subject.code
          },
          totalClasses: subjectTotalClasses,
          present: subjectPresent,
          absent: subjectAbsent,
          late: subjectLate,
          excused: subjectExcused,
          attendancePercentage,
          lastAttendance
        });
      }
      
      // Sort subjects by attendance percentage (ascending)
      subjectAttendance.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
      
      studentAttendance.push({
        student: {
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber,
          email: student.email
        },
        overallAttendance,
        consecutiveAbsences: maxConsecutiveAbsences,
        subjectAttendance
      });
      
      studentsAtRisk++;
    }
    
    // Sort students by attendance rate (ascending)
    studentAttendance.sort((a, b) => a.overallAttendance - b.overallAttendance);
    
    return res.status(200).json({
      success: true,
      message: 'Absentees retrieved',
      data: {
        classId,
        className: classDetails?.name || `${classDetails?.year}-${classDetails?.division} (Sem ${classDetails?.semester})`,
        subjectId,
        threshold: parseInt(threshold),
        studentsAtRisk,
        totalStudents: students.length,
        students: studentAttendance
      }
    });
  } catch (error) {
    console.error('Error retrieving absentees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve absentees',
      error: error.message
    });
  }
});

// Generate attendance report (PDF)
router.get('/generate-report', protect, facultyOnly, async (req, res) => {
  try {
    const { classId, subjectId, studentId, startDate, endDate, reportType = 'summary' } = req.query;
    const facultyId = req.user.id;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class ID is required' 
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set time to beginning and end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Generate the report
    const report = await reportGenerator.generateAttendanceReport({
      classId,
      subjectId,
      studentId,
      startDate: start,
      endDate: end,
      reportType,
      facultyId,
      universityId: req.user.university
    });
    
    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
});

// Add holiday endpoint
router.get('/holidays', protect, facultyOnly, facultyController.checkHoliday);

module.exports = router; 