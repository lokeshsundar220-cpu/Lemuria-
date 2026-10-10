const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const staffRoutes = require('./staffRoutes');
const hotelRoutes = require('./hotelRoutes');
const roomRoutes = require('./roomRoutes');
const reservationRoutes = require('./reservationRoutes');
const taskRoutes = require('./taskRoutes');
const serviceRequestRoutes = require('./serviceRequestRoutes');
const emergencyRoutes = require('./emergencyRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const managerRoutes = require('./managerRoutes');
const notificationRoutes = require('./notificationRoutes');
const { getDBStatus } = require('../config/db');

// Health check endpoint (GET /api/health)
router.get('/health', (req, res) => {
  const db = getDBStatus();
  return res.status(200).json({
    status: 'online',
    service: 'Lemuria Hotel Platform Backend',
    timestamp: new Date().toISOString(),
    database: {
      connected: db.connected,
      state: db.state,
      name: db.name
    },
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Modular REST APIs
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/hotels', hotelRoutes);
router.use('/rooms', roomRoutes);
router.use('/reservations', reservationRoutes);
router.use('/tasks', taskRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/emergencies', emergencyRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/manager', managerRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
