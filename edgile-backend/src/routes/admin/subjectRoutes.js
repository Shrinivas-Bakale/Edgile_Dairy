const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Middleware imports with debug logs
console.log('Loading auth middleware...');
const { authMiddleware: auth } = require('../../middleware/auth');
console.log('Auth middleware loaded:', typeof auth);

console.log('Loading adminAuth middleware...');
const adminAuthMiddleware = require('../../middleware/adminAuthMiddleware');
console.log('AdminAuth middleware loaded:', typeof adminAuthMiddleware);

const { check, validationResult } = require('express-validator');
const Subject = require('../../models/Subject');
const FacultyPreference = require('../../models/FacultyPreference');
const Admin = require('../../models/Admin');
const Faculty = require('../../models/Faculty');
const logger = require('../../utils/logger');

/**
 * @route GET /api/admin/subjects
 * @desc Get all subjects with optional filtering
 * @access Private (Admin only)
 */
router.get('/', auth, adminAuthMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG] GET /api/admin/subjects request received');
    console.log('[DEBUG] Query parameters:', req.query);
    
    const { year, semester, archived, university } = req.query;
    
    // Get admin details - either from req.user.id or allow explicit university in query
    let universityId = university;
    if (!universityId) {
      const admin = await Admin.findById(req.user.id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }
      universityId = admin._id;
    }
    
    // Build query object
    const query = { university: universityId };
    
    // Handle year conversion if numeric
    if (year) {
      const yearMap = {
        1: 'First',
        2: 'Second',
        3: 'Third'
      };
      query.year = yearMap[year] || year;
    }
    
    if (semester) query.semester = parseInt(semester);
    if (archived === 'true' || archived === 'false') {
      query.archived = archived === 'true';
    } else {
      // By default, show only non-archived subjects
      query.archived = false;
    }
    
    console.log('[DEBUG] Final query:', query);
    
    const subjects = await Subject.find(query).sort({ subjectName: 1 });
    
    logger.info(`Retrieved ${subjects.length} subjects for university ${universityId}`);
    
    res.json({
      success: true,
      subjects
    });
  } catch (error) {
    logger.error(`Error retrieving subjects: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/admin/subjects/academic-years
 * @desc Get list of all academic years with subjects
 * @access Private (Admin only)
 */
router.get('/subjects/academic-years', auth, adminAuthMiddleware, async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Academic year functionality has been removed',
    academicYears: []
  });
});

/**
 * @route GET /api/admin/subjects/:id
 * @desc Get a specific subject by ID
 * @access Private (Admin only)
 */
router.get('/subjects/:id', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid subject ID' });
    }
    
    // Get admin details
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    const subject = await Subject.findOne({
      _id: id,
      university: admin._id
    });
    
    if (!subject) {
      return res.status(404).json({ success: false, msg: 'Subject not found' });
    }
    
    // Get faculty preferences for this subject
    const preferences = await FacultyPreference.find({
      subject: subject._id,
      academicYear: subject.academicYear
    }).populate('faculty', 'name email department');
    
    res.json({
      success: true,
      subject,
      facultyPreferences: preferences
    });
  } catch (error) {
    logger.error(`Error retrieving subject: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/admin/subjects
 * @desc Create a new subject
 * @access Private (Admin only)
 */
router.post('/subjects', 
  auth,
  adminAuthMiddleware,
  check('subjectName', 'Subject name is required').not().isEmpty(),
  check('subjectCode', 'Subject code is required').not().isEmpty(),
  check('totalDuration', 'Total duration is required').isInt({ min: 1 }),
  check('year', 'Year is required').isIn(['First', 'Second', 'Third']),
  check('semester', 'Semester is required').isInt({ min: 1, max: 6 }),
  async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { 
      subjectName, 
      subjectCode, 
      type, 
      totalDuration, 
      year, 
      semester,
      description
    } = req.body;
    
    // Get admin details
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Check if subject with the same code already exists for the same year and semester
    const existingSubject = await Subject.findOne({
      university: admin._id,
      subjectCode,
      year,
      semester
    });
    
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        msg: `Subject with code ${subjectCode} already exists for ${year} year, semester ${semester}`
      });
    }
    
    // Calculate weekly hours (12 weeks in a semester)
    const weeklyHours = Math.ceil(totalDuration / 12);
    
    // Create new subject
    const newSubject = new Subject({
      subjectName,
      subjectCode,
      type: type?.toLowerCase() || 'core',
      totalDuration,
      weeklyHours,
      year,
      semester,
      description: description || '',
      university: admin._id,
      universityCode: admin.universityCode,
      createdBy: admin._id
    });
    
    await newSubject.save();
    
    logger.info(`Subject created: ${subjectName} (${subjectCode}) by ${admin.name}`);
    
    res.status(201).json({
      success: true,
      msg: 'Subject created successfully',
      subject: newSubject
    });
  } catch (error) {
    logger.error(`Error creating subject: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/admin/subjects/:id
 * @desc Update a subject
 * @access Private (Admin only)
 */
router.put('/subjects/:id', 
  auth,
  adminAuthMiddleware,
  check('subjectName', 'Subject name is required').optional().not().isEmpty(),
  check('subjectCode', 'Subject code is required').optional().not().isEmpty(),
  check('type', 'Subject type must be core, lab, or elective').optional().isIn(['core', 'lab', 'elective']),
  check('totalDuration', 'Total duration must be a positive number').optional().isInt({ min: 1 }),
  check('year', 'Year must be First, Second, or Third').optional().isIn(['First', 'Second', 'Third']),
  check('semester', 'Semester must be between 1 and 6').optional().isInt({ min: 1, max: 6 }),
  check('archived', 'Archived must be a boolean').optional().isBoolean(),
  async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid subject ID' });
    }
    
    // Get admin details
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find the subject
    let subject = await Subject.findOne({
      _id: id,
      university: admin._id
    });
    
    if (!subject) {
      return res.status(404).json({ success: false, msg: 'Subject not found' });
    }
    
    // Check if subject code is being updated and if new code already exists
    if (req.body.subjectCode && req.body.subjectCode !== subject.subjectCode) {
      const existingSubject = await Subject.findOne({
        university: admin._id,
        subjectCode: req.body.subjectCode,
        year: req.body.year || subject.year,
        semester: req.body.semester || subject.semester,
        academicYear: subject.academicYear,
        _id: { $ne: id } // Exclude current subject
      });
      
      if (existingSubject) {
        return res.status(400).json({
          success: false,
          msg: `Subject with code ${req.body.subjectCode} already exists for the selected year and semester`
        });
      }
    }
    
    // Update fields
    const updateFields = [
      'subjectName', 'subjectCode', 'type', 'totalDuration', 
      'year', 'semester', 'archived'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'type') {
          subject[field] = req.body[field].toLowerCase();
        } else {
          subject[field] = req.body[field];
        }
      }
    });
    
    // Recalculate weekly hours if totalDuration changed
    if (req.body.totalDuration) {
      subject.weeklyHours = Math.ceil(req.body.totalDuration / 12);
    }
    
    subject.updatedAt = Date.now();
    await subject.save();
    
    logger.info(`Subject updated: ${subject.subjectName} (${subject.subjectCode}) by ${admin.name}`);
    
    res.json({
      success: true,
      msg: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    logger.error(`Error updating subject: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route DELETE /api/admin/subjects/:id
 * @desc Archive a subject (soft delete)
 * @access Private (Admin only)
 */
router.delete('/subjects/:id', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: 'Invalid subject ID' });
    }
    
    // Get admin details
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Find the subject
    const subject = await Subject.findOne({
      _id: id,
      university: admin._id
    });
    
    if (!subject) {
      return res.status(404).json({ success: false, msg: 'Subject not found' });
    }
    
    // Soft delete (archive) the subject
    subject.archived = true;
    subject.updatedAt = Date.now();
    await subject.save();
    
    logger.info(`Subject archived: ${subject.subjectName} (${subject.subjectCode}) by ${admin.name}`);
    
    res.json({
      success: true,
      msg: 'Subject archived successfully'
    });
  } catch (error) {
    logger.error(`Error archiving subject: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/admin/subjects/copy
 * @desc Copy subjects from one academic year to another
 * @access Private (Admin only)
 */
router.post('/subjects/copy', auth, adminAuthMiddleware, async (req, res) => {
  return res.status(405).json({
    success: false,
    msg: 'This functionality has been removed. Academic year is no longer used.'
  });
});

/**
 * @route POST /api/admin/subjects/faculty-preference
 * @desc Submit faculty preference for a subject (faculty only)
 * @access Private (Faculty only)
 */
router.post('/faculty/preferences', 
  auth,
  check('subjectId', 'Subject ID is required').not().isEmpty(),
  check('academicYear', 'Academic year is required').not().isEmpty(),
  check('comment').optional().isLength({ max: 500 }),
  async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { subjectId, academicYear, comment } = req.body;
    
    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ success: false, msg: 'Invalid subject ID' });
    }
    
    // Get faculty details
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, msg: 'Faculty not found' });
    }
    
    // Find the subject
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, msg: 'Subject not found' });
    }
    
    // Check if faculty already has a preference for this subject in the given academic year
    const existingPreference = await FacultyPreference.findOne({
      faculty: faculty._id,
      subject: subject._id,
      academicYear
    });
    
    if (existingPreference) {
      // Update existing preference
      existingPreference.comment = comment;
      existingPreference.updatedAt = Date.now();
      await existingPreference.save();
      
      logger.info(`Faculty preference updated by ${faculty.name} for subject ${subject.subjectName}`);
      
      return res.json({
        success: true,
        msg: 'Preference updated successfully',
        preference: existingPreference
      });
    }
    
    // Create new preference
    const newPreference = new FacultyPreference({
      faculty: faculty._id,
      facultyName: faculty.name,
      subject: subject._id,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      year: subject.year,
      semester: subject.semester,
      academicYear,
      university: subject.university,
      universityCode: subject.universityCode,
      comment
    });
    
    await newPreference.save();
    
    logger.info(`Faculty preference created by ${faculty.name} for subject ${subject.subjectName}`);
    
    res.status(201).json({
      success: true,
      msg: 'Preference submitted successfully',
      preference: newPreference
    });
  } catch (error) {
    logger.error(`Error submitting faculty preference: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/faculty/preferences
 * @desc Get faculty preferences
 * @access Private (Faculty only)
 */
router.get('/faculty/preferences', auth, async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    // Get faculty details
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, msg: 'Faculty not found' });
    }
    
    // Build query
    const query = { faculty: faculty._id };
    if (academicYear) query.academicYear = academicYear;
    
    // Get preferences
    const preferences = await FacultyPreference.find(query)
      .populate('subject', 'subjectName subjectCode type totalDuration weeklyHours year semester')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: preferences.length,
      preferences
    });
  } catch (error) {
    logger.error(`Error retrieving faculty preferences: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/admin/faculty-preferences
 * @desc Get all faculty preferences (admin only)
 * @access Private (Admin only)
 */
router.get('/faculty-preferences', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { academicYear, year, semester, subjectId } = req.query;
    
    // Get admin details
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }
    
    // Build query
    const query = { university: admin._id };
    if (academicYear) query.academicYear = academicYear;
    if (year) query.year = year;
    if (semester) query.semester = parseInt(semester);
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subject = subjectId;
    }
    
    // Get preferences
    const preferences = await FacultyPreference.find(query)
      .populate('faculty', 'name email department')
      .populate('subject', 'subjectName subjectCode type totalDuration weeklyHours year semester')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: preferences.length,
      preferences
    });
  } catch (error) {
    logger.error(`Error retrieving faculty preferences: ${error.message}`);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
});

module.exports = router; 