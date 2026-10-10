const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorizeRole, authorizeDepartment, requireOnDuty } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRole('STAFF'));

// Task query and creation
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);

// 15-second offer acceptance / decline
router.post('/offers/:offerId/accept', requireOnDuty, taskController.acceptOffer);
router.post('/offers/:offerId/decline', taskController.declineOffer);
router.post('/offers/:offerId/timeout', taskController.timeoutOffer);

// Task assignment (Manager/Reception only) & execution
router.post('/:id/assign', authorizeDepartment('MANAGER', 'RECEPTION'), taskController.assignTask);
router.put('/:id/assign', authorizeDepartment('MANAGER', 'RECEPTION'), taskController.assignTask);
router.post('/:id/start', requireOnDuty, taskController.startTask);
router.put('/:id/start', requireOnDuty, taskController.startTask);
router.post('/:id/complete', requireOnDuty, taskController.completeTask);
router.put('/:id/complete', requireOnDuty, taskController.completeTask);

module.exports = router;
