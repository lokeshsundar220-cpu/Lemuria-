const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorizeRole } = require('../middleware/auth');

router.use(authenticate);

// Feedback submission
router.post('/', authorizeRole('GUEST', 'STAFF'), feedbackController.submitFeedback);

// Staff / Manager feedback view
router.get('/', authorizeRole('STAFF'), feedbackController.getHotelFeedback);

module.exports = router;
