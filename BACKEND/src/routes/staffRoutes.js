const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authController = require('../controllers/authController');
const { authenticate, authorizeRole } = require('../middleware/auth');

// Public staff login alias (/api/staff/login)
router.post('/login', authController.loginStaff);

router.use(authenticate);
router.use(authorizeRole('STAFF'));

// Directory & Profile
router.get('/', staffController.getHotelStaff);
router.get('/me', staffController.getMyProfile);

// Duty operations
router.post('/duty/start', staffController.startDuty);
router.post('/duty/end', staffController.endDuty);
router.get('/duty/status', staffController.getDutyStatus);

module.exports = router;
