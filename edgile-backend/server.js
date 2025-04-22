require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set development mode if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('Environment not specified, defaulting to development mode');
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Set connection options for MongoDB Atlas
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };
    
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGO_URI ? 'Present' : 'Missing');
    
    // Try connecting to the specified MongoDB instance (Atlas or local)
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('MongoDB Connected Successfully');
    return true;
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    console.log('Setting up in-memory MongoDB server for development...');
    
    // If connection fails, set up in-memory MongoDB server for development
    try {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('In-memory MongoDB Connected Successfully');
      
      // Save the mongod instance to app for later cleanup if needed
      app.mongod = mongod;
      return true;
    } catch (inMemoryErr) {
      console.error('In-memory MongoDB Connection Error:', inMemoryErr);
      return false;
    }
  }
};

// Start server
const PORT = process.env.PORT || 5001;

// Start the application
const startServer = async () => {
  console.log('Starting application...');
  
  try {
    // Connect to database first
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    console.log('Database connected, starting server...');
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log('Available routes:');
      console.log('- GET  /health');
      console.log('- GET  /');
      console.log('- GET  /api/test');
      console.log('- POST /api/admin/auth/verify-access-code');
      console.log('- POST /api/admin/auth/verify-super-admin-code');
      console.log('- POST /api/admin/auth/generate-otp');
      console.log('- POST /api/admin/auth/verify-otp');
      console.log('- POST /api/admin/auth/login');
      console.log('- POST /api/student/auth/verify-code');
      console.log('- POST /api/student/auth/verify-otp');
      console.log('- POST /api/student/auth/complete-registration');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (app.mongod) {
    app.mongod.stop();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
}); 