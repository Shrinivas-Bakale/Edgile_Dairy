const { AttendanceRecord, AttendanceStatus } = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');

/**
 * Mark attendance for multiple students
 */
exports.markAttendance = async (req, res) => {
  try {
    const { classId, subjectId, slotNumber, date, facultyId, studentAttendance } = req.body;

    // Validate required fields
    if (!classId || !subjectId || !slotNumber || !date || !facultyId || !studentAttendance) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    // Validate faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty not found' 
      });
    }

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    // Process each student's attendance
    const results = [];
    const attendanceDate = new Date(date);

    for (const student of studentAttendance) {
      // Validate student exists
      const studentExists = await Student.findById(student.id);
      if (!studentExists) {
        results.push({
          studentId: student.id,
          success: false,
          message: 'Student not found'
        });
        continue;
      }

      // Validate attendance status
      if (!Object.values(AttendanceStatus).includes(student.status)) {
        results.push({
          studentId: student.id,
          success: false,
          message: 'Invalid attendance status'
        });
        continue;
      }

      try {
        // Check if attendance record already exists
        const existingRecord = await AttendanceRecord.findOne({
          studentId: student.id,
          subjectId,
          date: { 
            $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)), 
            $lt: new Date(attendanceDate.setHours(23, 59, 59, 999)) 
          },
          slotNumber
        });

        if (existingRecord) {
          // Update existing record
          existingRecord.status = student.status;
          existingRecord.reason = student.reason || null;
          existingRecord.updatedAt = new Date();
          await existingRecord.save();
          
          results.push({
            studentId: student.id,
            success: true,
            message: 'Attendance updated',
            record: existingRecord
          });
        } else {
          // Create new attendance record
          const newRecord = await AttendanceRecord.create({
            studentId: student.id,
            facultyId,
            classId,
            subjectId,
            date: attendanceDate,
            slotNumber,
            status: student.status,
            reason: student.reason || null
          });
          
          results.push({
            studentId: student.id,
            success: true,
            message: 'Attendance marked',
            record: newRecord
          });
        }
      } catch (err) {
        console.error(`Error marking attendance for student ${student.id}:`, err);
        results.push({
          studentId: student.id,
          success: false,
          message: 'Failed to mark attendance',
          error: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance processed',
      results
    });
  } catch (error) {
    console.error('Error in markAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

/**
 * Get attendance records for a class on a specific date
 */
exports.getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId, date, subjectId } = req.query;

    // Validate required fields
    if (!classId || !date) {
      return res.status(400).json({ 
        success: false,
        message: 'Class ID and date are required' 
      });
    }

    // Parse date
    const attendanceDate = new Date(date);
    const query = {
      classId,
      date: { 
        $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)), 
        $lt: new Date(attendanceDate.setHours(23, 59, 59, 999)) 
      }
    };

    // Add subject filter if provided
    if (subjectId) {
      query.subjectId = subjectId;
    }

    // Fetch attendance records
    const records = await AttendanceRecord.find(query)
      .populate('studentId', 'name registerNumber email')
      .populate('facultyId', 'name email')
      .populate('subjectId', 'name code')
      .sort({ slotNumber: 1 });

    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved',
      data: records
    });
  } catch (error) {
    console.error('Error in getAttendanceByClassAndDate:', error);
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
exports.getStudentAttendanceStats = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate required fields
    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Student ID is required' 
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get all attendance records for the student
    const allRecords = await AttendanceRecord.find({ studentId })
      .populate('subjectId', 'name code')
      .sort({ date: -1 });

    // Calculate statistics by subject
    const subjectStats = {};
    let totalClasses = 0;
    let totalPresent = 0;

    allRecords.forEach(record => {
      const subjectId = record.subjectId._id.toString();
      
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          subjectName: record.subjectId.name,
          subjectCode: record.subjectId.code,
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendancePercentage: 0
        };
      }
      
      subjectStats[subjectId].totalClasses++;
      totalClasses++;
      
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          subjectStats[subjectId].present++;
          totalPresent++;
          break;
        case AttendanceStatus.ABSENT:
          subjectStats[subjectId].absent++;
          break;
        case AttendanceStatus.LATE:
          subjectStats[subjectId].late++;
          // Count late as present for attendance percentage
          subjectStats[subjectId].present++;
          totalPresent++;
          break;
        case AttendanceStatus.EXCUSED:
          subjectStats[subjectId].excused++;
          // Count excused as present for attendance percentage
          subjectStats[subjectId].present++;
          totalPresent++;
          break;
      }
    });

    // Calculate attendance percentage for each subject
    Object.keys(subjectStats).forEach(subjectId => {
      const stats = subjectStats[subjectId];
      stats.attendancePercentage = stats.totalClasses > 0
        ? ((stats.present / stats.totalClasses) * 100).toFixed(2)
        : 0;
    });

    // Calculate overall attendance percentage
    const overallAttendancePercentage = totalClasses > 0
      ? ((totalPresent / totalClasses) * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      message: 'Student attendance statistics retrieved',
      data: {
        student: {
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber
        },
        overallStats: {
          totalClasses,
          totalPresent,
          attendancePercentage: overallAttendancePercentage
        },
        subjectStats: Object.values(subjectStats)
      }
    });
  } catch (error) {
    console.error('Error in getStudentAttendanceStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student attendance statistics',
      error: error.message
    });
  }
};

/**
 * Get students who haven't attended classes for more than a week
 */
exports.getAbsenteeStudents = async (req, res) => {
  try {
    const { classId } = req.query;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }
    
    // Get all students in the class
    const students = await Student.find({ 
      division: classId.split('-')[1], // Assuming format like "year-division-semester"
      classYear: classId.split('-')[0],
      semester: classId.split('-')[2]
    });
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const absenteeStudents = [];
    
    // For each student, check if they've attended any class in the last week
    for (const student of students) {
      const latestAttendance = await AttendanceRecord.findOne({
        studentId: student._id,
        date: { $gte: oneWeekAgo }
      })
      .sort({ date: -1 });
      
      if (!latestAttendance) {
        absenteeStudents.push({
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber,
          email: student.email,
          phone: student.phone,
          lastAttendance: "More than a week ago"
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Absentee students retrieved',
      data: absenteeStudents
    });
  } catch (error) {
    console.error('Error in getAbsenteeStudents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve absentee students',
      error: error.message
    });
  }
}; 