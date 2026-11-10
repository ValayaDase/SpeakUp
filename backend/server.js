require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 8000;

// Connect to MongoDB Database
connectDB();

const server = app.listen(PORT, () => {
  console.log(`[SpeakUp Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[SpeakUp Server] API endpoint: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  // Keep server running in dev or gracefully exit
});

// Graceful termination
process.on('SIGTERM', () => {
  console.log('[SpeakUp Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[SpeakUp Server] HTTP server closed');
  });
});

