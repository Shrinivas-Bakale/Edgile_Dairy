/**
 * Seed Data Script
 * This script adds test data to the database for development and testing purposes.
 * 
 * It adds:
 * - Students (3-4 per division, for each year and odd semesters)
 * - Faculty members (15-16 in total)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const RegistrationCode = require('../models/RegistrationCode');

// Try to find and load the .env file from multiple possible locations
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'),                      // Project root
  path.join(process.cwd(), '../.env'),                   // One level up
  path.join(__dirname, '../../.env'),                    // Two levels up from script
  path.join(__dirname, '../../../.env'),                 // Three levels up from script
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at ${envPath}`);
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('No .env file found in any expected location. Will try dotenv default loading behavior.');
  require('dotenv').config();
}

// MongoDB Atlas connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4, skip trying IPv6
};

// Get MongoDB URI from environment variable or directly
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// If no MongoDB URI is found, provide example and exit
if (!MONGODB_URI) {
  console.error('MongoDB connection string not found. Please set MONGO_URI environment variable in your .env file.');
  console.error('Example:');
  console.error('MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/edgile?retryWrites=true&w=majority');
  
  // Prompt for URI if running in interactive mode
  console.log('\nIf you have the connection URI, you can enter it below:');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('MongoDB URI: ', (uri) => {
    if (uri && uri.startsWith('mongodb')) {
      console.log('Using provided URI to connect...');
      connectToDatabase(uri);
    } else {
      console.log('No valid URI provided. Exiting.');
      process.exit(1);
    }
    readline.close();
  });

  return;
} else {
  // Log connection attempt with masked credentials
  const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':******@');
  console.log(`Connecting to MongoDB: ${maskedUri}`);
  connectToDatabase(MONGODB_URI);
}

function connectToDatabase(uri) {
  // Connect to MongoDB
  mongoose.connect(uri, options)
    .then(() => {
      console.log('MongoDB connected for seeding data');
      // Start the seeding process
      return seedData();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}

/**
 * Main function to seed data
 */
async function seedData() {
  try {
    console.log('Starting data seeding process...');
    
    // Check if we already have data
    const studentCount = await Student.countDocuments();
    const facultyCount = await Faculty.countDocuments(); 
    
    if (studentCount > 0 || facultyCount > 0) {
      console.log(`Database already has data: ${studentCount} students and ${facultyCount} faculty members`);
      console.log('To re-seed, please drop the existing collections first');
      return;
    }
    
    // Get university admin (need this for references)
    const admin = await Admin.findOne();
    if (!admin) {
      console.error('No admin/university found! Please create an admin user first.');
      return;
    }
    
    console.log(`Using university: ${admin.universityName} (${admin.universityCode})`);
    
    // Add faculty members
    await addFacultyMembers(admin);
    
    // Add students for each year and odd semester
    await addStudents(admin);
    
    console.log('Data seeding completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, error: error.message };
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

/**
 * Add faculty members
 */
async function addFacultyMembers(admin) {
  console.log('Adding faculty members...');
  
  // Define departments
  const departments = [
    'Computer Science',
    'Information Technology', 
    'Electronics and Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering',
    'Mathematics',
    'Physics'
  ];
  
  // Predefined subjects by department
  const subjectsByDepartment = {
    'Computer Science': ['Data Structures', 'Algorithms', 'Database Systems', 'Computer Networks', 'Operating Systems', 'Web Development'],
    'Information Technology': ['Information Security', 'Cloud Computing', 'Web Technologies', 'Mobile Application Development', 'IT Infrastructure'],
    'Electronics and Communication': ['Digital Electronics', 'Analog Circuits', 'Communication Systems', 'Signal Processing', 'Control Systems'],
    'Mechanical Engineering': ['Thermodynamics', 'Fluid Mechanics', 'Manufacturing Processes', 'Machine Design', 'Heat Transfer'],
    'Civil Engineering': ['Structural Analysis', 'Geotechnical Engineering', 'Transportation Engineering', 'Environmental Engineering'],
    'Electrical Engineering': ['Power Systems', 'Electric Machines', 'Control Engineering', 'Electrical Circuit Analysis'],
    'Mathematics': ['Calculus', 'Linear Algebra', 'Differential Equations', 'Discrete Mathematics', 'Statistics'],
    'Physics': ['Mechanics', 'Electromagnetism', 'Optics', 'Quantum Mechanics', 'Thermal Physics']
  };
  
  // Create the standard password hash for all test users
  const password = await bcrypt.hash('Test@123', 10);
  
  // Create 16 faculty members
  const facultyMembers = [];
  
  for (let i = 1; i <= 16; i++) {
    const department = departments[i % departments.length];
    const subjects = subjectsByDepartment[department] || [];
    
    const faculty = {
      name: `Faculty ${i}`,
      email: `faculty${i}@klebcahubli.in`,
      password,
      universityCode: admin.universityCode,
      universityName: admin.universityName,
      university: admin._id,
      department,
      employeeId: `EMP${100 + i}`,
      role: 'faculty',
      status: 'active',
      subjects: subjects.slice(0, 3), // Assign first 3 subjects
      isVerified: true,
      registrationCompleted: true,
      phone: `98765432${i.toString().padStart(2, '0')}`,
      qualification: ['Ph.D.', 'M.Tech.', 'M.Sc.'][i % 3],
      experience: `${5 + (i % 10)} years`,
      isFirstLogin: false,
      passwordChangeRequired: false,
      lastLoginAt: new Date()
    };
    
    facultyMembers.push(faculty);
  }
  
  // Insert faculty members
  const result = await Faculty.insertMany(facultyMembers);
  console.log(`Added ${result.length} faculty members`);
  
  // Create faculty registration codes
  await createFacultyRegistrationCodes(admin);
  
  return result;
}

/**
 * Create faculty registration codes
 */
async function createFacultyRegistrationCodes(admin) {
  console.log('Creating faculty registration codes...');
  
  // Create 5 unused registration codes for future faculty registrations
  const codes = [];
  
  for (let i = 1; i <= 5; i++) {
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const code = {
      code: `FAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      university: admin._id,
      universityCode: admin.universityCode,
      type: 'faculty',
      status: 'unused',
      createdBy: admin._id,
      expiresAt: expiresAt
    };
    
    codes.push(code);
  }
  
  const result = await RegistrationCode.insertMany(codes);
  console.log(`Created ${result.length} faculty registration codes`);
  
  return result;
}

/**
 * Add students for each year and odd semester
 */
async function addStudents(admin) {
  console.log('Adding students...');
  
  // Define years, semesters, and divisions
  const years = [1, 2, 3];
  const semesters = [1, 3, 5]; // Odd semesters
  const divisions = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  
  // Create the standard password hash for all test users
  const password = await bcrypt.hash('Test@123', 10);
  
  // Create students
  const students = [];
  let counter = 1;
  
  for (const year of years) {
    // Map year to appropriate semester
    const semester = semesters[year - 1];
    
    for (const division of divisions) {
      // Create 3-4 students per division
      const studentsPerDivision = 3 + (division === 'A1' ? 1 : 0); // 4 students for A1, 3 for others
      
      for (let i = 1; i <= studentsPerDivision; i++) {
        const registerNumber = `REG${year}${division}${i.toString().padStart(2, '0')}`;
        
        const student = {
          registerNumber,
          name: `Student ${counter}`,
          email: `student${counter}@klebcahubli.in`,
          password,
          phone: `98765${counter.toString().padStart(5, '0')}`,
          classYear: year,
          semester,
          division,
          university: admin._id,
          universityCode: admin.universityCode,
          universityName: admin.universityName,
          role: 'student',
          status: 'active',
          isVerified: true,
          otpVerified: true,
        };
        
        students.push(student);
        counter++;
      }
    }
  }
  
  // Insert students
  try {
    const result = await Student.insertMany(students);
    console.log(`Added ${result.length} students across years and divisions`);
    return result;
  } catch (error) {
    console.error('Error adding students:', error.message);
    
    // If insertMany fails, try adding one by one to isolate the issue
    console.log('Trying to add students one by one...');
    const addedStudents = [];
    
    for (const student of students) {
      try {
        const newStudent = new Student(student);
        const result = await newStudent.save();
        addedStudents.push(result);
      } catch (singleError) {
        console.error(`Failed to add student ${student.registerNumber}:`, singleError.message);
      }
    }
    
    console.log(`Added ${addedStudents.length} students individually`);
    return addedStudents;
  }
}

module.exports = { seedData }; 