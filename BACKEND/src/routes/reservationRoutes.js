const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate, authorizeRole, authorizeDepartment, requireOnDuty } = require('../middleware/auth');

router.use(authenticate);

// Guest routes
router.post('/book', authorizeRole('GUEST'), reservationController.createReservation);
router.get('/my-bookings', authorizeRole('GUEST'), reservationController.getGuestReservations);
router.post('/:id/request-checkin', authorizeRole('GUEST'), reservationController.requestCheckIn);

// Reception & Manager routes
const requireReceptionOrManagerForStaff = (req, res, next) => {
  if (req.user?.role === 'STAFF') {
    return authorizeDepartment('RECEPTION', 'MANAGER')(req, res, () => {
      requireOnDuty(req, res, next);
    });
  }
  next();
};

router.get('/hotel', authorizeRole('STAFF'), authorizeDepartment('RECEPTION', 'MANAGER'), reservationController.getHotelReservations);
router.post('/:id/approve-checkin', authorizeRole('STAFF', 'GUEST'), requireReceptionOrManagerForStaff, reservationController.approveCheckIn);
router.post('/:id/checkout', authorizeRole('STAFF', 'GUEST'), requireReceptionOrManagerForStaff, reservationController.processCheckOut);

module.exports = router;
