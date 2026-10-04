require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);
app.use(errorHandler);
const { Staff, Task, TaskOffer, ServiceRequest, Hotel, Guest, Reservation } = require('../src/models');
const authService = require('../src/services/authService');
const taskService = require('../src/services/taskService');

async function makeRequest(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runNoRefreshTest() {
  console.log('=== STARTING NO-REFRESH REAL POLLING & TASK LIFECYCLE TEST ===\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lemuria_production';
  await mongoose.connect(mongoUri);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Test Server] Running on ephemeral port ${port}`);

  try {
    // 1. Locate Hills Hotel and a Hills Housekeeping / Maintenance worker
    const hillsHotel = await Hotel.findOne({ $or: [{ hotelCode: 'HIL' }, { name: /Hills/i }] });
    if (!hillsHotel) throw new Error('Hills Hotel not found in DB');
    console.log(`[1] Hills Hotel found: ${hillsHotel.name} (${hillsHotel._id})`);

    let staff = await Staff.findOne({
      hotelId: hillsHotel._id,
      department: 'maintenance',
      enabled: { $ne: false },
      accountStatus: { $nin: ['DISABLED', 'SUSPENDED', 'DELETED'] }
    });

    if (!staff) {
      staff = await Staff.findOne({
        hotelId: hillsHotel._id,
        department: 'housekeeping',
        enabled: { $ne: false }
      });
    }

    if (!staff) throw new Error('No Hills staff found');
    console.log(`[2] Staff selected: ${staff.name} (${staff.staffCode || staff.staffId}) Dept: ${staff.department}`);

    // Set staff ON DUTY and AVAILABLE
    staff.duty = 'ON_DUTY';
    staff.dutyStatus = 'ON_DUTY';
    staff.availability = 'AVAILABLE';
    staff.currentTaskId = null;
    await staff.save();
    console.log(`[3] Staff set to ON_DUTY and AVAILABLE`);

    // Clean up any stale offers for this staff
    await TaskOffer.deleteMany({ staffId: staff._id });

    // 2. Authenticate Staff
    const staffToken = authService.generateToken({
      id: staff._id,
      staffId: staff.staffCode || staff.staffId,
      department: staff.department,
      role: 'STAFF',
      hotelId: staff.hotelId
    });
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    // 3. Initial Staff Polling simulation (Dashboard loaded)
    console.log('\n--- Initial Staff Polling (Dashboard open, zero tasks) ---');
    const pollInitTasks = await makeRequest(port, 'GET', '/api/tasks', staffHeaders);
    const pollInitMy = await makeRequest(port, 'GET', '/api/tasks/my-tasks', staffHeaders);

    console.log(`Initial tasks count: ${pollInitTasks.body.data ? pollInitTasks.body.data.length : 0}`);
    console.log(`Initial pending offers: ${pollInitMy.body.data ? pollInitMy.body.data.pendingOffers.length : 0}`);

    if (pollInitMy.status !== 200) {
      throw new Error(`GET /api/tasks/my-tasks failed with status ${pollInitMy.status}`);
    }

    // 4. Guest creates a new service request
    console.log('\n--- Guest Portal creates service request ---');
    let guest = await Guest.findOne({ guestCode: { $exists: true, $ne: null } });
    if (!guest) {
      guest = await Guest.findOne();
    }
    if (!guest) {
      guest = await Guest.create({
        guestCode: `GST-${Date.now().toString().slice(-5)}`,
        fullName: 'Dr. Test Guest',
        email: `guest.hills.${Date.now()}@lemuria.test`,
        phone: '+919988776655',
        hotelId: hillsHotel._id,
        hotel: hillsHotel._id
      });
    }

    // Ensure guest has active CHECKED_IN reservation
    let activeReservation = await Reservation.findOne({ guestId: guest._id, status: 'CHECKED_IN' });
    if (!activeReservation) {
      activeReservation = await Reservation.create({
        reservationCode: `RES-TEST-${Date.now().toString().slice(-4)}`,
        guestId: guest._id,
        hotelId: hillsHotel._id,
        roomNumber: '402',
        status: 'CHECKED_IN',
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000 * 2),
        totalAmount: 4500,
        amountPaid: 4500
      });
    }

    const guestToken = authService.generateToken({
      id: guest._id,
      email: guest.email,
      role: 'GUEST',
      hotelId: hillsHotel._id
    });
    const guestHeaders = { Authorization: `Bearer ${guestToken}` };

    const guestReqRes = await makeRequest(port, 'POST', '/api/service-requests', guestHeaders, {
      department: staff.department,
      serviceType: 'Thermostat Adjustment',
      description: 'Air conditioning temperature control panel requires adjustment',
      priority: 'HIGH'
    });

    console.log(`Guest request response: status=${guestReqRes.status}`, guestReqRes.body);
    const createdReq = guestReqRes.body.data;
    console.log(`Created service request ID: ${createdReq?._id}`);

    // 5. Staff Portal Next 2-Second Polling Cycle (NO BROWSER REFRESH)
    console.log('\n--- Next 2-Second Polling Tick (Without Refresh) ---');
    
    // Simulate safe independent calls
    const pollTasksRes = await makeRequest(port, 'GET', '/api/tasks', staffHeaders);
    const pollMyRes = await makeRequest(port, 'GET', '/api/tasks/my-tasks', staffHeaders);

    console.log(`[Polling] /api/tasks status: ${pollTasksRes.status}, count: ${pollTasksRes.body.data?.length}`);
    console.log(`[Polling] /api/tasks/my-tasks status: ${pollMyRes.status}, pendingOffers: ${pollMyRes.body.data?.pendingOffers?.length}`);

    if (pollTasksRes.status !== 200 || pollMyRes.status !== 200) {
      throw new Error('Polling request failed');
    }

    const offers = pollMyRes.body.data?.pendingOffers || [];
    if (offers.length === 0) {
      throw new Error('Expected 1 pending offer for staff, but got 0');
    }

    const activeOffer = offers[0];
    console.log(`\n[SUCCESS] New Task Offer received by polling!`);
    console.log(`Offer ID: ${activeOffer._id}`);
    console.log(`Task ID: ${activeOffer.taskId?._id || activeOffer.taskId}`);
    console.log(`Expires At: ${activeOffer.expiresAt}`);

    // 6. Accept Task Offer
    console.log('\n--- Staff clicks "ACCEPT TASK" ---');
    const acceptRes = await makeRequest(port, 'POST', `/api/tasks/offers/${activeOffer._id}/accept`, staffHeaders);
    console.log(`Accept response status: ${acceptRes.status}`);
    if (acceptRes.status !== 200) {
      throw new Error(`Accept failed: ${JSON.stringify(acceptRes.body)}`);
    }

    const taskId = activeOffer.taskId?._id || activeOffer.taskId;
    const acceptedTask = await Task.findById(taskId);
    console.log(`Task status after accept: ${acceptedTask.status} (assigned: ${acceptedTask.assignedStaffId})`);
    if (acceptedTask.status !== 'ACCEPTED') throw new Error('Task should be ACCEPTED');

    // 7. Start Task
    console.log('\n--- Staff clicks "START TASK" ---');
    const startRes = await makeRequest(port, 'PUT', `/api/tasks/${taskId}/start`, staffHeaders);
    console.log(`Start response status: ${startRes.status}`);
    if (startRes.status !== 200) {
      throw new Error(`Start failed: ${JSON.stringify(startRes.body)}`);
    }

    const inProgressTask = await Task.findById(taskId);
    console.log(`Task status after start: ${inProgressTask.status}`);
    if (inProgressTask.status !== 'IN_PROGRESS') throw new Error('Task should be IN_PROGRESS');

    // 8. Complete Task
    console.log('\n--- Staff clicks "COMPLETE TASK" ---');
    const completeRes = await makeRequest(port, 'PUT', `/api/tasks/${taskId}/complete`, staffHeaders, {
      completionNotes: 'Calibrated thermostat control board in Room 402. Temp stable at 21C.',
      proofImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'
    });
    console.log(`Complete response status: ${completeRes.status}`);
    if (completeRes.status !== 200) {
      throw new Error(`Complete failed: ${JSON.stringify(completeRes.body)}`);
    }

    const completedTask = await Task.findById(taskId);
    console.log(`Task status after complete: ${completedTask.status}`);
    if (completedTask.status !== 'COMPLETED') throw new Error('Task should be COMPLETED');

    const updatedStaff = await Staff.findById(staff._id);
    console.log(`Staff availability after completion: ${updatedStaff.availability}, currentTaskId: ${updatedStaff.currentTaskId}`);
    if (updatedStaff.availability !== 'AVAILABLE') throw new Error('Staff should be AVAILABLE after completion');

    // Clean up test records
    await TaskOffer.deleteMany({ taskId: taskId });
    await Task.deleteOne({ _id: taskId });
    if (createdReq?._id) await ServiceRequest.deleteOne({ _id: createdReq._id });

    console.log('\n======================================================');
    console.log('✅ ALL NO-REFRESH POLLING & TASK LIFECYCLE TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runNoRefreshTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
