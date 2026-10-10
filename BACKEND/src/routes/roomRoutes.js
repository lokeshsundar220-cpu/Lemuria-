const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticate, authorizeRole, authorizeDepartment, requireOnDuty } = require('../middleware/auth');

// Query rooms
router.get('/', authenticate, authorizeRole('STAFF'), roomController.getRooms);
router.get('/hotel/:hotelId', roomController.getRoomsByHotel);
router.get('/availability/:hotelId', roomController.checkAvailability);

// Room actions
router.post('/', authenticate, authorizeRole('STAFF'), authorizeDepartment('MANAGER'), roomController.createRoom);
router.patch('/:id/status', authenticate, authorizeRole('STAFF'), roomController.updateRoomStatus);
router.post('/:id/approve', authenticate, authorizeRole('STAFF'), authorizeDepartment('MANAGER'), roomController.approveRoom);
router.post('/:id/reject', authenticate, authorizeRole('STAFF'), authorizeDepartment('MANAGER'), roomController.rejectRoom);

module.exports = router;
