const express = require('express');
const router = express.Router();
const studentRoutes = require('./studentRoutes');
const attendanceRoutes = require('./attendanceRoutes');

// Mount general student routes
router.use('/', studentRoutes);

// Mount attendance routes
router.use('/attendance', attendanceRoutes);

module.exports = router; 