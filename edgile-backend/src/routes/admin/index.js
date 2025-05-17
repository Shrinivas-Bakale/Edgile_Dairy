const express = require("express");
const router = express.Router();
const Faculty = require("../../models/Faculty");
const Admin = require("../../models/Admin");
const RegistrationLog = require("../../models/RegistrationLog");
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const logger = require("../../utils/logger");
const registrationLogger = require("../../utils/registrationLogger");
const { validateAdmin } = require("../../middleware/auth");
const eventController = require("../../controllers/admin/eventController");
const { protect, adminOnly } = require("../../middleware/authMiddleware");
const coeController = require("../../controllers/admin/coeController");
const adminController = require("../../controllers/adminController");

// Import route files
const classroomRoutes = require("./classroomRoutes");
const subjectRoutes = require("./subjectRoutes");
const timetableRoutes = require("./timetableRoutes");
const facultyRoutes = require("./facultyRoutes");
const attendanceRoutes = require("./attendanceRoutes");

// Add public route for listing all published COEs (must be before any auth middleware)
router.get("/coes/published", coeController.listPublishedCOEs);
// Add public route for viewing a single COE by id
router.get("/coes/:id", coeController.getCOE);

// Protect all admin routes
router.use(adminAuthMiddleware);

// Debug middleware to log every request
router.use((req, res, next) => {
  console.log("[ADMIN ROUTER] Request URL:", req.originalUrl);
  console.log("[ADMIN ROUTER] Request method:", req.method);
  console.log("[ADMIN ROUTER] Request body:", req.body);
  console.log("[ADMIN ROUTER] Request query:", req.query);
  console.log("[ADMIN ROUTER] User:", req.user?.id);
  next();
});

// Apply authentication middleware to all routes
router.use(validateAdmin);

// Connect routes
router.use("/classrooms", classroomRoutes);
router.use("/subjects", subjectRoutes);
router.use("/timetable", timetableRoutes);
router.use("/faculty", facultyRoutes);
router.use("/attendance", attendanceRoutes);

// Event routes
router.get("/events", eventController.listEvents);
router.post("/events", eventController.createEvent);
router.put("/events/:id", eventController.updateEvent);
router.delete("/events/:id", eventController.deleteEvent);
router.patch("/events/:id/publish", eventController.setPublishState);
router.get("/events/download", eventController.downloadEvents);

// Get all faculty members for this university
router.get("/faculty", async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    const faculty = await Faculty.find({ university: admin._id })
      .select("-password -resetOTP -otpExpires")
      .sort({ createdAt: -1 });

    logger.info(
      `Retrieved ${faculty.length} faculty members for university: ${admin.universityName}`
    );

    res.json({ faculty });
  } catch (error) {
    logger.error(`Error retrieving faculty: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Get faculty by ID
router.get("/faculty/:id", async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    const faculty = await Faculty.findOne({
      _id: req.params.id,
      university: admin._id,
    }).select("-password -resetOTP -otpExpires");

    if (!faculty) {
      logger.warn(`Faculty not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: "Faculty not found" });
    }

    res.json({ faculty });
  } catch (error) {
    logger.error(`Error retrieving faculty: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Update faculty status
router.patch("/faculty/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    const faculty = await Faculty.findOne({
      _id: req.params.id,
      university: admin._id,
    });

    if (!faculty) {
      logger.warn(`Faculty not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: "Faculty not found" });
    }

    faculty.status = status;
    await faculty.save();

    logger.info(
      `Updated faculty status: ${faculty.name} (${faculty.email}) set to ${status}`
    );

    res.json({
      msg: "Faculty status updated successfully",
      faculty: {
        _id: faculty._id,
        name: faculty.name,
        status: faculty.status,
      },
    });
  } catch (error) {
    logger.error(`Error updating faculty status: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Get students for dashboard (empty array response)
router.get("/students", async (req, res) => {
  try {
    res.json({ students: [] });
  } catch (error) {
    logger.error(`Error in students endpoint: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Get student by ID (404 response)
router.get("/students/:id", async (req, res) => {
  try {
    return res.status(404).json({ msg: "Student functionality removed" });
  } catch (error) {
    logger.error(`Error in student/:id endpoint: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Update student status (404 response)
router.patch("/students/:id/status", async (req, res) => {
  try {
    return res.status(404).json({ msg: "Student functionality removed" });
  } catch (error) {
    logger.error(`Error in student status endpoint: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Get registration logs
router.get("/registration-logs", async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    const logs = await RegistrationLog.find({ university: admin._id })
      .sort({ createdAt: -1 })
      .limit(100);

    logger.info(
      `Retrieved ${logs.length} registration logs for university: ${admin.universityName}`
    );

    res.json({ logs });
  } catch (error) {
    logger.error(`Error retrieving registration logs: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Admin profile
router.get("/profile", async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    res.json({ admin });
  } catch (error) {
    logger.error(`Error retrieving admin profile: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Update admin profile
router.put("/profile", async (req, res) => {
  try {
    const { name, email, phone, universityName, universityWebsite } = req.body;

    // Find admin
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: "Admin not found" });
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (universityName) admin.universityName = universityName;
    if (universityWebsite) admin.universityWebsite = universityWebsite;

    await admin.save();

    logger.info(`Admin profile updated: ${admin.name} (${admin._id})`);

    res.json({
      msg: "Profile updated successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        universityName: admin.universityName,
        universityWebsite: admin.universityWebsite,
      },
    });
  } catch (error) {
    logger.error(`Error updating admin profile: ${error.message}`);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Certificate of Excellence (COE) routes
router.post("/coes", protect, adminOnly, coeController.createCOE);
router.get("/coes", protect, adminOnly, coeController.listCOEs);
router.put("/coes/:id", protect, adminOnly, coeController.updateCOE);
router.delete("/coes/:id", protect, adminOnly, coeController.deleteCOE);
router.patch("/coes/:id/publish", protect, adminOnly, coeController.publishCOE);
router.patch(
  "/coes/:id/unpublish",
  protect,
  adminOnly,
  coeController.unpublishCOE
);

// Admin stats
router.get("/stats/dashboard", adminController.getDashboardStats);
router.get("/stats/faculty", adminController.getFacultyStats);
router.get("/stats/courses", adminController.getCourseStats);
router.get("/stats/attendance", adminController.getAttendanceOverview);

module.exports = router;
