require('dotenv').config();
const assert = require('assert');
const express = require('express');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, Room, Task } = require('../src/models');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runSecurityTests() {
  console.log('================================================================');
  console.log('CRITICAL SECURITY SUITE: STAFF DEPARTMENT AUTH & RBAC ENFORCEMENT');
  console.log('================================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let hkStaff, maintStaff, rcStaff, managerStaff, bayStaff;
  let grdHotel, bayHotel;

  try {
    // Lookup fixtures in MongoDB
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

    managerStaff = await Staff.findOne({
      $or: [{ role: 'MANAGER' }, { department: { $in: ['MANAGER', 'manager'] } }],
      hotelId: grdHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    bayStaff = await Staff.findOne({
      hotelId: bayHotel._id,
      enabled: { $ne: false },
      accountStatus: { $ne: 'DISABLED' }
    });

    assert.ok(hkStaff, 'Housekeeping staff fixture required');
    assert.ok(maintStaff, 'Maintenance staff fixture required');
    assert.ok(rcStaff, 'Reception staff fixture required');
    assert.ok(managerStaff, 'Manager staff fixture required');

    const defaultPass = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';

    // TEST 1: Housekeeping credentials + Housekeeping workspace -> ALLOWED (200)
    console.log('[TEST 1] Housekeeping staff logging into Housekeeping workspace...');
    const res1 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    const json1 = await res1.json();
    assert.strictEqual(res1.status, 200, `Expected 200, got ${res1.status}`);
    assert.ok(json1.data?.token, 'Token must be issued');
    assert.strictEqual(json1.data.staff.department.toLowerCase(), 'housekeeping');
    const hkToken = json1.data.token;
    console.log('✓ [TEST 1 PASSED] Housekeeping credentials + Housekeeping workspace allowed\n');

    // TEST 2: Housekeeping credentials + Maintenance workspace -> REJECTED (403)
    console.log('[TEST 2] Housekeeping staff attempting to log into Maintenance workspace...');
    const res2 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: defaultPass,
        department: 'maintenance'
      })
    });
    const json2 = await res2.json();
    assert.strictEqual(res2.status, 403, `Expected 403 Forbidden, got ${res2.status}`);
    assert.strictEqual(json2.success, false);
    assert.ok(json2.message.includes('not authorized for this department'), `Expected department authorization error, got: ${json2.message}`);
    assert.strictEqual(json2.data, undefined, 'No token/data must be issued');
    console.log('✓ [TEST 2 PASSED] Cross-department login (HK -> Maintenance) rejected with 403\n');

    // TEST 3: Maintenance credentials + Maintenance workspace -> ALLOWED (200)
    console.log('[TEST 3] Maintenance staff logging into Maintenance workspace...');
    const res3 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: maintStaff.staffCode || maintStaff.email,
        password: defaultPass,
        department: 'maintenance'
      })
    });
    const json3 = await res3.json();
    assert.strictEqual(res3.status, 200, `Expected 200, got ${res3.status}`);
    assert.ok(json3.data?.token, 'Token must be issued');
    assert.strictEqual(json3.data.staff.department.toLowerCase(), 'maintenance');
    const maintToken = json3.data.token;
    console.log('✓ [TEST 3 PASSED] Maintenance credentials + Maintenance workspace allowed\n');

    // TEST 4: Maintenance credentials + Housekeeping workspace -> REJECTED (403)
    console.log('[TEST 4] Maintenance staff attempting to log into Housekeeping workspace...');
    const res4 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: maintStaff.staffCode || maintStaff.email,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    const json4 = await res4.json();
    assert.strictEqual(res4.status, 403, `Expected 403 Forbidden, got ${res4.status}`);
    assert.ok(json4.message.includes('not authorized for this department'));
    console.log('✓ [TEST 4 PASSED] Cross-department login (Maint -> HK) rejected with 403\n');

    // TEST 5: Reception credentials + Maintenance workspace -> REJECTED (403)
    console.log('[TEST 5] Reception staff attempting to log into Maintenance workspace...');
    const res5 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: rcStaff.staffCode || rcStaff.email,
        password: defaultPass,
        department: 'maintenance'
      })
    });
    const json5 = await res5.json();
    assert.strictEqual(res5.status, 403, `Expected 403 Forbidden, got ${res5.status}`);
    assert.ok(json5.message.includes('not authorized for this department'));
    console.log('✓ [TEST 5 PASSED] Cross-department login (Reception -> Maintenance) rejected with 403\n');

    // TEST 6: Disabled or suspended staff -> REJECTED (403)
    console.log('[TEST 6] Testing disabled and suspended staff account rejection...');
    const tempDisabledStaff = new Staff({
      staffCode: `DIS-TEST-${Date.now().toString().slice(-4)}`,
      name: 'Security Test Disabled Staff',
      email: `disabled.sec.${Date.now()}@lemuria.test`,
      passwordHash: hkStaff.passwordHash,
      department: 'housekeeping',
      role: 'HOUSEKEEPING',
      hotelId: grdHotel._id,
      hotelCode: 'GRD',
      enabled: false,
      accountStatus: 'DISABLED'
    });
    await tempDisabledStaff.save();

    const res6a = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: tempDisabledStaff.staffCode,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    const json6a = await res6a.json();
    assert.strictEqual(res6a.status, 403, `Expected 403 Forbidden for disabled staff, got ${res6a.status}`);
    assert.ok(json6a.message.toLowerCase().includes('disabled'));

    tempDisabledStaff.enabled = true;
    tempDisabledStaff.accountStatus = 'SUSPENDED';
    await tempDisabledStaff.save();

    const res6b = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: tempDisabledStaff.staffCode,
        password: defaultPass,
        department: 'housekeeping'
      })
    });
    const json6b = await res6b.json();
    assert.strictEqual(res6b.status, 403, `Expected 403 Forbidden for suspended staff, got ${res6b.status}`);
    assert.ok(json6b.message.toLowerCase().includes('suspended'));

    await Staff.deleteOne({ _id: tempDisabledStaff._id });
    console.log('✓ [TEST 6 PASSED] Disabled & suspended accounts correctly rejected with 403\n');

    // TEST 7: Wrong password -> REJECTED (401)
    console.log('[TEST 7] Testing invalid password rejection...');
    const res7 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: 'IncorrectPassword999!',
        department: 'housekeeping'
      })
    });
    assert.strictEqual(res7.status, 401, `Expected 401 Unauthorized, got ${res7.status}`);
    console.log('✓ [TEST 7 PASSED] Invalid password rejected with 401\n');

    // TEST 8: Missing or forged department in the request -> CANNOT BYPASS (400/403)
    console.log('[TEST 8] Testing missing or forged department handling...');
    const res8a = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: defaultPass
        // department is intentionally omitted
      })
    });
    assert.ok(res8a.status === 400 || res8a.status === 403, `Expected 400 or 403 for missing department, got ${res8a.status}`);

    const res8b = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: hkStaff.staffCode || hkStaff.email,
        password: defaultPass,
        department: 'INVALID_FORGED_DEPT'
      })
    });
    assert.strictEqual(res8b.status, 403, `Expected 403 for forged department, got ${res8b.status}`);
    console.log('✓ [TEST 8 PASSED] Missing/forged department rejected and cannot bypass auth\n');

    // TEST 9: Housekeeping token calling a manager-only or maintenance-restricted endpoint -> REJECTED (403)
    console.log('[TEST 9] Testing role & department authorization on protected endpoints...');
    const res9a = await fetch(`${baseUrl}/manager/staff`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hkToken}`
      }
    });
    assert.strictEqual(res9a.status, 403, `Expected 403 when Housekeeping staff accesses Manager staff directory, got ${res9a.status}`);

    // Housekeeping token attempting to manually assign task
    const sampleTask = await Task.findOne({ hotelId: grdHotel._id });
    if (sampleTask) {
      const res9b = await fetch(`${baseUrl}/tasks/${sampleTask._id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hkToken}`
        },
        body: JSON.stringify({ staffId: hkStaff._id })
      });
      assert.strictEqual(res9b.status, 403, `Expected 403 when Housekeeping staff attempts manual task assign, got ${res9b.status}`);
    }
    console.log('✓ [TEST 9 PASSED] Housekeeping token rejected on manager/restricted endpoints\n');

    // TEST 10: Multi-hotel isolation check
    console.log('[TEST 10] Testing hotel tenant isolation on staff login & data access...');
    if (bayStaff) {
      const res10 = await fetch(`${baseUrl}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrCode: bayStaff.staffCode || bayStaff.email,
          password: defaultPass,
          department: bayStaff.department || 'housekeeping',
          hotelId: grdHotel._id.toString()
        })
      });
      assert.strictEqual(res10.status, 403, `Expected 403 when staff logs into different hotel, got ${res10.status}`);
    }
    console.log('✓ [TEST 10 PASSED] Multi-hotel isolation strictly enforced\n');

    // TEST 11: Legitimate Manager login and authorized management actions -> ALLOWED (200)
    console.log('[TEST 11] Testing Manager login and authorized management actions...');
    const res11 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrCode: managerStaff.staffCode || managerStaff.email,
        password: defaultPass,
        department: 'manager'
      })
    });
    const json11 = await res11.json();
    assert.strictEqual(res11.status, 200, `Expected 200 OK for manager login, got ${res11.status}`);
    const mgrToken = json11.data.token;

    const res11StaffList = await fetch(`${baseUrl}/manager/staff`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mgrToken}`
      }
    });
    assert.strictEqual(res11StaffList.status, 200, `Expected 200 for manager staff list access, got ${res11StaffList.status}`);
    console.log('✓ [TEST 11 PASSED] Legitimate Manager login and management actions fully working\n');

    console.log('================================================================');
    console.log('ALL 11 CRITICAL SECURITY REGRESSION TESTS PASSED SUCCESSFULLY');
    console.log('================================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runSecurityTests().catch((err) => {
  console.error('CRITICAL SECURITY TEST FAILED:', err);
  process.exit(1);
});
