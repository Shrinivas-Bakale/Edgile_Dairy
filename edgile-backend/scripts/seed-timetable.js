const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Timetable = require('../src/models/Timetable');
const Admin = require('../src/models/Admin');

// Load environment variables
dotenv.config();

// Sample timetable data
const timetables = [
  {
    year: 'Second',
    semester: 3,
    division: 'A',
    academicYear: '2023-2024',
    classroomName: 'Computer Lab 1',
    days: [
      {
        day: 'Monday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS101', subjectName: 'Introduction to Programming', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS102', subjectName: 'Data Structures', type: 'Core' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS103', subjectName: 'Database Systems', type: 'Core' }
        ]
      },
      {
        day: 'Tuesday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS104', subjectName: 'Software Engineering', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS105', subjectName: 'Web Development', type: 'Elective' },
          { startTime: '14:00', endTime: '16:00', subjectCode: 'CS106', subjectName: 'Programming Lab', type: 'Lab' }
        ]
      },
      {
        day: 'Wednesday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS101', subjectName: 'Introduction to Programming', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS107', subjectName: 'Artificial Intelligence', type: 'Elective' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS103', subjectName: 'Database Systems', type: 'Core' }
        ]
      },
      {
        day: 'Thursday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS104', subjectName: 'Software Engineering', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS108', subjectName: 'Mobile App Development', type: 'Elective' },
          { startTime: '14:00', endTime: '16:00', subjectCode: 'CS109', subjectName: 'Database Lab', type: 'Lab' }
        ]
      },
      {
        day: 'Friday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS110', subjectName: 'Computer Networks', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS111', subjectName: 'Operating Systems', type: 'Core' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS112', subjectName: 'IT Project Management', type: 'Elective' }
        ]
      },
      {
        day: 'Saturday',
        slots: []
      }
    ],
    status: 'published'
  },
  {
    year: 'Second',
    semester: 3,
    division: 'B',
    academicYear: '2023-2024',
    classroomName: 'Computer Lab 2',
    days: [
      {
        day: 'Monday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS102', subjectName: 'Data Structures', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS101', subjectName: 'Introduction to Programming', type: 'Core' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS107', subjectName: 'Artificial Intelligence', type: 'Elective' }
        ]
      },
      {
        day: 'Tuesday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS103', subjectName: 'Database Systems', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS110', subjectName: 'Computer Networks', type: 'Core' },
          { startTime: '14:00', endTime: '16:00', subjectCode: 'CS109', subjectName: 'Database Lab', type: 'Lab' }
        ]
      },
      {
        day: 'Wednesday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS104', subjectName: 'Software Engineering', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS102', subjectName: 'Data Structures', type: 'Core' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS108', subjectName: 'Mobile App Development', type: 'Elective' }
        ]
      },
      {
        day: 'Thursday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS101', subjectName: 'Introduction to Programming', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS111', subjectName: 'Operating Systems', type: 'Core' },
          { startTime: '14:00', endTime: '16:00', subjectCode: 'CS106', subjectName: 'Programming Lab', type: 'Lab' }
        ]
      },
      {
        day: 'Friday',
        slots: [
          { startTime: '09:00', endTime: '10:30', subjectCode: 'CS103', subjectName: 'Database Systems', type: 'Core' },
          { startTime: '11:00', endTime: '12:30', subjectCode: 'CS104', subjectName: 'Software Engineering', type: 'Core' },
          { startTime: '14:00', endTime: '15:30', subjectCode: 'CS105', subjectName: 'Web Development', type: 'Elective' }
        ]
      },
      {
        day: 'Saturday',
        slots: []
      }
    ],
    status: 'published'
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edgile', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    return false;
  }
};

// Seed function
const seedTimetables = async () => {
  try {
    // Get the first admin (university) from the database
    const admin = await Admin.findOne();
    
    if (!admin) {
      console.error('No admin/university found in the database');
      return false;
    }
    
    console.log(`Using university: ${admin.universityName || 'Unknown'}`);
    
    // Clear existing timetables
    await Timetable.deleteMany();
    console.log('Cleared existing timetables');
    
    // Create timetables
    for (const timetableData of timetables) {
      const timetable = new Timetable({
        ...timetableData,
        university: admin._id,
        createdBy: admin._id,
        publishedAt: new Date()
      });
      
      await timetable.save();
      console.log(`Created timetable for division ${timetableData.division}`);
    }
    
    console.log('Seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Error seeding timetables:', error.message);
    return false;
  }
};

// Main function
const main = async () => {
  if (await connectDB()) {
    const success = await seedTimetables();
    if (success) {
      console.log('Successfully seeded timetable data');
    } else {
      console.error('Failed to seed timetable data');
    }
  }
  
  // Close the connection
  mongoose.connection.close();
  console.log('MongoDB connection closed');
};

// Run the main function
main(); 