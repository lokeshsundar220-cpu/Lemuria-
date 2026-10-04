require('dotenv').config();
const mongoose = require('mongoose');
const { Staff, Task, TaskOffer, Hotel, Reservation, Room } = require('../src/models');
const taskService = require('../src/services/taskService');

async function testHillsFlow() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lemuria_production');
  console.log('Connected to MongoDB');

  // 1. Locate Hills Hotel and Staff HIL-HK-001
  const hills = await Hotel.findOne({ $or: [{ code: 'HIL' }, { name: /Hills/i }] });
  if (!hills) throw new Error('Hills hotel not found');

  const staff = await Staff.findOne({ staffCode: 'HIL-HK-001' });
  if (!staff) throw new Error('Staff HIL-HK-001 not found');

  console.log('Found Staff:', staff.staffCode, staff.name, 'Hotel:', hills.code, 'Duty:', staff.dutyStatus, 'Avail:', staff.availability);

  // Ensure staff is ON_DUTY, AVAILABLE, enabled
  staff.duty = 'ON_DUTY';
  staff.dutyStatus = 'ON_DUTY';
  staff.availability = 'AVAILABLE';
  staff.availabilityStatus = 'AVAILABLE';
  staff.currentTaskId = null;
  staff.accountStatus = 'ENABLED';
  staff.enabled = true;
  await staff.save();

  // Clean any existing active offers for this staff
  await TaskOffer.deleteMany({ staffId: staff._id, status: 'OFFERED' });

  // 2. Create a Room C02 task
  console.log('\n--- Creating Task for Room C02 ---');
  const task = await taskService.createTask({
    title: 'Room cleaning: Extra Towels & Linen Refresh',
    description: 'Guest requested complete room cleaning and fresh linen',
    department: 'HOUSEKEEPING',
    priority: 'HIGH',
    hotelId: hills._id,
    roomNumber: 'C02',
    isDemo: false
  });

  console.log('Task Created:', task.taskCode, 'Status:', task.status, 'OfferStatus:', task.offerStatus);
  if (task.status !== 'PENDING') throw new Error(`Expected PENDING, got ${task.status}`);

  // 3. Verify TaskOffer created for HIL-HK-001
  const activeOffer = await TaskOffer.findOne({
    taskId: task._id,
    staffId: staff._id,
    status: 'OFFERED',
    expiresAt: { $gt: new Date() }
  });

  if (!activeOffer) throw new Error('TaskOffer was NOT created for HIL-HK-001!');
  console.log('✅ Active TaskOffer verified:', activeOffer._id, 'ExpiresAt:', activeOffer.expiresAt);

  // 4. Test API response for GET /tasks/my-tasks
  const pendingOffers = await TaskOffer.find({
    staffId: staff._id,
    status: 'OFFERED',
    expiresAt: { $gt: new Date() }
  }).populate('taskId');

  console.log('Pending offers count for staff:', pendingOffers.length);
  if (pendingOffers.length === 0) throw new Error('Pending offers empty for staff!');

  // 5. Accept Offer
  console.log('\n--- Accepting Offer ---');
  const acceptResult = await taskService.acceptTaskOffer(activeOffer._id, staff._id);
  console.log('Accepted:', acceptResult.task.taskCode, 'New Task Status:', acceptResult.task.status);
  if (acceptResult.task.status !== 'ACCEPTED') throw new Error('Task should be ACCEPTED');

  const updatedStaff = await Staff.findById(staff._id);
  console.log('Staff availability:', updatedStaff.availability, 'CurrentTaskId:', updatedStaff.currentTaskId);
  if (updatedStaff.availability !== 'BUSY') throw new Error('Staff should be BUSY');

  // 6. Start Task
  console.log('\n--- Starting Task ---');
  const startedTask = await taskService.startTask(task._id, staff._id);
  console.log('Started Task Status:', startedTask.status, 'StartedAt:', startedTask.startedAt);
  if (startedTask.status !== 'IN_PROGRESS') throw new Error('Task should be IN_PROGRESS');

  // 7. Complete Task
  console.log('\n--- Completing Task ---');
  const completedTask = await taskService.completeTask(task._id, staff._id, { notes: 'Room clean & inspected' });
  console.log('Completed Task Status:', completedTask.status, 'CompletedAt:', completedTask.completedAt);
  if (completedTask.status !== 'COMPLETED') throw new Error('Task should be COMPLETED');

  const finalStaff = await Staff.findById(staff._id);
  console.log('Final Staff availability:', finalStaff.availability, 'CurrentTaskId:', finalStaff.currentTaskId);
  if (finalStaff.availability !== 'AVAILABLE') throw new Error('Staff should be AVAILABLE');

  console.log('\n========================================');
  console.log('ALL HILLS C02 HOUSEKEEPING TESTS PASSED!');
  console.log('========================================\n');

  await mongoose.disconnect();
}

testHillsFlow().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
