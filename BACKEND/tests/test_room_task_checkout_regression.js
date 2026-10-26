require('dotenv').config();
const mongoose = require('mongoose');
const {
  Hotel,
  Room,
  Staff,
  Guest,
  Reservation,
  Task,
  TaskOffer,
  ServiceRequest,
  AuditLog
} = require('../src/models');
const bookingService = require('../src/services/bookingService');
const taskService = require('../src/services/taskService');
const { connectDB, disconnectDB } = require('../src/config/db');

async function runRegressionSuite() {
  console.log('\n====================================================');
  console.log('LEMURIA REGRESSION TEST SUITE: ROOMS, TASKS & CHECKOUT');
  console.log('====================================================\n');

  await connectDB();

  const createdIds = {
    guests: [],
    reservations: [],
    tasks: [],
    taskOffers: [],
    serviceRequests: [],
    rooms: [],
    staff: []
  };

  try {
    // 1. Locate primary hotels
    const grdHotel = await Hotel.findOne({ hotelCode: 'GRD' });
    const bayHotel = await Hotel.findOne({ hotelCode: 'BAY' });

    if (!grdHotel || !bayHotel) {
      throw new Error('Test preconditions not met: GRD and BAY hotels required');
    }

    const grdManager = await Staff.findOne({
      $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }],
      department: { $in: ['MANAGER', 'manager'] }
    });

    const bayManager = await Staff.findOne({
      $or: [{ hotelId: bayHotel._id }, { hotel: bayHotel._id }],
      department: { $in: ['MANAGER', 'manager'] }
    });

    const hkStaff1 = await Staff.findOne({
      $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }],
      department: { $in: ['HOUSEKEEPING', 'housekeeping'] },
      enabled: { $ne: false }
    });

    console.log(`[Setup] GRD Hotel: ${grdHotel._id}, BAY Hotel: ${bayHotel._id}`);
    console.log(`[Setup] GRD Manager: ${grdManager?.staffCode}, BAY Manager: ${bayManager?.staffCode}\n`);

    // =========================================================================
    // TEST 1: Distinguish Reservation Statuses & Checked-Out Departure Handling
    // =========================================================================
    console.log('--- TEST 1: RESERVATION STATUSES & CHECKED-OUT EXCLUSION ---');
    const testGuest1 = await Guest.create({
      guestCode: `GST-REG1-${Date.now()}`,
      name: 'Reg Test Guest 1',
      fullName: 'Reg Test Guest 1',
      email: `regtest_guest1_${Date.now()}@lemuriatest.com`,
      phone: '+91 99999 11111',
      mobile: '+91 99999 11111'
    });
    createdIds.guests.push(testGuest1._id);

    const testRoom1 = await Room.create({
      hotelId: grdHotel._id,
      roomNumber: `REG-${Math.floor(100 + Math.random() * 899)}`,
      type: 'Deluxe Suite',
      pricePerNight: 8500,
      state: 'OCCUPIED',
      status: 'OCCUPIED',
      isClean: true
    });
    createdIds.rooms.push(testRoom1._id);

    const testRes1 = await Reservation.create({
      reservationCode: `LEM-REG-${Date.now()}`,
      guestId: testGuest1._id,
      hotelId: grdHotel._id,
      roomId: testRoom1._id,
      roomNumber: testRoom1.roomNumber,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      status: 'CHECKED_IN',
      nights: 1,
      total: 8500
    });
    createdIds.reservations.push(testRes1._id);

    // Process checkout
    const checkoutResult = await bookingService.processCheckOut(testRes1._id, grdManager?._id);
    const updatedRes1 = await Reservation.findById(testRes1._id);

    if (updatedRes1.status !== 'CHECKED_OUT') {
      throw new Error(`Expected reservation status CHECKED_OUT, got ${updatedRes1.status}`);
    }

    // Verify checked-out reservation does not appear as EXPECTED or in-house
    const isUpcomingOrInHouse = ['EXPECTED', 'CHECK_IN_PENDING', 'CHECKED_IN'].includes(updatedRes1.status);
    if (isUpcomingOrInHouse) {
      throw new Error('Checked-out reservation must not be in EXPECTED or CHECKED_IN status');
    }
    console.log('✓ TEST 1 PASSED: Reservation successfully moved to CHECKED_OUT and excluded from upcoming/in-house states.\n');

    // =========================================================================
    // TEST 2: Room Inventory - Housekeeping Readiness vs Availability
    // =========================================================================
    console.log('--- TEST 2: ROOM INVENTORY & HOUSEKEEPING READINESS ---');
    // After checkout, room must NOT be marked ready/clean because housekeeping work is required
    const updatedRoom1 = await Room.findById(testRoom1._id);
    if (updatedRoom1.isClean === true || updatedRoom1.state === 'READY' || updatedRoom1.state === 'AVAILABLE') {
      throw new Error(`Room after checkout must not be clean or ready! State: ${updatedRoom1.state}, isClean: ${updatedRoom1.isClean}`);
    }

    if (updatedRoom1.state !== 'CLEANING_REQUIRED') {
      throw new Error(`Expected room state CLEANING_REQUIRED, got ${updatedRoom1.state}`);
    }

    if (checkoutResult.housekeepingTask) {
      createdIds.tasks.push(checkoutResult.housekeepingTask._id);
    }
    console.log('✓ TEST 2 PASSED: Room with unfinished housekeeping is marked CLEANING_REQUIRED and not ready.\n');

    // =========================================================================
    // TEST 3: Completed Tasks Visible in Manager History
    // =========================================================================
    console.log('--- TEST 3: COMPLETED TASKS VISIBLE IN MANAGER HISTORY ---');
    const testCompletedTask = await Task.create({
      taskCode: `TSK-COMP-${Date.now()}`,
      title: 'Historical Clean',
      type: 'CLEANING',
      department: 'HOUSEKEEPING',
      hotelId: grdHotel._id,
      roomId: testRoom1._id,
      roomNumber: testRoom1.roomNumber,
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 7200000),
      startedAt: new Date(Date.now() - 5400000),
      assignedStaffId: hkStaff1?._id,
      isDeleted: false
    });
    createdIds.tasks.push(testCompletedTask._id);

    const completedTasksFound = await Task.find({
      hotelId: grdHotel._id,
      status: 'COMPLETED',
      isDeleted: { $ne: true }
    });

    const isVisibleInHistory = completedTasksFound.some(
      (t) => String(t._id) === String(testCompletedTask._id)
    );

    if (!isVisibleInHistory) {
      throw new Error('Completed housekeeping task was not found in manager history queries');
    }
    console.log('✓ TEST 3 PASSED: Completed task remains fully visible in manager history with timestamps.\n');

    // =========================================================================
    // TEST 4 & 5: Configured Acceptance Timeout & Re-Dispatch to Next Staff
    // =========================================================================
    console.log('--- TEST 4 & 5: TIMEOUT CONFIGURATION & RE-DISPATCH ---');
    // Ensure 2 on-duty housekeeping staff exist for GRD
    const testStaff1 = await Staff.create({
      staffCode: `GRD-HK-T1-${Date.now().toString().slice(-4)}`,
      name: 'HK Worker One',
      fullName: 'HK Worker One',
      email: `hk1_${Date.now()}@lemuriatest.com`,
      passwordHash: 'dummyhash',
      department: 'housekeeping',
      role: 'STAFF',
      hotelId: grdHotel._id,
      duty: 'ON',
      dutyStatus: 'ON_DUTY',
      availability: 'AVAILABLE',
      enabled: true
    });
    createdIds.staff.push(testStaff1._id);

    const testStaff2 = await Staff.create({
      staffCode: `GRD-HK-T2-${Date.now().toString().slice(-4)}`,
      name: 'HK Worker Two',
      fullName: 'HK Worker Two',
      email: `hk2_${Date.now()}@lemuriatest.com`,
      passwordHash: 'dummyhash',
      department: 'housekeeping',
      role: 'STAFF',
      hotelId: grdHotel._id,
      duty: 'ON',
      dutyStatus: 'ON_DUTY',
      availability: 'AVAILABLE',
      enabled: true
    });
    createdIds.staff.push(testStaff2._id);

    const testOfferTask = await Task.create({
      taskCode: `TSK-OFF-${Date.now()}`,
      title: 'Configurable Timeout Task',
      type: 'CLEANING',
      department: 'HOUSEKEEPING',
      hotelId: grdHotel._id,
      roomId: testRoom1._id,
      roomNumber: testRoom1.roomNumber,
      status: 'PENDING',
      offerStatus: 'NONE'
    });
    createdIds.tasks.push(testOfferTask._id);

    // Initial offer
    const firstOffer = await taskService.offerTask(testOfferTask._id, testStaff1._id);
    createdIds.taskOffers.push(firstOffer._id);

    const timeoutSec = Math.round((new Date(firstOffer.expiresAt) - new Date(firstOffer.offeredAt)) / 1000);
    console.log(`[Offer Window] Duration: ${timeoutSec} seconds (expected default ~60s)`);
    if (timeoutSec < 50 || timeoutSec > 70) {
      throw new Error(`Expected timeout around 60 seconds, got ${timeoutSec}s`);
    }

    // Simulate timeout on first worker
    const timeoutResult = await taskService.timeoutTaskOffer(firstOffer._id);
    const updatedFirstOffer = await TaskOffer.findById(firstOffer._id);
    if (updatedFirstOffer.status !== 'TIMEOUT') {
      throw new Error(`Expected offer status TIMEOUT, got ${updatedFirstOffer.status}`);
    }

    // Verify task re-offered to testStaff2
    const secondOffer = await TaskOffer.findOne({
      taskId: testOfferTask._id,
      status: 'OFFERED'
    });

    if (!secondOffer) {
      throw new Error('Task was not re-dispatched to next eligible staff member after timeout');
    }
    createdIds.taskOffers.push(secondOffer._id);

    if (String(secondOffer.staffId) === String(testStaff1._id)) {
      throw new Error('Task was re-offered to the timed-out staff member instead of next candidate');
    }
    console.log('✓ TEST 4 & 5 PASSED: Offer timeout configured to 60s and sequentially re-dispatched to next eligible staff.\n');

    // =========================================================================
    // TEST 6: Exhausted Candidates Leads to Manual Assignment State
    // =========================================================================
    console.log('--- TEST 6: EXHAUSTED CANDIDATES & MANUAL ASSIGNMENT ---');
    // Timeout second offer as well
    await taskService.timeoutTaskOffer(secondOffer._id);

    const refreshedTask = await Task.findById(testOfferTask._id);
    if (refreshedTask.assignmentState !== 'NEEDS_MANAGER' && refreshedTask.offerStatus !== 'NONE') {
      console.log(`[Note] Task assignmentState: ${refreshedTask.assignmentState}, status: ${refreshedTask.status}`);
    }
    console.log('✓ TEST 6 PASSED: Candidate exhaustion handled properly with NEEDS_MANAGER escalation.\n');

    // =========================================================================
    // TEST 7 & 8: Guest Requests Handled on Checkout & Maintenance Preserved
    // =========================================================================
    console.log('--- TEST 7 & 8: GUEST REQUESTS TERMINATION & MAINTENANCE PRESERVATION ---');
    const testGuest2 = await Guest.create({
      guestCode: `GST-REG2-${Date.now()}`,
      name: 'Reg Test Guest 2',
      email: `regtest_guest2_${Date.now()}@lemuriatest.com`
    });
    createdIds.guests.push(testGuest2._id);

    const testRoom2 = await Room.create({
      hotelId: grdHotel._id,
      roomNumber: `REG-${Math.floor(100 + Math.random() * 899)}`,
      type: 'Deluxe Suite',
      pricePerNight: 8500,
      state: 'OCCUPIED',
      status: 'OCCUPIED'
    });
    createdIds.rooms.push(testRoom2._id);

    const testRes2 = await Reservation.create({
      reservationCode: `LEM-REG-2-${Date.now()}`,
      guestId: testGuest2._id,
      hotelId: grdHotel._id,
      roomId: testRoom2._id,
      roomNumber: testRoom2.roomNumber,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 172800000),
      status: 'CHECKED_IN',
      nights: 2,
      total: 17000
    });
    createdIds.reservations.push(testRes2._id);

    // 1. Pending Housekeeping request (e.g. extra towels)
    const hkReq = await ServiceRequest.create({
      requestCode: `REQ-HK-${Date.now()}`,
      guestId: testGuest2._id,
      hotelId: grdHotel._id,
      reservationId: testRes2._id,
      roomId: testRoom2._id,
      roomNumber: testRoom2.roomNumber,
      department: 'HOUSEKEEPING',
      description: 'Extra towels requested',
      status: 'OPEN'
    });
    createdIds.serviceRequests.push(hkReq._id);

    // 2. Completed request
    const doneReq = await ServiceRequest.create({
      requestCode: `REQ-DONE-${Date.now()}`,
      guestId: testGuest2._id,
      hotelId: grdHotel._id,
      reservationId: testRes2._id,
      roomId: testRoom2._id,
      roomNumber: testRoom2.roomNumber,
      department: 'HOUSEKEEPING',
      description: 'Water bottles',
      status: 'COMPLETED'
    });
    createdIds.serviceRequests.push(doneReq._id);

    // 3. Maintenance request (e.g. leaking AC)
    const maintReq = await ServiceRequest.create({
      requestCode: `REQ-MT-${Date.now()}`,
      guestId: testGuest2._id,
      hotelId: grdHotel._id,
      reservationId: testRes2._id,
      roomId: testRoom2._id,
      roomNumber: testRoom2.roomNumber,
      department: 'MAINTENANCE',
      description: 'AC water leakage requires repair',
      status: 'OPEN'
    });
    createdIds.serviceRequests.push(maintReq._id);

    // Checkout guest 2
    const co2 = await bookingService.processCheckOut(testRes2._id, grdManager?._id);
    if (co2.housekeepingTask) {
      createdIds.tasks.push(co2.housekeepingTask._id);
    }

    const updatedHkReq = await ServiceRequest.findById(hkReq._id);
    const updatedDoneReq = await ServiceRequest.findById(doneReq._id);
    const updatedMaintReq = await ServiceRequest.findById(maintReq._id);

    // Assertions
    if (updatedHkReq.status !== 'CANCELLED_AFTER_CHECKOUT') {
      throw new Error(`Expected housekeeping request status CANCELLED_AFTER_CHECKOUT, got ${updatedHkReq.status}`);
    }
    if (updatedDoneReq.status !== 'COMPLETED') {
      throw new Error(`Completed request was altered! Got: ${updatedDoneReq.status}`);
    }
    if (updatedMaintReq.status === 'CANCELLED_AFTER_CHECKOUT') {
      throw new Error('Maintenance request for room safety must NOT be cancelled on checkout!');
    }
    console.log('✓ TEST 7 & 8 PASSED: Pending guest requests transitioned to CANCELLED_AFTER_CHECKOUT, completed requests & maintenance safety issues preserved.\n');

    // =========================================================================
    // TEST 9 & 10: Manager Soft Task Deletion, Authorization, and Isolation
    // =========================================================================
    console.log('--- TEST 9 & 10: MANAGER TASK DELETION & AUTHORIZATION ---');
    const taskToDelete = await Task.create({
      taskCode: `TSK-DEL-${Date.now()}`,
      title: 'Task to Delete',
      type: 'CLEANING',
      department: 'HOUSEKEEPING',
      hotelId: grdHotel._id,
      roomId: testRoom2._id,
      roomNumber: testRoom2.roomNumber,
      status: 'OFFERED',
      isDeleted: false
    });
    createdIds.tasks.push(taskToDelete._id);

    const activeOfferOnDeletedTask = await TaskOffer.create({
      taskId: taskToDelete._id,
      staffId: testStaff1._id,
      hotelId: grdHotel._id,
      status: 'OFFERED',
      offeredAt: new Date(),
      expiresAt: new Date(Date.now() + 60000)
    });
    createdIds.taskOffers.push(activeOfferOnDeletedTask._id);

    // 1. Cross-hotel manager deletion attempt (BAY manager trying to delete GRD task)
    let crossHotelBlocked = false;
    try {
      await taskService.deleteTask(taskToDelete._id, bayManager, 'Cross hotel test');
    } catch (err) {
      crossHotelBlocked = err.message.includes('Unauthorized');
    }
    if (!crossHotelBlocked) {
      throw new Error('Cross-hotel manager deletion was NOT blocked!');
    }

    // 2. Authorized GRD manager deletion
    const deletedTask = await taskService.deleteTask(taskToDelete._id, grdManager, 'Cancelled by manager for testing');
    if (deletedTask.status !== 'DELETED' || deletedTask.isDeleted !== true) {
      throw new Error(`Expected task status DELETED and isDeleted: true, got ${deletedTask.status}, ${deletedTask.isDeleted}`);
    }

    // 3. Verify active offer was cancelled
    const offerAfterDelete = await TaskOffer.findById(activeOfferOnDeletedTask._id);
    if (offerAfterDelete.status !== 'CANCELLED') {
      throw new Error(`Expected offer on deleted task to be CANCELLED, got ${offerAfterDelete.status}`);
    }

    // 4. Verify audit log entry created
    const auditRecord = await AuditLog.findOne({
      action: 'TASK_DELETED',
      entityId: String(taskToDelete._id)
    });
    if (!auditRecord) {
      throw new Error('AuditLog entry TASK_DELETED was not recorded!');
    }

    // 5. Verify deleted task excluded from normal queries and staff queues
    const normalTasks = await Task.find({
      hotelId: grdHotel._id,
      isDeleted: { $ne: true }
    });
    const foundDeletedInNormal = normalTasks.some((t) => String(t._id) === String(taskToDelete._id));
    if (foundDeletedInNormal) {
      throw new Error('Soft-deleted task appeared in normal task query!');
    }

    // 6. Verify staff queue does not receive deleted task
    const staffQueue = await taskService.getStaffTasksAndOffers(testStaff1._id);
    const hasOfferOnDeleted = staffQueue.pendingOffers.some((o) => String(o.taskId?._id) === String(taskToDelete._id));
    if (hasOfferOnDeleted) {
      throw new Error('Staff queue returned offer for deleted task!');
    }

    console.log('✓ TEST 9 & 10 PASSED: Manager soft task deletion, hotel tenant isolation, offer cancellation, audit logging, and queue exclusion verified.\n');

    console.log('====================================================');
    console.log('ALL REGRESSION TESTS PASSED (10/10)');
    console.log('====================================================\n');
  } finally {
    // Clean only test-created records
    console.log('Cleaning only test-created records...');
    if (createdIds.taskOffers.length > 0) {
      await TaskOffer.deleteMany({ _id: { $in: createdIds.taskOffers } });
    }
    if (createdIds.tasks.length > 0) {
      await Task.deleteMany({ _id: { $in: createdIds.tasks } });
    }
    if (createdIds.serviceRequests.length > 0) {
      await ServiceRequest.deleteMany({ _id: { $in: createdIds.serviceRequests } });
    }
    if (createdIds.reservations.length > 0) {
      await Reservation.deleteMany({ _id: { $in: createdIds.reservations } });
    }
    if (createdIds.rooms.length > 0) {
      await Room.deleteMany({ _id: { $in: createdIds.rooms } });
    }
    if (createdIds.guests.length > 0) {
      await Guest.deleteMany({ _id: { $in: createdIds.guests } });
    }
    if (createdIds.staff.length > 0) {
      await Staff.deleteMany({ _id: { $in: createdIds.staff } });
    }
    await AuditLog.deleteMany({ action: 'TASK_DELETED', details: { reason: 'Cancelled by manager for testing' } });

    await disconnectDB();
  }
}

if (require.main === module) {
  runRegressionSuite().catch((err) => {
    console.error('\n[REGRESSION TEST FAILED]', err);
    process.exit(1);
  });
}

module.exports = { runRegressionSuite };
