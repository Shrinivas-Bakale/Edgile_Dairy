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
const Timetable = require('../../models/Timetable');

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

// Define the occupancy route first, before any other routes
router.get('/classrooms/occupancy', async (req, res) => {
  try {
    console.log('[OCCUPANCY HANDLER] Occupancy endpoint called correctly');
    
    // Get admin details from middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        msg: 'Authentication required', 
        error: 'No valid user ID in request' 
      });
    }
    
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      logger.warn(`Admin not found with ID: ${req.user.id}`);
      return res.status(404).json({ 
        success: false, 
        msg: 'Admin not found',
        error: `No admin record found for ID: ${req.user.id}` 
      });
    }
    
    // Log the university ID we're using to query
    logger.info(`Getting classrooms for university ID: ${admin._id}`);
    
    // Check if university ID is valid
    if (!admin._id || !mongoose.Types.ObjectId.isValid(admin._id)) {
      logger.error(`Invalid university ID: ${admin._id}`);
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid university ID',
        error: `Invalid or missing university ID: ${admin._id}` 
      });
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
      if (Array.isArray(unavailabilityRecords)) {
        unavailabilityRecords.forEach(record => {
          if (record && record.classroom) {
            unavailableClassroomMap[record.classroom.toString()] = {
              substituteClassroomId: record.substituteClassroom,
              substituteClassroomName: record.substituteClassroomName,
              reason: record.reason
            };
          }
        });
      }
      
      // Get current academic year
      const academicYear = getCurrentAcademicYear();
      
      // Fetch the latest active timetables for the current academic year
      const timetables = await Timetable.find({ 
        university: admin._id,
        status: 'published',
        academicYear
      }).lean();
      
      logger.info(`Found ${timetables.length} published timetables for university ID: ${admin._id}`);
      
      // Create a map of classroom assignments from timetables
      const classroomAssignments = {};
      
      timetables.forEach(timetable => {
        if (timetable.classroomId) {
          const classroomIdString = timetable.classroomId.toString();
          // Use the proper class information from the timetable
          classroomAssignments[classroomIdString] = {
            year: timetable.year,
            semester: timetable.semester,
            division: timetable.division,
            class: `${timetable.year} Year, Sem ${timetable.semester}, Div ${timetable.division}`,
            // Store the full timetable ID for reference
            timetableId: timetable._id
          };
        }
      });
      
      // Format the result using real timetable data
      const occupancyData = classrooms.map(classroom => {
        // Protect against null/undefined classroom._id
        if (!classroom || !classroom._id) {
          return null;
        }
        
        const classroomId = classroom._id.toString();
        const isUnavailable = classroom.status === 'unavailable' || 
                             unavailableClassroomMap[classroomId];
        
        // Use real timetable data to determine occupancy
        let occupiedBy = null;
        let occupancyPercentage = 0;
        let occupiedByYear = null;
        let occupiedBySemester = null;
        let occupiedByDivision = null;
        let timetableId = null;
        
        // Check if classroom is assigned in a timetable
        if (!isUnavailable && classroomAssignments[classroomId]) {
          const assignment = classroomAssignments[classroomId];
          occupiedBy = assignment.class; 
          occupiedByYear = assignment.year;
          occupiedBySemester = assignment.semester;
          occupiedByDivision = assignment.division;
          timetableId = assignment.timetableId;
          occupancyPercentage = 100; // Full occupancy when assigned
        }
        
        return {
          id: classroomId,
          name: classroom.name,
          floor: classroom.floor,
          capacity: classroom.capacity,
          status: isUnavailable ? 'unavailable' : (occupiedBy ? 'occupied' : 'available'),
          occupiedBy,
          occupiedByYear,
          occupiedBySemester,
          occupiedByDivision,
          timetableId,
          unavailabilityInfo: unavailableClassroomMap[classroomId] || null,
          occupancyPercentage
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
router.get('/classrooms', async (req, res) => {
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
      classrooms: classrooms
    };
    console.log(`Sending response with ${classrooms.length} classrooms`);
    console.log('===== END GET /api/admin/classrooms =====');
    
    return res.json(responseData);
  } catch (error) {
    console.error(`Error fetching classrooms: ${error.message}`);
    logger.error(`Error fetching classrooms: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching classrooms',
      error: error.message
    });
  }
});

// Get classroom by ID - must be after the available-classrooms route
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  
  // Skip processing for special paths
  if (id === 'classrooms' || id === 'occupancy' || id.includes('occupancy') || 
      id === 'available-classrooms-list' || id === 'debug-auth' || id === 'test-route') {
    console.log(`[ID ROUTE] Skipping ID handler for special path: ${id}`);
    return next();
  }
  
  try {
    // Only proceed if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid classroom ID: "${id}"`
      });
    }
    
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
  if (url.includes('/classrooms/occupancy') || url.includes('/classrooms/') || url.includes('/available-classrooms-list')) {
    console.log(`[PARAM MIDDLEWARE] Skipping for route: ${url}`);
    return next();
  }
  
  // Skip ID routes if the ID is 'classrooms' (conflicts with /classrooms/* routes)
  if (id === 'classrooms' || id === 'occupancy') {
    console.log(`[PARAM MIDDLEWARE] Detected "${id}" as an ID - this is likely a route conflict`);
    return res.status(404).json({
      success: false,
      msg: `Invalid route. Use /api/admin/classrooms/${id} instead of /api/admin/${id}`
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

module.exports = router;