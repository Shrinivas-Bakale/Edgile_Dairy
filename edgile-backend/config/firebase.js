const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config(); // Load environment variables

const serviceAccount = require("../../firebaseServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // From .env file
});

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };
