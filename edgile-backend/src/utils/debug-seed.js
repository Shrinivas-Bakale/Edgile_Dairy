/**
 * Debug Script for Seed Data Issues
 * This script will help identify why students aren't being loaded into the database
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

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
  process.exit(1);
} else {
  // Log connection attempt with masked credentials
  const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':******@');
  console.log(`Connecting to MongoDB: ${maskedUri}`);
  
  // Connect to MongoDB
  mongoose.connect(MONGODB_URI, options)
    .then(async () => {
      console.log('MongoDB connected successfully');
      
      try {
        // 1. Check database collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:', collections.map(c => c.name).join(', '));
        
        // 2. Check if admin exists
        const adminCount = await Admin.countDocuments();
        console.log(`Found ${adminCount} admin accounts`);
        
        if (adminCount === 0) {
          console.error('ERROR: No admin account found. Please create an admin account first.');
          process.exit(1);
        }
        
        // 3. Get admin details
        const admin = await Admin.findOne();
        console.log('Admin found:', {
          id: admin._id,
          universityName: admin.universityName,
          universityCode: admin.universityCode
        });
        
        // 4. Check student collection
        const studentCount = await Student.countDocuments();
        console.log(`Found ${studentCount} existing students`);
        
        // 5. Try to add a test student
        console.log('Attempting to create a test student...');
        
        try {
          const password = await bcrypt.hash('Test@123', 10);
          
          const student = new Student({
            registerNumber: 'DEBUG001',
            name: 'Debug Student',
            email: 'debug@klebcahubli.in',
            password,
            phone: '9876543210',
            classYear: 1,
            semester: 1,
            division: 'A1',
            university: admin._id,
            universityCode: admin.universityCode,
            universityName: admin.universityName,
            role: 'student',
            status: 'active',
            isVerified: true,
            otpVerified: true
          });
          
          const savedStudent = await student.save();
          console.log('✅ Test student created successfully:', savedStudent._id);
          
          // 6. Verify the student was added
          const newCount = await Student.countDocuments();
          console.log(`Student count is now ${newCount}`);
          
          // 7. Try running the original addStudents function
          console.log('\nTrying to add students from seed script...');
          
          const testYears = [1];
          const testSemesters = [1];
          const testDivisions = ['A1'];
          
          // Create students
          const students = [];
          let counter = 1;
          
          for (const year of testYears) {
            const semester = testSemesters[year - 1];
            
            for (const division of testDivisions) {
              // Create just 1 test student
              const registerNumber = `SEED${year}${division}${counter.toString().padStart(2, '0')}`;
              
              const student = {
                registerNumber,
                name: `Seed Student ${counter}`,
                email: `seedstudent${counter}@klebcahubli.in`,
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
          
          console.log(`Prepared ${students.length} students for insertion`);
          try {
            const result = await Student.insertMany(students);
            console.log(`✅ Successfully added ${result.length} students from seed function`);
          } catch (insertError) {
            console.error('❌ Error in insertMany operation:', insertError);
            
            // Try to add each student individually to find the problematic one
            console.log('\nTrying to add students individually:');
            for (let i = 0; i < students.length; i++) {
              try {
                const newStudent = new Student(students[i]);
                await newStudent.save();
                console.log(`✅ Student ${i+1} added successfully`);
              } catch (singleError) {
                console.error(`❌ Error adding student ${i+1}:`, singleError.message);
                
                // Check validation issues
                if (singleError.name === 'ValidationError') {
                  for (const field in singleError.errors) {
                    console.error(`  - ${field}: ${singleError.errors[field].message}`);
                  }
                }
              }
            }
          }
          
        } catch (studentError) {
          console.error('❌ Error creating test student:', studentError);
          
          // Check validation issues
          if (studentError.name === 'ValidationError') {
            for (const field in studentError.errors) {
              console.error(`  - ${field}: ${studentError.errors[field].message}`);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ Error during debugging:', error);
      } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err);
      process.exit(1);
    });
} 