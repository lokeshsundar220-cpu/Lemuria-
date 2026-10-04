require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const apiRoutes = require('../src/routes');
const express = require('express');
const cors = require('cors');
const { Staff, Task, Hotel, TaskOffer, Notification, AuditLog } = require('../src/models');

const serverApp = express();
serverApp.use(cors());
serverApp.use(express.json());
serverApp.use('/api', apiRoutes);

let serverInstance = null;
const port = 5098;
const baseUrl = `http://localhost:${port}/api`;

async function fetchJson(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('=== STARTING HILLS HOTEL - LOKESH SUNDAR ASSIGNMENT TEST ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  await new Promise((resolve) => {
    serverInstance = serverApp.listen(port, resolve);
  });

  // 1. Verify Lokesh Record in DB
  const lokesh = await Staff.findOne({ staffCode: 'HIL-MT-002' });
  if (!lokesh) {
    throw new Error('FAIL: HIL-MT-002 not found in database!');
  }
  console.log('1. Lokesh Record verified in DB:');
  console.log({
    _id: lokesh._id.toString(),
    staffCode: lokesh.staffCode,
    name: lokesh.name,
    email: lokesh.email,
    department: lokesh.department,
    hotelId: lokesh.hotelId.toString(),
    accountStatus: lokesh.accountStatus,
    dutyStatus: lokesh.dutyStatus,
    availability: lokesh.availability
  });

  // Ensure Lokesh is ON_DUTY, AVAILABLE, ENABLED, no currentTaskId for clean start
  lokesh.duty = 'ON_DUTY';
  lokesh.dutyStatus = 'ON_DUTY';
  lokesh.availability = 'AVAILABLE';
  lokesh.accountStatus = 'ENABLED';
  lokesh.enabled = true;
  lokesh.currentTaskId = null;
  await lokesh.save();

  // 2. Login as Hills Manager
  console.log('\n2. Logging in as Hills Manager (ganesh.subramanian@hills.lemuria.example)...');
  const hillsManagerRes = await fetchJson('/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrCode: 'ganesh.subramanian@hills.lemuria.example',
      password: 'Password123!'
    })
  });

  if (hillsManagerRes.status !== 200) {
    throw new Error(`Hills Manager login failed: ${JSON.stringify(hillsManagerRes.data)}`);
  }
  const hillsToken = hillsManagerRes.data.data.token;
  const hillsHotelId = hillsManagerRes.data.data.staff.hotelId;
  console.log('Hills Manager authenticated successfully. Hotel ID:', hillsHotelId);

  // 3. Hills Manager Staff List Check
  console.log('\n3. Hills Manager querying staff list...');
  const hillsStaffListRes = await fetchJson('/manager/staff', {
    headers: { Authorization: `Bearer ${hillsToken}` }
  });

  if (hillsStaffListRes.status !== 200) {
    throw new Error(`Hills staff list fetch failed: ${JSON.stringify(hillsStaffListRes.data)}`);
  }
  const hillsStaff = hillsStaffListRes.data.data;
  const foundLokeshInHills = hillsStaff.find(s => s.staffCode === 'HIL-MT-002' || s.email === 'lokeshsundar220@gmail.com');
  if (!foundLokeshInHills) {
    throw new Error('FAIL: Lokesh Sundar NOT found in Hills Manager staff list!');
  }
  console.log('SUCCESS: Lokesh found in Hills Manager staff list:', {
    id: foundLokeshInHills._id || foundLokeshInHills.id,
    staffCode: foundLokeshInHills.staffCode,
    name: foundLokeshInHills.name,
    department: foundLokeshInHills.department
  });

  // 4. Grand Manager Isolation Check
  console.log('\n4. Checking Grand Manager Isolation (daniel.cruz@grand.lemuria.example)...');
  const grandManagerRes = await fetchJson('/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrCode: 'daniel.cruz@grand.lemuria.example',
      password: 'Password123!'
    })
  });
  if (grandManagerRes.status === 200) {
    const grandStaffListRes = await fetchJson('/manager/staff', {
      headers: { Authorization: `Bearer ${grandManagerRes.data.data.token}` }
    });
    const foundInGrand = (grandStaffListRes.data.data || []).find(s => s.staffCode === 'HIL-MT-002' || s.name === 'Lokesh Sundar');
    if (foundInGrand) {
      throw new Error('FAIL: Grand Manager can see Lokesh Sundar! Hotel isolation breached!');
    }
    console.log('SUCCESS: Grand Manager CANNOT see Lokesh Sundar.');
  }

  // 5. Bay Manager Isolation Check
  console.log('\n5. Checking Bay Manager Isolation (joseph.rodrigues@bay.lemuria.example)...');
  const bayManagerRes = await fetchJson('/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrCode: 'joseph.rodrigues@bay.lemuria.example',
      password: 'Password123!'
    })
  });
  if (bayManagerRes.status === 200) {
    const bayStaffListRes = await fetchJson('/manager/staff', {
      headers: { Authorization: `Bearer ${bayManagerRes.data.data.token}` }
    });
    const foundInBay = (bayStaffListRes.data.data || []).find(s => s.staffCode === 'HIL-MT-002' || s.name === 'Lokesh Sundar');
    if (foundInBay) {
      throw new Error('FAIL: Bay Manager can see Lokesh Sundar! Hotel isolation breached!');
    }
    console.log('SUCCESS: Bay Manager CANNOT see Lokesh Sundar.');
  }

  // 6. Create a Hills Maintenance Task
  console.log('\n6. Creating a new Hills Maintenance Task...');
  const createTaskRes = await fetchJson('/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hillsToken}`
    },
    body: JSON.stringify({
      title: 'Heater thermostat check in Cottage H01',
      description: 'Heating unit requires calibration before evening chill',
      department: 'MAINTENANCE',
      priority: 'HIGH',
      hotelId: hillsHotelId
    })
  });

  if (createTaskRes.status !== 201) {
    throw new Error(`Failed to create maintenance task: ${JSON.stringify(createTaskRes.data)}`);
  }
  const createdTask = createTaskRes.data.data;
  console.log('Task created:', {
    _id: createdTask._id,
    taskCode: createdTask.taskCode,
    department: createdTask.department,
    status: createdTask.status
  });

  // 7. Assign Task to Lokesh Sundar using MongoDB _id
  console.log('\n7. Manager assigning task to Lokesh Sundar (using actual MongoDB _id)...');
  const assignRes = await fetchJson(`/tasks/${createdTask._id}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hillsToken}`
    },
    body: JSON.stringify({
      staffId: lokesh._id.toString()
    })
  });

  if (assignRes.status !== 200) {
    throw new Error(`Assign task failed: ${JSON.stringify(assignRes.data)}`);
  }
  console.log('SUCCESS: Manager assignment succeeded!');
  console.log({
    taskId: assignRes.data.data._id,
    taskCode: assignRes.data.data.taskCode,
    status: assignRes.data.data.status,
    assignedStaff: assignRes.data.data.assignedStaffId
  });

  // 8. Login as Lokesh Sundar
  console.log('\n8. Logging in as Lokesh Sundar (HIL-MT-002)...');
  const lokeshLoginRes = await fetchJson('/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrCode: 'HIL-MT-002',
      password: 'Password123!'
    })
  });

  if (lokeshLoginRes.status !== 200) {
    throw new Error(`Lokesh login failed: ${JSON.stringify(lokeshLoginRes.data)}`);
  }
  const lokeshToken = lokeshLoginRes.data.data.token;
  console.log('Lokesh authenticated successfully. Staff info:', {
    _id: lokeshLoginRes.data.data.staff._id,
    staffCode: lokeshLoginRes.data.data.staff.staffCode,
    name: lokeshLoginRes.data.data.staff.name,
    department: lokeshLoginRes.data.data.staff.department
  });

  // 9. Lokesh retrieves my-tasks
  console.log('\n9. Lokesh retrieving tasks (/api/tasks/my-tasks)...');
  const myTasksRes = await fetchJson('/tasks/my-tasks', {
    headers: { Authorization: `Bearer ${lokeshToken}` }
  });

  if (myTasksRes.status !== 200) {
    throw new Error(`Failed to get staff tasks: ${JSON.stringify(myTasksRes.data)}`);
  }
  const myTasks = myTasksRes.data.data;
  console.log(`Active Tasks for Lokesh: ${myTasks.activeTasks.length}`);
  const assignedTask = myTasks.activeTasks.find(t => t._id.toString() === createdTask._id.toString());
  if (!assignedTask) {
    throw new Error('FAIL: Assigned task not found in Lokesh active tasks list!');
  }
  console.log('SUCCESS: Task reached Lokesh without refresh:', {
    taskId: assignedTask._id,
    taskCode: assignedTask.taskCode,
    status: assignedTask.status
  });

  // 10. Lokesh starts the task
  console.log('\n10. Lokesh starting task (/api/tasks/:id/start)...');
  const startRes = await fetchJson(`/tasks/${assignedTask._id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lokeshToken}` }
  });

  if (startRes.status !== 200) {
    throw new Error(`Start task failed: ${JSON.stringify(startRes.data)}`);
  }
  console.log('SUCCESS: Task marked IN_PROGRESS:', {
    status: startRes.data.data.status,
    startedAt: startRes.data.data.startedAt
  });

  // 11. Lokesh completes the task
  console.log('\n11. Lokesh completing task (/api/tasks/:id/complete)...');
  const completeRes = await fetchJson(`/tasks/${assignedTask._id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lokeshToken}`
    },
    body: JSON.stringify({
      completionNotes: 'Heater thermostat calibrated and operational.',
      proofImageUrl: 'https://example.com/proof-thermostat-fixed.jpg'
    })
  });

  if (completeRes.status !== 200) {
    throw new Error(`Complete task failed: ${JSON.stringify(completeRes.data)}`);
  }
  console.log('SUCCESS: Task marked COMPLETED:', {
    status: completeRes.data.data.status,
    completedAt: completeRes.data.data.completedAt,
    notes: completeRes.data.data.completionNote
  });

  // Check Lokesh status is back to AVAILABLE
  const updatedLokesh = await Staff.findById(lokesh._id);
  console.log('Lokesh status after completion:', {
    availability: updatedLokesh.availability,
    currentTaskId: updatedLokesh.currentTaskId
  });
  if (updatedLokesh.availability !== 'AVAILABLE') {
    throw new Error('FAIL: Lokesh availability was not reset to AVAILABLE!');
  }

  if (serverInstance) {
    serverInstance.close();
  }
  await mongoose.disconnect();
  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch(err => {
  console.error('\nTEST ERROR:', err);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
