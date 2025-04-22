const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { validateAdmin } = require('../../middleware/auth');
const timetableGenerator = require('../../controllers/timetable/timetableGenerator');
const { getCurrentAcademicYear, isValidAcademicYear } = require('../../utils/academicYear');

// Import models
const Timetable = require('../../models/Timetable');
const Classroom = require('../../models/Classroom');
const Subject = require('../../models/Subject');
const Faculty = require('../../models/Faculty');
const FacultyPreference = require('../../models/FacultyPreference');
const ClassroomAssignment = require('../../models/ClassroomAssignment');

// Middleware to check if the admin belongs to the university
const checkUniversityAccess = async (req, res, next) => {
  try {
    // Admin ID is set in the validateAdmin middleware
    const universityId = req.body.university || req.query.university;
    
    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: 'University ID is required'
      });
    }

    if (req.admin.role !== 'super' && req.admin._id.toString() !== universityId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this university\'s data'
      });
    }

    next();
  } catch (error) {
    logger.error(`checkUniversityAccess middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during university access check'
    });
  }
};

// Apply middleware to all routes
router.use(validateAdmin);
router.use(checkUniversityAccess);

// Get list of timetables
router.get('/list', async (req, res) => {
  try {
    const { university, year, semester, division, academicYear } = req.query;
    
    const timetables = await Timetable.find({
      university,
      year,
      semester,
      division,
      academicYear
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: timetables
    });
  } catch (error) {
    logger.error(`Error fetching timetables: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching timetables'
    });
  }
});

// Get a specific timetable
router.get('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('classroom')
      .populate('subjects')
      .populate('faculty');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error fetching timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error fetching timetable'
    });
  }
});

// Generate timetable templates
router.post('/generate', async (req, res) => {
  try {
    let { university, year, semester, division, classroomId, academicYear } = req.body;
    
    logger.info(`Generating templates request: university=${university}, year=${year}, semester=${semester}, division=${division}, classroomId=${classroomId}, academicYear=${academicYear}`);
    
    // If university is not provided, get it from the admin
    if (!university && req.admin?._id) {
      university = req.admin._id;
      logger.info(`Using university from admin: ${university}`);
    }
    
    // Check if all required parameters are provided
    if (!university || !year || !semester || !division || !classroomId) {
      logger.warn(`Missing required parameters: university=${university}, year=${year}, semester=${semester}, division=${division}, classroomId=${classroomId}`);
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters for template generation'
      });
    }
    
    // Convert numeric year to string format
    const yearMap = {
      1: 'First',
      2: 'Second',
      3: 'Third'
    };
    
    const yearString = yearMap[year];
    if (!yearString) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Must be 1, 2, or 3'
      });
    }
    
    // If academicYear is not provided or invalid, use the current academic year
    if (!academicYear || !isValidAcademicYear(academicYear)) {
      academicYear = getCurrentAcademicYear();
      logger.info(`Using calculated academicYear: ${academicYear}`);
    }

    // Get subjects for this year and semester
    const subjects = await Subject.find({ 
      university, 
      year: yearString, 
      semester,
      academicYear,
      archived: false 
    });
    logger.info(`Found ${subjects.length} subjects for university=${university}, year=${yearString}, semester=${semester}`);
    
    if (subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subjects found for the specified year and semester. Please add subjects first.'
      });
    }
    
    // Get classroom details
    const classroom = await Classroom.findById(classroomId);
    
    if (!classroom) {
      logger.warn(`Classroom not found with ID: ${classroomId}`);
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Get faculty preferences
    const preferences = await FacultyPreference.find({
      university,
      year: yearString,
      semester,
      academicYear
    }).populate('faculty');
    
    logger.info(`Found ${preferences.length} faculty preferences`);
    
    // Generate templates using the timetable generator
    const templates = await timetableGenerator.generateTemplates({
      subjects,
      preferences,
      classroom,
      year: yearString,
      semester,
      division,
      academicYear
    });
    
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`Error generating templates: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generating timetable templates',
      error: error.message
    });
  }
});

// Create a new timetable
router.post('/create', async (req, res) => {
  try {
    let { university, template, assignFaculty, academicYear } = req.body;
    
    logger.info(`Creating timetable request: university=${university}, assignFaculty=${assignFaculty}, academicYear=${academicYear}`);
    
    // If university is not provided, get it from the admin
    if (!university && req.admin?._id) {
      university = req.admin._id;
      logger.info(`Using university from admin: ${university}`);
    }
    
    // Check if all required parameters are provided
    if (!university || !template) {
      logger.warn(`Missing required parameters: university=${university}, template=${JSON.stringify(template)}`);
      return res.status(400).json({
        success: false,
        message: 'University and template are required'
      });
    }
    
    // If academicYear is not provided or invalid, use the current academic year
    if (!academicYear || !isValidAcademicYear(academicYear)) {
      academicYear = getCurrentAcademicYear();
      logger.info(`Using calculated academicYear: ${academicYear}`);
    }

    // Create the timetable
    const timetable = new Timetable({
      university,
      year: template.year,
      semester: template.semester,
      division: template.division,
      classroom: template.classroomId,
      academicYear,
      days: template.days,
      status: 'draft'
    });

    await timetable.save();
    logger.info(`Timetable created with ID: ${timetable._id}`);

    if (assignFaculty) {
      // Get faculty preferences
      const preferences = await FacultyPreference.find({
        university,
        year: template.year,
        semester: template.semester,
        academicYear
      }).populate('faculty');
      logger.info(`Found ${preferences.length} faculty preferences for assignment`);

      // Assign faculty based on preferences
      await timetableGenerator.assignFaculty(timetable, preferences);
      logger.info(`Faculty assigned to timetable ID: ${timetable._id}`);
    }

    return res.status(201).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error creating timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error creating timetable'
    });
  }
});

// Update a timetable
router.put('/:id', async (req, res) => {
  try {
    const { days } = req.body;

    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { days },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error updating timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating timetable'
    });
  }
});

// Check for conflicts in a timetable
router.post('/:id/check-conflicts', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('classroom')
      .populate('subjects')
      .populate('faculty');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    const conflicts = await timetableGenerator.checkConflicts(timetable);

    return res.status(200).json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    logger.error(`Error checking conflicts: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error checking timetable conflicts'
    });
  }
});

// Publish a timetable
router.post('/:id/publish', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('classroom')
      .populate('subjects')
      .populate('faculty');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Check for conflicts before publishing
    const conflicts = await timetableGenerator.checkConflicts(timetable);

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish timetable with conflicts',
        conflicts
      });
    }

    timetable.status = 'published';
    await timetable.save();

    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error publishing timetable: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error publishing timetable'
    });
  }
});

// Auto-assign faculty to a timetable
router.post('/:id/assign-faculty', async (req, res) => {
  try {
    const { university, academicYear } = req.body;
    
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Get faculty preferences
    const preferences = await FacultyPreference.find({
      university,
      year: timetable.year,
      semester: timetable.semester,
      academicYear
    }).populate('faculty');

    // Assign faculty based on preferences
    await timetableGenerator.assignFaculty(timetable, preferences);

    return res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    logger.error(`Error assigning faculty: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error auto-assigning faculty'
    });
  }
});

module.exports = router; 