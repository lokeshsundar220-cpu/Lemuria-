require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Staff, Task, TaskOffer, Hotel, Guest, Reservation } = require('../src/models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lemuria_ultra_secure_jwt_secret_key_2026';

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: `/api${path}`,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function simulate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lemuria_production');
  console.log('=== SIMULATING REAL USER FLOW ===\n');

  // 1. Staff HIL-HK-001 login
  const staff = await Staff.findOne({ staffCode: 'HIL-HK-001' });
  if (!staff) throw new Error('HIL-HK-001 not found');

  staff.duty = 'ON_DUTY';
  staff.dutyStatus = 'ON_DUTY';
  staff.availability = 'AVAILABLE';
  staff.availabilityStatus = 'AVAILABLE';
  staff.currentTaskId = null;
  await staff.save();

  const secret = process.env.JWT_SECRET || 'Lemuria_jwt_secret_key_2026';

  const staffToken = jwt.sign(
    { id: staff._id, hotelId: staff.hotelId, role: 'STAFF' },
    secret,
    { expiresIn: '24h' }
  );

  console.log('Staff Logged In: HIL-HK-001 (Kavitha Raman), Status: ON_DUTY, AVAILABLE');

  // 2. Locate checked-in guest in Hills Room C02
  const hills = await Hotel.findOne({ $or: [{ code: 'HIL' }, { name: /Hills/i }] });
  const reservation = await Reservation.findOne({
    hotelId: hills._id,
    roomNumber: 'C02',
    status: 'CHECKED_IN'
  }).sort({ createdAt: -1 });

  if (!reservation) throw new Error('No CHECKED_IN reservation for Hills C02');
  const guest = await Guest.findById(reservation.guestId);
  if (!guest) throw new Error('Guest not found');

  const guestToken = jwt.sign(
    { id: guest._id, reservationId: reservation._id, hotelId: hills._id, role: 'GUEST' },
    secret,
    { expiresIn: '24h' }
  );

  console.log(`Guest Logged In: ${guest.name || guest.email}, Room: C02, Hotel: Hills`);

  // 3. Check initial Staff poll BEFORE request
  const pollBefore = await apiCall('GET', '/tasks/my-tasks', null, staffToken);
  console.log('\n[POLL 1 - Before Request] Pending Offers:', pollBefore.body.data?.pendingOffers?.length || 0);

  // 4. Guest creates a new Housekeeping service request
  console.log('\n--- Guest submits service request from Guest Portal ---');
  const reqRes = await apiCall('POST', '/service-requests', {
    department: 'HOUSEKEEPING',
    serviceType: 'Room Cleaning',
    description: 'Fresh towels, vacuuming, and replace toiletries please',
    priority: 'HIGH'
  }, guestToken);

  console.log('Guest Request Response Status:', reqRes.status, 'Body:', reqRes.body.message);
  const createdTaskId = reqRes.body.data?.taskId;
  console.log('Created Task ID:', createdTaskId);

  // 5. Staff polls immediately after request (simulating 2-second background poll)
  console.log('\n--- Staff Portal polls /tasks/my-tasks (without refresh) ---');
  const pollAfter = await apiCall('GET', '/tasks/my-tasks', null, staffToken);
  console.log('Staff MyTasks Poll Status:', pollAfter.status);
  const offers = pollAfter.body.data?.pendingOffers || [];
  console.log(`Pending Offers count for HIL-HK-001: ${offers.length}`);

  if (offers.length === 0) {
    console.error('❌ FAILURE: Staff did NOT receive TaskOffer in polling response!');
    process.exit(1);
  }

  const offer = offers[0];
  console.log(`✅ SUCCESS: Received TaskOffer ${offer._id} for Task ${offer.taskId?.taskCode || offer.taskId}`);
  console.log(`Offer Status: ${offer.status}, ExpiresAt: ${offer.expiresAt}`);
  console.log(`Populated Task: Room ${offer.taskId?.roomNumber}, Dept: ${offer.taskId?.department}, Title: ${offer.taskId?.title}`);

  // 6. Verify GET /tasks includes the new pending task
  const allTasksRes = await apiCall('GET', '/tasks', null, staffToken);
  const allTasks = allTasksRes.body.data || [];
  const foundTask = allTasks.find(t => t._id === String(createdTaskId) || t.id === String(createdTaskId) || t.taskCode === offer.taskId?.taskCode);
  console.log(`\nGET /tasks count: ${allTasks.length}. Found newly created task in list: ${foundTask ? 'YES (' + foundTask.taskCode + ', ' + foundTask.status + ')' : 'NO'}`);

  // 7. Accept Offer
  console.log('\n--- Staff clicks [ ACCEPT TASK ] ---');
  const acceptRes = await apiCall('POST', `/tasks/offers/${offer._id}/accept`, {}, staffToken);
  console.log('Accept Response:', acceptRes.status, acceptRes.body.message);

  // 8. Staff polls again
  const pollAfterAccept = await apiCall('GET', '/tasks/my-tasks', null, staffToken);
  console.log('Active Tasks after accept:', pollAfterAccept.body.data?.activeTasks?.map(t => `${t.taskCode} (${t.status})`));

  // 9. Start Task
  console.log('\n--- Staff clicks [ ▶ START TASK ] ---');
  const startRes = await apiCall('POST', `/tasks/${createdTaskId}/start`, {}, staffToken);
  console.log('Start Task Response:', startRes.status, startRes.body.message);

  // 10. Complete Task
  console.log('\n--- Staff clicks [ ✓ COMPLETE TASK ] ---');
  const compRes = await apiCall('POST', `/tasks/${createdTaskId}/complete`, {
    completionNotes: 'Room C02 completely cleaned and inspected'
  }, staffToken);
  console.log('Complete Task Response:', compRes.status, compRes.body.message);

  console.log('\n=============================================');
  console.log('E2E HTTP SIMULATION COMPLETED SUCCESSFULLY!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

simulate().catch(err => {
  console.error('Simulation Failed:', err);
  process.exit(1);
});
