const mongoose = require('mongoose');
const { Classroom } = require('../src/models/Classroom');

async function seedClassrooms() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edgile');
    console.log('Connected to MongoDB');

    // First check if classrooms already exist
    const existingCount = await Classroom.countDocuments();
    console.log(`Found ${existingCount} existing classrooms`);

    if (existingCount > 0) {
      console.log('Classrooms already exist, skipping seed');
      return;
    }

    // Sample university ID - you'll need to replace this with a valid university ID from your database
    // Get the first admin from the database who should have a university
    const universityId = process.argv[2];
    
    if (!universityId) {
      console.error('Please provide a university ID as the first argument');
      process.exit(1);
    }

    console.log(`Using university ID: ${universityId}`);

    // Define sample classrooms
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
      },
      {
        name: 'Lab 202',
        building: 'Science Building',
        floor: 2,
        capacity: 30,
        university: universityId,
        status: 'active'
      },
      {
        name: 'Lecture Hall 301',
        building: 'Arts Building',
        floor: 3,
        capacity: 100,
        university: universityId,
        status: 'active'
      }
    ];

    // Insert classrooms
    const result = await Classroom.insertMany(classrooms);
    console.log(`${result.length} classrooms inserted`);

    console.log('Classroom seed completed successfully');
  } catch (error) {
    console.error('Error seeding classrooms:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedClassrooms(); 