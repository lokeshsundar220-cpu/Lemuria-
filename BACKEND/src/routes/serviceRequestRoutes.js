const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const { authenticate, authorizeRole } = require('../middleware/auth');

router.use(authenticate);

// Guest and Staff routes
router.post('/', authorizeRole('GUEST', 'STAFF'), serviceRequestController.createServiceRequest);
router.get('/my-requests', authorizeRole('GUEST'), serviceRequestController.getGuestRequests);

// Staff routes
router.get('/department', authorizeRole('STAFF'), serviceRequestController.getDepartmentRequests);

module.exports = router;
