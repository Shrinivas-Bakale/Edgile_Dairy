const express = require('express');
const router = express.Router();
const Faculty = require('../../models/Faculty');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/facultyAuthMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/faculty/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'faculty-' + req.faculty._id + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg files are allowed!'));
  }
});

/**
 * @route   POST /faculty/profile/complete
 * @desc    Complete faculty profile after first login
 * @access  Private (faculty only)
 */
router.post('/complete', [
  auth,
  [
    check('phone', 'Phone is required').not().isEmpty(),
    check('dateOfBirth', 'Date of birth is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty(),
    check('qualification', 'Qualification is required').not().isEmpty(),
    check('specialization', 'Specialization is required').not().isEmpty(),
    check('experience', 'Experience is required').not().isEmpty(),
    check('researchInterests', 'Research interests are required').isArray().not().isEmpty(),
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      phone,
      dateOfBirth,
      address,
      qualification,
      specialization,
      experience,
      researchInterests,
      profileImage
    } = req.body;

    // Log who is making the request and the faculty ID
    console.log('Profile completion request from:', req.faculty.email);
    console.log('Faculty ID from token:', req.faculty._id);

    // Find faculty by ID
    const faculty = await Faculty.findById(req.faculty._id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Update faculty profile
    faculty.phone = phone;
    faculty.dateOfBirth = dateOfBirth;
    faculty.address = address;
    faculty.qualification = qualification;
    faculty.specialization = specialization;
    faculty.experience = experience;
    faculty.researchInterests = researchInterests;
    
    if (profileImage) {
      faculty.profileImage = profileImage;
    }

    // Mark registration as completed
    faculty.registrationCompleted = true;
    faculty.isFirstLogin = false;
    faculty.status = 'active';

    await faculty.save();

    res.json({ 
      success: true, 
      message: 'Profile completed successfully',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        universityName: faculty.universityName,
        registrationCompleted: faculty.registrationCompleted,
        status: faculty.status
      }
    });
  } catch (err) {
    console.error('Error completing faculty profile:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /faculty/profile/upload-image
 * @desc    Upload profile image
 * @access  Private (faculty only)
 */
router.post('/upload-image', [auth, upload.single('profileImage')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    // Get the file path relative to server
    const profileImageUrl = `/uploads/faculty/profiles/${req.file.filename}`;

    // Update faculty profile with image URL
    const faculty = await Faculty.findById(req.faculty._id);
    faculty.profileImage = profileImageUrl;
    await faculty.save();

    res.json({ 
      success: true, 
      message: 'Profile image uploaded successfully', 
      imageUrl: profileImageUrl 
    });
  } catch (err) {
    console.error('Error uploading profile image:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /faculty/profile
 * @desc    Get current faculty profile
 * @access  Private (faculty only)
 */
router.get('/', auth, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.faculty._id).select('-password');
    
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    
    res.json({ success: true, faculty });
  } catch (err) {
    console.error('Error fetching faculty profile:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /faculty/profile
 * @desc    Update faculty profile
 * @access  Private (faculty only)
 */
router.put('/', [
  auth,
  [
    check('phone', 'Phone is required').optional(),
    check('address', 'Address is required').optional(),
    check('qualification', 'Qualification is required').optional(),
    check('specialization', 'Specialization is required').optional(),
    check('experience', 'Experience is required').optional(),
    check('researchInterests', 'Research interests should be an array').optional().isArray(),
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const updateFields = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'password' && key !== 'email' && key !== 'universityName' && key !== 'universityCode') {
        updateFields[key] = value;
      }
    }

    const faculty = await Faculty.findByIdAndUpdate(
      req.faculty._id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({ success: true, faculty });
  } catch (err) {
    console.error('Error updating faculty profile:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 