require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Check if university code already exists
    const existingAdmin = await Admin.findOne({ universityCode: 'KLE-F104ED' });
    
    if (existingAdmin) {
      console.log('University admin with code KLE-F104ED already exists:');
      console.log(`Name: ${existingAdmin.name}`);
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`University: ${existingAdmin.universityName}`);
      console.log(`Status: ${existingAdmin.status}`);
      mongoose.connection.close();
      return;
    }
    
    // Create password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Create a new admin with KLE-F104ED code
    const admin = new Admin({
      name: 'KLE Admin',
      email: 'admin@klebcahubli.in',
      password: hashedPassword,
      universityName: 'KLE BCA Hubli',
      universityCode: 'KLE-F104ED',
      status: 'active',
      role: 'admin'
    });
    
    await admin.save();
    console.log('Sample university admin created successfully:');
    console.log(`Code: ${admin.universityCode}`);
    console.log(`University: ${admin.universityName}`);
    console.log(`Admin: ${admin.name} (${admin.email})`);
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