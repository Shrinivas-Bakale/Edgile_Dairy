const express = require("express");
const router = express.Router();
const { protect, facultyOnly } = require("../../middleware/authMiddleware");
const attendanceController = require("../../controllers/attendanceController");
const reportGenerator = require("../../utils/reportGenerator");
const facultyController = require("../../controllers/facultyController");

// Mark attendance for a class
router.post("/mark", protect, facultyOnly, attendanceController.markAttendance);

// Get attendance by class and date
router.get(
  "/class",
  protect,
  facultyOnly,
  attendanceController.getAttendanceByClassAndDate
);

// Get daily attendance records
router.get("/daily", protect, facultyOnly, async (req, res) => {
  try {
    const { classId, date, subjectId } = req.query;
    const facultyId = req.user.id;

    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "Class ID and date are required",
      });
    }

    // Parse date
    const attendanceDate = new Date(date);
    const dayStart = new Date(attendanceDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(attendanceDate.setHours(23, 59, 59, 999));

    // Get all attendance records for the given date and class
    const query = {
      classId,
      date: { $gte: dayStart, $lte: dayEnd },
    };

    if (subjectId) {
      query.subjectId = subjectId;
    }

    const AttendanceRecord =
      require("../../models/AttendanceRecord").AttendanceRecord;
    const Class = require("../../models/Class");

    // Get class details
    const classDetails = await Class.findById(classId);

    // Get all attendance records for the day
    const records = await AttendanceRecord.find(query)
      .populate("facultyId", "name")
      .populate("subjectId", "name code")
      .sort({ slotNumber: 1 });

    // Group by slot number
    const slotMap = {};
    records.forEach((record) => {
      const slotNumber = record.slotNumber;

      if (!slotMap[slotNumber]) {
        slotMap[slotNumber] = {
          slotNumber,
          subject: record.subjectId,
          faculty: record.facultyId,
          attendance: [],
        };
      }

      slotMap[slotNumber].attendance.push({
        status: record.status,
        reason: record.reason,
      });
    });

    // Convert to array and sort by slot number
    const slots = Object.values(slotMap).sort(
      (a, b) => a.slotNumber - b.slotNumber
    );

    return res.status(200).json({
      success: true,
      message: "Daily attendance records retrieved",
      data: {
        classId,
        className:
          classDetails?.name ||
          `${classDetails?.year}-${classDetails?.division} (Sem ${classDetails?.semester})`,
        date: date,
        slots,
      },
    });
  } catch (error) {
    console.error("Error retrieving daily attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve daily attendance records",
      error: error.message,
    });
  }
});

// Get attendance statistics for a class
router.get("/stats", protect, facultyOnly, async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    const facultyId = req.user.id;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    // Parse dates
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Set time to beginning and end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const AttendanceRecord =
      require("../../models/AttendanceRecord").AttendanceRecord;
    const Subject = require("../../models/Subject");
    const Class = require("../../models/Class");
    const AttendanceSettings = require("../../models/AttendanceSettings");

    // Get attendance settings
    const faculty = await req.user;
    const settings = await AttendanceSettings.findOne({
      university: faculty.university,
    });

    const minAttendanceRequired = settings?.minAttendancePercentage || 75;

    // Get class details
    const classDetails = await Class.findById(classId);
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Build query for attendance records
    const query = {
      classId,
      date: { $gte: start, $lte: end },
    };

    let subjectName = "";
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
      totalExcused: 0,
    };

    // Count attendance statuses
    records.forEach((record) => {
      switch (record.status) {
        case "PRESENT":
          overallStats.totalPresent++;
          break;
        case "ABSENT":
          overallStats.totalAbsent++;
          break;
        case "LATE":
          overallStats.totalLate++;
          break;
        case "EXCUSED":
          overallStats.totalExcused++;
          break;
      }
    });

    // Calculate average attendance
    overallStats.averageAttendance =
      records.length > 0
        ? Math.round(
            ((overallStats.totalPresent +
              overallStats.totalLate +
              overallStats.totalExcused) /
              records.length) *
              100
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Attendance statistics retrieved",
      data: {
        classId,
        className:
          classDetails?.name ||
          `${classDetails?.year}-${classDetails?.division} (Sem ${classDetails?.semester})`,
        subjectId,
        subjectName,
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
        minAttendanceRequired,
        overallStats,
        facultyOnly: true,
      },
    });
  } catch (error) {
    console.error("Error retrieving attendance statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance statistics",
      error: error.message,
    });
  }
});

// Get absentees endpoint - simplified as student functionality is removed
router.get("/absentees", protect, facultyOnly, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Student functionality has been removed",
      data: {
        students: [],
      },
    });
  } catch (error) {
    console.error("Error retrieving absentees:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve absentees",
      error: error.message,
    });
  }
});

// Generate attendance report (PDF)
router.get("/generate-report", protect, facultyOnly, async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      startDate,
      endDate,
      reportType = "summary",
    } = req.query;
    const facultyId = req.user.id;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    // Parse dates
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Set time to beginning and end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Generate the report
    const report = await reportGenerator.generateAttendanceReport({
      classId,
      subjectId,
      startDate: start,
      endDate: end,
      reportType,
      facultyId,
      universityId: req.user.university,
    });

    return res.status(200).json({
      success: true,
      message: "Report generated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
});

// Add holiday endpoint
router.get("/holidays", protect, facultyOnly, facultyController.checkHoliday);

module.exports = router;
