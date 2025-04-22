require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // List all university admins
    const admins = await Admin.find({}, 'name email universityName universityCode');
    
    console.log('\nAvailable University Codes:');
    console.log('=========================');
    
    if (admins.length === 0) {
      console.log('No university admins found in the database!');
    } else {
      admins.forEach(admin => {
        console.log(`Code: ${admin.universityCode}`);
        console.log(`University: ${admin.universityName}`);
        console.log(`Admin: ${admin.name} (${admin.email})`);
        console.log('-------------------------');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}); 