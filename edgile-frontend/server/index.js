// Mock Development Server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Import routes
const adminAuthRoutes = require('./routes/admin-auth');

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth/admin', adminAuthRoutes);

// Root route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Edgile Mock API Server',
    status: 'running',
    endpoints: {
      adminAuth: '/api/auth/admin/*'
    },
    adminAccessCode: 'admin123' // Development only information
  });
});

// Start server
app.listen(port, () => {
  console.log(`Mock API server running on port ${port}`);
  console.log('Development admin access code: admin123');
});

module.exports = app; 