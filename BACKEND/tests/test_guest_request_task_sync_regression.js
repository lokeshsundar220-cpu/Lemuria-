require('dotenv').config();
const assert = require('assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Guest, Hotel, Room, Reservation, Task, TaskOffer, ServiceRequest } = require('../src/models');
const taskService = require('../src/services/taskService');
const bookingService = require('../src/services/bookingService');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('REGRESSION SUITE: GUEST REQUEST COUNT & STAFF TASK SYNCHRONIZATION');
  console.log('========================================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  const jwtSecret = process.env.JWT_SECRET || 'Lemuria_jwt_secret_key_2026';

  const createdRequestIds = [];
  const createdTaskIds = [];
  const createdReservationIds = [];

  try {
    // 1. Fixtures lookup
    const hotel = await Hotel.findOne({}) || await Hotel.create({
      name: 'Lemuria Test Resort',
      hotelCode: 'TST',
      code: 'test',
      city: 'Goa',
      address: '123 Beach Rd',
      rating: 5
    });

    const room = await Room.findOne({ hotelId: hotel._id }) || await Room.create({
      hotelId: hotel._id,
      roomNumber: 'T99',
      room: 'T99',
      floor: 1,
      type: 'Deluxe Suite',
      status: 'AVAILABLE',
      cleanliness: 'CLEAN'
    });

    let guest = await Guest.findOne({ email: 'test_sync_guest@example.com' });
    if (!guest) {
      guest = await Guest.create({
        name: 'Sync Test Guest',
        fullName: 'Sync Test Guest',
        email: 'test_sync_guest@example.com',
        guestCode: 'GST-SYNC01',
        mobile: '9876543210'
      });
    }

    let staff = await Staff.findOne({ staffCode: 'STF-SYNC99' });
    if (!staff) {
      staff = await Staff.create({
        hotelId: hotel._id,
        name: 'Sync Test Staff',
        fullName: 'Sync Test Staff',
        staffCode: 'STF-SYNC99',
        staffId: 'STF-SYNC99',
        email: 'staff_sync99@example.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        department: 'HOUSEKEEPING',
        role: 'STAFF',
        isOnDuty: true,
        duty: 'ON_DUTY',
        dutyStatus: 'ON_DUTY',
        availability: 'AVAILABLE',
        currentTaskId: null
      });
    } else {
      staff.duty = 'ON_DUTY';
      staff.dutyStatus = 'ON_DUTY';
      staff.isOnDuty = true;
      staff.availability = 'AVAILABLE';
      staff.currentTaskId = null;
      await staff.save();
    }

    const guestToken = jwt.sign(
      { id: guest._id, guestId: guest.guestCode, email: guest.email, role: 'GUEST' },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // Active Reservation for testing
    const activeStay = await Reservation.create({
      reservationCode: `RES-SYNC-${Date.now()}`,
      guestId: guest._id,
      hotelId: hotel._id,
      roomId: room._id,
      roomNumber: room.roomNumber || 'T99',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      total: 5000,
      status: 'CHECKED_IN'
    });
    createdReservationIds.push(activeStay._id);

    console.log('✓ Fixtures verified and active stay created.');

    // -------------------------------------------------------------------------
    // TEST 1: Service Request creation & initial offering state
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Service Request Creation and Offering State ---');
    const createRes = await fetch(`${baseUrl}/service-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        serviceType: 'Extra Towels',
        description: 'Please bring 2 extra towels'
      })
    });

    assert.strictEqual(createRes.status, 201, 'Should create request with 201');
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.data.status, 'OFFERING', 'Request status should be OFFERING upon dispatch');
    assert.ok(createData.data.taskId, 'Request should have linked taskId');

    const req1Id = createData.data._id;
    const task1Id = createData.data.taskId;
    createdRequestIds.push(req1Id);
    createdTaskIds.push(task1Id);

    const initialTask = await Task.findById(task1Id);
    assert.ok(initialTask, 'Linked task should exist in DB');
    assert.strictEqual(initialTask.serviceRequestId.toString(), req1Id.toString(), 'Task should link back to serviceRequest');
    console.log('✓ Request created, linked to Task, initial status is OFFERING.');

    // -------------------------------------------------------------------------
    // TEST 2: Duplicate Request Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Rapid Duplicate Submission Guard ---');
    const dupRes = await fetch(`${baseUrl}/service-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        serviceType: 'Extra Towels',
        description: 'Please bring 2 extra towels'
      })
    });

    assert.strictEqual(dupRes.status, 200, 'Duplicate request should return 200 without creating new entity');
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.message, 'Service request already submitted');
    assert.strictEqual(dupData.data.id, createData.data.requestCode || createData.data._id);

    const totalRequestsForDesc = await ServiceRequest.countDocuments({
      guestId: guest._id,
      description: 'Please bring 2 extra towels'
    });
    assert.strictEqual(totalRequestsForDesc, 1, 'Only one service request should exist in database');
    console.log('✓ Duplicate submission successfully guarded and deduplicated.');

    // -------------------------------------------------------------------------
    // TEST 3: Status Sync through Task Lifecycle (ACCEPTED -> IN_PROGRESS -> COMPLETED)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Task Lifecycle to ServiceRequest Status Sync ---');
    // A: Accept task
    await taskService.assignTask(task1Id, staff._id);
    let syncedReq = await ServiceRequest.findById(req1Id);
    assert.strictEqual(syncedReq.status, 'ACCEPTED', 'ServiceRequest status must synchronize to ACCEPTED');
    assert.strictEqual(syncedReq.assignedStaffId.toString(), staff._id.toString(), 'ServiceRequest assignedStaffId must be updated');
    console.log('✓ Task assignment synced to ServiceRequest: ACCEPTED');

    // B: Start task
    await taskService.startTask(task1Id, staff._id);
    syncedReq = await ServiceRequest.findById(req1Id);
    assert.strictEqual(syncedReq.status, 'IN_PROGRESS', 'ServiceRequest status must synchronize to IN_PROGRESS');
    console.log('✓ Task start synced to ServiceRequest: IN_PROGRESS');

    // C: Complete task
    await taskService.completeTask(task1Id, staff._id, { notes: 'Delivered towels to room' });
    syncedReq = await ServiceRequest.findById(req1Id);
    assert.strictEqual(syncedReq.status, 'COMPLETED', 'ServiceRequest status must synchronize to COMPLETED');
    console.log('✓ Task completion synced to ServiceRequest: COMPLETED');

    // -------------------------------------------------------------------------
    // TEST 4: Guest Request List Scoping (Active Stay vs History)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Active Stay Request Scoping & Counting ---');
    // Create a 2nd request for the active stay (stays active)
    const activeReq2 = await ServiceRequest.create({
      requestCode: `REQ-SYNC-${Date.now()}-A`,
      guestId: guest._id,
      hotelId: hotel._id,
      reservationId: activeStay._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      department: 'HOUSEKEEPING',
      description: 'Need extra pillows',
      status: 'OFFERING'
    });
    createdRequestIds.push(activeReq2._id);

    // Create an old past reservation that is CHECKED_OUT with an old request
    const pastStay = await Reservation.create({
      reservationCode: `RES-PAST-${Date.now()}`,
      guestId: guest._id,
      hotelId: hotel._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      checkInDate: new Date(Date.now() - 7 * 86400000),
      checkOutDate: new Date(Date.now() - 5 * 86400000),
      total: 5000,
      status: 'CHECKED_OUT'
    });
    createdReservationIds.push(pastStay._id);

    const pastReq = await ServiceRequest.create({
      requestCode: `REQ-SYNC-${Date.now()}-P`,
      guestId: guest._id,
      hotelId: hotel._id,
      reservationId: pastStay._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      department: 'HOUSEKEEPING',
      description: 'Old checkout request',
      status: 'OFFERING' // Intentionally left in offering to test reconciliation
    });
    createdRequestIds.push(pastReq._id);

    // Fetch default guest requests (should scope to activeStay)
    const listRes = await fetch(`${baseUrl}/service-requests/my-requests`, {
      headers: {
        Authorization: `Bearer ${guestToken}`
      }
    });
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.strictEqual(listData.success, true);

    const returnedIds = listData.data.map((r) => r.requestCode);
    assert.ok(returnedIds.includes(createData.data.requestCode), 'Should include completed request from current stay');
    assert.ok(returnedIds.includes(activeReq2.requestCode), 'Should include active request from current stay');
    assert.ok(!returnedIds.includes(pastReq.requestCode), 'Must NOT include request from past checked-out stay');

    // Count active requests in active stay: only activeReq2 is active, req1 is COMPLETED
    const activeCount = listData.data.filter(
      (r) => !['COMPLETED', 'RESOLVED', 'CANCELLED', 'DECLINED', 'CANCELLED_AFTER_CHECKOUT', 'CLOSED_AFTER_CHECKOUT'].includes((r.status || '').toUpperCase())
    ).length;
    assert.strictEqual(activeCount, 1, 'Guest must have exactly 1 active request');
    console.log('✓ Default request list correctly scoped to active stay. Exactly 1 active request found.');

    // Fetch with ?all=true (should include past request, auto-reconciled so it does not linger as OFFERING)
    const allRes = await fetch(`${baseUrl}/service-requests/my-requests?all=true`, {
      headers: {
        Authorization: `Bearer ${guestToken}`
      }
    });
    assert.strictEqual(allRes.status, 200);
    const allData = await allRes.json();
    const allReqCodes = allData.data.map((r) => r.requestCode);
    assert.ok(allReqCodes.includes(pastReq.requestCode), 'Should include past request when ?all=true');

    const reconciledPastReq = allData.data.find((r) => r.requestCode === pastReq.requestCode);
    assert.strictEqual(reconciledPastReq.status, 'CANCELLED_AFTER_CHECKOUT', 'Past request must be reconciled away from OFFERING');
    console.log('✓ Historical query with ?all=true returns past requests safely reconciled to closed state.');

    // -------------------------------------------------------------------------
    // TEST 5: Reservation Checkout Auto-Reconciles Open Requests
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Checkout Lifecycle Handling of Open Requests ---');
    // Create a new stay with 1 maintenance request and 1 housekeeping request
    const checkoutStay = await Reservation.create({
      reservationCode: `RES-CO-${Date.now()}`,
      guestId: guest._id,
      hotelId: hotel._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      total: 5000,
      status: 'CHECKED_IN'
    });
    createdReservationIds.push(checkoutStay._id);

    const maintReq = await ServiceRequest.create({
      requestCode: `REQ-M-${Date.now()}`,
      guestId: guest._id,
      hotelId: hotel._id,
      reservationId: checkoutStay._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      department: 'MAINTENANCE',
      description: 'Leaking pipe under sink',
      status: 'OFFERING'
    });
    createdRequestIds.push(maintReq._id);

    const hkReq = await ServiceRequest.create({
      requestCode: `REQ-HK-${Date.now()}`,
      guestId: guest._id,
      hotelId: hotel._id,
      reservationId: checkoutStay._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      department: 'HOUSEKEEPING',
      description: 'Extra soap requested',
      status: 'OFFERING'
    });
    createdRequestIds.push(hkReq._id);

    // Perform check-out
    await bookingService.processCheckOut(checkoutStay._id);

    const updatedMaintReq = await ServiceRequest.findById(maintReq._id);
    const updatedHkReq = await ServiceRequest.findById(hkReq._id);

    assert.strictEqual(updatedMaintReq.status, 'CLOSED_AFTER_CHECKOUT', 'Maintenance request should be CLOSED_AFTER_CHECKOUT');
    assert.strictEqual(updatedHkReq.status, 'CANCELLED_AFTER_CHECKOUT', 'Housekeeping request should be CANCELLED_AFTER_CHECKOUT');
    console.log('✓ Check-out correctly sets CLOSED_AFTER_CHECKOUT and CANCELLED_AFTER_CHECKOUT.');

    console.log('\n========================================================================');
    console.log('ALL REGRESSION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================================================\n');
  } finally {
    // Cleanup created test documents
    if (createdRequestIds.length > 0) {
      await ServiceRequest.deleteMany({ _id: { $in: createdRequestIds } });
    }
    if (createdTaskIds.length > 0) {
      await Task.deleteMany({ _id: { $in: createdTaskIds } });
      await TaskOffer.deleteMany({ taskId: { $in: createdTaskIds } });
    }
    if (createdReservationIds.length > 0) {
      await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
    }
    await Staff.deleteMany({ staffCode: 'STF-SYNC99' });
    await Guest.deleteMany({ email: 'test_sync_guest@example.com' });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

runRegressionSuite().catch((err) => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
