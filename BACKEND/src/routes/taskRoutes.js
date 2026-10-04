const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorizeRole } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRole('STAFF'));

// Task query and creation
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);

// 15-second offer acceptance / decline
router.post('/offers/:offerId/accept', taskController.acceptOffer);
router.post('/offers/:offerId/decline', taskController.declineOffer);
router.post('/offers/:offerId/timeout', taskController.timeoutOffer);

// Task assignment & execution
router.post('/:id/assign', taskController.assignTask);
router.put('/:id/assign', taskController.assignTask);
router.post('/:id/start', taskController.startTask);
router.put('/:id/start', taskController.startTask);
router.post('/:id/complete', taskController.completeTask);
router.put('/:id/complete', taskController.completeTask);

module.exports = router;
