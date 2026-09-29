const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { authenticate, authorizeRole, authorizeDepartment } = require('../middleware/auth');

// Public / Guest / Staff access
router.get('/', hotelController.getAllHotels);
router.get('/:id', hotelController.getHotelById);

// Manager only
router.post('/', authenticate, authorizeRole('STAFF'), authorizeDepartment('MANAGER'), hotelController.createHotel);

module.exports = router;
