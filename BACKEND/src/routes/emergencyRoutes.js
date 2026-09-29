const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate, authorizeRole } = require('../middleware/auth');

router.use(authenticate);

// Emergency submission (free text)
router.post('/', authorizeRole('GUEST', 'STAFF'), emergencyController.createEmergencyRequest);

// Staff emergency monitoring and response
router.get('/active', authorizeRole('STAFF'), emergencyController.getActiveEmergencies);
router.post('/:id/respond', authorizeRole('STAFF'), emergencyController.respondToEmergency);
router.post('/:id/resolve', authorizeRole('STAFF'), emergencyController.resolveEmergency);

module.exports = router;
