const express = require('express');
const router = express.Router();
const facultyProfileRoutes = require('./profile');
const facultyRoutes = require('./facultyRoutes');
const attendanceRoutes = require('./attendanceRoutes');

// Mount profile routes
router.use('/profile', facultyProfileRoutes);

// Mount attendance routes
router.use('/attendance', attendanceRoutes);

// Mount general faculty routes
router.use('/', facultyRoutes);

module.exports = router; 