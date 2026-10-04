const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Hotel, Staff, Room, Task, TaskOffer, ServiceRequest } = require('../src/models');
const taskService = require('../src/services/taskService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lemuria_production';

let passed = 0;
let failed = 0;

function logTest(num, title, ok, details = '') {
  const badge = ok ? '[✅ PASS]' : '[❌ FAIL]';
  console.log(`[TEST ${String(num).padStart(2, '0')}] ${title.padEnd(52)} : ${badge} ${details}`);
  if (ok) passed++;
  else failed++;
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('LEMURIA TASK STATUS + 15S OFFER + MANAGER ASSIGNMENT REGRESSION');
  console.log('================================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB Connected to:', mongoose.connection.name);

  // Setup hotel and clean prior test records
  const grandHotel = await Hotel.findOne({ hotelCode: 'GRD' });
  const hillsHotel = await Hotel.findOne({ hotelCode: 'HIL' });

  if (!grandHotel || !hillsHotel) {
    console.error('Hotels GRD and HIL required in DB.');
    process.exit(1);
  }

  const grandId = grandHotel._id;
  const hillsId = hillsHotel._id;

  // Cleanup test artifacts
  await Task.deleteMany({ taskCode: { $regex: /^TSK-REG-/ } });
  await TaskOffer.deleteMany({ isDemo: true });
  await Staff.deleteMany({ staffCode: { $regex: /^TEST-REG-/ } });

  // 1. Create Test Staff for Grand Hotel (HK Dept)
  // Worker A: ON_DUTY, AVAILABLE
  const workerA = await Staff.create({
    staffCode: 'TEST-REG-HK-A',
    name: 'Worker Alpha',
    fullName: 'Worker Alpha',
    email: 'alpha.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'housekeeping',
    role: 'HOUSEKEEPING',
    hotelId: grandId,
    hotelAccess: [grandId],
    enabled: true,
    accountStatus: 'ENABLED',
    duty: 'ON',
    dutyStatus: 'ON_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  // Worker B: ON_DUTY, AVAILABLE
  const workerB = await Staff.create({
    staffCode: 'TEST-REG-HK-B',
    name: 'Worker Beta',
    fullName: 'Worker Beta',
    email: 'beta.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'housekeeping',
    role: 'HOUSEKEEPING',
    hotelId: grandId,
    hotelAccess: [grandId],
    enabled: true,
    accountStatus: 'ENABLED',
    duty: 'ON',
    dutyStatus: 'ON_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  // Worker C (Hills Hotel - for isolation): ON_DUTY, AVAILABLE
  const workerC_Hills = await Staff.create({
    staffCode: 'TEST-REG-HK-C',
    name: 'Worker Charlie (Hills)',
    fullName: 'Worker Charlie (Hills)',
    email: 'charlie.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'housekeeping',
    role: 'HOUSEKEEPING',
    hotelId: hillsId,
    hotelAccess: [hillsId],
    enabled: true,
    accountStatus: 'ENABLED',
    duty: 'ON',
    dutyStatus: 'ON_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  // Worker D: OFF_DUTY
  const workerD_OffDuty = await Staff.create({
    staffCode: 'TEST-REG-HK-D',
    name: 'Worker Delta (Off Duty)',
    fullName: 'Worker Delta (Off Duty)',
    email: 'delta.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'housekeeping',
    role: 'HOUSEKEEPING',
    hotelId: grandId,
    hotelAccess: [grandId],
    enabled: true,
    accountStatus: 'ENABLED',
    duty: 'OFF',
    dutyStatus: 'OFF_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  // Worker E: DISABLED
  const workerE_Disabled = await Staff.create({
    staffCode: 'TEST-REG-HK-E',
    name: 'Worker Echo (Disabled)',
    fullName: 'Worker Echo (Disabled)',
    email: 'echo.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'housekeeping',
    role: 'HOUSEKEEPING',
    hotelId: grandId,
    hotelAccess: [grandId],
    enabled: false,
    accountStatus: 'DISABLED',
    duty: 'ON',
    dutyStatus: 'ON_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  // Manager:
  const managerGrand = await Staff.create({
    staffCode: 'TEST-REG-MG-1',
    name: 'Manager Grand',
    fullName: 'Manager Grand',
    email: 'mgr.reg@lemuria.com',
    passwordHash: 'hash',
    department: 'manager',
    role: 'MANAGER',
    hotelId: grandId,
    hotelAccess: [grandId],
    enabled: true,
    accountStatus: 'ENABLED',
    duty: 'ON',
    dutyStatus: 'ON_DUTY',
    availability: 'AVAILABLE',
    currentTaskId: null
  });

  try {
    // ---------------------------------------------------------------
    // Step 1 & 2: Task Creation & Status Initial State
    // ---------------------------------------------------------------
    const taskData = {
      title: 'Room Cleaning Test',
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      priority: 'HIGH',
      hotelId: grandId,
      roomNumber: 'C02',
      description: 'Room cleaning requested by guest',
      isDemo: true
    };

    const count = await Task.countDocuments();
    const taskCode = `TSK-REG-${String(count + 1).padStart(4, '0')}`;
    const task = await Task.create({
      taskCode,
      hotelId: grandId,
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      title: 'Room cleaning',
      description: 'Room cleaning requested by guest',
      priority: 'HIGH',
      status: 'PENDING',
      offerStatus: 'NONE',
      roomNumber: 'C02',
      offeredTo: [],
      declinedBy: [],
      isDemo: true
    });

    logTest(1, 'Task Created with Initial Status PENDING', task.status === 'PENDING', `Status: ${task.status}`);

    // ---------------------------------------------------------------
    // Step 3: Trigger Dispatch & Create 15-Second TaskOffer for Worker A
    // ---------------------------------------------------------------
    const offerA = await taskService.offerTask(task._id, workerA._id);
    const taskAfterOffer1 = await Task.findById(task._id);

    const offerA_Ok = offerA &&
      offerA.staffId.toString() === workerA._id.toString() &&
      offerA.status === 'OFFERED' &&
      taskAfterOffer1.status === 'PENDING' &&
      taskAfterOffer1.offerStatus === 'OFFERED';

    const remainingSecs = Math.round((offerA.expiresAt - offerA.offeredAt) / 1000);
    logTest(2, 'TaskOffer Created for Worker A (15s Window)', offerA_Ok && remainingSecs === 15, `Assigned: Worker A, Task Status: ${taskAfterOffer1.status}, Window: ${remainingSecs}s`);

    // ---------------------------------------------------------------
    // Step 4: Worker A Declines -> Task MUST Remain PENDING (NOT ESCALATED)
    // ---------------------------------------------------------------
    await taskService.declineTaskOffer(offerA._id, workerA._id);

    const taskAfterDeclineA = await Task.findById(task._id);
    const offerA_After = await TaskOffer.findById(offerA._id);

    logTest(3, 'Worker A Declines -> Task MUST Remain PENDING', taskAfterDeclineA.status === 'PENDING' && offerA_After.status === 'DECLINED', `Task Status: ${taskAfterDeclineA.status}, Offer A: ${offerA_After.status}`);

    // ---------------------------------------------------------------
    // Step 5: Offer to Next Eligible Worker B (Worker B gets 15s offer, Task PENDING)
    // ---------------------------------------------------------------
    const offerB = await taskService.offerTask(task._id, workerB._id);
    const taskAfterOfferB = await Task.findById(task._id);
    const offerB_Ok = offerB && offerB.status === 'OFFERED' && taskAfterOfferB.status === 'PENDING';

    logTest(4, 'Immediate Re-dispatch to Worker B (Task PENDING)', offerB_Ok, `Offer B ID: ${offerB?._id}, Status: ${offerB?.status}, Task: ${taskAfterOfferB.status}`);

    // ---------------------------------------------------------------
    // Step 6: Worker B Times Out (15s expire) -> Task MUST Remain PENDING (NOT ESCALATED)
    // ---------------------------------------------------------------
    await taskService.timeoutTaskOffer(offerB._id);

    const taskAfterTimeoutB = await Task.findById(task._id);
    const offerB_After = await TaskOffer.findById(offerB._id);

    logTest(5, 'Worker B Times Out -> Task MUST Remain PENDING', taskAfterTimeoutB.status === 'PENDING' && offerB_After.status === 'TIMEOUT', `Task Status: ${taskAfterTimeoutB.status}, Offer B: ${offerB_After.status}`);

    // ---------------------------------------------------------------
    // Step 7: Exhausted Eligible Workers -> Task Remains PENDING with NEEDS_MANAGER flag
    // ---------------------------------------------------------------
    // Exclude all available HK staff in DB so dispatcher exhausts
    const allHkStaff = await Staff.find({ department: 'housekeeping', hotelId: grandId });
    taskAfterTimeoutB.offeredTo = allHkStaff.map((s) => s._id);
    await taskAfterTimeoutB.save();

    await taskService.offerTaskToNextEligibleStaff(task._id);
    const taskExhausted = await Task.findById(task._id);
    const exhaustedOk = taskExhausted.status === 'PENDING' && taskExhausted.assignmentState === 'NEEDS_MANAGER';

    logTest(6, 'All Workers Exhausted -> Task PENDING + NEEDS_MANAGER', exhaustedOk, `Status: ${taskExhausted.status}, assignmentState: ${taskExhausted.assignmentState}`);

    // ---------------------------------------------------------------
    // Step 8: Strict Validation on Manual Assignment
    // ---------------------------------------------------------------
    // 8a. Reject assigning Hills worker to Grand task (Hotel Isolation)
    let crossHotelRejected = false;
    try {
      await taskService.assignTask(task._id, workerC_Hills._id, managerGrand._id);
    } catch (e) {
      crossHotelRejected = true;
    }
    logTest(7, 'Manager Assign: Strict Hotel Isolation Enforced', crossHotelRejected, 'Cross-hotel assignment properly rejected');

    // 8b. Reject assigning Disabled worker
    let disabledRejected = false;
    try {
      await taskService.assignTask(task._id, workerE_Disabled._id, managerGrand._id);
    } catch (e) {
      disabledRejected = true;
    }
    logTest(8, 'Manager Assign: Disabled Account Rejected', disabledRejected, 'Disabled staff assignment properly rejected');

    // ---------------------------------------------------------------
    // Step 9: Manager Manually Assigns Eligible Worker (Worker A, now available)
    // ---------------------------------------------------------------
    const assignedTask = await taskService.assignTask(task._id, workerA._id, managerGrand._id);
    const workerA_AfterAssign = await Staff.findById(workerA._id);

    const assignedStaffIdStr = (assignedTask.assignedStaffId?._id || assignedTask.assignedStaffId).toString();
    const manualAssignOk = assignedTask.status === 'ACCEPTED' &&
      assignedStaffIdStr === workerA._id.toString() &&
      assignedTask.assignmentState === 'ASSIGNED' &&
      workerA_AfterAssign.availability === 'BUSY' &&
      workerA_AfterAssign.currentTaskId.toString() === task._id.toString();

    logTest(9, 'Manager Assigns Worker -> Task ACCEPTED, Worker BUSY', manualAssignOk, `Task Status: ${assignedTask.status}, Assigned Staff: ${assignedStaffIdStr}, Worker Availability: ${workerA_AfterAssign.availability}`);

    // ---------------------------------------------------------------
    // Step 10: Assigned Worker Starts Task -> IN_PROGRESS
    // ---------------------------------------------------------------
    const startedTask = await taskService.startTask(task._id, workerA._id);
    logTest(10, 'Worker Starts Task -> IN_PROGRESS', startedTask.status === 'IN_PROGRESS', `Status: ${startedTask.status}, StartedAt: ${startedTask.startedAt}`);

    // ---------------------------------------------------------------
    // Step 11: Worker Completes Task -> COMPLETED & Worker becomes AVAILABLE
    // ---------------------------------------------------------------
    const completedTask = await taskService.completeTask(task._id, workerA._id, {
      completionNotes: 'Room cleaned thoroughly and sanitized'
    });
    const workerA_AfterComplete = await Staff.findById(workerA._id);

    const completeOk = completedTask.status === 'COMPLETED' &&
      workerA_AfterComplete.availability === 'AVAILABLE' &&
      workerA_AfterComplete.currentTaskId === null;

    logTest(11, 'Worker Completes Task -> COMPLETED, Staff AVAILABLE', completeOk, `Status: ${completedTask.status}, Staff Avail: ${workerA_AfterComplete.availability}`);

  } finally {
    // Clean test data
    await Task.deleteMany({ taskCode: { $regex: /^TSK-REG-/ } });
    await TaskOffer.deleteMany({ isDemo: true });
    await Staff.deleteMany({ staffCode: { $regex: /^TEST-REG-/ } });
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`REGRESSION TEST RESULT: ${passed}/${passed + failed} PASSED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
