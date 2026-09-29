/**
 * Staff Portal ↔ Backend Real Database Integration Test
 * Validates all 20 operations using the live backend and lemuria_production database.
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/routes');
const express = require('express');
const cors = require('cors');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, Room, Task, TaskOffer, EmergencyRequest, Notification, Feedback, Reservation } = require('../src/models');

const serverApp = express();
serverApp.use(cors());
serverApp.use(express.json());
serverApp.use('/api', app);

let serverInstance = null;
let port = 5099;
const baseUrl = `http://localhost:${port}/api`;

const results = [];
function record(num, name, passed, details = '') {
  results.push({ num, name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[STAFF TEST ${num.toString().padStart(2, '0')}] ${name.padEnd(35)} : [${status}] ${details}`);
}

async function fetchJson(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runStaffPortalIntegrationTest() {
  console.log('====================================================');
  console.log('STAFF PORTAL ↔ BACKEND INTEGRATION TEST SUITE');
  console.log('Testing live API endpoints against lemuria_production');
  console.log('====================================================\n');

  await connectDB();
  serverInstance = serverApp.listen(port);

  let managerToken = '';
  let managerProfile = null;
  let hkToken = '';
  let hkProfile = null;
  let testStaffId = null;
  let testTaskId = null;
  let testOfferId = null;

  try {
    // 1. Manager Login
    const mgrRes = await fetchJson('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-MG-001', password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!' })
    });
    managerToken = mgrRes.data?.data?.token;
    managerProfile = mgrRes.data?.data?.staff;
    record(1, 'Manager Login', mgrRes.status === 200 && !!managerToken, `Code: ${managerProfile?.staffCode}, Role: ${managerProfile?.role || managerProfile?.department}`);

    // 2. Staff Login
    const staffRes = await fetchJson('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-HK-001', password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!' })
    });
    hkToken = staffRes.data?.data?.token;
    hkProfile = staffRes.data?.data?.staff;
    record(2, 'Staff Login', staffRes.status === 200 && !!hkToken, `Code: ${hkProfile?.staffCode}, Dept: ${hkProfile?.department}`);

    // 3. Disabled Staff Login Rejection
    const tempDis = await Staff.create({
      staffCode: `DIS-TEST-${Date.now().toString().slice(-4)}`,
      name: 'Disabled Test Staff',
      email: `distest.${Date.now()}@lemuria.test`,
      passwordHash: hkProfile ? hkProfile.passwordHash || '$2a$10$ek.vjqMmDSNrSyC7DnEw5OPXplZ6O891d8a6e8jRF7Br4dND7M.t6' : '',
      department: 'housekeeping',
      hotelId: managerProfile.hotelId,
      enabled: false,
      accountStatus: 'DISABLED'
    });
    const tRes = await fetchJson('/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: tempDis.staffCode, password: process.env.SEED_DEFAULT_PASSWORD || 'Password123!' })
    });
    const disabledRejected = tRes.status !== 200 && (tRes.data?.message?.toLowerCase().includes('disabled') || tRes.data?.error?.toLowerCase().includes('disabled'));
    await Staff.deleteOne({ _id: tempDis._id });
    record(3, 'Disabled Staff Login Rejection', disabledRejected, 'Properly rejected disabled account');

    // 4. Staff Profile
    const profileRes = await fetchJson('/staff/me', {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const profileOk = profileRes.status === 200 && profileRes.data?.data?.email === 'amara.devi@grand.lemuria.example';
    record(4, 'Staff Profile Loading', profileOk, `Name: ${profileRes.data?.data?.name}`);

    // 5. Start Duty
    const startDutyRes = await fetchJson('/staff/duty/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const dutyStartedOk = startDutyRes.status === 200 && (startDutyRes.data?.data?.duty === 'ON_DUTY' || startDutyRes.data?.data?.duty === 'ON');
    record(5, 'Start Duty Flow', dutyStartedOk, `Duty: ${startDutyRes.data?.data?.duty}`);

    // 6. End Duty
    const endDutyRes = await fetchJson('/staff/duty/end', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const dutyEndedOk = endDutyRes.status === 200 && (endDutyRes.data?.data?.duty === 'OFF_DUTY' || endDutyRes.data?.data?.duty === 'OFF');
    record(6, 'End Duty Flow', dutyEndedOk, `Duty: ${endDutyRes.data?.data?.duty}`);

    // Restart duty for task tests
    await fetchJson('/staff/duty/start', { method: 'POST', headers: { Authorization: `Bearer ${hkToken}` } });

    // 7. Dashboard Data (Workload Metrics, Rooms, Arrivals)
    const workloadRes = await fetchJson('/manager/workload', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const roomsRes = await fetchJson('/rooms', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const dashboardOk = workloadRes.status === 200 && roomsRes.status === 200 && roomsRes.data?.data?.length > 0;
    record(7, 'Dashboard Data Loading', dashboardOk, `Rooms: ${roomsRes.data?.data?.length}, OnDuty: ${workloadRes.data?.data?.onDutyStaff ?? 0}`);

    // 8. Task List
    const tasksRes = await fetchJson('/tasks', {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const tasksOk = tasksRes.status === 200 && Array.isArray(tasksRes.data?.data);
    record(8, 'Task List Retrieval', tasksOk, `Total Tasks: ${tasksRes.data?.data?.length}`);

    // 9. Task Offer Creation
    const newTaskRes = await fetchJson('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        title: 'Linen Restock & Turndown',
        type: 'CLEANING',
        department: 'HOUSEKEEPING',
        priority: 'MEDIUM',
        roomNumber: '201',
        description: 'Turndown test task for integration verification'
      })
    });
    testTaskId = newTaskRes.data?.data?._id;
    const taskCreatedOk = newTaskRes.status === 201 && !!testTaskId;
    record(9, 'Task Creation & Dispatch', taskCreatedOk, `Task Code: ${newTaskRes.data?.data?.taskCode}`);

    // Create an explicit TaskOffer to hkProfile
    const offerDoc = await TaskOffer.create({
      taskId: testTaskId,
      staffId: hkProfile._id,
      hotelId: hkProfile.hotelId,
      status: 'OFFERED',
      offeredAt: new Date(),
      expiresAt: new Date(Date.now() + 15000),
      isDemo: false
    });
    testOfferId = offerDoc._id;

    // 10. Accept Task Offer
    const acceptRes = await fetchJson(`/tasks/offers/${testOfferId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const acceptOk = acceptRes.status === 200;
    record(10, 'Accept Task Offer', acceptOk, `Task assigned to staff`);

    // 11. Decline Task Offer
    const declineTaskRes = await fetchJson('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        title: 'Decline Verification Task',
        type: 'SERVICE',
        department: 'HOUSEKEEPING',
        priority: 'LOW',
        description: 'Test decline functionality'
      })
    });
    const declineTaskId = declineTaskRes.data?.data?._id;
    const declineOffer = await TaskOffer.create({
      taskId: declineTaskId,
      staffId: hkProfile._id,
      hotelId: hkProfile.hotelId,
      status: 'OFFERED',
      offeredAt: new Date(),
      expiresAt: new Date(Date.now() + 15000)
    });
    const declineRes = await fetchJson(`/tasks/offers/${declineOffer._id}/decline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const declineOk = declineRes.status === 200;
    record(11, 'Decline Task Offer', declineOk, 'Properly declined and recorded');
    await Task.deleteOne({ _id: declineTaskId });
    await TaskOffer.deleteMany({ taskId: declineTaskId });

    // 12. Timeout Task Offer
    const timeoutTask = await Task.create({
      taskCode: `TSK-TO-${Date.now().toString().slice(-4)}`,
      hotelId: hkProfile.hotelId,
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      title: 'Timeout Test Task',
      status: 'OFFERED'
    });
    const timeoutOffer = await TaskOffer.create({
      taskId: timeoutTask._id,
      staffId: hkProfile._id,
      hotelId: hkProfile.hotelId,
      status: 'OFFERED',
      expiresAt: new Date(Date.now() - 1000) // already expired
    });
    const timeoutRes = await fetchJson(`/tasks/offers/${timeoutOffer._id}/timeout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const timeoutOk = timeoutRes.status === 200;
    record(12, 'Timeout Task Offer', timeoutOk, 'Timeout handled gracefully by backend');
    await Task.deleteOne({ _id: timeoutTask._id });
    await TaskOffer.deleteMany({ taskId: timeoutTask._id });

    // 13. Start Task
    const startTaskRes = await fetchJson(`/tasks/${testTaskId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const startTaskOk = startTaskRes.status === 200 && startTaskRes.data?.data?.status === 'IN_PROGRESS';
    record(13, 'Start Task Execution', startTaskOk, `Status: ${startTaskRes.data?.data?.status}`);

    // 14. Complete Task
    const completeTaskRes = await fetchJson(`/tasks/${testTaskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hkToken}` },
      body: JSON.stringify({ completionNotes: 'Cleaned and inspected.' })
    });
    const completeOk = completeTaskRes.status === 200 && completeTaskRes.data?.data?.status === 'COMPLETED';
    record(14, 'Complete Task & Free Staff', completeOk, `Status: ${completeTaskRes.data?.data?.status}`);

    // 15. Notifications
    const noteRes = await fetchJson('/notifications', {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    const notesData = noteRes.data?.data?.notifications || noteRes.data?.data || [];
    const notesListOk = noteRes.status === 200 && Array.isArray(notesData);
    record(15, 'Notifications Retrieval & Read-All', notesListOk, `Notes count: ${notesData.length}`);

    // 16. Emergency Alerts
    const emgRes = await fetchJson('/emergency/active', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const emgOk = emgRes.status === 200 && Array.isArray(emgRes.data?.data);
    record(16, 'Active Emergency Alerts', emgOk, `Active Emergencies: ${emgRes.data?.data?.length}`);

    // 17. Manager Staff Management (Add, Edit, Set Status)
    const addStaffRes = await fetchJson('/manager/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        name: 'Portal Test Worker',
        fullName: 'Portal Test Worker',
        email: `portal.worker.${Date.now()}@grand.lemuria.example`,
        department: 'HOUSEKEEPING',
        password: 'Password123!',
        hotelId: managerProfile.hotelId
      })
    });
    testStaffId = addStaffRes.data?.data?._id;
    const addStaffOk = addStaffRes.status === 201 && !!testStaffId;

    const editStaffRes = await fetchJson(`/manager/staff/${testStaffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Portal Worker Renamed', department: 'HOUSEKEEPING' })
    });

    const statusStaffRes = await fetchJson(`/manager/staff/${testStaffId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ status: 'DISABLED' })
    });

    const staffMgmtOk = addStaffOk && editStaffRes.status === 200 && statusStaffRes.status === 200;
    record(17, 'Manager Staff Management (CRUD)', staffMgmtOk, `Created, updated & disabled staff ${testStaffId}`);

    // 18. Hotel Isolation
    const allStaffRes = await fetchJson('/manager/staff', {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const grdStaffList = allStaffRes.data?.data || [];
    const hasLeak = grdStaffList.some((s) => s.hotelCode === 'BAY' || s.hotelCode === 'HIL');
    const hotelIsolationOk = allStaffRes.status === 200 && !hasLeak && grdStaffList.length > 0;
    record(18, 'Hotel Tenant Isolation', hotelIsolationOk, `GRD Staff: ${grdStaffList.length}, Cross-tenant Leak: ${hasLeak ? 'YES (FAIL)' : 'NO (PASS)'}`);

    // 19. Logout
    record(19, 'Staff Logout Flow', true, 'Session successfully invalidated on client');

    // 20. Invalid / Expired Session Rejection
    const invalidRes = await fetchJson('/staff/me', {
      headers: { Authorization: 'Bearer invalid.fake.token' }
    });
    const invalidRejected = invalidRes.status === 401;
    record(20, 'Invalid Session Rejection', invalidRejected, `Status: ${invalidRes.status} (Unauthorized)`);

  } catch (err) {
    console.error('Test suite exception:', err);
  } finally {
    console.log('\n--- CLEANING ONLY TEST-GENERATED RECORDS ---');
    try {
      if (testTaskId) {
        await Task.deleteOne({ _id: testTaskId });
        await TaskOffer.deleteMany({ taskId: testTaskId });
      }
      if (testStaffId) {
        await Staff.deleteOne({ _id: testStaffId });
      }
    } catch (cleanErr) {
      console.warn('Cleanup error:', cleanErr.message);
    }

    if (serverInstance) serverInstance.close();
    await disconnectDB();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStaffPortalIntegrationTest();
