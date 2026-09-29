const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate, authorizeRole } = require('../middleware/auth');

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
