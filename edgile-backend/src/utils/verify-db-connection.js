/**
 * MongoDB Connection Verification Script
 * Use this script to test if your MongoDB connection works
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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

// Get MongoDB URI from environment variable
let MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MongoDB connection string not found in environment variables.');
  console.error('The main application uses MONGO_URI in your .env file.');
  console.error('Please make sure you have MONGO_URI set in your .env file.');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('MongoDB URI: ', (uri) => {
    if (uri && uri.startsWith('mongodb')) {
      console.log('Using provided URI to connect...');
      MONGODB_URI = uri;
      testConnection(uri);
    } else {
      console.log('No valid URI provided. Exiting.');
      process.exit(1);
    }
    readline.close();
  });
} else {
  // Log connection attempt with masked credentials
  const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':******@');
  console.log(`Found MongoDB URI in environment: ${maskedUri}`);
  testConnection(MONGODB_URI);
}

async function testConnection(uri) {
  console.log('Testing connection to MongoDB...');
  
  try {
    // Connect to MongoDB with a short timeout
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });
    
    console.log('✅ Connection successful!');
    
    // Get database information
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    const serverInfo = await adminDb.serverInfo();
    
    console.log(`\nConnected to: ${mongoose.connection.name}`);
    console.log(`MongoDB version: ${serverInfo.version}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\nCollections in database: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('Collection names:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    console.log('\nYour MongoDB connection is working correctly!');
    console.log('You can now run the seed script with: npm run seed');
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error details:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nPossible issues:');
      console.error('1. You might be trying to connect to a local MongoDB that is not running');
      console.error('2. The connection string might be incorrect');
      console.error('3. Network issues or firewalls might be blocking the connection');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.error('\nAuthentication failed - please check your username and password in the connection string');
    }
    
    console.error('\nCorrect MongoDB Atlas connection string format:');
    console.error('mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
  } finally {
    // Close the connection
    await mongoose.connection.close();
    process.exit(0);
  }
} 