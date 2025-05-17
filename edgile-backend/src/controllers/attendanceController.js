const {
  AttendanceRecord,
  AttendanceStatus,
} = require("../models/AttendanceRecord");
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");

/**
 * Mark attendance for a class
 */
exports.markAttendance = async (req, res) => {
  try {
    const { classId, subjectId, slotNumber, date, facultyId } = req.body;

    // Validate required fields
    if (!classId || !subjectId || !slotNumber || !date || !facultyId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    try {
      // Check if attendance record already exists
      const existingRecord = await AttendanceRecord.findOne({
        facultyId,
        subjectId,
        date: {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
        slotNumber,
      });

      let record;

      if (existingRecord) {
        // Update existing record
        existingRecord.updatedAt = new Date();
        record = await existingRecord.save();
      } else {
        // Create new attendance record
        record = await AttendanceRecord.create({
          facultyId,
          classId,
          subjectId,
          date: new Date(date),
          slotNumber,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Attendance processed",
        record,
      });
    } catch (err) {
      console.error(`Error marking attendance:`, err);
      return res.status(500).json({
        success: false,
        message: "Failed to mark attendance",
        error: err.message,
      });
    }
  } catch (error) {
    console.error("Error in markAttendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message,
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
        message: "Class ID and date are required",
      });
    }

    // Parse date
    const attendanceDate = new Date(date);
    const query = {
      classId,
      date: {
        $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
        $lt: new Date(attendanceDate.setHours(23, 59, 59, 999)),
      },
    };

    // Add subject filter if provided
    if (subjectId) {
      query.subjectId = subjectId;
    }

    // Fetch attendance records
    const records = await AttendanceRecord.find(query)
      .populate("facultyId", "name email")
      .populate("subjectId", "name code")
      .sort({ slotNumber: 1 });

    return res.status(200).json({
      success: true,
      message: "Attendance records retrieved",
      data: records,
    });
  } catch (error) {
    console.error("Error in getAttendanceByClassAndDate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance records",
      error: error.message,
    });
  }
};

/**
 * Get attendance statistics - simplified version without student functionality
 */
exports.getStudentAttendanceStats = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Student functionality has been removed",
    data: {
      message: "Student functionality is no longer available",
    },
  });
};

/**
 * Get absentee information - simplified version without student functionality
 */
exports.getAbsenteeStudents = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Student functionality has been removed",
    data: [],
  });
};
