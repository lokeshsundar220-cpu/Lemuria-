require('dotenv').config();
const assert = require('assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, Room, Task, TaskOffer } = require('../src/models');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('REGRESSION SUITE: DUTY AUTHENTICATION & MANAGER TASK ASSIGNMENT RULES');
  console.log('========================================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  const jwtSecret = process.env.JWT_SECRET || 'Lemuria_jwt_secret_key_2026';
  const defaultPass = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';

  let testTasksToClean = [];

  try {
    const hotels = await Hotel.find({});
    const grdHotel = hotels.find((h) => h.hotelCode === 'GRD' || h.code === 'grand') || hotels[0];
    const bayHotel = hotels.find((h) => h.hotelCode === 'BAY' || h.code === 'bay') || hotels[1];

    assert.ok(grdHotel, 'Grand hotel fixture is required');
    assert.ok(bayHotel, 'Bay hotel fixture is required');

    // Fetch staff fixtures
    const managerStaff = await Staff.findOne({
      $or: [{ role: 'MANAGER' }, { department: { $in: ['MANAGER', 'manager'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    const bayManager = await Staff.findOne({
      $or: [{ role: 'MANAGER' }, { department: { $in: ['MANAGER', 'manager'] } }],
      hotelId: bayHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    const rcStaff = await Staff.findOne({
      $or: [{ role: 'RECEPTION' }, { department: { $in: ['RECEPTION', 'reception'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    const hkStaff = await Staff.findOne({
      $or: [{ role: 'HOUSEKEEPING' }, { department: { $in: ['HOUSEKEEPING', 'housekeeping'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    const maintStaff = await Staff.findOne({
      $or: [{ role: 'MAINTENANCE' }, { department: { $in: ['MAINTENANCE', 'maintenance'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    const fnbStaff = await Staff.findOne({
      $or: [{ role: 'FNB' }, { department: { $in: ['FNB', 'fnb', 'food_and_beverage'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    assert.ok(managerStaff, 'Manager fixture is required');
    assert.ok(bayManager, 'Bay Manager fixture is required');
    assert.ok(rcStaff, 'Reception fixture is required');
    assert.ok(hkStaff, 'Housekeeping fixture is required');
    assert.ok(maintStaff, 'Maintenance fixture is required');

    // Helper: Login staff
    async function login(staffDoc, dept) {
      const res = await fetch(`${baseUrl}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrCode: staffDoc.staffCode || staffDoc.email,
          password: defaultPass,
          department: dept
        })
      });
      const data = await res.json();
      return { status: res.status, data };
    }

    const { data: mgrLogin } = await login(managerStaff, 'manager');
    const mgrToken = mgrLogin.data.token;

    const { data: bayMgrLogin } = await login(bayManager, 'manager');
    const bayMgrToken = bayMgrLogin.data.token;

    const { data: rcLogin } = await login(rcStaff, 'reception');
    const rcToken = rcLogin.data.token;

    const { data: hkLogin } = await login(hkStaff, 'housekeeping');
    const hkToken = hkLogin.data.token;

    const { data: maintLogin } = await login(maintStaff, 'maintenance');
    const maintToken = maintLogin.data.token;

    let fnbToken = null;
    if (fnbStaff) {
      const { data: fnbLogin } = await login(fnbStaff, 'fnb');
      fnbToken = fnbLogin.data?.token;
    }

    // =========================================================================
    // TEST 1: Token Authentication Verification (Missing, Expired, Malformed, Valid)
    // =========================================================================
    console.log('[TEST 1] Testing Token Authentication (Missing, Expired, Malformed, Valid)...');

    // 1A: Missing token
    const res1A = await fetch(`${baseUrl}/staff/duty/status`);
    const json1A = await res1A.json();
    assert.strictEqual(res1A.status, 401, 'Expected 401 for request without token');
    assert.ok(json1A.message.includes('token required') || json1A.error?.includes('token required'), 'Expected token required message');

    // 1B: Malformed / invalid token
    const res1B = await fetch(`${baseUrl}/staff/duty/status`, {
      headers: { Authorization: 'Bearer thisisnotavalidjwttoken12345' }
    });
    assert.strictEqual(res1B.status, 401, 'Expected 401 for malformed token');

    // 1C: Expired token
    const expiredToken = jwt.sign(
      { id: managerStaff._id, role: 'STAFF', department: 'manager' },
      jwtSecret,
      { expiresIn: '-10s' }
    );
    const res1C = await fetch(`${baseUrl}/staff/duty/status`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    const json1C = await res1C.json();
    assert.strictEqual(res1C.status, 401, 'Expected 401 for expired token');
    assert.ok(json1C.message.includes('expired') || json1C.error?.includes('expired'), 'Expected token expired error');

    // 1D: Valid token succeeds
    const res1D = await fetch(`${baseUrl}/staff/duty/status`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    assert.strictEqual(res1D.status, 200, 'Expected 200 for valid token');
    console.log('✓ [TEST 1 PASSED] Missing, expired, malformed, and valid tokens handled correctly.\n');

    // =========================================================================
    // TEST 2: Start Duty and End Duty for Every Supported Staff Role
    // =========================================================================
    console.log('[TEST 2] Testing Start Duty and End Duty for all supported roles...');

    const roleConfigs = [
      { name: 'Manager', token: mgrToken, staffDoc: managerStaff },
      { name: 'Reception', token: rcToken, staffDoc: rcStaff },
      { name: 'Housekeeping', token: hkToken, staffDoc: hkStaff },
      { name: 'Maintenance', token: maintToken, staffDoc: maintStaff }
    ];
    if (fnbToken && fnbStaff) {
      roleConfigs.push({ name: 'FNB', token: fnbToken, staffDoc: fnbStaff });
    }

    for (const conf of roleConfigs) {
      // Start Duty
      const resStart = await fetch(`${baseUrl}/staff/duty/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conf.token}`
        }
      });
      const jsonStart = await resStart.json();
      assert.strictEqual(resStart.status, 200, `${conf.name} Start Duty failed with status ${resStart.status}`);
      const freshStart = await Staff.findById(conf.staffDoc._id);
      assert.ok(
        freshStart.duty === 'ON' || freshStart.duty === 'ON_DUTY' || freshStart.dutyStatus === 'ON_DUTY',
        `${conf.name} duty should be ON after start duty`
      );

      // End Duty
      const resEnd = await fetch(`${baseUrl}/staff/duty/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${conf.token}`
        }
      });
      const jsonEnd = await resEnd.json();
      assert.strictEqual(resEnd.status, 200, `${conf.name} End Duty failed with status ${resEnd.status}`);
      const freshEnd = await Staff.findById(conf.staffDoc._id);
      assert.ok(
        freshEnd.duty === 'OFF' || freshEnd.duty === 'OFF_DUTY' || freshEnd.dutyStatus === 'OFF_DUTY',
        `${conf.name} duty should be OFF after end duty`
      );
    }
    console.log('✓ [TEST 2 PASSED] Start Duty and End Duty verified for Manager, Reception, Housekeeping, Maintenance, and F&B.\n');

    // =========================================================================
    // TEST 3: Off-Duty Manager Assignment Rejected by Backend
    // =========================================================================
    console.log('[TEST 3] Testing Off-Duty Manager manual task assignment is rejected with HTTP 403...');

    // Ensure manager is OFF_DUTY in database
    managerStaff.duty = 'OFF_DUTY';
    managerStaff.dutyStatus = 'OFF_DUTY';
    await managerStaff.save();

    // Create a pending test task for Housekeeping
    const testTask3 = await Task.create({
      taskCode: `TSK-REG3-${Date.now().toString().slice(-4)}`,
      hotelId: grdHotel._id,
      hotel: grdHotel._id,
      department: 'HOUSEKEEPING',
      category: 'HOUSEKEEPING',
      type: 'CLEANING',
      title: 'Regression Test Room Cleaning',
      roomNumber: '101',
      priority: 'HIGH',
      status: 'PENDING',
      assignmentState: 'AUTO'
    });
    testTasksToClean.push(testTask3._id);

    // Attempt assignment via /tasks/:id/assign
    const res3A = await fetch(`${baseUrl}/tasks/${testTask3._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    const json3A = await res3A.json();
    assert.strictEqual(res3A.status, 403, `Expected 403 for off-duty manager assignment, got ${res3A.status}`);
    assert.strictEqual(json3A.message, 'Start your duty before assigning tasks', `Expected exact duty requirement message, got "${json3A.message}"`);

    // Attempt assignment via /manager/tasks/:id/assign
    const res3B = await fetch(`${baseUrl}/manager/tasks/${testTask3._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    const json3B = await res3B.json();
    assert.strictEqual(res3B.status, 403, `Expected 403 for off-duty manager assignment via manager route, got ${res3B.status}`);
    assert.strictEqual(json3B.message, 'Start your duty before assigning tasks');

    // Ensure task was NOT assigned
    const checkTask3 = await Task.findById(testTask3._id);
    assert.strictEqual(checkTask3.status, 'PENDING', 'Task status must remain PENDING');
    assert.strictEqual(checkTask3.assignedStaffId, null, 'Task must not have assigned staff');
    console.log('✓ [TEST 3 PASSED] Off-duty manager assignment rejected with HTTP 403 "Start your duty before assigning tasks".\n');

    // =========================================================================
    // TEST 4: On-Duty Authorized Manager Assignment Succeeds
    // =========================================================================
    console.log('[TEST 4] Testing On-Duty Authorized Manager manual task assignment succeeds...');

    // Manager starts duty
    const resMgrStartDuty = await fetch(`${baseUrl}/staff/duty/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      }
    });
    assert.strictEqual(resMgrStartDuty.status, 200, 'Manager start duty should succeed');

    // Ensure Housekeeper is eligible and starts duty via API
    await Staff.findByIdAndUpdate(hkStaff._id, {
      currentTaskId: null,
      availability: 'AVAILABLE',
      enabled: true,
      accountStatus: 'ENABLED'
    });
    const resHkStart = await fetch(`${baseUrl}/staff/duty/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      }
    });
    assert.strictEqual(resHkStart.status, 200, 'Housekeeper start duty should succeed');

    // Manager assigns task
    const res4 = await fetch(`${baseUrl}/tasks/${testTask3._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    const json4 = await res4.json();
    assert.strictEqual(res4.status, 200, `Expected 200 for on-duty manager assignment, got ${res4.status}`);
    assert.ok(json4.success, 'Expected success: true');

    const checkTask4 = await Task.findById(testTask3._id);
    assert.strictEqual(checkTask4.status, 'ACCEPTED', 'Task status should be ACCEPTED');
    assert.strictEqual(checkTask4.assignedStaffId.toString(), hkStaff._id.toString(), 'Staff should be assigned');

    const freshHk = await Staff.findById(hkStaff._id);
    assert.strictEqual(freshHk.availability, 'BUSY', 'Staff availability should be BUSY');
    assert.strictEqual(freshHk.currentTaskId.toString(), testTask3._id.toString(), 'Staff currentTaskId should be set');
    console.log('✓ [TEST 4 PASSED] On-duty authorized manager successfully assigned task.\n');

    // =========================================================================
    // TEST 5: Non-Manager Assignment Attempts Remain Forbidden (HTTP 403)
    // =========================================================================
    console.log('[TEST 5] Testing Non-Manager staff assignment attempts remain forbidden...');

    const testTask5 = await Task.create({
      taskCode: `TSK-REG5-${Date.now().toString().slice(-4)}`,
      hotelId: grdHotel._id,
      hotel: grdHotel._id,
      department: 'HOUSEKEEPING',
      category: 'HOUSEKEEPING',
      type: 'CLEANING',
      roomNumber: '102',
      priority: 'MEDIUM',
      status: 'PENDING'
    });
    testTasksToClean.push(testTask5._id);

    // Reception staff attempts to assign task
    const res5Rc = await fetch(`${baseUrl}/tasks/${testTask5._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rcToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    assert.strictEqual(res5Rc.status, 403, `Expected 403 for Reception staff assignment attempt, got ${res5Rc.status}`);

    // Housekeeping staff attempts to assign task
    const res5Hk = await fetch(`${baseUrl}/tasks/${testTask5._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    assert.strictEqual(res5Hk.status, 403, `Expected 403 for Housekeeping staff assignment attempt, got ${res5Hk.status}`);

    // Maintenance staff attempts to assign task
    const res5Maint = await fetch(`${baseUrl}/tasks/${testTask5._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${maintToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    assert.strictEqual(res5Maint.status, 403, `Expected 403 for Maintenance staff assignment attempt, got ${res5Maint.status}`);
    console.log('✓ [TEST 5 PASSED] Non-manager assignment attempts are strictly rejected with HTTP 403.\n');

    // =========================================================================
    // TEST 6: Cross-Hotel Assignment Attempts Remain Forbidden (HTTP 403)
    // =========================================================================
    console.log('[TEST 6] Testing Cross-Hotel assignment attempts remain forbidden...');

    // Create a task belonging to Bay Hotel
    const bayTask = await Task.create({
      taskCode: `TSK-BAY-${Date.now().toString().slice(-4)}`,
      hotelId: bayHotel._id,
      hotel: bayHotel._id,
      department: 'HOUSEKEEPING',
      category: 'HOUSEKEEPING',
      type: 'CLEANING',
      roomNumber: 'B101',
      priority: 'MEDIUM',
      status: 'PENDING'
    });
    testTasksToClean.push(bayTask._id);

    // Grand Hotel Manager attempts to assign Bay Hotel Task
    const res6Cross = await fetch(`${baseUrl}/tasks/${bayTask._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ staffId: hkStaff._id.toString() })
    });
    assert.strictEqual(res6Cross.status, 403, `Expected 403 for cross-hotel task assignment, got ${res6Cross.status}`);
    console.log('✓ [TEST 6 PASSED] Cross-hotel task assignment strictly forbidden (HTTP 403).\n');

    // =========================================================================
    // TEST 7: Staff Task Execution Unblocked When Manager Ends Duty
    // =========================================================================
    console.log('[TEST 7] Testing Staff task execution is NOT blocked when Manager ends duty...');

    // Manager now ends duty (goes OFF_DUTY)
    const resMgrEndDuty = await fetch(`${baseUrl}/staff/duty/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      }
    });
    assert.strictEqual(resMgrEndDuty.status, 200, 'Manager end duty should succeed');

    const freshMgrAfterEnd = await Staff.findById(managerStaff._id);
    assert.ok(
      freshMgrAfterEnd.duty === 'OFF' || freshMgrAfterEnd.duty === 'OFF_DUTY',
      'Manager must be OFF duty'
    );

    // Housekeeper starts task (assigned previously in TEST 4) while manager is off duty
    const res7Start = await fetch(`${baseUrl}/tasks/${testTask3._id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      }
    });
    const json7Start = await res7Start.json();
    assert.strictEqual(res7Start.status, 200, `Expected 200 for staff starting assigned task, got ${res7Start.status}: ${json7Start.message}`);

    const taskStarted = await Task.findById(testTask3._id);
    assert.strictEqual(taskStarted.status, 'IN_PROGRESS', 'Task status should be IN_PROGRESS');

    // Housekeeper completes task while manager is off duty
    const res7Complete = await fetch(`${baseUrl}/tasks/${testTask3._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      },
      body: JSON.stringify({
        completionNotes: 'Cleaned and sanitized Room 101 perfectly.'
      })
    });
    const json7Complete = await res7Complete.json();
    assert.strictEqual(res7Complete.status, 200, `Expected 200 for staff completing task, got ${res7Complete.status}: ${json7Complete.message}`);

    const taskCompleted = await Task.findById(testTask3._id);
    assert.strictEqual(taskCompleted.status, 'COMPLETED', 'Task status should be COMPLETED');

    const freshHkCompleted = await Staff.findById(hkStaff._id);
    assert.strictEqual(freshHkCompleted.availability, 'AVAILABLE', 'Staff availability should return to AVAILABLE');
    assert.strictEqual(freshHkCompleted.currentTaskId, null, 'Staff currentTaskId should be cleared');
    console.log('✓ [TEST 7 PASSED] Staff task execution works seamlessly even when manager is off duty.\n');

    console.log('========================================================================');
    console.log('ALL REGRESSION TESTS COMPLETED SUCCESSFULLY (7/7 PASSED)');
    console.log('========================================================================');
  } finally {
    // Clean up temporary test tasks
    if (testTasksToClean.length > 0) {
      await Task.deleteMany({ _id: { $in: testTasksToClean } });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

runRegressionSuite().catch((err) => {
  console.error('\n❌ REGRESSION SUITE FAILED:', err);
  process.exit(1);
});
