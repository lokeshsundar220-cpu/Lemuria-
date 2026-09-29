const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Staff auth
router.post('/staff/login', authController.loginStaff);

// Guest auth
router.post('/guest/otp/request', authController.requestGuestOTP);
router.post('/guest/otp/verify', authController.verifyGuestOTP);
router.post('/guest/login', authController.loginGuestPassword);
router.post('/guest/register', authController.registerGuest);

// Current user profile
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
