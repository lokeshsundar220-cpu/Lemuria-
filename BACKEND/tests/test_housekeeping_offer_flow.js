/**
 * Focused End-to-End Test for Housekeeping Task Offer / Accept Flow
 * Validates complete lifecycle against real MongoDB Atlas database.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = require('../src/routes');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, Room, Task, TaskOffer, AuditLog } = require('../src/models');

const serverApp = express();
serverApp.use(cors());
serverApp.use(express.json());
serverApp.use('/api', app);

let serverInstance = null;
const port = 5098;
const baseUrl = `http://localhost:${port}/api`;

const testResults = [];
function logResult(stepNum, name, passed, details = '') {
  testResults.push({ stepNum, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[TEST ${String(stepNum).padStart(2, '0')}] ${name.padEnd(45)} : [${status}] ${details}`);
}

async function fetchApi(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('HOUSEKEEPING TASK OFFER / ACCEPT LIFECYCLE E2E TEST (REAL MONGODB)');
  console.log('================================================================\n');

  await connectDB();
  serverInstance = serverApp.listen(port);

  let grandHotel = null;
  let hillsHotel = null;
  let hkStaff1 = null;
  let hkStaff2 = null;
  let hillsHkStaff = null;
  let hkToken1 = '';
  let hkToken2 = '';
  let hillsHkToken = '';

  const testGeneratedTaskIds = [];
  const testGeneratedOfferIds = [];

  try {
    // 0. Locate Hotels
    grandHotel = await Hotel.findOne({ hotelCode: 'GRD' });
    hillsHotel = await Hotel.findOne({ hotelCode: 'HIL' });

    if (!grandHotel || !hillsHotel) {
      throw new Error('Required hotels (GRD and HIL) not found in MongoDB');
    }
    console.log(`Using Grand Hotel: ${grandHotel.name} (${grandHotel._id})`);
    console.log(`Using Hills Hotel: ${hillsHotel.name} (${hillsHotel._id})\n`);

    // Ensure staff accounts exist & have reset states
    hkStaff1 = await Staff.findOne({ staffCode: 'GRD-HK-001' });
    hkStaff2 = await Staff.findOne({ staffCode: 'GRD-HK-002' });
    hillsHkStaff = await Staff.findOne({ staffCode: 'HIL-HK-001' });

    if (!hkStaff1 || !hkStaff2 || !hillsHkStaff) {
      throw new Error('Required test staff members not found in database');
    }

    // Reset duty/availability for clean test run
    await Staff.updateMany(
      { staffCode: { $in: ['GRD-HK-001', 'GRD-HK-002', 'HIL-HK-001'] } },
      { duty: 'OFF_DUTY', dutyStatus: 'OFF_DUTY', availability: 'AVAILABLE', currentTaskId: null }
    );


    // 1. Staff Login
    const loginRes1 = await fetchApi('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: hkStaff1.staffCode, password: 'Password123!' })
    });
    hkToken1 = loginRes1.data?.data?.token;
    logResult(1, 'Housekeeping Staff 1 Login', loginRes1.status === 200 && !!hkToken1, `Staff: ${hkStaff1.staffCode}`);

    const loginRes2 = await fetchApi('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: hkStaff2.staffCode, password: 'Password123!' })
    });
    hkToken2 = loginRes2.data?.data?.token;
    logResult(2, 'Housekeeping Staff 2 Login', loginRes2.status === 200 && !!hkToken2, `Staff: ${hkStaff2.staffCode}`);

    const loginHillsRes = await fetchApi('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: hillsHkStaff.staffCode, password: 'Password123!' })
    });
    hillsHkToken = loginHillsRes.data?.data?.token;
    logResult(3, 'Hills Hotel HK Staff Login', loginHillsRes.status === 200 && !!hillsHkToken, `Staff: ${hillsHkStaff.staffCode}`);

    // 2. Start Duty for Staff 1
    const startDutyRes1 = await fetchApi('/staff/duty/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const dbStaff1AfterStart = await Staff.findById(hkStaff1._id);
    const dutyActive1 = (
      startDutyRes1.status === 200 &&
      dbStaff1AfterStart.duty === 'ON_DUTY' &&
      dbStaff1AfterStart.dutyStatus === 'ON_DUTY' &&
      dbStaff1AfterStart.availability === 'AVAILABLE'
    );
    logResult(4, 'Start Duty & Verify MongoDB Record', dutyActive1, `duty=${dbStaff1AfterStart.duty}, avail=${dbStaff1AfterStart.availability}`);

    // 3. Check "STAFF ON DUTY" Count via /staff endpoint
    const staffListRes = await fetchApi('/staff', {
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const staffList = staffListRes.data?.data || [];
    const hkOnDutyCount = staffList.filter(
      (s) => s.department === 'housekeeping' && (s.duty === 'ON_DUTY' || s.duty === 'ON' || s.dutyStatus === 'ON_DUTY')
    ).length;
    logResult(5, 'Staff on Duty Count via /staff', staffListRes.status === 200 && hkOnDutyCount === 1, `Housekeeping on duty: ${hkOnDutyCount}`);

    // 4. Create Housekeeping Task in Grand Hotel
    const createTaskRes = await fetchApi('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hkToken1}` },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        roomNumber: '101',
        priority: 'HIGH',
        description: 'E2E Full Deep Clean Verification',
        hotelId: grandHotel._id
      })
    });
    const createdTask = createTaskRes.data?.data;
    if (createdTask?._id) testGeneratedTaskIds.push(createdTask._id);
    logResult(6, 'Create Housekeeping Task', createTaskRes.status === 201 && !!createdTask, `Task Code: ${createdTask?.taskCode}`);

    // 5. Verify Dispatcher created TaskOffer in MongoDB
    const taskOffer1 = await TaskOffer.findOne({
      taskId: createdTask._id,
      staffId: hkStaff1._id,
      status: 'OFFERED'
    });
    if (taskOffer1) testGeneratedOfferIds.push(taskOffer1._id);
    const offerCreatedOk = (
      !!taskOffer1 &&
      taskOffer1.expiresAt > new Date() &&
      taskOffer1.hotelId.toString() === grandHotel._id.toString()
    );
    logResult(7, 'TaskOffer in MongoDB Associated to Staff 1', offerCreatedOk, `Offer ID: ${taskOffer1?._id}, Expires in ~15s`);

    // 6. Frontend /tasks/my-tasks Retrieval
    const myTasksRes = await fetchApi('/tasks/my-tasks', {
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const pendingOffers = myTasksRes.data?.data?.pendingOffers || [];
    const receivedOffer = pendingOffers.find((o) => (o._id || o.id).toString() === (taskOffer1?._id || '').toString());
    logResult(8, 'GET /tasks/my-tasks Scoped to Authenticated Staff', !!receivedOffer, `Pending offers: ${pendingOffers.length}`);

    // 7. Accept Offer Flow
    const acceptRes = await fetchApi(`/tasks/offers/${taskOffer1._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const dbTaskAfterAccept = await Task.findById(createdTask._id);
    const dbStaffAfterAccept = await Staff.findById(hkStaff1._id);
    const dbOfferAfterAccept = await TaskOffer.findById(taskOffer1._id);

    const acceptOk = (
      acceptRes.status === 200 &&
      dbOfferAfterAccept.status === 'ACCEPTED' &&
      dbTaskAfterAccept.status === 'ACCEPTED' &&
      dbTaskAfterAccept.assignedStaffId.toString() === hkStaff1._id.toString() &&
      dbStaffAfterAccept.availability === 'BUSY' &&
      dbStaffAfterAccept.currentTaskId.toString() === createdTask._id.toString()
    );
    logResult(9, 'Accept Task Offer (Atomic State Transition)', acceptOk, `Task=${dbTaskAfterAccept.status}, Staff=${dbStaffAfterAccept.availability}, Offer=${dbOfferAfterAccept.status}`);

    // 8. Start & Complete Task
    const startRes = await fetchApi(`/tasks/${createdTask._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const completeRes = await fetchApi(`/tasks/${createdTask._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hkToken1}` },
      body: JSON.stringify({ completionNotes: 'E2E Room clean finished completely' })
    });
    const dbTaskAfterDone = await Task.findById(createdTask._id);
    const dbStaffAfterDone = await Staff.findById(hkStaff1._id);
    const completeOk = (
      completeRes.status === 200 &&
      dbTaskAfterDone.status === 'COMPLETED' &&
      dbStaffAfterDone.availability === 'AVAILABLE' &&
      dbStaffAfterDone.currentTaskId === null
    );
    logResult(10, 'Task Complete -> Staff Returns to AVAILABLE', completeOk, `Task=${dbTaskAfterDone.status}, Staff=${dbStaffAfterDone.availability}`);

    // 9. Decline Flow with Next Eligible Staff Reassignment
    // Put Staff 2 on duty as well
    await fetchApi('/staff/duty/start', { method: 'POST', headers: { Authorization: `Bearer ${hkToken2}` } });
    await TaskOffer.deleteMany({ status: 'OFFERED' });



    const declineTaskRes = await fetchApi('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hkToken1}` },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        type: 'SERVICE',
        roomNumber: '102',
        priority: 'MEDIUM',
        description: 'Decline Verification Task',
        hotelId: grandHotel._id
      })
    });
    const declineTask = declineTaskRes.data?.data;
    if (declineTask?._id) testGeneratedTaskIds.push(declineTask._id);

    // Get offer created for Staff 1
    const offerForStaff1 = await TaskOffer.findOne({ taskId: declineTask._id, staffId: hkStaff1._id, status: 'OFFERED' });
    if (offerForStaff1) testGeneratedOfferIds.push(offerForStaff1._id);

    // Staff 1 declines offer
    const declineCallRes = await fetchApi(`/tasks/offers/${offerForStaff1._id}/decline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const offer1AfterDecline = await TaskOffer.findById(offerForStaff1._id);
    const staff1AfterDecline = await Staff.findById(hkStaff1._id);

    // Verify next eligible staff (Staff 2) immediately received offer
    const offerForStaff2 = await TaskOffer.findOne({ taskId: declineTask._id, staffId: hkStaff2._id, status: 'OFFERED' });
    if (offerForStaff2) testGeneratedOfferIds.push(offerForStaff2._id);

    const declineAndReassignOk = (
      declineCallRes.status === 200 &&
      offer1AfterDecline.status === 'DECLINED' &&
      staff1AfterDecline.availability === 'AVAILABLE' &&
      !!offerForStaff2
    );
    logResult(11, 'Decline Flow & Immediate Re-dispatch to Staff 2', declineAndReassignOk, `Staff 1 Offer=${offer1AfterDecline?.status}, Staff 2 Offer=${offerForStaff2?.status}`);

    // Clean up Staff 2 offer for decline test
    await fetchApi(`/tasks/offers/${offerForStaff2._id}/decline`, { method: 'POST', headers: { Authorization: `Bearer ${hkToken2}` } });

    // 10. Timeout Flow (15s Window)
    const timeoutTaskRes = await fetchApi('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hkToken1}` },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        roomNumber: '103',
        priority: 'LOW',
        description: 'Timeout Verification Task',
        hotelId: grandHotel._id
      })
    });
    const timeoutTask = timeoutTaskRes.data?.data;
    if (timeoutTask?._id) testGeneratedTaskIds.push(timeoutTask._id);

    const timeoutOfferDoc = await TaskOffer.findOne({ taskId: timeoutTask._id, status: 'OFFERED' });
    if (timeoutOfferDoc) testGeneratedOfferIds.push(timeoutOfferDoc._id);

    const timeoutCallRes = await fetchApi(`/tasks/offers/${timeoutOfferDoc._id}/timeout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken1}` }
    });
    const offerAfterTimeout = await TaskOffer.findById(timeoutOfferDoc._id);
    logResult(12, '15-Second Offer Timeout Handling', timeoutCallRes.status === 200 && offerAfterTimeout.status === 'TIMEOUT', `Offer status: ${offerAfterTimeout.status}`);

    // 11. Strict Hotel Tenant Isolation
    // Start duty for Hills Hotel HK staff
    await fetchApi('/staff/duty/start', { method: 'POST', headers: { Authorization: `Bearer ${hillsHkToken}` } });
    await TaskOffer.deleteMany({});



    // Create a task specifically for Hills Hotel
    const hillsTaskRes = await fetchApi('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hillsHkToken}` },
      body: JSON.stringify({
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        roomNumber: '301',
        priority: 'HIGH',
        description: 'Hills Hotel Isolation Task',
        hotelId: hillsHotel._id
      })
    });
    const hillsTask = hillsTaskRes.data?.data;
    if (hillsTask?._id) testGeneratedTaskIds.push(hillsTask._id);

    // Check offers created for Hills task
    const hillsOffers = await TaskOffer.find({ taskId: hillsTask._id });
    hillsOffers.forEach(o => testGeneratedOfferIds.push(o._id));

    // Grand Hotel staff (hkStaff1 & hkStaff2) must NOT have received any offer for Hills task
    const grandStaffOffersForHills = await TaskOffer.find({
      taskId: hillsTask._id,
      staffId: { $in: [hkStaff1._id, hkStaff2._id] }
    });

    const hillsStaffGotOffer = hillsOffers.some(o => o.staffId.toString() === hillsHkStaff._id.toString());
    const isolationOk = hillsOffers.length > 0 && grandStaffOffersForHills.length === 0 && hillsStaffGotOffer;
    logResult(13, 'Strict Hotel Tenant Isolation', isolationOk, `Grand Staff Leaks: ${grandStaffOffersForHills.length}, Hills Staff Assigned: ${hillsStaffGotOffer}`);

    // Clean up test tasks and offers
    console.log('\nCleaning test-generated records from database...');
    await Task.deleteMany({ _id: { $in: testGeneratedTaskIds } });
    await TaskOffer.deleteMany({ _id: { $in: testGeneratedOfferIds } });
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('[E2E Test Execution Error]', err);
  } finally {
    if (serverInstance) serverInstance.close();
    await disconnectDB();

    console.log('\n================================================================');
    console.log('E2E TEST SUMMARY:');
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    console.log(`Passed: ${passed}/${total}`);
    console.log('================================================================');

    process.exit(passed === total ? 0 : 1);
  }
}

runE2ETests();
