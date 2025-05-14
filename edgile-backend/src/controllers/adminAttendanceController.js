const { AttendanceRecord, AttendanceStatus } = require('../models/AttendanceRecord');
const AttendanceSettings = require('../models/AttendanceSettings');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Class = require('../models/Class');

/**
 * Get attendance settings
 */
exports.getAttendanceSettings = async (req, res) => {
  try {
    const university = req.user.university;

    if (!university) {
      return res.status(400).json({ 
        success: false, 
        message: 'University ID is required' 
      });
    }

    // Find settings or create default
    let settings = await AttendanceSettings.findOne({ university });
    
    if (!settings) {
      // Create default settings
      settings = await AttendanceSettings.create({
        university,
        minAttendancePercentage: 75,
        warnAtPercentage: 85,
        allowExcusedAbsences: true,
        allowSelfMarking: false,
        enableAutomatedReporting: true,
        reportingFrequency: 'weekly',
        graceTimeForLateMarkingMinutes: 10
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance settings retrieved',
      data: settings
    });
  } catch (error) {
    console.error('Error in getAttendanceSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance settings',
      error: error.message
    });
  }
};

/**
 * Update attendance settings
 */
exports.updateAttendanceSettings = async (req, res) => {
  try {
    const university = req.user.university;
    const {
      minAttendancePercentage,
      warnAtPercentage,
      allowExcusedAbsences,
      allowSelfMarking,
      enableAutomatedReporting,
      reportingFrequency,
      graceTimeForLateMarkingMinutes
    } = req.body;

    if (!university) {
      return res.status(400).json({ 
        success: false, 
        message: 'University ID is required' 
      });
    }

    // Validate settings
    if (minAttendancePercentage !== undefined && (minAttendancePercentage < 0 || minAttendancePercentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum attendance percentage must be between 0 and 100'
      });
    }

    if (warnAtPercentage !== undefined && (warnAtPercentage < 0 || warnAtPercentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Warning percentage must be between 0 and 100'
      });
    }

    // Find settings or create default
    let settings = await AttendanceSettings.findOne({ university });
    
    if (!settings) {
      // Create new settings if not found
      settings = new AttendanceSettings({ university });
    }
    
    // Update settings with new values
    if (minAttendancePercentage !== undefined) settings.minAttendancePercentage = minAttendancePercentage;
    if (warnAtPercentage !== undefined) settings.warnAtPercentage = warnAtPercentage;
    if (allowExcusedAbsences !== undefined) settings.allowExcusedAbsences = allowExcusedAbsences;
    if (allowSelfMarking !== undefined) settings.allowSelfMarking = allowSelfMarking;
    if (enableAutomatedReporting !== undefined) settings.enableAutomatedReporting = enableAutomatedReporting;
    if (reportingFrequency !== undefined) settings.reportingFrequency = reportingFrequency;
    if (graceTimeForLateMarkingMinutes !== undefined) settings.graceTimeForLateMarkingMinutes = graceTimeForLateMarkingMinutes;
    
    // Save updated settings
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Attendance settings updated',
      data: settings
    });
  } catch (error) {
    console.error('Error in updateAttendanceSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance settings',
      error: error.message
    });
  }
};

/**
 * Get attendance reports for all classes
 */
exports.getAttendanceReports = async (req, res) => {
  try {
    const universityCode = req.user.universityCode;
    const { classId, startDate, endDate } = req.query;

    if (!universityCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'University code is required' 
      });
    }

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
      universityCode,
      date: { $gte: start, $lte: end }
    };

    // Add class filter if provided
    if (classId) {
      query.class = classId;
    }

    // Get all attendance records for the date range
    const records = await AttendanceRecord.find(query)
      .populate('student', 'name registerNumber email')
      .populate('faculty', 'name email')
      .populate('subject', 'name code')
      .populate('class', 'name year semester division');

    // Get classes for the university
    const classes = await Class.find({ universityCode });
    
    // Aggregate data by class (using classId)
    const classSummary = {};

    // Process all records
    for (const record of records) {
      if (!record.class) continue;
      
      const classId = record.class._id.toString();
      const classObj = record.class;
      const subjectId = record.subject?._id.toString();
      const studentId = record.student?._id.toString();
      
      // Skip if missing required data
      if (!classId || !subjectId || !studentId) continue;
      
      // Initialize class summary if it doesn't exist
      if (!classSummary[classId]) {
        classSummary[classId] = {
          id: classId,
          name: classObj.name,
          year: classObj.year,
          semester: classObj.semester,
          division: classObj.division,
          studentCounts: new Set(),
          subjectBreakdown: {},
          totalClasses: 0,
          totalPresent: 0,
          attendanceRate: 0
        };
      }
      
      // Track unique students
      classSummary[classId].studentCounts.add(studentId);
      
      // Initialize subject breakdown if it doesn't exist
      if (!classSummary[classId].subjectBreakdown[subjectId]) {
        classSummary[classId].subjectBreakdown[subjectId] = {
          id: subjectId,
          name: record.subject.name,
          code: record.subject.code,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalClasses: 0,
          attendanceRate: 0
        };
      }
      
      // Update counts based on attendance status
      classSummary[classId].subjectBreakdown[subjectId].totalClasses++;
      
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          classSummary[classId].subjectBreakdown[subjectId].present++;
          break;
        case AttendanceStatus.ABSENT:
          classSummary[classId].subjectBreakdown[subjectId].absent++;
          break;
        case AttendanceStatus.LATE:
          classSummary[classId].subjectBreakdown[subjectId].late++;
          break;
        case AttendanceStatus.EXCUSED:
          classSummary[classId].subjectBreakdown[subjectId].excused++;
          break;
      }
    }
    
    // Calculate totals and convert Sets to counts
    Object.keys(classSummary).forEach(key => {
      const summary = classSummary[key];
      
      // Count unique students
      summary.totalStudents = summary.studentCounts.size;
      delete summary.studentCounts;
      
      // Calculate totals for each subject
      let totalClasses = 0;
      let totalPresent = 0;
      
      Object.values(summary.subjectBreakdown).forEach(subject => {
        totalClasses += subject.totalClasses;
        totalPresent += subject.present + subject.late + subject.excused; // Count late and excused as present
        
        // Calculate attendance rate for each subject
        subject.attendanceRate = subject.totalClasses > 0
          ? ((subject.present + subject.late + subject.excused) / subject.totalClasses * 100).toFixed(2)
          : 0;
      });
      
      summary.totalClasses = totalClasses;
      summary.attendanceRate = totalClasses > 0
        ? (totalPresent / totalClasses * 100).toFixed(2)
        : 0;
      
      // Convert subject breakdown to array for easier consumption
      summary.subjects = Object.values(summary.subjectBreakdown);
      delete summary.subjectBreakdown;
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance reports retrieved',
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        classes: Object.values(classSummary)
      }
    });
  } catch (error) {
    console.error('Error in getAttendanceReports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance reports',
      error: error.message
    });
  }
};

/**
 * Get students with low attendance
 */
exports.getLowAttendanceStudents = async (req, res) => {
  try {
    const university = req.user.university;
    const { threshold, classId } = req.query;
    
    // Get attendance settings to determine threshold
    const settings = await AttendanceSettings.findOne({ university });
    const attendanceThreshold = threshold || (settings ? settings.minAttendancePercentage : 75);
    
    // Build query for classes
    const classQuery = { university };
    if (classId) {
      classQuery._id = classId;
    }
    
    // Get all classes
    const classes = await Class.find(classQuery);
    
    // Get all subjects
    const subjects = await Subject.find({ university });
    
    // For each class, get students and check their attendance
    const lowAttendanceStudents = [];
    
    for (const classObj of classes) {
      // Get students in the class
      const students = await Student.find({ class: classObj._id });
      
      for (const student of students) {
        // Calculate attendance for each subject
        const subjectAttendance = [];
        let overallAttendance = { totalClasses: 0, totalPresent: 0, percentage: 0 };
        
        for (const subject of subjects.filter(s => s.class && s.class.toString() === classObj._id.toString())) {
          // Get attendance records for this student and subject
          const records = await AttendanceRecord.find({
            university,
            class: classObj._id,
            subject: subject._id,
            student: student._id
          });
          
          if (records.length === 0) continue;
          
          // Count attendance statuses
          let present = 0, absent = 0, late = 0, excused = 0;
          
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
          const percentage = totalClasses > 0 ? (totalPresent / totalClasses * 100) : 0;
          
          subjectAttendance.push({
            subject: {
              id: subject._id,
              name: subject.name,
              code: subject.code
            },
            present,
            absent,
            late,
            excused,
            totalClasses,
            percentage: percentage.toFixed(2)
          });
          
          // Add to overall totals
          overallAttendance.totalClasses += totalClasses;
          overallAttendance.totalPresent += totalPresent;
        }
        
        // Calculate overall percentage
        overallAttendance.percentage = overallAttendance.totalClasses > 0 
          ? (overallAttendance.totalPresent / overallAttendance.totalClasses * 100).toFixed(2)
          : 0;
        
        // Check if student has low attendance
        if (parseFloat(overallAttendance.percentage) < attendanceThreshold) {
          lowAttendanceStudents.push({
            student: {
              id: student._id,
              name: student.name,
              registerNumber: student.registerNumber,
              email: student.email
            },
            class: {
              id: classObj._id,
              name: classObj.name
            },
            overallAttendance,
            subjectAttendance
          });
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Low attendance students retrieved',
      data: {
        threshold: attendanceThreshold,
        students: lowAttendanceStudents
      }
    });
  } catch (error) {
    console.error('Error in getLowAttendanceStudents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get low attendance students',
      error: error.message
    });
  }
};

/**
 * Generate attendance report in PDF
 * This is a placeholder for a more complete implementation
 */
exports.generateAttendanceReport = async (req, res) => {
  try {
    const university = req.user.university;
    const { classId, startDate, endDate, format } = req.query;
    
    // Validate that classId is provided
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }
    
    // Parse dates with validation
    let start, end;
    try {
      start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
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
    
    // This would typically generate a PDF or other report format
    // For now, just return a success message
    return res.status(200).json({
      success: true,
      message: 'Attendance report generated',
      data: {
        reportUrl: `/reports/attendance_${classId}_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    console.error('Error in generateAttendanceReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate attendance report',
      error: error.message
    });
  }
}; 