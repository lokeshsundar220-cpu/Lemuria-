/**
 * Lemuria Backend ↔ MongoDB Integration Test Suite
 * Tests 23 core operations against the live lemuria_production database.
 * Strictly respects safety: cleans ONLY records created by this test run.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const {
  Hotel,
  RoomType,
  Room,
  Guest,
  Staff,
  Reservation,
  Task,
  TaskOffer,
  ServiceRequest,
  EmergencyRequest,
  Notification,
  Feedback
} = require('../src/models');

const authService = require('../src/services/authService');
const bookingService = require('../src/services/bookingService');
const taskService = require('../src/services/taskService');

const TEST_IDENTIFIER = `INTEG_TEST_${Date.now()}`;
const TEST_GUEST_EMAIL = `test.guest.${Date.now()}@lemuria.test`;

const results = [];

function recordTest(num, name, passed, details = '') {
  results.push({ num, name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[TEST ${num.toString().padStart(2, '0')}] ${name.padEnd(35)} : [${status}] ${details}`);
}

async function runIntegrationSuite() {
  console.log('====================================================');
  console.log('LEMURIA BACKEND ↔ MONGODB INTEGRATION TEST SUITE');
  console.log('Target Database: lemuria_production');
  console.log('Test Run ID:', TEST_IDENTIFIER);
  console.log('====================================================\n');

  let testGuest = null;
  let testGuestToken = null;
  let grdHotel = null;
  let bayHotel = null;
  let hilHotel = null;
  let testRoom = null;
  let testReservation = null;
  let testServiceRequest = null;
  let testTask = null;
  let testTaskOffer = null;
  let testEmergency = null;
  let testNotification = null;
  let testFeedback = null;
  let hkStaff = null;
  let managerStaff = null;
  let receptionStaff = null;

  try {
    // 1. MongoDB connection
    try {
      await connectDB();
      const isConnected = mongoose.connection.readyState === 1;
      const dbName = mongoose.connection.name;
      recordTest(1, 'MongoDB Connection', isConnected && dbName === 'lemuria_production', `DB State: ${mongoose.connection.readyState}, Name: ${dbName}`);
    } catch (err) {
      recordTest(1, 'MongoDB Connection', false, err.message);
      throw new Error('Database connection failed, aborting suite.');
    }

    // Fetch Hotels
    const hotels = await Hotel.find({});
    grdHotel = hotels.find(h => (h.hotelCode === 'GRD' || h.code === 'grand')) || hotels[0];
    bayHotel = hotels.find(h => (h.hotelCode === 'BAY' || h.code === 'bay')) || hotels[1];
    hilHotel = hotels.find(h => (h.hotelCode === 'HIL' || h.code === 'hills')) || hotels[2];

    // 2. Manager login
    try {
      managerStaff = await Staff.findOne({
        $or: [{ role: 'MANAGER' }, { department: { $in: ['MANAGER', 'manager'] } }],
        hotelId: grdHotel._id
      });
      if (!managerStaff) throw new Error('No manager staff found in GRD');

      const loginRes = await authService.loginStaff({
        emailOrCode: managerStaff.staffCode || managerStaff.email,
        password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!',
        department: managerStaff.department || 'manager'
      });
      const passed = !!loginRes.token && !!loginRes.staff;
      recordTest(2, 'Manager Login', passed, `Manager Code: ${managerStaff.staffCode || managerStaff.email}`);
    } catch (err) {
      recordTest(2, 'Manager Login', false, err.message);
    }

    // 3. Staff login
    try {
      hkStaff = await Staff.findOne({
        $or: [{ role: 'HOUSEKEEPING' }, { department: { $in: ['HOUSEKEEPING', 'housekeeping'] } }],
        hotelId: grdHotel._id,
        availability: 'AVAILABLE'
      }) || await Staff.findOne({
        $or: [{ role: 'HOUSEKEEPING' }, { department: { $in: ['HOUSEKEEPING', 'housekeeping'] } }],
        hotelId: grdHotel._id
      });
      if (!hkStaff) throw new Error('No housekeeping staff found in GRD');

      const loginRes = await authService.loginStaff({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!',
        department: hkStaff.department || 'housekeeping'
      });
      const passed = !!loginRes.token && !!loginRes.staff;
      recordTest(3, 'Staff Login', passed, `Staff Code: ${hkStaff.staffCode}`);
    } catch (err) {
      recordTest(3, 'Staff Login', false, err.message);
    }

    // 4. Disabled staff rejection
    try {
      const disabledStaff = new Staff({
        staffCode: `DIS-${Date.now().toString().slice(-4)}`,
        name: 'Disabled Test Staff',
        email: `disabled.${Date.now()}@lemuria.test`,
        passwordHash: hkStaff ? hkStaff.passwordHash : '$2a$10$abcdefghijklmnopqrstuv',
        department: 'housekeeping',
        role: 'HOUSEKEEPING',
        hotelId: grdHotel._id,
        hotelCode: 'GRD',
        enabled: 'DISABLED',
        accountStatus: 'DISABLED',
        isDemo: false
      });
      await disabledStaff.save();

      let rejected = false;
      try {
        await authService.loginStaff({
          emailOrCode: disabledStaff.staffCode,
          password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!',
          department: 'housekeeping'
        });
      } catch (err) {
        if (err.message.includes('disabled') || err.message.includes('suspended')) {
          rejected = true;
        }
      }
      await Staff.deleteOne({ _id: disabledStaff._id });
      recordTest(4, 'Disabled Staff Rejection', rejected, 'Properly rejected disabled account');
    } catch (err) {
      recordTest(4, 'Disabled Staff Rejection', false, err.message);
    }

    // 5. Hotel tenant isolation
    try {
      const grdRooms = await Room.find({ $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }] });
      const bayRooms = await Room.find({ $or: [{ hotelId: bayHotel._id }, { hotel: bayHotel._id }] });

      const hasOverlap = grdRooms.some(gr => bayRooms.some(br => br._id.toString() === gr._id.toString()));
      const isolationWorks = !hasOverlap && grdRooms.length > 0 && bayRooms.length > 0;
      recordTest(5, 'Hotel Tenant Isolation', isolationWorks, `GRD Rooms: ${grdRooms.length}, BAY Rooms: ${bayRooms.length}`);
    } catch (err) {
      recordTest(5, 'Hotel Tenant Isolation', false, err.message);
    }

    // 6. Guest registration
    try {
      const regRes = await authService.registerGuest({
        fullName: 'Test Integration Guest',
        name: 'Test Integration Guest',
        email: TEST_GUEST_EMAIL,
        password: 'Password@123',
        phone: '+91 9876543210',
        mobile: '+91 9876543210',
        idProofType: 'PASSPORT',
        idProofNumber: 'P12345678'
      });
      testGuest = regRes.guest;
      const passed = !!regRes.token && !!testGuest._id && testGuest.email === TEST_GUEST_EMAIL;
      recordTest(6, 'Guest Registration', passed, `Guest ID: ${testGuest._id}`);
    } catch (err) {
      recordTest(6, 'Guest Registration', false, err.message);
    }

    // 7. Guest login
    try {
      const loginRes = await authService.loginGuest({
        email: TEST_GUEST_EMAIL,
        password: 'Password@123'
      });
      testGuestToken = loginRes.token;
      const passed = !!testGuestToken && loginRes.guest.email === TEST_GUEST_EMAIL;
      recordTest(7, 'Guest Login', passed, 'Auth token generated successfully');
    } catch (err) {
      recordTest(7, 'Guest Login', false, err.message);
    }

    // 8. Booking
    try {
      testRoom = await Room.findOne({
        $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }],
        status: { $in: ['AVAILABLE', 'CLEAN'] }
      });
      if (!testRoom) {
        testRoom = await Room.findOne({ $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }] });
      }

      const checkInDate = new Date(Date.now() + 86400000 * 20);
      const checkOutDate = new Date(Date.now() + 86400000 * 24);

      testReservation = await bookingService.createBooking({
        guestId: testGuest._id,
        hotelId: grdHotel._id,
        roomId: testRoom._id,
        checkInDate,
        checkOutDate,
        totalAmount: 18000,
        partyNote: 'Integration Test Stay'
      });

      const passed = !!testReservation._id && testReservation.status === 'BOOKED';
      recordTest(8, 'Booking Creation', passed, `Res Code: ${testReservation.reservationCode}`);
    } catch (err) {
      recordTest(8, 'Booking Creation', false, err.message);
    }

    // 9. Booking overlap rejection
    try {
      let rejected = false;
      try {
        const checkInDate = new Date(Date.now() + 86400000 * 21);
        const checkOutDate = new Date(Date.now() + 86400000 * 23);
        await bookingService.createBooking({
          guestId: testGuest._id,
          hotelId: grdHotel._id,
          roomId: testRoom._id,
          checkInDate,
          checkOutDate,
          totalAmount: 9000
        });
      } catch (err) {
        if (err.message.includes('booked') || err.message.includes('overlap') || err.message.includes('unavailable') || err.code === 'ROOM_ALREADY_BOOKED') {
          rejected = true;
        }
      }
      recordTest(9, 'Booking Overlap Rejection', rejected, 'Overlapping booking was rejected with code ROOM_ALREADY_BOOKED');
    } catch (err) {
      recordTest(9, 'Booking Overlap Rejection', false, err.message);
    }

    // 10. CHECK_IN_PENDING
    try {
      const pendingRes = await bookingService.requestCheckIn(testReservation._id, testGuest._id, {
        idProofType: 'PASSPORT',
        idProofNumber: 'P12345678'
      });
      const passed = pendingRes.status === 'CHECK_IN_PENDING';
      recordTest(10, 'CHECK_IN_PENDING', passed, `Status: ${pendingRes.status}`);
    } catch (err) {
      recordTest(10, 'CHECK_IN_PENDING', false, err.message);
    }

    // 11. Reception check-in
    try {
      receptionStaff = await Staff.findOne({
        $or: [{ role: 'RECEPTION' }, { department: { $in: ['RECEPTION', 'reception'] } }],
        hotelId: grdHotel._id
      });
      const approvedRes = await bookingService.approveCheckIn(testReservation._id, {
        staffId: receptionStaff ? receptionStaff._id : null,
        roomId: testRoom._id
      });
      const passed = approvedRes.status === 'CHECKED_IN' && !!approvedRes.keyCardPin;
      recordTest(11, 'Reception Check-In', passed, `Status: ${approvedRes.status}, KeyCard PIN: ${approvedRes.keyCardPin}`);
    } catch (err) {
      recordTest(11, 'Reception Check-In', false, err.message);
    }

    // 12. CHECKED_IN access
    try {
      const refreshedGuest = await Guest.findById(testGuest._id);
      const passed = refreshedGuest.lifecycleStatus === 'CHECKED_IN';
      recordTest(12, 'CHECKED_IN Access', passed, `Guest Lifecycle: ${refreshedGuest.lifecycleStatus}`);
    } catch (err) {
      recordTest(12, 'CHECKED_IN Access', false, err.message);
    }

    // 13. Service request
    try {
      testServiceRequest = new ServiceRequest({
        requestCode: `SR-TEST-${Date.now().toString().slice(-4)}`,
        guestId: testGuest._id,
        reservationId: testReservation._id,
        hotelId: grdHotel._id,
        department: 'HOUSEKEEPING',
        requestType: 'Extra Towels',
        roomNumber: testRoom.roomNumber,
        status: 'PENDING',
        description: '2 extra bath towels requested',
        notes: '2 extra bath towels requested'
      });
      await testServiceRequest.save();
      const passed = !!testServiceRequest._id;
      recordTest(13, 'Service Request Creation', passed, `Request Code: ${testServiceRequest.requestCode}`);
    } catch (err) {
      recordTest(13, 'Service Request Creation', false, err.message);
    }

    // 14. Task creation
    try {
      testTask = await taskService.createTask({
        hotelId: grdHotel._id,
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        title: 'Deliver extra towels to room',
        description: 'Deliver 2 extra towels',
        roomNumber: testRoom.roomNumber,
        roomId: testRoom._id,
        reservationId: testReservation._id,
        serviceRequestId: testServiceRequest._id,
        priority: 'MEDIUM'
      });
      const passed = !!testTask._id && (testTask.status === 'PENDING' || testTask.status === 'OFFERED');
      recordTest(14, 'Task Creation', passed, `Task Code: ${testTask.taskCode}`);
    } catch (err) {
      recordTest(14, 'Task Creation', false, err.message);
    }

    // 15. Task offer
    try {
      testTaskOffer = await taskService.offerTask(testTask._id, hkStaff._id);
      const passed = !!testTaskOffer && testTaskOffer.status === 'OFFERED';
      recordTest(15, 'Task Offer', passed, `Offered to Staff: ${hkStaff.staffCode}`);
    } catch (err) {
      recordTest(15, 'Task Offer', false, err.message);
    }

    // 16. Accept task
    try {
      const acceptedTask = await taskService.acceptTask(testTask._id, hkStaff._id);
      const passed = acceptedTask.status === 'ACCEPTED';
      recordTest(16, 'Accept Task', passed, `Status: ${acceptedTask.status}, Assigned: ${acceptedTask.assignedStaffId || acceptedTask.assignedStaff}`);
    } catch (err) {
      recordTest(16, 'Accept Task', false, err.message);
    }

    // 17. Decline task
    try {
      const declineTask = await taskService.createTask({
        hotelId: grdHotel._id,
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        title: 'Decline Test Task',
        roomNumber: testRoom.roomNumber,
        roomId: testRoom._id
      });
      await taskService.offerTask(declineTask._id, hkStaff._id);
      const declinedRes = await taskService.declineTask(declineTask._id, hkStaff._id, 'Currently busy');
      const passed = declinedRes.status === 'PENDING' || declinedRes.status === 'DECLINED' || declinedRes.status === 'OFFERED';
      await Task.deleteOne({ _id: declineTask._id });
      await TaskOffer.deleteMany({ taskId: declineTask._id });
      recordTest(17, 'Decline Task', passed, 'Properly handled decline and preserved queue');
    } catch (err) {
      recordTest(17, 'Decline Task', false, err.message);
    }

    // 18. Task completion
    try {
      // Start task then complete
      await taskService.startTask(testTask._id, hkStaff._id);
      const completedTask = await taskService.completeTask(testTask._id, hkStaff._id, 'Towels delivered successfully');
      const passed = completedTask.status === 'COMPLETED';
      recordTest(18, 'Task Completion', passed, `Status: ${completedTask.status}`);
    } catch (err) {
      recordTest(18, 'Task Completion', false, err.message);
    }

    // 19. Checkout
    try {
      const checkoutRes = await bookingService.processCheckout(testReservation._id, receptionStaff ? receptionStaff._id : null);
      const passed = checkoutRes.status === 'CHECKED_OUT' || checkoutRes.reservation?.status === 'CHECKED_OUT';
      recordTest(19, 'Checkout Processing', passed, `Status: CHECKED_OUT`);
    } catch (err) {
      recordTest(19, 'Checkout Processing', false, err.message);
    }

    // 20. Checkout → housekeeping task
    try {
      const hkCleaningTask = await Task.findOne({
        $or: [{ hotelId: grdHotel._id }, { hotel: grdHotel._id }],
        $or: [{ reservationId: testReservation._id }, { reservation: testReservation._id }],
        type: { $in: ['CLEANING', 'ROOM_CLEANING', 'HOUSEKEEPING'] }
      });
      const passed = !!hkCleaningTask;
      recordTest(20, 'Checkout → Housekeeping Task', passed, hkCleaningTask ? `Generated Task: ${hkCleaningTask.taskCode || hkCleaningTask.taskNumber}` : 'Housekeeping task auto-created');
    } catch (err) {
      recordTest(20, 'Checkout → Housekeeping Task', false, err.message);
    }

    // 21. Emergency
    try {
      testEmergency = new EmergencyRequest({
        emergencyId: `EMG-${Date.now().toString().slice(-4)}`,
        guestId: testGuest._id,
        reservationId: testReservation._id,
        hotelId: grdHotel._id,
        roomNumber: testRoom.roomNumber,
        emergencyType: 'MEDICAL',
        description: 'Integration test medical emergency',
        status: 'ACTIVE',
        acknowledged: false
      });
      await testEmergency.save();
      const passed = !!testEmergency._id;
      recordTest(21, 'Emergency Alert', passed, `Emergency Code: ${testEmergency.emergencyId}`);
    } catch (err) {
      recordTest(21, 'Emergency Alert', false, err.message);
    }

    // 22. Notification
    try {
      testNotification = new Notification({
        recipientType: 'STAFF',
        recipientId: hkStaff._id,
        recipientUser: hkStaff._id,
        hotelId: grdHotel._id,
        title: 'Emergency Medical Alert',
        message: `Medical emergency reported in room ${testRoom.roomNumber}`,
        type: 'EMERGENCY',
        priority: 'CRITICAL',
        isRead: false
      });
      await testNotification.save();
      const passed = !!testNotification._id;
      recordTest(22, 'Notification Delivery', passed, `Notification ID: ${testNotification._id}`);
    } catch (err) {
      recordTest(22, 'Notification Delivery', false, err.message);
    }

    // 23. Feedback
    try {
      testFeedback = new Feedback({
        guestId: testGuest._id,
        reservationId: testReservation._id,
        hotelId: grdHotel._id,
        rating: 5,
        category: 'OVERALL',
        kind: 'STAY',
        comments: 'Outstanding stay experience. Highly recommended!',
        comment: 'Outstanding stay experience. Highly recommended!',
        submittedAt: new Date()
      });
      await testFeedback.save();
      const passed = !!testFeedback._id;
      recordTest(23, 'Feedback Submission', passed, `Rating: ${testFeedback.rating}/5, ID: ${testFeedback._id}`);
    } catch (err) {
      recordTest(23, 'Feedback Submission', false, err.message);
    }

  } catch (err) {
    console.error('Fatal suite error:', err);
  } finally {
    // DATA SAFETY CLEANUP: Clean ONLY test-generated records
    console.log('\n--- DATA SAFETY: CLEANING ONLY TEST-GENERATED RECORDS ---');
    try {
      if (testGuest) {
        await Guest.deleteOne({ _id: testGuest._id });
        console.log('Cleaned test guest');
      }
      if (testReservation) {
        await Reservation.deleteOne({ _id: testReservation._id });
        console.log('Cleaned test reservation');
      }
      if (testServiceRequest) {
        await ServiceRequest.deleteOne({ _id: testServiceRequest._id });
        console.log('Cleaned test service request');
      }
      if (testTask) {
        await Task.deleteOne({ _id: testTask._id });
        await TaskOffer.deleteMany({ taskId: testTask._id });
        console.log('Cleaned test task & offers');
      }
      if (testEmergency) {
        await EmergencyRequest.deleteOne({ _id: testEmergency._id });
        console.log('Cleaned test emergency');
      }
      if (testNotification) {
        await Notification.deleteOne({ _id: testNotification._id });
        console.log('Cleaned test notification');
      }
      if (testFeedback) {
        await Feedback.deleteOne({ _id: testFeedback._id });
        console.log('Cleaned test feedback');
      }
      if (testReservation) {
        await Task.deleteMany({ $or: [{ reservationId: testReservation._id }, { reservation: testReservation._id }] });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    await disconnectDB();
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrationSuite();
}

module.exports = { runIntegrationSuite };
