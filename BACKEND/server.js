require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB, disconnectDB, getDBStatus } = require('./src/config/db');
const apiRoutes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middleware
app.use(helmet());

// CORS configuration
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://lemuria-guest-portal-fajmniecm-lemuria4.vercel.app',
  'https://lemuria-staff-portal.vercel.app'
];

const configuredOrigins = new Set([...envOrigins, ...defaultOrigins]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');

  // Exact match with configured origins
  if (configuredOrigins.has(cleanOrigin)) return true;

  // Localhost or 127.0.0.1 on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;

  // Any Vercel preview or production deployment domain
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(cleanOrigin)) return true;

  // Any Render web service domain
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.onrender\.com$/i.test(cleanOrigin)) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, origin || true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by Lemuria CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    message: 'Welcome to Lemuria Hotel Operations & Guest Services Platform API',
    database: dbStatus,
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Centralized error handler
app.use(errorHandler);

let server = null;

const attendanceService = require('./src/services/attendanceService');

// Server startup & Database initialization
const startServer = async () => {
  try {
    await connectDB();

    // Start 11:59 PM attendance auto-closure scheduler & catch-up
    attendanceService.initAttendanceScheduler();

    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(PORT, () => {
        console.log(`\n==================================================`);
        console.log(`  LEMURIA BACKEND SERVER STARTED`);
        console.log(`  Port: ${PORT}`);
        console.log(`  Health Check: http://localhost:${PORT}/api/health`);
        console.log(`  MongoDB: ${getDBStatus().state} (${getDBStatus().name})`);
        console.log(`==================================================\n`);
      });
    }
  } catch (error) {
    console.error(`[Server Startup Failed] ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

const handleShutdown = async () => {
  console.log('\n[Graceful Shutdown] Closing HTTP server and MongoDB connection...');
  attendanceService.stopAttendanceScheduler();
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed.');
    });
  }
  await disconnectDB();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

