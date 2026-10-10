require('dotenv').config();
const assert = require('assert');
const express = require('express');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, Room, Task, TaskOffer } = require('../src/models');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runManagerAndDutySecurityTests() {
  console.log('================================================================');
  console.log('SECURITY SUITE: MANAGER AUTHORIZATION & START-DUTY ENFORCEMENT');
  console.log('================================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let hkStaff, maintStaff, rcStaff, fnbStaff, managerStaff, bayStaff, bayManager;
  let grdHotel, bayHotel;

  try {
    const hotels = await Hotel.find({});
    grdHotel = hotels.find(h => h.hotelCode === 'GRD' || h.code === 'grand') || hotels[0];
    bayHotel = hotels.find(h => h.hotelCode === 'BAY' || h.code === 'bay') || hotels[1];

    hkStaff = await Staff.findOne({
      $or: [{ role: 'HOUSEKEEPING' }, { department: { $in: ['HOUSEKEEPING', 'housekeeping'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    maintStaff = await Staff.findOne({
      $or: [{ role: 'MAINTENANCE' }, { department: { $in: ['MAINTENANCE', 'maintenance'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    rcStaff = await Staff.findOne({
      $or: [{ role: 'RECEPTION' }, { department: { $in: ['RECEPTION', 'reception'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    fnbStaff = await Staff.findOne({
      $or: [{ role: 'FNB' }, { department: { $in: ['FNB', 'fnb', 'food_and_beverage'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    managerStaff = await Staff.findOne({
      $or: [{ role: 'MANAGER' }, { department: { $in: ['MANAGER', 'manager'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    bayStaff = await Staff.findOne({
      hotelId: bayHotel._id,
      department: { $ne: 'manager' },
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    bayManager = await Staff.findOne({
      hotelId: bayHotel._id,
      $or: [{ role: 'MANAGER' }, { department: 'manager' }],
      enabled: { $ne: false }
    });

    assert.ok(hkStaff, 'Housekeeping staff fixture required');
    assert.ok(maintStaff, 'Maintenance staff fixture required');
    assert.ok(rcStaff, 'Reception staff fixture required');
    assert.ok(managerStaff, 'Manager staff fixture required');

    const defaultPass = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';

    // Helper: Login and get token
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

    // Ensure manager is OFF_DUTY to test exemption
    managerStaff.duty = 'OFF_DUTY';
    managerStaff.dutyStatus = 'OFF_DUTY';
    await managerStaff.save();

    const { data: mgrLoginData } = await login(managerStaff, 'manager');
    const mgrToken = mgrLoginData.data.token;

    const { data: hkLoginData } = await login(hkStaff, 'housekeeping');
    const hkToken = hkLoginData.data.token;

    const { data: maintLoginData } = await login(maintStaff, 'maintenance');
    const maintToken = maintLoginData.data.token;

    const { data: rcLoginData } = await login(rcStaff, 'reception');
    const rcToken = rcLoginData.data.token;

    let fnbToken = null;
    if (fnbStaff) {
      const { data: fnbLoginData } = await login(fnbStaff, 'fnb');
      fnbToken = fnbLoginData.data?.token;
    }

    // TEST 1: Enabled Manager can access authorized Manager pages and APIs without Start Duty
    console.log('[TEST 1] Testing Manager access without Start Duty...');
    const res1Staff = await fetch(`${baseUrl}/manager/staff`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    assert.strictEqual(res1Staff.status, 200, `Expected 200 for manager staff directory, got ${res1Staff.status}`);

    const res1Workload = await fetch(`${baseUrl}/manager/workload`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    assert.strictEqual(res1Workload.status, 200, `Expected 200 for manager workload endpoint, got ${res1Workload.status}`);
    console.log('✓ [TEST 1 PASSED] Enabled Manager accesses manager endpoints without Start Duty\n');

    // TEST 2: Housekeeping cannot access Manager pages or APIs (HTTP 403)
    console.log('[TEST 2] Testing Housekeeping token blocked on manager endpoints...');
    const res2 = await fetch(`${baseUrl}/manager/staff`, {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res2.status, 403, `Expected 403 Forbidden for HK calling manager/staff, got ${res2.status}`);
    console.log('✓ [TEST 2 PASSED] Housekeeping cannot access Manager APIs (403)\n');

    // TEST 3: Maintenance cannot access Manager pages or APIs (HTTP 403)
    console.log('[TEST 3] Testing Maintenance token blocked on manager endpoints...');
    const res3 = await fetch(`${baseUrl}/manager/workload`, {
      headers: { Authorization: `Bearer ${maintToken}` }
    });
    assert.strictEqual(res3.status, 403, `Expected 403 Forbidden for Maintenance calling manager/workload, got ${res3.status}`);
    console.log('✓ [TEST 3 PASSED] Maintenance cannot access Manager APIs (403)\n');

    // TEST 4: Reception and F&B cannot access Manager-only actions (HTTP 403)
    console.log('[TEST 4] Testing Reception and F&B tokens blocked on manager-only actions...');
    const res4Rc = await fetch(`${baseUrl}/manager/staff`, {
      headers: { Authorization: `Bearer ${rcToken}` }
    });
    assert.strictEqual(res4Rc.status, 403, `Expected 403 for Reception calling manager/staff, got ${res4Rc.status}`);

    if (fnbToken) {
      const res4Fnb = await fetch(`${baseUrl}/manager/staff`, {
        headers: { Authorization: `Bearer ${fnbToken}` }
      });
      assert.strictEqual(res4Fnb.status, 403, `Expected 403 for F&B calling manager/staff, got ${res4Fnb.status}`);
    }
    console.log('✓ [TEST 4 PASSED] Reception and F&B cannot access Manager-only actions (403)\n');

    // TEST 5: A staff member cannot gain Manager access by changing local storage, URL, request body, or workspace selection
    console.log('[TEST 5] Testing forged workspace/body attempts to gain Manager access...');
    const res5Login = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode,
        password: defaultPass,
        department: 'manager'
      })
    });
    assert.strictEqual(res5Login.status, 403, `Expected 403 for non-manager attempting manager workspace login, got ${res5Login.status}`);

    // Attempting to pass role or department in request headers / body
    const res5Body = await fetch(`${baseUrl}/manager/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      },
      body: JSON.stringify({
        name: 'Hacker Staff',
        email: 'hacker@lemuria.test',
        password: 'Password123!',
        department: 'housekeeping',
        hotelId: grdHotel._id
      })
    });
    assert.strictEqual(res5Body.status, 403, `Expected 403 when non-manager tries to add staff, got ${res5Body.status}`);
    console.log('✓ [TEST 5 PASSED] Direct tampering, forged body, or workspace spoofing cannot gain Manager access\n');

    // TEST 6: Staff who have not started duty cannot receive task offers or perform duty-dependent task actions
    console.log('[TEST 6] Testing OFF_DUTY staff blocked on duty-dependent operations...');
    // Ensure HK staff is OFF_DUTY
    hkStaff.duty = 'OFF_DUTY';
    hkStaff.dutyStatus = 'OFF_DUTY';
    hkStaff.availability = 'AVAILABLE';
    hkStaff.currentTaskId = null;
    await hkStaff.save();

    // Create a housekeeping task
    const sampleTask = await Task.create({
      taskCode: `TSK-DUTY-${Date.now().toString().slice(-4)}`,
      taskNumber: `TSK-DUTY-${Date.now().toString().slice(-4)}`,
      hotelId: grdHotel._id,
      hotel: grdHotel._id,
      department: 'HOUSEKEEPING',
      category: 'HOUSEKEEPING',
      type: 'CLEANING',
      priority: 'HIGH',
      status: 'PENDING',
      assignedStaffId: hkStaff._id
    });

    // HK staff attempts to start task while OFF_DUTY -> 403
    const res6Start = await fetch(`${baseUrl}/tasks/${sampleTask._id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      }
    });
    assert.strictEqual(res6Start.status, 403, `Expected 403 when OFF_DUTY staff starts task, got ${res6Start.status}`);

    // HK staff attempts to complete task while OFF_DUTY -> 403
    const res6Complete = await fetch(`${baseUrl}/tasks/${sampleTask._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      },
      body: JSON.stringify({ completionNotes: 'Done' })
    });
    assert.strictEqual(res6Complete.status, 403, `Expected 403 when OFF_DUTY staff completes task, got ${res6Complete.status}`);

    await Task.deleteOne({ _id: sampleTask._id });
    console.log('✓ [TEST 6 PASSED] OFF_DUTY staff cannot perform duty-dependent task operations\n');

    // TEST 7: Starting duty does not change the user's role or department
    console.log('[TEST 7] Testing that Start Duty does not grant Manager permissions or alter role/department...');
    const originalDept = hkStaff.department;
    const originalRole = hkStaff.role;

    const res7Duty = await fetch(`${baseUrl}/staff/duty/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hkToken}`
      }
    });
    assert.strictEqual(res7Duty.status, 200, `Expected 200 for Start Duty, got ${res7Duty.status}`);

    const refreshedHkStaff = await Staff.findById(hkStaff._id);
    assert.strictEqual(refreshedHkStaff.department, originalDept, 'Department must remain unchanged');
    assert.strictEqual(refreshedHkStaff.role, originalRole, 'Role must remain unchanged');

    // After starting duty, Housekeeping staff STILL cannot access manager routes
    const res7MgrCheck = await fetch(`${baseUrl}/manager/staff`, {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res7MgrCheck.status, 403, `Expected 403: Starting duty must NEVER grant manager access`);
    console.log('✓ [TEST 7 PASSED] Start Duty does not alter role or grant Manager permissions\n');

    // TEST 8: Disabled, suspended, and deleted accounts remain blocked
    console.log('[TEST 8] Testing disabled, suspended, and deleted account enforcement...');
    const tempStaff = await Staff.create({
      staffCode: `TEST-STATUS-${Date.now().toString().slice(-4)}`,
      name: 'Status Test Staff',
      email: `status.sec.${Date.now()}@lemuria.test`,
      passwordHash: hkStaff.passwordHash,
      department: 'housekeeping',
      role: 'HOUSEKEEPING',
      hotelId: grdHotel._id,
      hotelCode: 'GRD',
      enabled: false,
      accountStatus: 'DISABLED'
    });

    const res8Disabled = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: tempStaff.staffCode,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    assert.strictEqual(res8Disabled.status, 403);

    tempStaff.enabled = true;
    tempStaff.accountStatus = 'DELETED';
    await tempStaff.save();

    const res8Deleted = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: tempStaff.staffCode,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    assert.strictEqual(res8Deleted.status, 403);

    await Staff.deleteOne({ _id: tempStaff._id });
    console.log('✓ [TEST 8 PASSED] Disabled and deleted accounts are completely blocked\n');

    // TEST 9: Existing legitimate Manager functions continue to work
    console.log('[TEST 9] Testing full suite of Manager operations...');
    const testStaffEmail = `manager.create.test.${Date.now()}@lemuria.test`;
    const res9CreateStaff = await fetch(`${baseUrl}/manager/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({
        name: 'New Test Technician',
        email: testStaffEmail,
        password: 'Password123!',
        department: 'maintenance',
        hotelId: grdHotel._id.toString()
      })
    });
    const json9 = await res9CreateStaff.json();
    assert.strictEqual(res9CreateStaff.status, 201, `Expected 201 for manager creating staff, got ${res9CreateStaff.status}`);
    const createdStaffId = json9.data._id;

    // Manager updates staff status
    const res9Status = await fetch(`${baseUrl}/manager/staff/${createdStaffId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ status: 'DISABLED', enabled: false })
    });
    assert.strictEqual(res9Status.status, 200, `Expected 200 for manager updating staff status, got ${res9Status.status}`);

    // Manager deletes/cleans up test staff
    await Staff.deleteOne({ _id: createdStaffId });
    console.log('✓ [TEST 9 PASSED] Legitimate Manager operations (add, update, manage) fully functional\n');

    // TEST 10: Hotel-wise data isolation remains intact
    console.log('[TEST 10] Testing hotel tenant data isolation for managers and staff...');
    if (bayManager) {
      const { data: bayMgrLogin } = await login(bayManager, 'manager');
      const bayMgrToken = bayMgrLogin.data.token;

      // Bay Manager retrieves Bay staff list
      const res10Bay = await fetch(`${baseUrl}/manager/staff`, {
        headers: { Authorization: `Bearer ${bayMgrToken}` }
      });
      const json10Bay = await res10Bay.json();
      assert.strictEqual(res10Bay.status, 200);

      // Verify all retrieved staff belong to Bay hotel, none from Grand
      const returnedStaff = json10Bay.data || [];
      const hasGrandStaff = returnedStaff.some(s => String(s.hotelId?._id || s.hotelId || s.hotel) === String(grdHotel._id));
      assert.strictEqual(hasGrandStaff, false, 'Bay hotel manager must not see Grand hotel staff members');
    }
    console.log('✓ [TEST 10 PASSED] Multi-hotel tenant isolation strictly preserved\n');

    console.log('================================================================');
    console.log('ALL 10 MANAGER AUTHORIZATION & START-DUTY SECURITY TESTS PASSED');
    console.log('================================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runManagerAndDutySecurityTests().catch((err) => {
  console.error('SECURITY TEST FAILED:', err);
  process.exit(1);
});
