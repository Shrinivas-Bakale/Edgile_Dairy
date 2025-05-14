const express = require('express');
const router = express.Router();
const Faculty = require('../../models/Faculty');
const Student = require('../../models/Student');
const Admin = require('../../models/Admin');
const RegistrationLog = require('../../models/RegistrationLog');
const adminAuthMiddleware = require('../../middleware/adminAuthMiddleware');
const logger = require('../../utils/logger');
const registrationLogger = require('../../utils/registrationLogger');
const { validateAdmin } = require('../../middleware/auth');
const eventController = require('../../controllers/admin/eventController');
const { protect, adminOnly } = require('../../middleware/authMiddleware');
const coeController = require('../../controllers/admin/coeController');
const adminController = require('../../controllers/adminController');

// Import route files
const classroomRoutes = require('./classroomRoutes');
const subjectRoutes = require('./subjectRoutes');
const timetableRoutes = require('./timetableRoutes');
const facultyRoutes = require('./facultyRoutes');
const attendanceRoutes = require('./attendanceRoutes');

// Add public route for listing all published COEs (must be before any auth middleware)
router.get('/coes/published', coeController.listPublishedCOEs);
// Add public route for viewing a single COE by id
router.get('/coes/:id', coeController.getCOE);

// Protect all admin routes
router.use(adminAuthMiddleware);

// Debug middleware to log every request
router.use((req, res, next) => {
  console.log('[ADMIN ROUTER] Request URL:', req.originalUrl);
  console.log('[ADMIN ROUTER] Request method:', req.method);
  console.log('[ADMIN ROUTER] Request body:', req.body);
  console.log('[ADMIN ROUTER] Request query:', req.query);
  console.log('[ADMIN ROUTER] User:', req.user?.id);
  next();
});

// Apply authentication middleware to all routes
router.use(validateAdmin);

// Connect routes
router.use('/classrooms', classroomRoutes);
router.use('/subjects', subjectRoutes);
router.use('/timetable', timetableRoutes);
router.use('/faculty', facultyRoutes);
router.use('/attendance', attendanceRoutes);

// Event routes
router.get('/events', eventController.listEvents);
router.post('/events', eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);
router.patch('/events/:id/publish', eventController.setPublishState);
router.get('/events/download', eventController.downloadEvents);

// Get all faculty members for this university
router.get('/faculty', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const faculty = await Faculty.find({ university: admin._id })
      .select('-password -resetOTP -otpExpires')
      .sort({ createdAt: -1 });
    
    logger.info(`Retrieved ${faculty.length} faculty members for university: ${admin.universityName}`);
    
    res.json({ faculty });
  } catch (error) {
    logger.error(`Error retrieving faculty: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get all students for this university
router.get('/students', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const students = await Student.find({ university: admin._id })
      .select('-password -emailVerificationOTP -emailOtpExpires -otp -otpExpires')
      .sort({ createdAt: -1 });
    
    logger.info(`Retrieved ${students.length} students for university: ${admin.universityName}`);
    
    res.json({ students });
  } catch (error) {
    logger.error(`Error retrieving students: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get faculty by ID
router.get('/faculty/:id', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const faculty = await Faculty.findOne({ 
      _id: req.params.id,
      university: admin._id 
    }).select('-password -resetOTP -otpExpires');
    
    if (!faculty) {
      logger.warn(`Faculty not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Faculty not found' });
    }
    
    res.json({ faculty });
  } catch (error) {
    logger.error(`Error retrieving faculty: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get student by ID
router.get('/students/:id', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const student = await Student.findOne({ 
      _id: req.params.id,
      university: admin._id 
    }).select('-password -emailVerificationOTP -emailOtpExpires -otp -otpExpires');
    
    if (!student) {
      logger.warn(`Student not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Student not found' });
    }
    
    res.json({ student });
  } catch (error) {
    logger.error(`Error retrieving student: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Update faculty status
router.patch('/faculty/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const faculty = await Faculty.findOne({ 
      _id: req.params.id,
      university: admin._id 
    });
    
    if (!faculty) {
      logger.warn(`Faculty not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Faculty not found' });
    }
    
    faculty.status = status;
    await faculty.save();
    
    logger.info(`Updated faculty status: ${faculty.name} (${faculty.email}) set to ${status}`);
    
    res.json({ 
      msg: 'Faculty status updated successfully',
      faculty: {
        _id: faculty._id,
        name: faculty.name,
        status: faculty.status
      }
    });
  } catch (error) {
    logger.error(`Error updating faculty status: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Update student status
router.patch('/students/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'graduated'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const student = await Student.findOne({ 
      _id: req.params.id,
      university: admin._id 
    });
    
    if (!student) {
      logger.warn(`Student not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Student not found' });
    }
    
    student.status = status;
    await student.save();
    
    logger.info(`Updated student status: ${student.name} (${student.registerNumber}) set to ${status}`);
    
    res.json({ 
      msg: 'Student status updated successfully',
      student: {
        _id: student._id,
        name: student.name,
        status: student.status
      }
    });
  } catch (error) {
    logger.error(`Error updating student status: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get university information by code
router.get('/university-by-code/:universityCode', async (req, res) => {
  try {
    const { universityCode } = req.params;
    
    if (!universityCode) {
      return res.status(400).json({ success: false, message: 'University code is required' });
    }
    
    // The Admin model is already available in this file's scope
    const university = await Admin.findOne({ universityCode });
    
    if (!university) {
      // It's good practice to log this on the server for debugging
      logger.warn(`University not found with code: ${universityCode} by admin ${req.user?.id}`);
      return res.status(404).json({ success: false, message: 'University not found' });
    }
    
    res.status(200).json({
      success: true,
      university: {
        _id: university._id,
        name: university.name,         // Assuming Admin model has 'name' for the admin/university contact
        email: university.email,       // Admin's email
        universityName: university.universityName, // Actual name of the university
        universityCode: university.universityCode  // The code used for lookup
      }
    });
  } catch (error) {
    // Log the error on the server
    logger.error(`Error fetching university by code (${universityCode}): ${error.message}`, { error });
    res.status(500).json({ success: false, message: 'Server error while fetching university data', error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    const facultyCount = await Faculty.countDocuments({ university: admin._id });
    const activeFacultyCount = await Faculty.countDocuments({ 
      university: admin._id,
      status: 'active'
    });
    
    const studentCount = await Student.countDocuments({ university: admin._id });
    const activeStudentCount = await Student.countDocuments({ 
      university: admin._id,
      status: 'active'
    });
    const verifiedStudentCount = await Student.countDocuments({ 
      university: admin._id,
      isVerified: true
    });
    
    const stats = {
      university: {
        name: admin.universityName,
        code: admin.universityCode
      },
      faculty: {
        total: facultyCount,
        active: activeFacultyCount
      },
      students: {
        total: studentCount,
        active: activeStudentCount,
        verified: verifiedStudentCount
      }
    };
    
    logger.info(`Retrieved dashboard stats for university: ${admin.universityName}`);
    
    res.json({ stats });
  } catch (error) {
    logger.error(`Error retrieving dashboard stats: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get registration logs
router.get('/registration-logs', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    // Get query parameters
    const { role, limit = 50, sort = 'createdAt', order = 'desc' } = req.query;
    
    // Build query
    const query = { universityId: admin._id };
    if (role && ['faculty', 'student'].includes(role)) {
      query.userRole = role;
    }
    
    // Determine sort order
    const sortOrder = order === 'asc' ? 1 : -1;
    let sortOptions = {};
    
    // Set sorting based on role
    if (role === 'student' && sort === 'registerNumber') {
      sortOptions.registerNumber = sortOrder;
    } else if (role === 'faculty' && sort === 'employeeId') {
      sortOptions.employeeId = sortOrder;
    } else if (role === 'student' && sort === 'semester') {
      sortOptions.semester = sortOrder;
    } else {
      // Default sort by createdAt
      sortOptions.createdAt = sortOrder;
    }
    
    // Execute query
    const logs = await RegistrationLog.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit, 10));
    
    logger.info(`Retrieved ${logs.length} registration logs for university: ${admin.universityName}`);
    
    res.json({ logs });
  } catch (error) {
    logger.error(`Error retrieving registration logs: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get latest registrations for dashboard
router.get('/latest-registrations', async (req, res) => {
  try {
    // Admin ID is available from middleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    // Get latest faculty and student registrations
    const latest = await registrationLogger.getLatestRegistrationsByRole(admin._id);
    
    logger.info(`Retrieved latest registrations for university: ${admin.universityName}`);
    
    res.json({ 
      latest: {
        faculty: latest.faculty || null,
        student: latest.student || null
      } 
    });
  } catch (error) {
    logger.error(`Error retrieving latest registrations: ${error.message}`);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Test route for debugging
router.get('/students/test-route', (req, res) => {
  console.log('Test route hit');
  res.status(200).json({ message: 'Test route is working' });
});

// COE (Calendar of Events) routes
router.get('/coes', coeController.listCOEs);
router.post('/coes', coeController.createCOE);
router.put('/coes/:id', coeController.updateCOE);
router.delete('/coes/:id', coeController.deleteCOE);
router.patch('/coes/:id/publish', coeController.publishCOE);
router.patch('/coes/:id/unpublish', coeController.unpublishCOE);
// Festival/holiday suggestions
router.get('/festivals', coeController.getFestivals);
// Add public COE route
router.get('/coes/:id/public', coeController.getPublicCOE);

// Add the POST /students/promote route
router.post('/students/promote', adminController.promoteStudents);

// Add the POST /students/undo-promotion route with inline handler for debugging
router.post('/students/undo-promotion', async (req, res) => {
  console.log('Direct route handler for /students/undo-promotion called');
  
  try {
    // Call the actual controller function
    await adminController.undoPromotion(req, res);
  } catch (error) {
    console.error('Error in undo-promotion route handler:', error);
    res.status(500).json({ message: 'Server error in route handler', error: error.message });
  }
});

module.exports = router; 