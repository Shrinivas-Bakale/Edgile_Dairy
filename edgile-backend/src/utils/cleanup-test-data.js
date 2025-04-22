/**
 * Cleanup Script for Test Data
 * This script removes all test data (students and faculty) from the database
 * It does NOT remove admin accounts or other data
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
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
      console.log('MongoDB connected for cleanup');
      // Start the cleanup process
      return cleanupTestData();
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
 * Function to clean up test data
 */
async function cleanupTestData() {
  try {
    console.log('Starting cleanup process...');
    
    // Count existing data
    const studentCount = await Student.countDocuments();
    const facultyCount = await Faculty.countDocuments();
    const codeCount = await RegistrationCode.countDocuments({ type: 'faculty' });
    
    console.log(`Found ${studentCount} students, ${facultyCount} faculty members, and ${codeCount} faculty registration codes`);
    
    if (studentCount === 0 && facultyCount === 0 && codeCount === 0) {
      console.log('No test data found. Nothing to clean up.');
      return;
    }
    
    // Delete test data
    console.log('Removing test data...');
    
    // Option 1: Delete all data (use with caution)
    const studentsDeleted = await Student.deleteMany({});
    const facultyDeleted = await Faculty.deleteMany({});
    const codesDeleted = await RegistrationCode.deleteMany({ type: 'faculty' });
    
    // Option 2: Delete only test data with specific pattern (safer)
    // This can be used if you have real data you want to preserve
    // const studentsDeleted = await Student.deleteMany({ email: /^student\d+@klebcahubli\.in$/ });
    // const facultyDeleted = await Faculty.deleteMany({ email: /^faculty\d+@klebcahubli\.in$/ });
    // const codesDeleted = await RegistrationCode.deleteMany({ code: /^FAC-/ });
    
    console.log(`Deleted ${studentsDeleted.deletedCount} students, ${facultyDeleted.deletedCount} faculty members, and ${codesDeleted.deletedCount} faculty registration codes`);
    
    console.log('Cleanup completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = { cleanupTestData }; 