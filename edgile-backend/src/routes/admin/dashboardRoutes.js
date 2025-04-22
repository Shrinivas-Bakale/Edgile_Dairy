const express = require('express');
const router = express.Router();
const Admin = require('../../models/Admin');
const Faculty = require('../../models/Faculty');
const Student = require('../../models/Student');
const RegistrationCode = require('../../models/RegistrationCode');
const { authMiddleware: auth } = require('../../middleware/auth');

// Middleware imports with debug logs
console.log('Loading auth middleware in dashboardRoutes...');
console.log('Auth middleware loaded in dashboardRoutes:', typeof auth);

// Get admin dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    // Get counts
    const totalUsers = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Admin.countDocuments()
    ]);
    
    const activeCodesCount = await RegistrationCode.countDocuments({ used: false });
    
    // Get recent activity
    const recentActivity = await RegistrationCode.find({ used: true })
      .sort({ usedAt: -1 })
      .limit(5)
      .populate('usedBy', 'name role');
    
    res.json({
      totalUsers: totalUsers.reduce((a, b) => a + b, 0),
      facultyCount: totalUsers[1],
      studentCount: totalUsers[0],
      activeCodesCount,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Get all users
router.get('/users', auth, async (req, res) => {
  try {
    const [students, faculty, admins] = await Promise.all([
      Student.find().select('name email role createdAt'),
      Faculty.find().select('name email role department createdAt'),
      Admin.find().select('name email role universityName createdAt')
    ]);
    
    const allUsers = [
      ...students.map(s => ({ ...s.toObject(), role: 'student' })),
      ...faculty.map(f => ({ ...f.toObject(), role: 'faculty' })),
      ...admins.map(a => ({ ...a.toObject(), role: 'admin' }))
    ].sort((a, b) => b.createdAt - a.createdAt);
    
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create new faculty member
router.post('/faculty', auth, async (req, res) => {
  try {
    const { name, email, department, facultyId } = req.body;
    
    // Validate required fields
    if (!name || !email || !department || !facultyId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if email already exists
    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create new faculty member
    const faculty = new Faculty({
      name,
      email,
      department,
      facultyId,
      role: 'faculty'
    });
    
    await faculty.save();
    
    res.status(201).json({
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        role: faculty.role,
        department: faculty.department,
        facultyId: faculty.facultyId
      }
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ message: 'Failed to create faculty member' });
  }
});

module.exports = router; 