const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

const PORT = 5173;

console.log('Starting test server...');
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running on http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
}); 