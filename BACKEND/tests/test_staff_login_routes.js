require('dotenv').config();
const assert = require('assert');
const { connectDB, disconnectDB } = require('../src/config/db');
const authService = require('../src/services/authService');
const express = require('express');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runTests() {
  console.log('==================================================');
  console.log('STAFF LOGIN ROUTE & AUTH VERIFICATION SUITE');
  console.log('==================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Test POST /api/auth/staff/login with Housekeeping Staff Code
    console.log('[TEST 1] Testing POST /api/auth/staff/login with GRD-HK-001...');
    const res1 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-HK-001', password: 'Password123!' })
    });
    const json1 = await res1.json();
    assert.strictEqual(res1.status, 200, `Expected 200 OK, got ${res1.status}`);
    assert.ok(json1.data.token, 'Token must be present');
    assert.strictEqual(json1.data.staff.staffCode, 'GRD-HK-001', 'Staff code mismatch');
    assert.strictEqual(json1.data.staff.department.toLowerCase(), 'housekeeping', 'Department mismatch');
    console.log('✓ [TEST 1 PASSED] Staff authenticated successfully via /api/auth/staff/login\n');

    // 2. Test POST /api/staff/login route alias
    console.log('[TEST 2] Testing POST /api/staff/login alias with GRD-HK-001...');
    const res2 = await fetch(`${baseUrl}/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-HK-001', password: 'Password123!' })
    });
    const json2 = await res2.json();
    assert.strictEqual(res2.status, 200, `Expected 200 OK, got ${res2.status}`);
    assert.ok(json2.data.token, 'Token must be present');
    console.log('✓ [TEST 2 PASSED] Staff alias route /api/staff/login authenticated successfully\n');

    // 3. Test Manager login (GRD-MG-001)
    console.log('[TEST 3] Testing Manager Login with GRD-MG-001...');
    const res3 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-MG-001', password: 'Password123!' })
    });
    const json3 = await res3.json();
    assert.strictEqual(res3.status, 200, `Expected 200 OK, got ${res3.status}`);
    assert.strictEqual(json3.data.staff.role, 'MANAGER', 'Role mismatch');
    console.log('✓ [TEST 3 PASSED] Manager authenticated successfully\n');

    // 4. Test Reception login (GRD-RC-001)
    console.log('[TEST 4] Testing Reception Login with GRD-RC-001...');
    const res4 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-RC-001', password: 'Password123!' })
    });
    const json4 = await res4.json();
    assert.strictEqual(res4.status, 200, `Expected 200 OK, got ${res4.status}`);
    assert.strictEqual(json4.data.staff.department.toLowerCase(), 'reception', 'Department mismatch');
    console.log('✓ [TEST 4 PASSED] Reception staff authenticated successfully\n');

    // 5. Test Invalid password rejection (401)
    console.log('[TEST 5] Testing Invalid Password rejection...');
    const res5 = await fetch(`${baseUrl}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrCode: 'GRD-HK-001', password: 'WrongPassword999!' })
    });
    assert.strictEqual(res5.status, 401, `Expected 401 Unauthorized, got ${res5.status}`);
    console.log('✓ [TEST 5 PASSED] Invalid credentials properly rejected with 401\n');

    console.log('==================================================');
    console.log('ALL STAFF LOGIN TESTS PASSED SUCCESSFULLY');
    console.log('==================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
