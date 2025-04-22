const mongoose = require('mongoose');
const { Subject } = require('../src/models/Subject');

async function seedSubjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edgile');
    console.log('Connected to MongoDB');

    // First check if subjects already exist
    const existingCount = await Subject.countDocuments();
    console.log(`Found ${existingCount} existing subjects`);

    if (existingCount > 0) {
      console.log('Subjects already exist, skipping seed');
      return;
    }

    // Sample university ID - you'll need to replace this with a valid university ID from your database
    const universityId = process.argv[2];
    
    if (!universityId) {
      console.error('Please provide a university ID as the first argument');
      process.exit(1);
    }

    console.log(`Using university ID: ${universityId}`);

    // Define color mapping for subject types
    const colorMap = {
      core: '#4285F4',    // Blue
      elective: '#34A853', // Green
      lab: '#FBBC05',     // Yellow
      theory: '#EA4335',  // Red
      project: '#8F44AD'  // Purple
    };

    // Define sample subjects for different years and semesters
    const subjects = [
      // First Year, Semester 1
      {
        code: 'CS101',
        name: 'Introduction to Computer Science',
        year: 'First',
        semester: 1,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'MATH101',
        name: 'Calculus I',
        year: 'First',
        semester: 1,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'PHY101',
        name: 'Physics I',
        year: 'First',
        semester: 1,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'ENG101',
        name: 'English Composition',
        year: 'First',
        semester: 1,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS101L',
        name: 'Computer Science Lab',
        year: 'First',
        semester: 1,
        creditHours: 1,
        type: 'lab',
        color: colorMap.lab,
        university: universityId
      },
      
      // First Year, Semester 2
      {
        code: 'CS102',
        name: 'Data Structures',
        year: 'First',
        semester: 2,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'MATH102',
        name: 'Calculus II',
        year: 'First',
        semester: 2,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'PHY102',
        name: 'Physics II',
        year: 'First',
        semester: 2,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS102L',
        name: 'Data Structures Lab',
        year: 'First',
        semester: 2,
        creditHours: 1,
        type: 'lab',
        color: colorMap.lab,
        university: universityId
      },
      
      // Second Year, Semester 3
      {
        code: 'CS201',
        name: 'Algorithms',
        year: 'Second',
        semester: 3,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS202',
        name: 'Database Systems',
        year: 'Second',
        semester: 3,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS203',
        name: 'Computer Networks',
        year: 'Second',
        semester: 3,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      
      // Second Year, Semester 4
      {
        code: 'CS204',
        name: 'Operating Systems',
        year: 'Second',
        semester: 4,
        creditHours: 4,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS205',
        name: 'Software Engineering',
        year: 'Second',
        semester: 4,
        creditHours: 3,
        type: 'core',
        color: colorMap.core,
        university: universityId
      },
      {
        code: 'CS206',
        name: 'Web Development',
        year: 'Second',
        semester: 4,
        creditHours: 3,
        type: 'elective',
        color: colorMap.elective,
        university: universityId
      }
    ];

    // Insert subjects
    const result = await Subject.insertMany(subjects);
    console.log(`${result.length} subjects inserted`);

    console.log('Subject seed completed successfully');
  } catch (error) {
    console.error('Error seeding subjects:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedSubjects(); 