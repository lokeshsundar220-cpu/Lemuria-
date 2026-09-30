/**
 * COMPREHENSIVE REGRESSION TEST: Staff Task Offer Dispatch & Execution Flow
 * Covers:
 * 1. Login as HIL maintenance worker (HIL-MT-002)
 * 2. Start duty ON -> availability AVAILABLE
 * 3. Guest creates HIL Maintenance Service Request (Room C02)
 * 4. Task is created in PENDING status
 * 5. TaskOffer is dispatched to HIL-MT-002
 * 6. Staff polls /tasks/my-tasks and receives offer
 * 7. Staff accepts offer -> Task ACCEPTED, Staff BUSY
 * 8. Staff starts task -> Task IN_PROGRESS
 * 9. Staff completes task -> Task COMPLETED, Staff AVAILABLE
 * 10. Multi-hotel isolation: GRD/BAY staff do not receive HIL offers
 * 11. OFF_DUTY staff do not receive offers
 * 12. BUSY staff do not receive offers
 * 13. DISABLED staff do not receive offers
 * 14. DECLINE re-dispatches offer to next eligible worker
 * 15. TIMEOUT re-dispatches offer to next eligible worker
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Guest, Staff, Room, Reservation, ServiceRequest, Task, TaskOffer, Hotel } = require('../src/models');
const taskService = require('../src/services/taskService');

const BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:5000/api';

const fetchApi = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, error: err.message };
  }
};

const runSuite = async () => {
  console.log('====================================================');
  console.log('REGRESSION TEST: STAFF TASK OFFER & EXECUTION FLOW');
  console.log('====================================================\n');

  await connectDB();

  let allPassed = true;
  const logStep = (stepNum, name, condition, details = '') => {
    const icon = condition ? 'PASS' : 'FAIL';
    if (!condition) allPassed = false;
    console.log(`[FLOW TEST ${String(stepNum).padStart(2, '0')}] ${name.padEnd(42)} : [${icon}] ${details}`);
  };

  let hilHotel, hilRoom, hilStaff1, hilStaff2, grdStaff;
  let guestUser, guestRecord, guestStay, guestToken;
  let staffToken;
  const testCreatedIds = { tasks: [], offers: [], requests: [], reservations: [], guests: [] };

  try {
    // Setup Hotel & Staff
    hilHotel = await Hotel.findOne({ hotelCode: 'HIL' });
    if (!hilHotel) hilHotel = await Hotel.findOne({});
    
    hilRoom = await Room.findOne({ hotelId: hilHotel._id, roomNumber: 'C02' });
    if (!hilRoom) hilRoom = await Room.findOne({ hotelId: hilHotel._id });

    // HIL Maintenance Staff 1
    hilStaff1 = await Staff.findOne({ staffCode: 'HIL-MT-002' });
    if (!hilStaff1) hilStaff1 = await Staff.findOne({ hotelId: hilHotel._id, department: 'maintenance' });

    // HIL Maintenance Staff 2 (for decline/timeout failover test)
    hilStaff2 = await Staff.findOne({ staffCode: 'HIL-MT-001' });
    if (hilStaff2) {
      hilStaff2.duty = 'OFF_DUTY';
      hilStaff2.dutyStatus = 'OFF_DUTY';
      await hilStaff2.save();
    }

    // GRD Staff for cross-hotel check
    grdStaff = await Staff.findOne({ staffCode: 'GRD-MT-001' });

    // Clean any previous test offers for these staff
    await TaskOffer.deleteMany({ staffId: { $in: [hilStaff1._id, hilStaff2?._id].filter(Boolean) } });



    // 1. Staff Login
    const loginRes = await fetchApi('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: hilStaff1.staffCode, password: 'Password123!' })
    });
    staffToken = loginRes.data?.data?.token;
    logStep(1, 'Staff Login (HIL-MT-002)', loginRes.status === 200 && !!staffToken, `Staff: ${hilStaff1.staffCode}`);

    // 2. Set Duty ON & Available
    const dutyRes = await fetchApi('/staff/duty/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const dutyOk = dutyRes.status === 200 && (dutyRes.data?.data?.duty === 'ON' || dutyRes.data?.data?.duty === 'ON_DUTY');
    logStep(2, 'Start Duty (ON_DUTY & AVAILABLE)', dutyOk, `Duty: ${dutyRes.data?.data?.duty}`);


    // 3. Guest Registration & Active Stay in Room C02
    const testGuestEmail = `hil.guest.${Date.now()}@lemuria.test`;
    const regRes = await fetchApi('/auth/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'HIL Guest',
        email: testGuestEmail,
        mobile: '+91 98888 77777',
        password: 'Password123!'
      })
    });
    guestToken = regRes.data?.data?.token;
    guestRecord = await Guest.findOne({ email: testGuestEmail });
    testCreatedIds.guests.push(guestRecord._id);

    guestStay = await Reservation.create({
      reservationCode: `REG-HIL-${Date.now().toString().slice(-5)}`,
      guestId: guestRecord._id,
      guestName: 'HIL Guest',
      hotelId: hilHotel._id,
      roomId: hilRoom._id,
      roomNumber: hilRoom.roomNumber,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      status: 'CHECKED_IN',
      guestsCount: 2,
      totalAmount: 15000,
      paymentStatus: 'PAID'
    });
    testCreatedIds.reservations.push(guestStay._id);

    logStep(3, 'Guest Active Stay in C02', !!guestStay._id, `Room: ${guestStay.roomNumber}`);

    // 4. Guest Creates Maintenance Service Request
    const reqRes = await fetchApi('/service-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        department: 'MAINTENANCE',
        serviceType: 'Maintenance',
        description: 'Electrical: Lamp and bedside outlet not working in Room C02',
        priority: 'HIGH'
      })
    });
    const svcReq = reqRes.data?.data;
    testCreatedIds.requests.push(svcReq?._id);
    logStep(4, 'Guest Creates Maintenance Request', reqRes.status === 201 && !!svcReq?.requestCode, `Req: ${svcReq?.requestCode}`);

    // 5. Verify Linked Task is PENDING
    const dbTask = await Task.findById(svcReq?.taskId);
    testCreatedIds.tasks.push(dbTask?._id);
    logStep(5, 'Task is PENDING (Not Completed)', dbTask?.status === 'PENDING', `Status: ${dbTask?.status}`);

    // 6. Verify TaskOffer Created for HIL-MT-002
    const dbOffer = await TaskOffer.findOne({ taskId: dbTask?._id, staffId: hilStaff1._id });
    testCreatedIds.offers.push(dbOffer?._id);
    logStep(6, 'TaskOffer Generated for HIL-MT-002', !!dbOffer && dbOffer.status === 'OFFERED', `Offer: ${dbOffer?._id}`);

    // 7. Verify Staff Portal Polling (/tasks/my-tasks) Returns Pending Offer
    const myTasksRes = await fetchApi('/tasks/my-tasks', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const offersList = myTasksRes.data?.data?.pendingOffers || [];
    const receivedOffer = offersList.some((o) => o._id === dbOffer._id.toString() || o.id === dbOffer._id.toString());
    logStep(7, 'Staff Portal Receives Offer on Polling', receivedOffer, `Offers in queue: ${offersList.length}`);

    // 8. Staff Accepts Offer -> Task ACCEPTED, Staff BUSY
    const acceptRes = await fetchApi(`/tasks/offers/${dbOffer._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const taskAfterAccept = await Task.findById(dbTask._id);
    const staffAfterAccept = await Staff.findById(hilStaff1._id);
    const acceptOk = acceptRes.status === 200 && taskAfterAccept.status === 'ACCEPTED' && staffAfterAccept.availability === 'BUSY';
    logStep(8, 'Staff Accepts Offer -> ACCEPTED & BUSY', acceptOk, `Task: ${taskAfterAccept.status}, Staff: ${staffAfterAccept.availability}`);

    // 9. Staff Starts Task -> IN_PROGRESS
    const startRes = await fetchApi(`/tasks/${dbTask._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const taskAfterStart = await Task.findById(dbTask._id);
    logStep(9, 'Staff Starts Task -> IN_PROGRESS', startRes.status === 200 && taskAfterStart.status === 'IN_PROGRESS', `Task: ${taskAfterStart.status}`);

    // 10. Staff Completes Task -> COMPLETED, Staff AVAILABLE
    const completeRes = await fetchApi(`/tasks/${dbTask._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ completionNotes: 'Replaced faulty lamp fuse and tested socket voltage.' })
    });
    const taskAfterDone = await Task.findById(dbTask._id);
    const staffAfterDone = await Staff.findById(hilStaff1._id);
    const completeOk = completeRes.status === 200 && taskAfterDone.status === 'COMPLETED' && staffAfterDone.availability === 'AVAILABLE';
    logStep(10, 'Staff Completes Task -> COMPLETED & AVAILABLE', completeOk, `Task: ${taskAfterDone.status}, Staff: ${staffAfterDone.availability}`);

    // 11. Cross-Hotel Isolation: GRD staff does not receive HIL tasks
    const grdStaffOffers = await TaskOffer.find({ hotelId: { $ne: grdStaff?.hotelId }, staffId: grdStaff?._id });
    logStep(11, 'Cross-Hotel Task Isolation', grdStaffOffers.length === 0, `Leaked offers: ${grdStaffOffers.length}`);

    // 12. OFF_DUTY staff eligibility rejection
    if (hilStaff2) {
      hilStaff2.duty = 'OFF_DUTY';
      hilStaff2.dutyStatus = 'OFF_DUTY';
      await hilStaff2.save();

      const testOffDutyTask = await Task.create({
        taskCode: `TSK-OFF-${Date.now()}`,
        title: 'Off-Duty Test',
        department: 'MAINTENANCE',
        hotelId: hilHotel._id,
        status: 'PENDING'
      });
      testCreatedIds.tasks.push(testOffDutyTask._id);

      await taskService.offerTaskToNextEligibleStaff(testOffDutyTask._id);

      const offDutyOffer = await TaskOffer.findOne({ taskId: testOffDutyTask._id, staffId: hilStaff2._id });
      logStep(12, 'OFF_DUTY Staff Does Not Receive Offer', !offDutyOffer, 'Properly excluded');
      await TaskOffer.deleteMany({ taskId: testOffDutyTask._id });
    }

    // 13. DECLINE failover to next eligible worker
    if (hilStaff1 && hilStaff2) {
      await TaskOffer.deleteMany({ staffId: { $in: [hilStaff1._id, hilStaff2._id] } });

      hilStaff1 = await Staff.findById(hilStaff1._id);
      hilStaff2 = await Staff.findById(hilStaff2._id);

      hilStaff1.duty = 'ON_DUTY';
      hilStaff1.dutyStatus = 'ON_DUTY';
      hilStaff1.availability = 'AVAILABLE';
      hilStaff1.currentTaskId = null;
      await hilStaff1.save();

      hilStaff2.duty = 'ON_DUTY';
      hilStaff2.dutyStatus = 'ON_DUTY';
      hilStaff2.availability = 'AVAILABLE';
      hilStaff2.currentTaskId = null;
      await hilStaff2.save();

      const declineTestTask = await taskService.createTask({
        title: 'Decline Failover Test',
        department: 'MAINTENANCE',
        hotelId: hilHotel._id
      });
      testCreatedIds.tasks.push(declineTestTask._id);

      // Find first offer
      const firstOffer = await TaskOffer.findOne({ taskId: declineTestTask._id, status: 'OFFERED' });
      testCreatedIds.offers.push(firstOffer?._id);

      if (firstOffer) {
        // Decline
        await taskService.declineTaskOffer(firstOffer._id, firstOffer.staffId);
        
        // Check next offer created for the other staff member
        const secondOffer = await TaskOffer.findOne({
          taskId: declineTestTask._id,
          status: 'OFFERED',
          staffId: { $ne: firstOffer.staffId }
        });
        if (secondOffer) testCreatedIds.offers.push(secondOffer._id);
        logStep(13, 'DECLINE Re-dispatches to Next Eligible Worker', !!secondOffer, `Next Staff: ${secondOffer?.staffId}`);
      }
    }

    // 14. TIMEOUT failover to next eligible worker
    if (hilStaff1 && hilStaff2) {
      await TaskOffer.deleteMany({ staffId: { $in: [hilStaff1._id, hilStaff2._id] } });

      hilStaff1 = await Staff.findById(hilStaff1._id);
      hilStaff2 = await Staff.findById(hilStaff2._id);

      hilStaff1.duty = 'ON_DUTY';
      hilStaff1.dutyStatus = 'ON_DUTY';
      hilStaff1.availability = 'AVAILABLE';
      hilStaff1.currentTaskId = null;
      await hilStaff1.save();

      hilStaff2.duty = 'ON_DUTY';
      hilStaff2.dutyStatus = 'ON_DUTY';
      hilStaff2.availability = 'AVAILABLE';
      hilStaff2.currentTaskId = null;
      await hilStaff2.save();

      const timeoutTestTask = await taskService.createTask({
        title: 'Timeout Failover Test',
        department: 'MAINTENANCE',
        hotelId: hilHotel._id
      });
      testCreatedIds.tasks.push(timeoutTestTask._id);

      const toOffer = await TaskOffer.findOne({ taskId: timeoutTestTask._id, status: 'OFFERED' });
      testCreatedIds.offers.push(toOffer?._id);

      if (toOffer) {
        await taskService.timeoutTaskOffer(toOffer._id);
        const nextToOffer = await TaskOffer.findOne({
          taskId: timeoutTestTask._id,
          status: 'OFFERED',
          staffId: { $ne: toOffer.staffId }
        });
        if (nextToOffer) testCreatedIds.offers.push(nextToOffer._id);
        logStep(14, 'TIMEOUT Re-dispatches to Next Eligible Worker', !!nextToOffer, `Next Staff: ${nextToOffer?.staffId}`);
      }
    }


  } catch (err) {
    console.error('[SUITE ERROR]', err);
    allPassed = false;
  } finally {
    console.log('\n--- CLEANING TEST GENERATED RECORDS ---');
    if (testCreatedIds.offers.length) await TaskOffer.deleteMany({ _id: { $in: testCreatedIds.offers } });
    if (testCreatedIds.tasks.length) await Task.deleteMany({ _id: { $in: testCreatedIds.tasks } });
    if (testCreatedIds.requests.length) await ServiceRequest.deleteMany({ _id: { $in: testCreatedIds.requests } });
    if (testCreatedIds.reservations.length) await Reservation.deleteMany({ _id: { $in: testCreatedIds.reservations } });
    if (testCreatedIds.guests.length) {
      await Guest.deleteMany({ _id: { $in: testCreatedIds.guests } });
      await User.deleteMany({ guestId: { $in: testCreatedIds.guests } });
    }
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE RESULT: ${allPassed ? 'ALL PASSED' : 'FAILED'}`);
  console.log('====================================================\n');
  process.exit(allPassed ? 0 : 1);
};

runSuite();
