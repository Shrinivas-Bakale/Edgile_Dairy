const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Classroom = require('../../models/Classroom');
const ClassroomUnavailability = require('../../models/ClassroomUnavailability');
const Admin = require('../../models/Admin');
const adminAuthMiddleware = require('../../middleware/adminAuthMiddleware');
const logger = require('../../utils/logger');
const { validateAdmin } = require('../../middleware/auth');
const ClassroomAssignment = require('../../models/ClassroomAssignment');
const { getCurrentAcademicYear, isValidAcademicYear } = require('../../utils/academicYear');

// Add a global request tracer middleware before any other middleware
router.use((req, res, next) => {
  console.log('--------------------------------------------------');
  console.log(`[ROUTE TRACER] ${req.method} ${req.originalUrl}`);
  console.log(`[ROUTE TRACER] Query params:`, req.query);
  console.log(`[ROUTE TRACER] Route params:`, req.params);
  console.log(`[ROUTE TRACER] Auth user:`, req.user ? req.user.id : 'none');
  console.log('--------------------------------------------------');
  next();
});

// Protect all classroom routes with just one middleware
// Comment out the redundant middleware to avoid conflicts
router.use(adminAuthMiddleware);
// router.use(validateAdmin);  // This creates duplicate checks and confusion

// For debugging - log requests
router.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl} - User ID: ${req.user?.id}`);
  next();
});

// Add this test route first - it should be matched before any other route
router.get('/test-route', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Test route is working',
    timestamp: new Date().toISOString(),
    query: req.query,
    user: req.user || null
  });
});

// Add this debug route second - it should be matched before other routes
router.get('/debug-auth', (req, res) => {
  console.log('[TRACE] Debug route matched');
  return res.status(200).json({
    success: true,
    message: 'Authentication is working',
    user: req.user,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Test route to verify authentication
router.get('/test-auth', (req, res) => {
  console.log('===== TEST AUTH ROUTE =====');
  console.log('User object:', req.user);
  
  // Check if user is present
  if (!req.user) {
    console.log('No user object in request - auth failed');
    return res.status(401).json({
      success: false,
      message: 'Authentication failed - no user object'
    });
  }
  
  // Check user ID
  if (!req.user.id) {
    console.log('User object missing ID - auth incomplete');
    return res.status(401).json({
      success: false,
      message: 'Authentication failed - user ID missing'
    });
  }
  
  // Auth success
  console.log('Authentication successful for user:', req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Authentication successful',
    userId: req.user.id,
    role: req.user.role || 'unknown'
  });
});

// Get available classrooms - must be before the ID route
router.get('/available-classrooms', async (req, res) => {
  try {
    const { university, academicYear } = req.query;
    
    // For debugging
    logger.info(`Fetching available classrooms: university=${university}, academicYear=${academicYear}`);
    console.log(`[DEBUG] Fetching available classrooms: university=${university}, academicYear=${academicYear}`);
    
    // Get admin's university ID if not provided
    let universityId = university;
    if (!universityId) {
      const admin = await Admin.findById(req.user.id);
      if (admin) {
        universityId = admin._id;
        logger.info(`Using admin's university ID: ${universityId}`);
      }
    }
    
    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: 'University ID is required'
      });
    }
    
    // Get current academic year if not provided
    const currentAcademicYear = academicYear || getCurrentAcademicYear();
    
    // Find all classrooms for this university
    const allClassrooms = await Classroom.find({ university: universityId });
    
    // If ClassroomAssignment model exists, filter out assigned classrooms
    let availableClassrooms = allClassrooms;
    try {
      const assignedClassrooms = await ClassroomAssignment.find({
        academicYear: currentAcademicYear
      }).distinct('classroom');
      
      availableClassrooms = allClassrooms.filter(
        classroom => !assignedClassrooms.includes(classroom._id)
      );
    } catch (error) {
      // If ClassroomAssignment model doesn't exist, use all classrooms
      logger.warn('ClassroomAssignment model not found, using all classrooms');
    }
    
    logger.info(`Found ${availableClassrooms.length} available classrooms for university ${universityId}`);
    
    return res.status(200).json({
      success: true,
      data: availableClassrooms
    });
  } catch (error) {
    logger.error(`Error fetching available classrooms: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching available classrooms',
      error: error.message
    });
  }
});

// Get all classrooms
router.get('/', async (req, res) => {
  try {
    console.log('===== GET /api/admin/classrooms =====');
    console.log('Request from user:', req.user?.id);
    const { university } = req.query;
    
    // For debugging
    console.log(`Fetching all classrooms: university=${university}`);
    logger.info(`Fetching all classrooms: university=${university}`);
    
    // Get admin's university ID if not provided
    let universityId = university;
    if (!universityId) {
      console.log('University ID not provided, looking up admin data');
      const admin = await Admin.findById(req.user.id);
      console.log('Admin from database:', admin ? 'found' : 'not found');
      
      if (admin) {
        universityId = admin._id;
        console.log(`Using admin's university ID: ${universityId}`);
        logger.info(`Using admin's university ID: ${universityId}`);
      }
    }
    
    if (!universityId) {
      console.log('No university ID available, returning 400');
      return res.status(400).json({
        success: false,
        message: 'University ID is required'
      });
    }
    
    // Find all classrooms for this university
    console.log(`Finding classrooms for university: ${universityId}`);
    const classrooms = await Classroom.find({ university: universityId })
      .sort({ name: 1 });
    
    console.log(`Found ${classrooms.length} classrooms for university ${universityId}`);
    logger.info(`Found ${classrooms.length} classrooms for university ${universityId}`);
    
    const responseData = {
      success: true,
      data: classrooms
    };
    console.log(`Sending response with ${classrooms.length} classrooms`);
    console.log('===== END GET /api/admin/classrooms =====');
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    logger.error(`Error fetching classrooms: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching classrooms',
      error: error.message
    });
  }
});

// Get classroom by ID - must be after the available-classrooms route
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // For debugging
    logger.info(`Fetching classroom by ID: ${id}`);
    
    const classroom = await Classroom.findById(id);
    
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    logger.error(`Error fetching classroom: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching classroom',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/classrooms
 * @desc Get all classrooms for this university with optional filtering
 */
router.get('/classrooms', async (req, res) => {
  try {
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ msg: 'Admin not found' });
    }
    
    // Extract query parameters for filtering
    const { floor, status, capacity, name } = req.query;
    
    // Build the filter criteria
    const filter = { university: admin._id };
    
    if (floor) filter.floor = Number(floor);
    if (status) filter.status = status;
    if (capacity) filter.capacity = { $gte: Number(capacity) };
    if (name) filter.name = { $regex: name, $options: 'i' };
    
    // Find classrooms with the filter
    const classrooms = await Classroom.find(filter)
      .sort({ floor: 1, name: 1 })
      .lean();
    
    logger.info(`Retrieved ${classrooms.length} classrooms for university: ${admin.universityName}`);
    
    res.json({ success: true, classrooms });
  } catch (error) {
    logger.error(`Error retrieving classrooms: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/admin/classrooms
 * @desc Create a new classroom
 */
router.post('/classrooms', async (req, res) => {
  try {
    console.log('[DEBUG] POST /api/admin/classrooms - body:', req.body);
    
    let { name, floor, capacity, university } = req.body;
    
    // Validate input
    if (!name || !floor || !capacity) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Please provide name, floor, and capacity' 
      });
    }
    
    // Validate positive numbers
    if (floor < 1 || capacity < 1) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Floor and capacity must be positive numbers' 
      });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }

    // Use university from request if provided, otherwise use admin's university
    if (!university) {
      university = admin._id;
      console.log(`[DEBUG] University not provided in request, using admin's university: ${university}`);
    }
    
    // Ensure university is not null or undefined
    if (!university) {
      return res.status(400).json({ 
        success: false, 
        msg: 'University ID is required' 
      });
    }
    
    // Check if name is unique within this university
    const existingClassroom = await Classroom.findOne({ 
      name, 
      university
    });
    
    if (existingClassroom) {
      return res.status(400).json({ 
        success: false, 
        msg: 'A classroom with this name already exists' 
      });
    }
    
    // Create the new classroom
    const classroom = new Classroom({
      name,
      floor,
      capacity,
      university,
      universityCode: admin.universityCode,
      universityName: admin.universityName,
      createdBy: admin._id,
      status: 'available'
    });
    
    await classroom.save();
    
    logger.info(`New classroom created: ${name} by admin: ${admin.name}`);
    
    res.status(201).json({ 
      success: true, 
      msg: 'Classroom created successfully', 
      classroom 
    });
  } catch (error) {
    logger.error(`Error creating classroom: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/admin/classrooms/:id
 * @desc Get a specific classroom by ID
 */
router.get('/classrooms/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Invalid classroom ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find the classroom
    const classroom = await Classroom.findOne({ 
      _id: req.params.id,
      university: admin._id 
    });
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, msg: 'Classroom not found' });
    }
    
    res.json({ success: true, classroom });
  } catch (error) {
    logger.error(`Error retrieving classroom: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route PUT /api/admin/classrooms/:id
 * @desc Update a classroom
 */
router.put('/classrooms/:id', async (req, res) => {
  try {
    const { name, floor, capacity, status } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Invalid classroom ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Check if classroom exists
    let classroom = await Classroom.findOne({ 
      _id: req.params.id,
      university: admin._id 
    });
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, msg: 'Classroom not found' });
    }
    
    // Check if new name is unique (if name is being updated)
    if (name && name !== classroom.name) {
      const existingClassroom = await Classroom.findOne({ 
        name, 
        university: admin._id,
        _id: { $ne: req.params.id }
      });
      
      if (existingClassroom) {
        return res.status(400).json({ 
          success: false, 
          msg: 'A classroom with this name already exists' 
        });
      }
    }
    
    // Update fields
    if (name) classroom.name = name;
    if (floor) classroom.floor = floor;
    if (capacity) classroom.capacity = capacity;
    if (status && ['available', 'unavailable', 'maintenance'].includes(status)) {
      classroom.status = status;
    }
    
    classroom.updatedAt = Date.now();
    
    await classroom.save();
    
    logger.info(`Classroom updated: ${classroom.name} by admin: ${admin.name}`);
    
    res.json({ 
      success: true, 
      msg: 'Classroom updated successfully', 
      classroom 
    });
  } catch (error) {
    logger.error(`Error updating classroom: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route DELETE /api/admin/classrooms/:id
 * @desc Delete a classroom
 */
router.delete('/classrooms/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Invalid classroom ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Check if classroom exists
    const classroom = await Classroom.findOne({ 
      _id: req.params.id,
      university: admin._id 
    });
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, msg: 'Classroom not found' });
    }
    
    // Check if classroom has any unavailability records
    const unavailabilityCount = await ClassroomUnavailability.countDocuments({
      classroom: classroom._id
    });
    
    if (unavailabilityCount > 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Cannot delete classroom with existing unavailability records' 
      });
    }
    
    // Delete the classroom
    await classroom.remove();
    
    logger.info(`Classroom deleted: ${classroom.name} by admin: ${admin.name}`);
    
    res.json({ 
      success: true, 
      msg: 'Classroom deleted successfully' 
    });
  } catch (error) {
    logger.error(`Error deleting classroom: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/admin/classroom-unavailability
 * @desc Get all classroom unavailability records
 */
router.get('/classroom-unavailability', async (req, res) => {
  try {
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find unavailability records
    const records = await ClassroomUnavailability.find({ university: admin._id })
      .populate('classroom', 'name floor capacity')
      .populate('substituteClassroom', 'name floor capacity')
      .sort({ startDate: -1 });
    
    logger.info(`Retrieved ${records.length} classroom unavailability records for university: ${admin.universityName}`);
    
    res.json({ success: true, records });
  } catch (error) {
    logger.error(`Error retrieving classroom unavailability records: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/admin/classroom-unavailability
 * @desc Mark a classroom as unavailable
 */
router.post('/classroom-unavailability', async (req, res) => {
  try {
    const { classroomId, startDate, endDate, reason, substituteClassroomId } = req.body;
    
    // Validate input
    if (!classroomId || !startDate) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Please provide classroom ID and start date' 
      });
    }
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({ success: false, msg: 'Invalid classroom ID' });
    }
    
    if (substituteClassroomId && !mongoose.Types.ObjectId.isValid(substituteClassroomId)) {
      return res.status(400).json({ success: false, msg: 'Invalid substitute classroom ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Check if classroom exists
    const classroom = await Classroom.findOne({ 
      _id: classroomId,
      university: admin._id 
    });
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${classroomId}`);
      return res.status(404).json({ success: false, msg: 'Classroom not found' });
    }
    
    // Check substitute classroom if provided
    let substituteClassroom = null;
    if (substituteClassroomId) {
      substituteClassroom = await Classroom.findOne({ 
        _id: substituteClassroomId,
        university: admin._id 
      });
      
      if (!substituteClassroom) {
        logger.warn(`Substitute classroom not found with ID: ${substituteClassroomId}`);
        return res.status(404).json({ success: false, msg: 'Substitute classroom not found' });
      }
      
      // Check if substitute classroom has sufficient capacity
      if (substituteClassroom.capacity < classroom.capacity) {
        logger.warn(`Substitute classroom ${substituteClassroom.name} has insufficient capacity`);
        return res.status(400).json({ 
          success: false, 
          msg: 'Substitute classroom has insufficient capacity' 
        });
      }
      
      // Check if substitute classroom is available
      if (substituteClassroom.status !== 'available') {
        logger.warn(`Substitute classroom ${substituteClassroom.name} is not available`);
        return res.status(400).json({ 
          success: false, 
          msg: 'Substitute classroom is not available' 
        });
      }
    }
    
    // Create the unavailability record
    const unavailability = new ClassroomUnavailability({
      classroom: classroom._id,
      classroomName: classroom.name,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isOpenEnded: !endDate,
      reason: reason || 'Maintenance',
      substituteClassroom: substituteClassroom ? substituteClassroom._id : null,
      substituteClassroomName: substituteClassroom ? substituteClassroom.name : null,
      university: admin._id,
      universityCode: admin.universityCode,
      createdBy: admin._id,
      createdByName: admin.name
    });
    
    await unavailability.save();
    
    // Update classroom status
    classroom.status = 'unavailable';
    await classroom.save();
    
    logger.info(`Classroom marked unavailable: ${classroom.name} by admin: ${admin.name}`);
    
    res.status(201).json({ 
      success: true, 
      msg: 'Classroom marked as unavailable successfully', 
      unavailability 
    });
  } catch (error) {
    logger.error(`Error marking classroom as unavailable: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/admin/classrooms/occupancy
 * @desc Get real-time classroom occupancy data
 */
router.get('/classrooms/occupancy', async (req, res) => {
  try {
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Log the university ID we're using to query
    logger.info(`Getting classrooms for university ID: ${admin._id}`);
    
    // Check if university ID is valid
    if (!admin._id || !mongoose.Types.ObjectId.isValid(admin._id)) {
      logger.error(`Invalid university ID: ${admin._id}`);
      return res.status(400).json({ success: false, msg: 'Invalid university ID' });
    }
    
    try {
      // Get all classrooms - wrap in separate try/catch to isolate database issues
      const classrooms = await Classroom.find({ university: admin._id })
        .select('name floor capacity status')
        .lean();
      
      logger.info(`Found ${classrooms.length} classrooms for university ID: ${admin._id}`);
      
      if (!classrooms || classrooms.length === 0) {
        // Return empty data instead of error if no classrooms found
        return res.json({ 
          success: true, 
          occupancyData: [] 
        });
      }
      
      // Get current unavailability records
      const currentDate = new Date();
      const unavailabilityRecords = await ClassroomUnavailability.find({
        university: admin._id,
        $or: [
          { startDate: { $lte: currentDate }, endDate: { $gte: currentDate } },
          { startDate: { $lte: currentDate }, endDate: null }
        ]
      }).lean();
      
      // Create a map of unavailable classrooms
      const unavailableClassroomMap = {};
      unavailabilityRecords.forEach(record => {
        if (record.classroom) {
          unavailableClassroomMap[record.classroom.toString()] = {
            substituteClassroomId: record.substituteClassroom,
            substituteClassroomName: record.substituteClassroomName,
            reason: record.reason
          };
        }
      });
      
      // Get current day and time
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentHour = now.getHours();
      
      // Format the result - For now using mock timetable data until timetable integration
      const occupancyData = classrooms.map(classroom => {
        // Protect against null/undefined classroom._id
        if (!classroom || !classroom._id) {
          return null;
        }
        
        const classroomId = classroom._id.toString();
        const isUnavailable = classroom.status === 'unavailable' || 
                             unavailableClassroomMap[classroomId];
        
        // Mock data - would be replaced with actual timetable integration
        // This is where you would query your timetable collection in the future
        
        let occupiedBy = null;
        let batch = null;
        let occupancyPercentage = 0;
        
        // Only generate mock data if classroom is available
        if (!isUnavailable) {
          // Weekday between 9am and 5pm has higher chance of occupation
          const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
          const isWorkingHours = currentHour >= 9 && currentHour <= 17;
          
          // Determine if classroom is occupied based on time and random factor
          const baseOccupationChance = isWeekday && isWorkingHours ? 0.7 : 0.1;
          const randomFactor = Math.random();
          const isOccupied = randomFactor < baseOccupationChance;
          
          if (isOccupied) {
            // Create mock data for occupied classrooms
            const randomBatchYear = Math.floor(Math.random() * 4) + 1; // 1st to 4th year
            const departments = ['CS', 'ECE', 'ME', 'CE', 'EE'];
            const randomDept = departments[Math.floor(Math.random() * departments.length)];
            const sections = ['A', 'B', 'C'];
            const randomSection = sections[Math.floor(Math.random() * sections.length)];
            
            batch = `${randomDept} ${randomBatchYear} ${randomSection}`;
            
            const subjects = [
              'Data Structures', 'Algorithms', 'Database Systems', 
              'Operating Systems', 'Computer Networks', 'Machine Learning',
              'Digital Electronics', 'Signals & Systems', 'Control Systems',
              'Fluid Mechanics', 'Thermodynamics', 'Structural Analysis'
            ];
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            
            occupiedBy = `${batch} - ${randomSubject}`;
            occupancyPercentage = Math.floor(Math.random() * 40) + 60; // between 60% and 100%
          }
        }
        
        return {
          id: classroomId,
          name: classroom.name,
          floor: classroom.floor,
          capacity: classroom.capacity,
          status: isUnavailable ? 'unavailable' : (occupiedBy ? 'occupied' : 'available'),
          occupiedBy,
          batch,
          unavailabilityInfo: unavailableClassroomMap[classroomId] || null,
          occupancyPercentage // Keep for backward compatibility
        };
      }).filter(item => item !== null); // Remove any null items
      
      logger.info(`Retrieved occupancy data for ${occupancyData.length} classrooms`);
      
      return res.json({ success: true, occupancyData });
    } catch (dbError) {
      logger.error(`Database error fetching classrooms: ${dbError.message}`);
      return res.status(500).json({ 
        success: false, 
        msg: 'Database error fetching classrooms', 
        error: dbError.message 
      });
    }
  } catch (error) {
    logger.error(`Error retrieving classroom occupancy: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    return res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/admin/classrooms/suggestions
 * @desc Get smart suggestions for substitute classrooms
 */
router.get('/classrooms/suggestions', async (req, res) => {
  try {
    const { classroomId, startDate, endDate } = req.query;
    
    // Validate input
    if (!classroomId || !startDate) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Please provide classroom ID and start date' 
      });
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({ success: false, msg: 'Invalid classroom ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Get the target classroom
    const classroom = await Classroom.findOne({ 
      _id: classroomId,
      university: admin._id 
    });
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${classroomId}`);
      return res.status(404).json({ success: false, msg: 'Classroom not found' });
    }
    
    // Parse dates
    const targetStartDate = new Date(startDate);
    const targetEndDate = endDate ? new Date(endDate) : null;
    
    // Get unavailable classroom IDs for the given date range
    const unavailableClassroomIds = await ClassroomUnavailability.find({
      university: admin._id,
      $or: [
        // Case 1: Start date falls within an unavailability period
        { 
          startDate: { $lte: targetStartDate },
          $or: [
            { endDate: { $gte: targetStartDate } },
            { endDate: null } // Open-ended unavailability
          ]
        },
        // Case 2: End date falls within an unavailability period
        {
          startDate: { $lte: targetEndDate || targetStartDate },
          $or: [
            { endDate: { $gte: targetEndDate || targetStartDate } },
            { endDate: null } // Open-ended unavailability
          ]
        },
        // Case 3: Unavailability period falls completely within requested period
        {
          startDate: { $gte: targetStartDate },
          endDate: { $lte: targetEndDate || targetStartDate }
        }
      ]
    }).distinct('classroom');
    
    // Find suitable substitute classrooms
    const suitableClassrooms = await Classroom.find({
      university: admin._id,
      _id: { $ne: classroomId, $nin: unavailableClassroomIds },
      capacity: { $gte: classroom.capacity },
      status: 'available'
    }).sort({ 
      floor: 1, // Sort by proximity to original floor
      capacity: 1  // Then by smallest sufficient capacity
    });
    
    // Calculate distance from original floor
    const suggestedClassrooms = suitableClassrooms.map(suitable => {
      const floorDistance = Math.abs(suitable.floor - classroom.floor);
      const capacityDifference = suitable.capacity - classroom.capacity;
      
      return {
        id: suitable._id,
        name: suitable.name,
        floor: suitable.floor,
        capacity: suitable.capacity,
        floorDistance,
        capacityDifference,
        score: floorDistance * 2 + (capacityDifference / 10) // Lower score is better
      };
    });
    
    // Sort by score (best matches first)
    suggestedClassrooms.sort((a, b) => a.score - b.score);
    
    logger.info(`Found ${suggestedClassrooms.length} substitute suggestions for classroom: ${classroom.name}`);
    
    res.json({ 
      success: true, 
      suggestions: suggestedClassrooms.slice(0, 5) // Return top 5 suggestions
    });
  } catch (error) {
    logger.error(`Error finding substitute suggestions: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route PUT /api/admin/classroom-unavailability/:id
 * @desc Update a classroom unavailability record
 */
router.put('/classroom-unavailability/:id', async (req, res) => {
  try {
    const { endDate, reason, substituteClassroomId } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Invalid unavailability ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find the unavailability record
    const unavailability = await ClassroomUnavailability.findOne({
      _id: req.params.id,
      university: admin._id
    });
    
    if (!unavailability) {
      logger.warn(`Unavailability record not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, msg: 'Unavailability record not found' });
    }
    
    // Check substitute classroom if provided
    if (substituteClassroomId) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(substituteClassroomId)) {
        return res.status(400).json({ success: false, msg: 'Invalid substitute classroom ID' });
      }
      
      const substituteClassroom = await Classroom.findOne({ 
        _id: substituteClassroomId,
        university: admin._id 
      });
      
      if (!substituteClassroom) {
        logger.warn(`Substitute classroom not found with ID: ${substituteClassroomId}`);
        return res.status(404).json({ success: false, msg: 'Substitute classroom not found' });
      }
      
      unavailability.substituteClassroom = substituteClassroom._id;
      unavailability.substituteClassroomName = substituteClassroom.name;
    }
    
    // Update fields
    if (endDate !== undefined) {
      unavailability.endDate = endDate ? new Date(endDate) : null;
      unavailability.isOpenEnded = !endDate;
    }
    if (reason) unavailability.reason = reason;
    
    unavailability.updatedAt = Date.now();
    
    await unavailability.save();
    
    logger.info(`Unavailability record updated for classroom: ${unavailability.classroomName}`);
    
    res.json({ 
      success: true, 
      msg: 'Unavailability record updated successfully', 
      unavailability 
    });
  } catch (error) {
    logger.error(`Error updating unavailability record: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route DELETE /api/admin/classroom-unavailability/:id
 * @desc Remove a classroom unavailability record
 */
router.delete('/classroom-unavailability/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, msg: 'Invalid unavailability ID' });
    }
    
    // Get admin details from middleware
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find the unavailability record
    const unavailability = await ClassroomUnavailability.findOne({
      _id: req.params.id,
      university: admin._id
    });
    
    if (!unavailability) {
      logger.warn(`Unavailability record not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, msg: 'Unavailability record not found' });
    }
    
    // Get the classroom
    const classroom = await Classroom.findById(unavailability.classroom);
    
    // Delete the unavailability record
    await unavailability.remove();
    
    // Check if there are any remaining unavailability records for this classroom
    const remainingUnavailability = await ClassroomUnavailability.findOne({
      classroom: unavailability.classroom,
      $or: [
        { startDate: { $lte: new Date() }, endDate: { $gte: new Date() } },
        { startDate: { $lte: new Date() }, endDate: null }
      ]
    });
    
    // If no remaining unavailability and classroom exists, update its status
    if (!remainingUnavailability && classroom) {
      classroom.status = 'available';
      await classroom.save();
    }
    
    logger.info(`Unavailability record deleted for classroom: ${unavailability.classroomName}`);
    
    res.json({ 
      success: true, 
      msg: 'Unavailability record removed successfully' 
    });
  } catch (error) {
    logger.error(`Error deleting unavailability record: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: error.message 
    });
  }
});

// Get available classrooms - this will be available at /api/admin/classrooms/available
router.get('/classrooms/available', async (req, res) => {
  try {
    console.log('GET /available-classrooms endpoint hit');
    const { university, academicYear } = req.query;

    console.log('Request parameters:', {
      university,
      academicYear,
      user: req.user?.id,
      admin: req.admin?._id
    });

    // Validate required parameters
    if (!university || !academicYear) {
      console.log('Missing required parameters');
      return res.status(400).json({
        success: false,
        message: 'University and academic year are required'
      });
    }

    // Validate university ID format
    if (!mongoose.Types.ObjectId.isValid(university)) {
      console.log('Invalid university ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid university ID format'
      });
    }

    // Get all classrooms for this university
    console.log('Fetching classrooms');
    const classrooms = await Classroom.find({ university });
    console.log(`Found ${classrooms.length} classrooms`);

    // Get classrooms that are already assigned for this academic year
    const assignedClassrooms = await ClassroomAssignment.find({
      university,
      academicYear
    });
    console.log(`Found ${assignedClassrooms.length} assigned classrooms`);

    // Filter out already assigned classrooms
    const availableClassrooms = classrooms.filter(
      classroom => !assignedClassrooms.some(
        assignment => assignment.classroom.toString() === classroom._id.toString()
      )
    );
    console.log(`Found ${availableClassrooms.length} available classrooms`);

    return res.status(200).json({
      success: true,
      data: availableClassrooms
    });
  } catch (error) {
    console.error('Error in available-classrooms route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching available classrooms',
      error: error.message
    });
  }
});

// Update the router.param middleware to be more precise and add debugging
router.param('id', (req, res, next, id) => {
  console.log(`[PARAM MIDDLEWARE] Checking ID parameter: "${id}"`);
  
  // Don't apply this middleware to routes that start with certain paths
  const url = req.originalUrl;
  if (url.includes('/classrooms/') || url.includes('/available-classrooms-list')) {
    console.log(`[PARAM MIDDLEWARE] Skipping for route: ${url}`);
    return next();
  }
  
  // Skip ID routes if the ID is 'classrooms' (conflicts with /classrooms/* routes)
  if (id === 'classrooms') {
    console.log('[PARAM MIDDLEWARE] Detected "classrooms" as an ID - this is likely a route conflict');
    return res.status(404).json({
      success: false,
      msg: 'Invalid route. Use /api/admin/classrooms instead of /api/admin/classrooms'
    });
  }
  
  // Now verify that the ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`[PARAM MIDDLEWARE] Invalid ObjectId: "${id}"`);
    return res.status(400).json({
      success: false,
      msg: 'Invalid classroom ID'
    });
  }
  
  // Otherwise proceed with the ID route
  console.log(`[PARAM MIDDLEWARE] Valid ID: "${id}"`);
  next();
});

// Update the /:id route with better debugging and error handling
router.get('/:id', async (req, res, next) => {
  const id = req.params.id;
  console.log(`[ID ROUTE] Processing GET request for ID: "${id}"`);
  
  // Skip this route handler for certain paths
  if (id === 'classrooms' || id === 'available-classrooms-list' || id === 'debug-auth' || id === 'test-route') {
    console.log(`[ID ROUTE] Skipping handling for special path: ${id}`);
    return next();
  }
  
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[ID ROUTE] Invalid classroom ID: "${id}"`);
      return res.status(400).json({
        success: false,
        msg: `Invalid classroom ID: "${id}"`
      });
    }

    console.log(`[ID ROUTE] Finding classroom with ID: "${id}"`);
    const classroom = await Classroom.findById(id);

    if (!classroom) {
      console.log(`[ID ROUTE] Classroom not found: "${id}"`);
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    console.log(`[ID ROUTE] Successfully found classroom: "${classroom.name}"`);
    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    console.error(`[ID ROUTE] Error processing request:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching classroom',
      error: error.message
    });
  }
});

// Create a new classroom
router.post('/', async (req, res) => {
  try {
    console.log('[DEBUG] POST /api/admin/classrooms root route - body:', req.body);
    
    let { name, capacity, building, floor, university } = req.body;
    
    // Validate required fields
    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name and capacity are required'
      });
    }

    // If university is not provided, get it from the admin user
    if (!university) {
      const admin = await Admin.findById(req.user?.id);
      if (admin) {
        university = admin._id;
        console.log('[DEBUG] Using university from admin:', university);
      }
    }

    // Ensure university is not null or undefined
    if (!university) {
      return res.status(400).json({ 
        success: false, 
        message: 'University ID is required' 
      });
    }
    
    // Check if a classroom with the same name already exists in this university
    const existingClassroom = await Classroom.findOne({ 
      name, 
      university 
    });
    
    if (existingClassroom) {
      return res.status(400).json({ 
        success: false, 
        message: `A classroom with the name "${name}" already exists` 
      });
    }

    const classroom = new Classroom({
      name,
      capacity,
      building,
      floor,
      university,
      status: 'available'
    });

    await classroom.save();

    return res.status(201).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    logger.error(`Error creating classroom: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error creating classroom',
      error: error.message
    });
  }
});

// Update a classroom
router.put('/:id', async (req, res) => {
  try {
    const { name, capacity, building, floor } = req.body;

    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { name, capacity, building, floor },
      { new: true }
    );

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    logger.error(`Error updating classroom: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating classroom'
    });
  }
});

// Delete a classroom
router.delete('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Classroom deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting classroom: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error deleting classroom'
    });
  }
});

// Add a special middleware just for handling /classrooms paths 
// This should appear before the param middleware
router.use((req, res, next) => {
  const url = req.originalUrl;
  
  // If the URL contains /classrooms, print a detailed log and ensure it doesn't get misinterpreted
  if (url.includes('/classrooms')) {
    console.log(`[CLASSROOMS MIDDLEWARE] Processing path with /classrooms: ${url}`);
    
    // If this exact URL is being accessed and we don't have a handler for it,
    // we should still prevent it from falling through to the /:id handler
    if (url.endsWith('/classrooms') && req.method === 'GET') {
      console.log(`[CLASSROOMS MIDDLEWARE] Handling /classrooms directly`);
      // Just return all classrooms
      Classroom.find({})
        .then(classrooms => {
          return res.status(200).json({
            success: true,
            data: classrooms,
            note: 'This is from the special middleware handler'
          });
        })
        .catch(err => {
          return res.status(500).json({
            success: false,
            msg: 'Error retrieving classrooms',
            error: err.message
          });
        });
      return; // Don't call next() - we've handled the request
    }
  }
  
  next();
});

// Add a master route handler at the top that explicitly matches paths instead of relying on Express's router
// This should appear after all middleware but before specific routes
router.use((req, res, next) => {
  const path = req.path;
  const method = req.method;
  
  console.log(`[MASTER HANDLER] Processing ${method} ${path}`);
  
  // Special cases that cause problems
  if (method === 'GET') {
    
    // Explicitly match the problematic routes
    if (path === '/classrooms/available') {
      console.log(`[MASTER HANDLER] Matched /classrooms/available`);
      
      try {
        const { university, academicYear } = req.query;
        
        // Handle validation
        if (!university || !academicYear) {
          return res.status(400).json({
            success: false,
            msg: 'University and academic year are required'
          });
        }
        
        if (!mongoose.Types.ObjectId.isValid(university)) {
          return res.status(400).json({
            success: false,
            msg: 'Invalid university ID format'
          });
        }
        
        // Run the actual query
        Classroom.find({ university })
          .then(classrooms => {
            return res.status(200).json({
              success: true,
              data: classrooms,
              note: 'From master handler'
            });
          })
          .catch(err => {
            return res.status(500).json({
              success: false,
              msg: 'Error fetching classrooms',
              error: err.message
            });
          });
        
        // Don't continue to other routes
        return;
      } catch (error) {
        console.error('[MASTER HANDLER] Error handling /classrooms/available:', error);
        return res.status(500).json({
          success: false,
          msg: 'Server error processing request',
          error: error.message
        });
      }
    }
    
    // Add other problematic paths here...
  }
  
  // If not handled, proceed to normal router
  next();
});

// Add a standard format route for available classrooms
router.get('/available', async (req, res) => {
  try {
    console.log('[DEBUG] GET /api/admin/classrooms/available hit');
    let { university, academicYear } = req.query;

    console.log('[DEBUG] Query parameters:', req.query);
    console.log('[DEBUG] User/Admin context:', { 
      user: req.user?.id,
      admin: req.admin?._id 
    });

    // If university is not provided, get it from the admin user
    if (!university) {
      const admin = await Admin.findById(req.user?.id);
      if (admin) {
        university = admin._id;
        console.log('[DEBUG] Using university from admin:', university);
      }
    }

    // If academicYear is not provided or invalid, use the current academic year
    if (!academicYear || !isValidAcademicYear(academicYear)) {
      academicYear = getCurrentAcademicYear();
      console.log('[DEBUG] Using calculated academicYear:', academicYear);
    }

    // Validate required parameters
    if (!university) {
      return res.status(400).json({
        success: false,
        message: 'University is required. Please provide it in the request.'
      });
    }

    // Validate university ID format
    if (!mongoose.Types.ObjectId.isValid(university)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid university ID format'
      });
    }

    // Find all classrooms for this university
    const classrooms = await Classroom.find({ university });
    console.log(`[DEBUG] Found ${classrooms.length} total classrooms for university ${university}`);

    // If no ClassroomAssignment model exists, just return all classrooms
    if (!mongoose.models.ClassroomAssignment) {
      console.log('[DEBUG] ClassroomAssignment model not found, returning all classrooms');
      return res.status(200).json({
        success: true,
        data: classrooms
      });
    }

    try {
      // Find classrooms already assigned for this academic year
      const assignedClassrooms = await ClassroomAssignment.find({
        university,
        academicYear
      });
      console.log(`[DEBUG] Found ${assignedClassrooms.length} assigned classrooms for academic year ${academicYear}`);

      // Get IDs of assigned classrooms
      const assignedIds = assignedClassrooms.map(assignment => 
        assignment.classroom ? assignment.classroom.toString() : null
      ).filter(id => id !== null);

      // Filter out assigned classrooms
      const availableClassrooms = classrooms.filter(classroom => 
        !assignedIds.includes(classroom._id.toString())
      );
      console.log(`[DEBUG] After filtering, found ${availableClassrooms.length} available classrooms`);

      return res.status(200).json({
        success: true,
        data: availableClassrooms
      });
    } catch (err) {
      console.error('[ERROR] Error with ClassroomAssignment:', err);
      // If there's an error with ClassroomAssignment, return all classrooms
      return res.status(200).json({
        success: true,
        data: classrooms
      });
    }
  } catch (error) {
    console.error('[ERROR] Error fetching available classrooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching available classrooms',
      error: error.message
    });
  }
});

// Test route to create sample classrooms
router.post('/create-test-data', async (req, res) => {
  try {
    console.log('===== CREATING TEST CLASSROOM DATA =====');
    
    // Get admin's university ID
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const universityId = admin._id;
    console.log(`Creating test classrooms for university: ${universityId}`);
    
    // Check if classrooms already exist
    const existingCount = await Classroom.countDocuments({ university: universityId });
    console.log(`Found ${existingCount} existing classrooms`);
    
    if (existingCount > 0) {
      return res.status(200).json({
        success: true,
        message: `${existingCount} classrooms already exist for this university`,
        existingCount
      });
    }
    
    // Create sample classrooms
    const classroomData = [
      { name: 'Classroom 101', floor: 1, capacity: 30, status: 'available' },
      { name: 'Classroom 102', floor: 1, capacity: 40, status: 'available' },
      { name: 'Classroom 201', floor: 2, capacity: 25, status: 'available' },
      { name: 'Classroom 202', floor: 2, capacity: 35, status: 'available' },
      { name: 'Lab 301', floor: 3, capacity: 20, status: 'available' },
      { name: 'Conference Room', floor: 1, capacity: 15, status: 'available' }
    ];
    
    // Add university data to each classroom
    const preparedData = classroomData.map(room => ({
      ...room,
      university: universityId,
      universityCode: admin.universityCode || '',
      universityName: admin.universityName || '',
      createdBy: universityId
    }));
    
    // Create classrooms in database
    const createdClassrooms = await Classroom.create(preparedData);
    console.log(`Created ${createdClassrooms.length} test classrooms`);
    
    return res.status(200).json({
      success: true,
      message: `Successfully created ${createdClassrooms.length} test classrooms`,
      count: createdClassrooms.length,
      classrooms: createdClassrooms
    });
  } catch (error) {
    console.error('Error creating test classrooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating test classrooms',
      error: error.message
    });
  }
});

module.exports = router; 