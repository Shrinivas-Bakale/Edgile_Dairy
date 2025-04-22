const mongoose = require('mongoose');
const { Classroom } = require('../src/models/Classroom');
const { Subject } = require('../src/models/Subject');
const { Admin } = require('../src/models/Admin');

async function createMockData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edgile');
    console.log('Connected to MongoDB');

    // Find the first admin
    const admin = await Admin.findOne();
    if (!admin) {
      console.error('No admin found in the database');
      process.exit(1);
    }

    const universityId = admin._id;
    console.log(`Using admin with ID: ${universityId}`);

    // Check if classrooms exist
    const classroomCount = await Classroom.countDocuments();
    console.log(`Found ${classroomCount} classrooms`);

    // Check if subjects exist
    const subjectCount = await Subject.countDocuments();
    console.log(`Found ${subjectCount} subjects`);

    // Create classrooms if none exist
    if (classroomCount === 0) {
      console.log('Creating mock classrooms...');
      const classrooms = [
        {
          name: 'Room 101',
          building: 'Main Building',
          floor: 1,
          capacity: 50,
          university: universityId,
          status: 'active'
        },
        {
          name: 'Room 102',
          building: 'Main Building',
          floor: 1,
          capacity: 40,
          university: universityId,
          status: 'active'
        },
        {
          name: 'Lab 201',
          building: 'Science Building',
          floor: 2,
          capacity: 30,
          university: universityId,
          status: 'active'
        }
      ];

      const createdClassrooms = await Classroom.insertMany(classrooms);
      console.log(`Created ${createdClassrooms.length} classrooms`);
    }

    // Create subjects if none exist
    if (subjectCount === 0) {
      console.log('Creating mock subjects...');
      const subjects = [
        {
          code: 'CS101',
          name: 'Introduction to Computer Science',
          year: 'First',
          semester: 1,
          creditHours: 4,
          type: 'core',
          color: '#4285F4',
          university: universityId
        },
        {
          code: 'MATH101',
          name: 'Calculus I',
          year: 'First',
          semester: 1,
          creditHours: 3,
          type: 'core',
          color: '#4285F4',
          university: universityId
        },
        {
          code: 'PHY101',
          name: 'Physics I',
          year: 'First',
          semester: 1,
          creditHours: 4,
          type: 'core',
          color: '#4285F4',
          university: universityId
        }
      ];

      const createdSubjects = await Subject.insertMany(subjects);
      console.log(`Created ${createdSubjects.length} subjects`);
    }
    
    console.log('Script completed successfully');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createMockData(); 