/**
 * Migration script to move existing users from User collection
 * to specialized Admin, Faculty, and Student collections
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected Successfully');
  migrateUsers();
})
.catch((err) => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Migration function
async function migrateUsers() {
  try {
    console.log('Starting user migration...');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    let adminCount = 0;
    let facultyCount = 0;
    let studentCount = 0;
    
    // Process each user
    for (const user of users) {
      try {
        if (user.role === 'admin') {
          // Check if admin already exists
          const existingAdmin = await Admin.findOne({ email: user.email });
          
          if (!existingAdmin) {
            // Create new admin document
            const admin = new Admin({
              name: user.name,
              email: user.email,
              password: user.password,
              universityName: user.universityName || 'Migrated University',
              superAdminCode: process.env.SUPER_ADMIN_CODE || 'SUPER123',
              isActive: user.isActive,
              lastLogin: user.lastLogin,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            });
            
            await admin.save();
            adminCount++;
            console.log(`Migrated admin: ${user.email}`);
          } else {
            console.log(`Admin already exists: ${user.email}`);
          }
        } else if (user.role === 'faculty') {
          // Check if faculty already exists
          const existingFaculty = await Faculty.findOne({ email: user.email });
          
          if (!existingFaculty) {
            // Create new faculty document
            const faculty = new Faculty({
              name: user.name,
              email: user.email,
              password: user.password,
              universityCode: user.universityCode,
              department: user.profile?.department || '',
              facultyId: user.profile?.facultyId || '',
              isActive: user.isActive,
              lastLogin: user.lastLogin,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            });
            
            await faculty.save();
            facultyCount++;
            console.log(`Migrated faculty: ${user.email}`);
          } else {
            console.log(`Faculty already exists: ${user.email}`);
          }
        } else if (user.role === 'student') {
          // Check if student already exists
          const existingStudent = await Student.findOne({ email: user.email });
          
          if (!existingStudent) {
            // Create new student document
            const student = new Student({
              name: user.name,
              email: user.email,
              password: user.password,
              universityCode: user.universityCode,
              enrollmentId: user.profile?.studentId || '',
              isActive: user.isActive,
              lastLogin: user.lastLogin,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            });
            
            await student.save();
            studentCount++;
            console.log(`Migrated student: ${user.email}`);
          } else {
            console.log(`Student already exists: ${user.email}`);
          }
        } else {
          console.log(`Unknown role for user: ${user.email}`);
        }
      } catch (userError) {
        console.error(`Error migrating user ${user.email}:`, userError);
      }
    }
    
    console.log('Migration completed:');
    console.log(`Admins migrated: ${adminCount}`);
    console.log(`Faculty migrated: ${facultyCount}`);
    console.log(`Students migrated: ${studentCount}`);
    console.log(`Total migrated: ${adminCount + facultyCount + studentCount}`);
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
} 