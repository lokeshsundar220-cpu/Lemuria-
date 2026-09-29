const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate, authorizeRole, authorizeDepartment } = require('../middleware/auth');

router.use(authenticate);

// Guest routes
router.post('/book', authorizeRole('GUEST'), reservationController.createReservation);
router.get('/my-bookings', authorizeRole('GUEST'), reservationController.getGuestReservations);
router.post('/:id/request-checkin', authorizeRole('GUEST'), reservationController.requestCheckIn);

// Reception & Manager routes
router.get('/hotel', authorizeRole('STAFF'), authorizeDepartment('RECEPTION', 'MANAGER'), reservationController.getHotelReservations);
router.post('/:id/approve-checkin', authorizeRole('STAFF', 'GUEST'), reservationController.approveCheckIn);
router.post('/:id/checkout', authorizeRole('STAFF', 'GUEST'), reservationController.processCheckOut);

module.exports = router;
