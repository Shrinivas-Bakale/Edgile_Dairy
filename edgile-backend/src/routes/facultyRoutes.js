const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

// This file is DEPRECATED - redirecting all requests to the new faculty routes module
router.use((req, res, next) => {
  logger.info(`[DEPRECATED] Request to old faculty routes: ${req.method} ${req.originalUrl}`);
  logger.info(`Request is being forwarded to new faculty routes structure`);
  
  // Forward to the new route structure
  const newFacultyRoutes = require('./faculty/index');
  return newFacultyRoutes(req, res, next);
});

module.exports = router;
