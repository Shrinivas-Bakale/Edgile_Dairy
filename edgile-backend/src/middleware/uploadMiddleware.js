const multer = require("multer");

// Set up storage (files will be stored in memory before uploading)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
