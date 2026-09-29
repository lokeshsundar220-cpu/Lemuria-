const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticate, authorizeRole, authorizeDepartment } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRole('STAFF'));
router.use(authorizeDepartment('MANAGER'));

// Staff management
router.post('/staff', managerController.addStaff);
router.get('/staff', managerController.getAllStaff);
router.put('/staff/:id', managerController.updateStaff);
router.patch('/staff/:id/status', managerController.setStaffAccountStatus);
router.delete('/staff/:id', managerController.deleteStaff);

// Workload metrics
router.get('/workload', managerController.getStaffWorkload);

module.exports = router;
