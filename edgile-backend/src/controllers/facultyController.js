const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const { AttendanceRecord } = require('../models/AttendanceRecord');
const mongoose = require('mongoose');

// Add debug info for controller access
const logControllerAccess = (controllerName) => {
  console.log(`[DEBUG] Controller accessed: ${controllerName}`);
  return true;
};

// @desc    Get classes taught by faculty
// @route   GET /api/faculty/classes
// @access  Private (Faculty only)
exports.getClasses = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const { universityCode } = req.user;
    
    // Find classes where this faculty member teaches
    const classes = await Class.find({
      universityCode,
      facultyId
    });
    
    return res.status(200).json({
      success: true,
      classes
    });
  } catch (error) {
    console.error('Error in getClasses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get subjects for a class
// @route   GET /api/faculty/subjects
// @access  Private (Faculty only)
exports.getSubjects = async (req, res) => {
  try {
    const { classId } = req.query;
    const { universityCode } = req.user;
    
    // If no classId is provided, return all subjects for this university
    if (!classId) {
      const allSubjects = await Subject.find({ universityCode })
        .sort({ name: 1 });
      
      return res.status(200).json({
        success: true,
        subjects: allSubjects
      });
    }
    
    // Find the class
    const classInfo = await Class.findOne({
      _id: classId,
      universityCode
    });
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Find subjects for this class
    const subjects = await Subject.find({
      universityCode,
      year: classInfo.year,
      semester: classInfo.semester
    });
    
    return res.status(200).json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error('Error in getSubjects:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get students for a class
// @route   GET /api/faculty/students
// @access  Private (Faculty only)
exports.getStudents = async (req, res) => {
  logControllerAccess('getStudents');
  try {
    const { classId } = req.query;
    const { universityCode } = req.user;

    let students;
    if (!classId) {
      // Fetch all students for this university
      students = await Student.find({ universityCode }).select('_id name email registerNumber rollNumber year semester division phone');
    } else {
      // Find the class
      const classInfo = await Class.findOne({
        _id: classId,
        universityCode
      });
      if (!classInfo) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }
      // Find students for this class
      students = await Student.find({
        universityCode,
        year: classInfo.year,
        division: classInfo.division,
        semester: classInfo.semester
      }).select('_id name email registerNumber rollNumber year semester division phone');
    }
    return res.status(200).json({
      success: true,
      students
    });
  } catch (error) {
    console.error('Error in getStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark attendance for a class
// @route   POST /api/faculty/attendance/mark
// @access  Private (Faculty only)
exports.markAttendance = async (req, res) => {
  try {
    const { classId, subjectId, date, slotNumber, studentAttendance } = req.body;
    const { universityCode, id: facultyId } = req.user;
    
    if (!classId || !subjectId || !date || !slotNumber || !studentAttendance || !studentAttendance.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Get attendance settings
    const AttendanceSettings = require('../models/AttendanceSettings');
    const settings = await AttendanceSettings.findOne({ universityCode });
    
    // Check if excused absences are allowed
    const allowExcused = settings ? settings.allowExcusedAbsences : true;
    
    // Create attendance records for each student
    const attendancePromises = studentAttendance.map(async (student) => {
      // Validate attendance status
      if (student.status === 'EXCUSED' && !allowExcused) {
        student.status = 'ABSENT'; // Set to absent if excused is not allowed
      }
      
      // Check if record already exists
      const existingRecord = await AttendanceRecord.findOne({
        class: classId,
        subject: subjectId,
        date,
        slotNumber,
        student: student.id
      });
      
      if (existingRecord) {
        // Update existing record
        existingRecord.status = student.status;
        existingRecord.reason = student.reason || '';
        existingRecord.updatedAt = new Date();
        return existingRecord.save();
      } else {
        // Create new record
        return AttendanceRecord.create({
          universityCode,
          class: classId,
          subject: subjectId,
          faculty: facultyId,
          student: student.id,
          date,
          slotNumber,
          status: student.status,
          reason: student.reason || ''
        });
      }
    });
    
    await Promise.all(attendancePromises);
    
    // Get the updated records with student names for response
    const updatedRecords = await AttendanceRecord.find({
      class: classId,
      subject: subjectId,
      date,
      slotNumber
    })
    .populate('student', 'name registerNumber')
    .populate('subject', 'name code')
    .sort({ 'student.name': 1 });
    
    // Format records for response
    const formattedRecords = updatedRecords.map(record => ({
      _id: record._id,
      date: record.date,
      slotNumber: record.slotNumber,
      status: record.status,
      reason: record.reason,
      studentId: record.student ? record.student._id : null,
      studentName: record.student ? record.student.name : 'Unknown',
      studentRegisterNumber: record.student ? record.student.registerNumber : 'Unknown',
      subjectId: record.subject ? record.subject._id : null,
      subjectName: record.subject ? record.subject.name : 'Unknown',
      subjectCode: record.subject ? record.subject.code : 'Unknown'
    }));
    
    return res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: formattedRecords
    });
  } catch (error) {
    console.error('Error in markAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get attendance records for a class
// @route   GET /api/faculty/attendance/class
// @access  Private (Faculty only)
exports.getClassAttendance = async (req, res) => {
  try {
    const { classId, date, subjectId } = req.query;
    const { universityCode } = req.user;
    
    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and date are required'
      });
    }
    
    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Build query
    const query = {
      universityCode,
      class: classId,
      date: { $gte: attendanceDate, $lt: nextDay }
    };
    
    if (subjectId) {
      query.subject = subjectId;
    }
    
    // Find attendance records
    const attendanceRecords = await AttendanceRecord.find(query)
      .populate('student', 'name registerNumber')
      .populate('subject', 'name code')
      .sort({ slotNumber: 1, 'student.name': 1 });
    
    // Format records for the frontend
    const formattedRecords = attendanceRecords.map(record => ({
      _id: record._id,
      date: record.date,
      slotNumber: record.slotNumber,
      status: record.status,
      reason: record.reason,
      studentId: record.student ? record.student._id : null,
      studentName: record.student ? record.student.name : 'Unknown',
      studentRegisterNumber: record.student ? record.student.registerNumber : 'Unknown',
      subjectId: record.subject ? record.subject._id : null,
      subjectName: record.subject ? record.subject.name : 'Unknown',
      subjectCode: record.subject ? record.subject.code : 'Unknown'
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedRecords
    });
  } catch (error) {
    console.error('Error in getClassAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get attendance statistics for a class
// @route   GET /api/faculty/attendance/class-stats
// @access  Private (Faculty only)
exports.getClassAttendanceStats = async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    const { universityCode } = req.user;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }
    
    // Parse dates
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
    
    // Get attendance settings
    const AttendanceSettings = require('../models/AttendanceSettings');
    const settings = await AttendanceSettings.findOne({ universityCode });
    const minAttendanceRequired = settings ? settings.minAttendancePercentage : 75;
    
    // Build query
    const query = {
      universityCode,
      class: classId,
      date: { $gte: start, $lte: end }
    };
    
    if (subjectId) {
      query.subject = subjectId;
    }
    
    // Get all students in the class
    const Student = require('../models/Student');
    const students = await Student.find({ class: classId }).sort({ name: 1 });
    
    // Get all subjects for the class if no specific subject
    const Subject = require('../models/Subject');
    const subjects = subjectId 
      ? await Subject.find({ _id: subjectId }) 
      : await Subject.find({ class: classId });
    
    // Get all attendance records
    const records = await AttendanceRecord.find(query);
    
    // Calculate stats for each student
    const studentStats = [];
    
    for (const student of students) {
      const studentId = student._id;
      
      // Calculate overall stats
      let overallTotalClasses = 0;
      let overallTotalPresent = 0;
      
      // Calculate subject-wise stats
      const subjectStats = [];
      
      for (const subject of subjects) {
        // Filter records for this student and subject
        const studentSubjectRecords = records.filter(
          r => r.student.toString() === studentId.toString() && 
               r.subject.toString() === subject._id.toString()
        );
        
        if (studentSubjectRecords.length === 0) continue;
        
        // Count statuses
        let present = 0, absent = 0, late = 0, excused = 0;
        
        for (const record of studentSubjectRecords) {
          switch (record.status) {
            case 'PRESENT':
              present++;
              break;
            case 'ABSENT':
              absent++;
              break;
            case 'LATE':
              late++;
              break;
            case 'EXCUSED':
              excused++;
              break;
          }
        }
        
        const totalClasses = studentSubjectRecords.length;
        const totalPresent = present + late + excused; // Count late and excused as present
        const attendancePercentage = totalClasses > 0 ? (totalPresent / totalClasses * 100) : 0;
        
        // Add to overall totals
        overallTotalClasses += totalClasses;
        overallTotalPresent += totalPresent;
        
        // Add subject stats
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
      
      // Calculate overall percentage
      const overallAttendancePercentage = overallTotalClasses > 0 
        ? (overallTotalPresent / overallTotalClasses * 100)
        : 0;
      
      // Add student stats
      studentStats.push({
        student: {
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber
        },
        overallStats: {
          totalClasses: overallTotalClasses,
          totalPresent: overallTotalPresent,
          attendancePercentage: overallAttendancePercentage.toFixed(1),
          isBelowThreshold: overallAttendancePercentage < minAttendanceRequired
        },
        subjectStats
      });
    }
    
    // Calculate class-wide stats
    const classStats = {
      totalStudents: students.length,
      subjectStats: [],
      overallAttendancePercentage: 0
    };
    
    // Calculate for each subject
    for (const subject of subjects) {
      const subjectRecords = records.filter(r => r.subject.toString() === subject._id.toString());
      
      if (subjectRecords.length === 0) continue;
      
      // Count statuses
      let present = 0, absent = 0, late = 0, excused = 0;
      
      for (const record of subjectRecords) {
        switch (record.status) {
          case 'PRESENT':
            present++;
            break;
          case 'ABSENT':
            absent++;
            break;
          case 'LATE':
            late++;
            break;
          case 'EXCUSED':
            excused++;
            break;
        }
      }
      
      const totalAttendances = subjectRecords.length;
      const totalPresent = present + late + excused;
      const attendancePercentage = totalAttendances > 0 ? (totalPresent / totalAttendances * 100) : 0;
      
      // Get number of students with low attendance for this subject
      const lowAttendanceCount = studentStats.filter(s => 
        s.subjectStats.some(ss => 
          ss.subject.id.toString() === subject._id.toString() && ss.isBelowThreshold
        )
      ).length;
      
      classStats.subjectStats.push({
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.code
        },
        totalAttendances,
        present,
        absent,
        late,
        excused,
        attendancePercentage: attendancePercentage.toFixed(1),
        lowAttendanceCount,
        lowAttendancePercentage: students.length > 0 
          ? ((lowAttendanceCount / students.length) * 100).toFixed(1)
          : 0
      });
    }
    
    // Calculate overall class attendance percentage
    const allAttendances = records.length;
    const allPresent = records.filter(r => 
      r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED'
    ).length;
    
    classStats.overallAttendancePercentage = allAttendances > 0 
      ? ((allPresent / allAttendances) * 100).toFixed(1)
      : 0;
    
    return res.status(200).json({
      success: true,
      message: 'Class attendance statistics retrieved',
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        minAttendanceRequired,
        classStats,
        studentStats
      }
    });
  } catch (error) {
    console.error('Error in getClassAttendanceStats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get absentees for a class
// @route   GET /api/faculty/attendance/absentees
// @access  Private (Faculty only)
exports.getAbsentees = async (req, res) => {
  try {
    const { classId } = req.query;
    const { universityCode } = req.user;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }
    
    // Find the class
    const classInfo = await Class.findOne({
      _id: classId,
      universityCode
    });
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Get all students in this class
    const students = await Student.find({
      universityCode,
      year: classInfo.year,
      division: classInfo.division,
      semester: classInfo.semester
    }).select('_id name email registerNumber');
    
    // Get attendance statistics for each student
    const absenteesList = await Promise.all(students.map(async (student) => {
      // Count total sessions
      const totalSessions = await AttendanceRecord.countDocuments({
        universityCode,
        class: classId,
        student: student._id
      });
      
      // Count absences
      const absences = await AttendanceRecord.countDocuments({
        universityCode,
        class: classId,
        student: student._id,
        status: 'ABSENT'
      });
      
      // Calculate attendance percentage
      const attendancePercentage = totalSessions > 0 
        ? ((totalSessions - absences) / totalSessions) * 100 
        : 100;
      
      // Get last absence
      const lastAbsence = await AttendanceRecord.findOne({
        universityCode,
        class: classId,
        student: student._id,
        status: 'ABSENT'
      }).sort({ date: -1 });
      
      return {
        _id: student._id,
        studentId: student.registerNumber,
        studentName: student.name,
        email: student.email,
        absenceCount: absences,
        attendancePercentage: Math.round(attendancePercentage),
        lastAbsenceDate: lastAbsence ? lastAbsence.date : null
      };
    }));
    
    // Filter to show only students with low attendance or recent absences
    const absentees = absenteesList.filter(student => 
      student.attendancePercentage < 75 || student.absenceCount > 5
    );
    
    return res.status(200).json({
      success: true,
      data: absentees
    });
  } catch (error) {
    console.error('Error in getAbsentees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get current timetable for faculty
// @route   GET /api/faculty/timetable/current
// @access  Private (Faculty only)
exports.getCurrentTimetable = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const { universityCode } = req.user;
    
    // Get current day (Monday, Tuesday, etc.)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay()];
    
    // Find all timetables where this faculty member teaches
    const timetables = await Timetable.find({
      universityCode,
      status: 'published',
      days: {
        $elemMatch: {
          day: currentDay,
          slots: {
            $elemMatch: {
              facultyId: facultyId
            }
          }
        }
      }
    }).populate('classroomId');
    
    // Get all subjects for reference
    const subjects = await Subject.find({ universityCode });
    
    // Enhance the timetable with class information
    const enhancedTimetable = await Promise.all(timetables.map(async (timetable) => {
      // Find class information based on timetable details
      const classInfo = await Class.findOne({
        universityCode,
        year: timetable.year,
        division: timetable.division,
        semester: timetable.semester
      });
      
      const enhancedDays = timetable.days.map(day => {
        if (day.day !== currentDay) return day;
        
        const enhancedSlots = day.slots.map(slot => {
          // Only enhance slots that belong to this faculty
          if (String(slot.facultyId) !== String(facultyId)) return slot;
          
          // Find subject information
          const subject = subjects.find(sub => sub.subjectCode === slot.subjectCode);
          
          return {
            ...slot.toObject(),
            classId: classInfo ? classInfo._id : null,
            className: classInfo ? `${classInfo.year}-${classInfo.division} (Sem ${classInfo.semester})` : 'Unknown',
            subjectName: subject ? subject.name : 'Unknown Subject'
          };
        });
        
        return {
          ...day.toObject(),
          slots: enhancedSlots
        };
      });
      
      return {
        ...timetable.toObject(),
        days: enhancedDays
      };
    }));
    
    // Find the most relevant timetable (where the faculty is teaching right now)
    let currentTimetable = null;
    
    if (enhancedTimetable.length > 0) {
      // Get current time in minutes
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Find timetable with current active slot
      for (const timetable of enhancedTimetable) {
        const daySchedule = timetable.days.find(day => day.day === currentDay);
        if (!daySchedule) continue;
        
        const currentSlot = daySchedule.slots.find(slot => {
          if (!slot.startTime || !slot.endTime) return false;
          
          const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
          const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
          
          const startTimeInMinutes = startHours * 60 + startMinutes;
          const endTimeInMinutes = endHours * 60 + endMinutes;
          
          return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        });
        
        if (currentSlot) {
          currentTimetable = timetable;
          break;
        }
      }
      
      // If no current slot, use the first timetable
      if (!currentTimetable) {
        currentTimetable = enhancedTimetable[0];
      }
    }
    
    return res.status(200).json({
      success: true,
      timetable: currentTimetable,
      subjects
    });
  } catch (error) {
    console.error('Error in getCurrentTimetable:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all timetables
// @route   GET /api/faculty/timetables
// @access  Private (Faculty only)
exports.getTimetables = async (req, res) => {
  try {
    const { year, semester, division, academicYear } = req.query;
    const { universityCode, _id: facultyId } = req.user;
    
    console.log(`Fetching timetables for faculty ${facultyId} from university ${universityCode}`);
    console.log('Query parameters:', req.query);
    
    // DEBUGGING: Log the faculty user object to understand its structure
    console.log('Faculty user object:', {
      id: req.user._id,
      universityCode: req.user.universityCode,
      role: req.user.role,
      department: req.user.department
    });
    
    // First check if ANY published timetables exist regardless of other filters
    const allPublishedTimetables = await Timetable.find({
      status: 'published'
    }).limit(5);
    
    console.log(`DEBUG: Found ${allPublishedTimetables.length} timetables with ANY published status`);
    
    // Log sample of the first timetable if any exist
    if (allPublishedTimetables.length > 0) {
      console.log('Sample published timetable data:', {
        id: allPublishedTimetables[0]._id,
        universityCode: allPublishedTimetables[0].universityCode,
        year: allPublishedTimetables[0].year,
        division: allPublishedTimetables[0].division,
        academicYear: allPublishedTimetables[0].academicYear,
        status: allPublishedTimetables[0].status
      });
    }
    
    // Build the query for timetables specific to this faculty
    const query = { 
      status: 'published' // Only show published timetables to faculty
    };
    
    // IMPORTANT: Check if universityCode field is ObjectId or String and format correctly
    if (universityCode) {
      // Handle universityCode as either ObjectId or String
      if (mongoose.Types.ObjectId.isValid(universityCode)) {
        query.universityCode = mongoose.Types.ObjectId(universityCode);
      } else if (typeof universityCode === 'string') {
        query.universityCode = universityCode;
      }
    }
    
    if (year) query.year = year;
    if (semester) query.semester = parseInt(semester, 10);
    if (division) query.division = division;
    if (academicYear) query.academicYear = academicYear;
    
    console.log('Fetching timetables with query:', JSON.stringify(query));
    
    // Find timetables with the constructed query
    const timetables = await Timetable.find(query)
      .populate('classroomId', 'name building')
      .sort({ publishedAt: -1 });
      
    console.log(`Found ${timetables.length} published timetables for faculty's university`);
    
    // If no timetables found, try a broader search without specific faculty-related criteria
    if (timetables.length === 0) {
      // First, check for any published timetables in the system
      const allTimetables = await Timetable.find({ 
        status: 'published'
      }).countDocuments();
      
      console.log(`Total published timetables in the system: ${allTimetables}`);
      
      // Then check for timetables specifically relevant to this faculty
      const facultyTimetables = await Timetable.find({
        status: 'published',
        'days.slots.facultyId': facultyId
      }).countDocuments();
      
      console.log(`Timetables with slots assigned to this faculty: ${facultyTimetables}`);
      
      // Try to find timetables without the universityCode filter
      const timetablesWithoutUniversityCode = await Timetable.find({
        status: 'published'
      }).limit(5);
      
      console.log(`Timetables without universityCode filter: ${timetablesWithoutUniversityCode.length}`);
      
      // CRITICAL FIX: If there are published timetables but none for this universityCode, 
      // it's likely a universityCode mismatch. Return all published timetables as a fallback
      if (allTimetables > 0 && timetables.length === 0) {
        console.log('⚠️ UniversityCode mismatch detected! Returning all published timetables as a fallback.');
        
        // Use a more permissive query for now
        const fallbackTimetables = await Timetable.find({
          status: 'published'
        })
        .populate('classroomId', 'name building')
        .sort({ publishedAt: -1 });
        
        console.log(`Found ${fallbackTimetables.length} published timetables with fallback query`);
        
        // Get all subjects for enriching the timetable data
        const subjects = await Subject.find({});
        
        // Enhance timetables with faculty-specific data
        const enhancedTimetables = fallbackTimetables.map(timetable => {
          // Find slots where this faculty teaches
          const facultySlots = [];
          timetable.days.forEach(day => {
            day.slots.forEach(slot => {
              // Check if faculty ID is defined and matches current faculty
              // More permissive check: either exact match or consider all slots for visibility
              const facultyMatch = !slot.facultyId || 
                                   String(slot.facultyId) === String(facultyId);
              
              if (facultyMatch) {
                // Find subject info
                const subject = subjects.find(s => s.subjectCode === slot.subjectCode);
                facultySlots.push({
                  day: day.day,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  subjectCode: slot.subjectCode,
                  subjectName: subject ? subject.name : (slot.subjectName || 'Unknown Subject'),
                  type: subject ? subject.type : (slot.type || 'Unknown')
                });
              }
            });
          });
          
          // Return enhanced timetable with faculty's slots
          const timetableObj = timetable.toObject();
          timetableObj.facultySlots = facultySlots;
          timetableObj.relevantToFaculty = facultySlots.length > 0;
          
          return timetableObj;
        });
        
        // Return these timetables with a special note about the fallback
        return res.status(200).json({
          success: true,
          data: enhancedTimetables,
          totalPublished: fallbackTimetables.length,
          message: 'Showing all available timetables due to universityCode configuration issues',
          isUniversityCodeMismatch: true
        });
      }
    }
    
    // Get all subjects for enriching the timetable data 
    const subjects = await Subject.find({ universityCode });
    
    // Enhance timetables with faculty-specific data
    const enhancedTimetables = timetables.map(timetable => {
      // Find slots where this faculty teaches
      const facultySlots = [];
      timetable.days.forEach(day => {
        day.slots.forEach(slot => {
          // Check if faculty ID is defined and matches current faculty
          if (slot.facultyId && String(slot.facultyId) === String(facultyId)) {
            // Find subject info
            const subject = subjects.find(s => s.subjectCode === slot.subjectCode);
            facultySlots.push({
              day: day.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subjectCode: slot.subjectCode,
              subjectName: subject ? subject.name : (slot.subjectName || 'Unknown Subject'),
              type: subject ? subject.type : (slot.type || 'Unknown')
            });
          }
        });
      });
      
      // Return enhanced timetable with faculty's slots
      const timetableObj = timetable.toObject();
      timetableObj.facultySlots = facultySlots;
      timetableObj.relevantToFaculty = facultySlots.length > 0;
      
      return timetableObj;
    });
    
    // Log response data being sent to faculty
    console.log(`Returning ${enhancedTimetables.length} timetables to faculty, ${enhancedTimetables.filter(t => t.relevantToFaculty).length} are relevant to them`);
    
    return res.status(200).json({
      success: true,
      data: enhancedTimetables,
      totalPublished: timetables.length,
      message: timetables.length > 0 ? 'Timetables fetched successfully' : 'No timetables found matching your criteria'
    });
  } catch (error) {
    console.error('Error in getTimetables:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Unable to fetch timetables.',
      error: error.message
    });
  }
};

// @desc    Get faculty list
// @route   GET /api/faculty/faculty
// @access  Private (Faculty only)
exports.getFaculty = async (req, res) => {
  try {
    const { department } = req.query;
    const { universityCode } = req.user;
    
    // Build the query
    const query = { 
      universityCode,
      role: 'faculty'
    };
    
    if (department) query.department = department;
    
    // Find faculty members
    const Faculty = require('../models/Faculty');
    const facultyList = await Faculty.find(query)
      .select('_id name email department')
      .sort({ name: 1 });
    
    return res.status(200).json({
      success: true,
      faculty: facultyList
    });
  } catch (error) {
    console.error('Error in getFaculty:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get faculty dashboard data
// @route   GET /api/faculty/dashboard
// @access  Private (Faculty only)
exports.getDashboard = async (req, res) => {
  logControllerAccess('getDashboard');
  try {
    const { _id: facultyId, universityCode } = req.user;
    
    // Get count of courses/subjects taught by this faculty
    const subjects = await Subject.find({
      universityCode,
      facultyId
    });
    
    // Get count of students in classes taught by this faculty
    const classes = await Class.find({
      universityCode,
      facultyId
    });
    
    let totalStudents = 0;
    if (classes.length > 0) {
      // Get unique combinations of year, semester, division
      const classFilters = classes.map(cls => ({
        year: cls.year,
        semester: cls.semester, 
        division: cls.division
      }));
      
      // Count students in each class
      for (const filter of classFilters) {
        const studentCount = await Student.countDocuments({
          universityCode,
          ...filter
        });
        totalStudents += studentCount;
      }
    }
    
    // Get count of upcoming timetable slots for this faculty
    const timetables = await Timetable.find({
      universityCode,
      status: 'published',
      days: {
        $elemMatch: {
          slots: {
            $elemMatch: {
              facultyId: facultyId
            }
          }
        }
      }
    });
    
    // Count upcoming classes from timetables
    let upcomingClasses = 0;
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    timetables.forEach(timetable => {
      const daySchedule = timetable.days.find(day => day.day === currentDay);
      if (daySchedule) {
        daySchedule.slots.forEach(slot => {
          if (String(slot.facultyId) === String(facultyId)) {
            if (slot.startTime && slot.endTime) {
              const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
              const startTimeInMinutes = startHours * 60 + startMinutes;
              
              // If the slot starts later today, count it as upcoming
              if (startTimeInMinutes > currentTimeInMinutes) {
                upcomingClasses++;
              }
            }
          }
        });
      }
    });
    
    // Get count of pending assignments (placeholder - implement when assignment feature is ready)
    const pendingAssignments = 0;
    
    // Format the response
    const dashboardData = {
      totalCourses: subjects.length,
      totalStudents,
      upcomingClasses,
      pendingAssignments
    };
    
    // Get upcoming events (from timetable)
    const upcomingEvents = [];
    
    // Return the dashboard data
    return res.status(200).json({
      success: true,
      data: {
        dashboardData,
        upcomingEvents
      }
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get courses taught by faculty
// @route   GET /api/faculty/courses
// @access  Private (Faculty only)
exports.getCourses = async (req, res) => {
  logControllerAccess('getCourses');
  try {
    const { _id: facultyId, universityCode } = req.user;
    
    // Debug user object
    console.log('[DEBUG] getCourses - User object:', req.user);
    
    // Find subjects taught by this faculty
    const subjects = await Subject.find({
      universityCode
      // Use facultyId to filter when faculty-subject relationship is implemented 
      // For now, show all subjects
    }).sort({ name: 1 });
    
    // Log results for debugging
    console.log(`[DEBUG] getCourses - Found ${subjects.length} subjects for university ${universityCode}`);
    
    // Transform subjects into course format expected by frontend
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
    console.error('Error in getCourses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get course by ID
// @route   GET /api/faculty/courses/:id
// @access  Private (Faculty only)
exports.getCourseById = async (req, res) => {
  logControllerAccess('getCourseById');
  try {
    const { id } = req.params;
    const { universityCode, _id: facultyId } = req.user;
    
    console.log('[DEBUG] getCourseById - Course ID:', id);
    console.log('[DEBUG] getCourseById - User:', { universityCode, facultyId });
    
    // Find the subject
    const subject = await Subject.findOne({
      _id: id,
      universityCode
      // We're not filtering by facultyId until faculty-subject relationship is implemented
    });
    
    if (!subject) {
      console.log('[DEBUG] getCourseById - Subject not found');
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have access to it'
      });
    }
    
    console.log('[DEBUG] getCourseById - Subject found:', subject.name);
    
    // Transform to course format
    const course = {
      _id: subject._id,
      subjectName: subject.name,
      subjectCode: subject.subjectCode,
      type: subject.type || 'core',
      totalDuration: subject.totalDuration || 48,
      weeklyHours: subject.weeklyHours || 3,
      year: subject.year,
      semester: subject.semester,
      description: subject.description
    };
    
    return res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Error in getCourseById:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get timetable for a student
// @route   GET /api/faculty/student-timetable/:studentId
// @access  Private (Faculty only)
exports.getStudentTimetable = async (req, res) => {
  logControllerAccess('getStudentTimetable');
  try {
    const { studentId } = req.params;
    const { universityCode } = req.user;
    
    console.log('[DEBUG] getStudentTimetable - Student ID:', studentId);
    
    // Find the student
    const student = await Student.findOne({
      _id: studentId,
      universityCode
    });
    
    if (!student) {
      console.log('[DEBUG] getStudentTimetable - Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Find timetable for the student's class
    const timetable = await Timetable.findOne({
      universityCode,
      year: student.year,
      division: student.division,
      semester: student.semester,
      status: 'published'
    }).populate('classroomId');
    
    if (!timetable) {
      console.log('[DEBUG] getStudentTimetable - No timetable found');
      return res.status(404).json({
        success: false,
        message: 'No published timetable found for this student'
      });
    }
    
    console.log('[DEBUG] getStudentTimetable - Timetable found');
    
    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error in getStudentTimetable:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Check if a date is a holiday
// @route   GET /api/faculty/holidays
// @access  Private (Faculty only)
exports.checkHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    const Holiday = require('../models/Holiday');
    const holiday = await Holiday.findOne({ date: new Date(date) });
    if (holiday) {
      return res.json({ isHoliday: true, reason: holiday.reason || 'Holiday' });
    }
    return res.json({ isHoliday: false });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
