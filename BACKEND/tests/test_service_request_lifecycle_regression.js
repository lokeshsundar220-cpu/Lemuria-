/**
 * REGRESSION TEST: Service Request Lifecycle & Staff Task Progression
 * Verifies that a newly created guest service request:
 * 1. Is created with status OPEN / OFFERING
 * 2. Creates a Task in status PENDING (NEVER automatically COMPLETED)
 * 3. Offers the task to eligible staff
 * 4. Staff accepts -> Task becomes ACCEPTED
 * 5. Staff starts -> Task becomes IN_PROGRESS
 * 6. Staff completes -> Task becomes COMPLETED only upon explicit completion
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

const runRegressionTest = async () => {
  console.log('====================================================');
  console.log('REGRESSION TEST: SERVICE REQUEST LIFECYCLE');
  console.log('====================================================\n');

  await connectDB();

  let testGuestUser, testGuest, testReservation, testHotel, testRoom, testStaff;
  let guestToken, staffToken;
  let createdServiceRequest, createdTask, createdOffer;
  let allPassed = true;

  const logStep = (stepNum, name, condition, details = '') => {
    const icon = condition ? 'PASS' : 'FAIL';
    if (!condition) allPassed = false;
    console.log(`[TEST ${String(stepNum).padStart(2, '0')}] ${name.padEnd(42)} : [${icon}] ${details}`);
  };

  try {
    // 0. Setup test hotel & room
    testHotel = await Hotel.findOne({ hotelCode: 'GRD' });
    if (!testHotel) testHotel = await Hotel.findOne({});
    testRoom = await Room.findOne({ hotelId: testHotel._id });

    // 1. Setup Guest
    const testEmail = `regression.guest.${Date.now()}@lemuria.test`;
    const regRes = await fetchApi('/auth/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regression Test Guest',
        email: testEmail,
        mobile: '+91 99999 11111',
        password: 'Password123!'
      })
    });
    guestToken = regRes.data?.data?.token;
    testGuest = await Guest.findOne({ email: testEmail });

    logStep(1, 'Guest Registration & Token', regRes.status === 201 && !!guestToken, `Guest: ${testGuest?.guestCode}`);

    // 2. Setup Active Stay (CHECKED_IN)
    testReservation = await Reservation.create({
      reservationCode: `REG-${Date.now().toString().slice(-6)}`,
      guestId: testGuest._id,
      guestName: 'Regression Test Guest',
      hotelId: testHotel._id,
      roomId: testRoom._id,
      roomNumber: testRoom.roomNumber,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      status: 'CHECKED_IN',
      guestsCount: 1,
      totalAmount: 12000,
      paymentStatus: 'PAID'
    });

    logStep(2, 'Active Checked-In Stay Setup', !!testReservation._id, `Room: ${testReservation.roomNumber}`);

    // 3. Ensure Maintenance staff is ON DUTY & AVAILABLE
    testStaff = await Staff.findOne({ staffCode: 'GRD-MT-001' });
    if (!testStaff) {
      testStaff = await Staff.findOne({ department: { $in: ['MAINTENANCE', 'maintenance'] } });
    }

    testStaff.duty = 'ON_DUTY';
    testStaff.dutyStatus = 'ON_DUTY';
    testStaff.availability = 'AVAILABLE';
    testStaff.currentTaskId = null;
    await testStaff.save();


    // Login as staff
    const staffLoginRes = await fetchApi('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: testStaff.staffCode, password: 'Password123!' })
    });
    staffToken = staffLoginRes.data?.data?.token;

    logStep(3, 'Maintenance Staff On-Duty Setup', !!staffToken, `Staff: ${testStaff.staffCode}`);

    // 4. Create Guest Service Request via API
    const svcReqRes = await fetchApi('/service-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        department: 'MAINTENANCE',
        serviceType: 'Maintenance',
        description: 'AC Cooling Issue: Room is too warm, please adjust temperature.',
        priority: 'HIGH'
      })
    });

    createdServiceRequest = svcReqRes.data?.data;
    logStep(4, 'Guest Service Request Creation', svcReqRes.status === 201 && !!createdServiceRequest?.requestCode, `Req: ${createdServiceRequest?.requestCode}`);

    // 5. Verify Service Request Status in DB
    const dbSvcReq = await ServiceRequest.findById(createdServiceRequest?._id);
    logStep(5, 'ServiceRequest Status is OFFERING (Not Completed)', dbSvcReq?.status === 'OFFERING', `Status: ${dbSvcReq?.status}`);

    // 6. Verify Task Created in DB
    createdTask = await Task.findById(dbSvcReq?.taskId);
    logStep(6, 'Linked Task Created in DB', !!createdTask, `Task: ${createdTask?.taskCode}`);

    // 7. CRITICAL: Verify Task Status is PENDING (NOT COMPLETED!)
    const isNotCompleted = createdTask?.status !== 'COMPLETED' && createdTask?.status === 'PENDING';
    logStep(7, 'CRITICAL: Task Status is PENDING (Not Completed)', isNotCompleted, `Status: ${createdTask?.status}`);

    // 8. Verify Task Offer Created for Eligible Maintenance Staff
    const offer = await TaskOffer.findOne({ taskId: createdTask?._id, staffId: testStaff._id });
    createdOffer = offer;
    logStep(8, 'Task Offer Dispatched to Staff', !!offer && offer.status === 'OFFERED', `Offer ID: ${offer?._id}`);

    // 9. Staff Accepts Offer via Staff API
    const acceptRes = await fetchApi(`/tasks/offers/${createdOffer?._id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      }
    });

    const dbTaskAfterAccept = await Task.findById(createdTask?._id);
    logStep(9, 'Staff Accepts Task Offer', acceptRes.status === 200 && dbTaskAfterAccept?.status === 'ACCEPTED', `Task Status: ${dbTaskAfterAccept?.status}`);

    // 10. Staff Starts Task
    const startRes = await fetchApi(`/tasks/${createdTask?._id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      }
    });

    const dbTaskAfterStart = await Task.findById(createdTask?._id);
    logStep(10, 'Staff Starts Task (IN_PROGRESS)', startRes.status === 200 && dbTaskAfterStart?.status === 'IN_PROGRESS', `Task Status: ${dbTaskAfterStart?.status}`);

    // 11. Staff Completes Task
    const completeRes = await fetchApi(`/tasks/${createdTask?._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        completionNotes: 'AC thermostat calibrated and filters cleaned.'
      })
    });

    const dbTaskAfterComplete = await Task.findById(createdTask?._id);
    logStep(11, 'Staff Completes Task (COMPLETED Only Now)', completeRes.status === 200 && dbTaskAfterComplete?.status === 'COMPLETED' && !!dbTaskAfterComplete?.completedAt, `Task Status: ${dbTaskAfterComplete?.status}`);

    // 12. Staff Availability Restored to AVAILABLE
    const updatedStaff = await Staff.findById(testStaff._id);
    logStep(12, 'Staff Availability Restored', updatedStaff?.availability === 'AVAILABLE' && updatedStaff?.currentTaskId === null, `Avail: ${updatedStaff?.availability}`);

  } catch (err) {
    console.error('[REGRESSION TEST ERROR]', err);
    allPassed = false;
  } finally {
    // Clean up test records
    console.log('\n--- CLEANING TEST GENERATED RECORDS ---');
    if (createdOffer?._id) await TaskOffer.deleteOne({ _id: createdOffer._id });
    if (createdTask?._id) await Task.deleteOne({ _id: createdTask._id });
    if (createdServiceRequest?._id) await ServiceRequest.deleteOne({ _id: createdServiceRequest._id });
    if (testReservation?._id) await Reservation.deleteOne({ _id: testReservation._id });
    if (testGuest?._id) {
      await Guest.deleteOne({ _id: testGuest._id });
      await User.deleteOne({ guestId: testGuest._id });
    }
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`REGRESSION TEST RESULT: ${allPassed ? 'ALL PASSED' : 'FAILED'}`);
  console.log('====================================================\n');
  process.exit(allPassed ? 0 : 1);
};

runRegressionTest();
