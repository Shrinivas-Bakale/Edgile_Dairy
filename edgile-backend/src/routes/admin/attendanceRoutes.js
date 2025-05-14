const express = require('express');
const router = express.Router();
const adminAttendanceController = require('../../controllers/adminAttendanceController');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply middleware to all routes to ensure admin authentication
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

// GET /api/admin/attendance/settings - Get attendance settings
router.get('/settings', adminAttendanceController.getAttendanceSettings);

// PUT /api/admin/attendance/settings - Update attendance settings
router.put('/settings', adminAttendanceController.updateAttendanceSettings);

// GET /api/admin/attendance/reports - Get attendance reports
router.get('/reports', adminAttendanceController.getAttendanceReports);

// GET /api/admin/attendance/low-attendance - Get students with low attendance
router.get('/low-attendance', adminAttendanceController.getLowAttendanceStudents);

// GET /api/admin/attendance/generate-report - Generate attendance report (PDF)
router.get('/generate-report', adminAttendanceController.generateAttendanceReport);

module.exports = router; 