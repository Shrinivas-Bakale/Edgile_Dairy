const {
  AttendanceRecord,
  AttendanceStatus,
} = require("../models/AttendanceRecord");
const AttendanceSettings = require("../models/AttendanceSettings");
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");
const Class = require("../models/Class");

/**
 * Get attendance settings
 */
exports.getAttendanceSettings = async (req, res) => {
  try {
    const university = req.user.university;

    if (!university) {
      return res.status(400).json({
        success: false,
        message: "University ID is required",
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
        reportingFrequency: "weekly",
        graceTimeForLateMarkingMinutes: 10,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance settings retrieved",
      data: settings,
    });
  } catch (error) {
    console.error("Error in getAttendanceSettings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance settings",
      error: error.message,
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
      graceTimeForLateMarkingMinutes,
    } = req.body;

    if (!university) {
      return res.status(400).json({
        success: false,
        message: "University ID is required",
      });
    }

    // Validate settings
    if (
      minAttendancePercentage !== undefined &&
      (minAttendancePercentage < 0 || minAttendancePercentage > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum attendance percentage must be between 0 and 100",
      });
    }

    if (
      warnAtPercentage !== undefined &&
      (warnAtPercentage < 0 || warnAtPercentage > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Warning percentage must be between 0 and 100",
      });
    }

    // Find settings or create default
    let settings = await AttendanceSettings.findOne({ university });

    if (!settings) {
      // Create new settings if not found
      settings = new AttendanceSettings({ university });
    }

    // Update settings with new values
    if (minAttendancePercentage !== undefined)
      settings.minAttendancePercentage = minAttendancePercentage;
    if (warnAtPercentage !== undefined)
      settings.warnAtPercentage = warnAtPercentage;
    if (allowExcusedAbsences !== undefined)
      settings.allowExcusedAbsences = allowExcusedAbsences;
    if (allowSelfMarking !== undefined)
      settings.allowSelfMarking = allowSelfMarking;
    if (enableAutomatedReporting !== undefined)
      settings.enableAutomatedReporting = enableAutomatedReporting;
    if (reportingFrequency !== undefined)
      settings.reportingFrequency = reportingFrequency;
    if (graceTimeForLateMarkingMinutes !== undefined)
      settings.graceTimeForLateMarkingMinutes = graceTimeForLateMarkingMinutes;

    // Save updated settings
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Attendance settings updated",
      data: settings,
    });
  } catch (error) {
    console.error("Error in updateAttendanceSettings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update attendance settings",
      error: error.message,
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
        message: "University code is required",
      });
    }

    // Parse dates with validation
    let start, end;
    try {
      start = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
      end = endDate ? new Date(endDate) : new Date();

      // Set time to beginning and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Validate date objects
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Build query
    const query = {
      universityCode,
      date: { $gte: start, $lte: end },
    };

    // Add class filter if provided
    if (classId) {
      query.class = classId;
    }

    // Get all attendance records for the date range
    const records = await AttendanceRecord.find(query)
      .populate("faculty", "name email")
      .populate("subject", "name code")
      .populate("class", "name year semester division");

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

      // Skip if missing required data
      if (!classId || !subjectId) continue;

      // Initialize class summary if it doesn't exist
      if (!classSummary[classId]) {
        classSummary[classId] = {
          id: classId,
          name: classObj.name,
          year: classObj.year,
          semester: classObj.semester,
          division: classObj.division,
          facultyCounts: new Set(),
          subjectBreakdown: {},
          totalClasses: 0,
          totalRecords: 0,
          attendanceRate: 0,
        };
      }

      // Track unique faculty
      if (record.faculty) {
        classSummary[classId].facultyCounts.add(record.faculty._id.toString());
      }

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
          attendanceRate: 0,
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
    Object.keys(classSummary).forEach((key) => {
      const summary = classSummary[key];

      // Count unique faculty
      summary.totalFaculty = summary.facultyCounts.size;
      delete summary.facultyCounts;

      // Calculate totals for each subject
      let totalClasses = 0;
      let totalRecords = 0;

      Object.values(summary.subjectBreakdown).forEach((subject) => {
        totalClasses += subject.totalClasses;
        totalRecords +=
          subject.present + subject.absent + subject.late + subject.excused;

        // Calculate attendance rate for each subject
        subject.attendanceRate =
          subject.totalClasses > 0
            ? (
                ((subject.present + subject.late + subject.excused) /
                  subject.totalClasses) *
                100
              ).toFixed(2)
            : 0;
      });

      summary.totalClasses = totalClasses;
      summary.totalRecords = totalRecords;
      summary.attendanceRate =
        totalRecords > 0
          ? (
              ((totalRecords -
                summary.subjectBreakdown.reduce(
                  (acc, subj) => acc + subj.absent,
                  0
                )) /
                totalRecords) *
              100
            ).toFixed(2)
          : 0;

      // Convert subject breakdown to array for easier consumption
      summary.subjects = Object.values(summary.subjectBreakdown);
      delete summary.subjectBreakdown;
    });

    return res.status(200).json({
      success: true,
      message: "Attendance reports retrieved",
      data: {
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
        classes: Object.values(classSummary),
      },
    });
  } catch (error) {
    console.error("Error in getAttendanceReports:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance reports",
      error: error.message,
    });
  }
};

/**
 * Get students with low attendance - replaced with faculty attendance report
 */
exports.getLowAttendanceStudents = async (req, res) => {
  try {
    // Return empty response as student functionality has been removed
    return res.status(200).json({
      success: true,
      message: "Student functionality has been removed",
      data: {
        students: [],
      },
    });
  } catch (error) {
    console.error("Error in getLowAttendanceStudents:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message,
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
        message: "Class ID is required",
      });
    }

    // Parse dates with validation
    let start, end;
    try {
      start = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      end = endDate ? new Date(endDate) : new Date();

      // Set time to beginning and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Validate date objects
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // This would typically generate a PDF or other report format
    // For now, just return a success message
    return res.status(200).json({
      success: true,
      message: "Attendance report generated",
      data: {
        reportUrl: `/reports/attendance_${classId}_${
          start.toISOString().split("T")[0]
        }_${end.toISOString().split("T")[0]}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error in generateAttendanceReport:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate attendance report",
      error: error.message,
    });
  }
};
