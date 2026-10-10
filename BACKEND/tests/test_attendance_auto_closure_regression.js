require('dotenv').config();
const assert = require('assert');
const express = require('express');
const { connectDB, disconnectDB } = require('../src/config/db');
const { Staff, Hotel, DutyLog, Task, TaskOffer, Notification } = require('../src/models');
const attendanceService = require('../src/services/attendanceService');
const taskService = require('../src/services/taskService');
const apiRoutes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runAttendanceRegressionTests() {
  console.log('================================================================');
  console.log('TEST SUITE: AUTOMATIC STAFF ATTENDANCE CLOSURE AT 11:59 PM');
  console.log('================================================================\n');

  await connectDB();

  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let hkStaff, managerStaff, bayStaff, bayManager;
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
    assert.ok(managerStaff, 'Manager staff fixture required');
    assert.ok(bayStaff, 'Bay staff fixture required');
    assert.ok(bayManager, 'Bay manager fixture required');

    const defaultPass = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';

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

    const { data: hkLogin } = await login(hkStaff, 'housekeeping');
    const hkToken = hkLogin.data.token;

    const { data: mgrLogin } = await login(managerStaff, 'manager');
    const mgrToken = mgrLogin.data.token;

    const { data: bayLogin } = await login(bayManager, 'manager');
    const bayMgrToken = bayLogin.data.token;

    // Reset initial state for HK staff
    hkStaff.duty = 'OFF_DUTY';
    hkStaff.dutyStatus = 'OFF_DUTY';
    hkStaff.availability = 'AVAILABLE';
    hkStaff.currentTaskId = null;
    await hkStaff.save();
    await DutyLog.deleteMany({ staffId: hkStaff._id, status: 'ACTIVE' });

    // -------------------------------------------------------------
    // TEST 1: Staff can start attendance
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Staff Start Attendance / Duty...');
    const res1 = await fetch(`${baseUrl}/staff/duty/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res1.status, 200, `Expected 200 for start duty, got ${res1.status}`);

    const activeDutyLog = await DutyLog.findOne({ staffId: hkStaff._id, status: 'ACTIVE' });
    assert.ok(activeDutyLog, 'Active DutyLog record must exist in MongoDB');
    assert.strictEqual(activeDutyLog.status, 'ACTIVE');
    assert.ok(activeDutyLog.startedAt, 'Start timestamp must be set');
    assert.ok(activeDutyLog.workDate, 'workDate must be populated');
    assert.ok(activeDutyLog.scheduledCutoffAt, 'scheduledCutoffAt must be populated');
    console.log('✓ [TEST 1 PASSED] Staff started attendance session successfully\n');

    // -------------------------------------------------------------
    // TEST 2: Staff can manually end attendance
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing Staff Manual End Attendance / Duty...');
    const res2 = await fetch(`${baseUrl}/staff/duty/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res2.status, 200, `Expected 200 for manual end duty, got ${res2.status}`);

    const endedDutyLog = await DutyLog.findById(activeDutyLog._id);
    assert.strictEqual(endedDutyLog.status, 'COMPLETED');
    assert.strictEqual(endedDutyLog.endMethod, 'MANUAL');
    assert.strictEqual(endedDutyLog.closureReason, 'MANUAL_END_DUTY');
    assert.ok(endedDutyLog.endedAt, 'endedAt timestamp must be recorded');

    const refreshedHkStaff = await Staff.findById(hkStaff._id);
    assert.strictEqual(refreshedHkStaff.duty, 'OFF_DUTY');
    console.log('✓ [TEST 2 PASSED] Staff manually ended attendance, marked COMPLETED with endMethod: MANUAL\n');

    // -------------------------------------------------------------
    // TEST 3 & 4: Open sessions are auto-closed after cutoff & writes correct MongoDB record
    // -------------------------------------------------------------
    console.log('[TEST 3 & 4] Testing Automatic 11:59 PM closure mechanism...');
    // Create an open session whose cutoff is in the past
    const pastDate = '2026-01-01';
    const pastStart = new Date('2026-01-01T08:00:00.000Z');
    const pastCutoff = new Date('2026-01-01T18:29:59.999Z'); // Past cutoff

    const simulatedOpenLog = await DutyLog.create({
      hotelId: grdHotel._id,
      staffId: hkStaff._id,
      staffCode: hkStaff.staffCode,
      staffName: hkStaff.name,
      department: 'housekeeping',
      workDate: pastDate,
      startedAt: pastStart,
      endedAt: null,
      status: 'ACTIVE',
      scheduledCutoffAt: pastCutoff,
      endMethod: null,
      closureReason: ''
    });

    hkStaff.duty = 'ON_DUTY';
    hkStaff.dutyStatus = 'ON_DUTY';
    hkStaff.dutyStartedAt = pastStart;
    await hkStaff.save();

    // Trigger auto-closure
    const { closedCount } = await attendanceService.autoCloseExpiredAttendanceSessions();
    assert.ok(closedCount >= 1, `Expected at least 1 closed session, got ${closedCount}`);

    const autoClosedLog = await DutyLog.findById(simulatedOpenLog._id);
    assert.strictEqual(autoClosedLog.status, 'AUTO_CLOSED', 'Status must be AUTO_CLOSED');
    assert.strictEqual(autoClosedLog.endMethod, 'AUTO', 'endMethod must be AUTO');
    assert.strictEqual(autoClosedLog.closureReason, 'AUTO_CLOSED_END_OF_DAY', 'closureReason must be AUTO_CLOSED_END_OF_DAY');
    assert.ok(autoClosedLog.endedAt, 'endedAt timestamp must be recorded');

    const updatedStaffAfterAuto = await Staff.findById(hkStaff._id);
    assert.strictEqual(updatedStaffAfterAuto.duty, 'OFF_DUTY');
    assert.strictEqual(updatedStaffAfterAuto.lastAttendanceClosedReason, 'AUTO_CLOSED_END_OF_DAY');
    console.log('✓ [TEST 3 & 4 PASSED] Open sessions past cutoff automatically closed with AUTO_CLOSED_END_OF_DAY\n');

    // -------------------------------------------------------------
    // TEST 5: The record distinguishes manual and automatic closure
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing that attendance records distinguish MANUAL vs AUTO...');
    assert.strictEqual(endedDutyLog.endMethod, 'MANUAL');
    assert.strictEqual(autoClosedLog.endMethod, 'AUTO');
    assert.notStrictEqual(endedDutyLog.status, autoClosedLog.status);
    console.log('✓ [TEST 5 PASSED] Records distinctively identify MANUAL vs AUTO closure\n');

    // -------------------------------------------------------------
    // TEST 6: Running the closure process twice is idempotent & safe
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing idempotency of automatic closure process...');
    const rerunResult = await attendanceService.autoCloseExpiredAttendanceSessions();
    assert.strictEqual(rerunResult.closedCount, 0, 'Second run must not close or duplicate already closed sessions');

    const checkLogAgain = await DutyLog.findById(autoClosedLog._id);
    assert.strictEqual(checkLogAgain.status, 'AUTO_CLOSED');
    console.log('✓ [TEST 6 PASSED] Automatic closure is completely idempotent\n');

    // -------------------------------------------------------------
    // TEST 7: Multi-tenant hotel isolation on attendance logs
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Multi-Tenant hotel isolation on attendance history...');
    const res7MgrGrand = await fetch(`${baseUrl}/manager/attendance`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    });
    const json7Grand = await res7MgrGrand.json();
    assert.strictEqual(res7MgrGrand.status, 200);

    const res7MgrBay = await fetch(`${baseUrl}/manager/attendance`, {
      headers: { Authorization: `Bearer ${bayMgrToken}` }
    });
    const json7Bay = await res7MgrBay.json();
    assert.strictEqual(res7MgrBay.status, 200);

    const bayLogs = json7Bay.data || [];
    const hasGrandInBay = bayLogs.some(l => String(l.hotelId?._id || l.hotelId) === String(grdHotel._id));
    assert.strictEqual(hasGrandInBay, false, 'Bay manager must not see Grand Hotel attendance logs');
    console.log('✓ [TEST 7 PASSED] Hotel-wise attendance multi-tenant isolation enforced\n');

    // -------------------------------------------------------------
    // TEST 8: Active tasks are not falsely marked completed on auto-close
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing safe handling of unfinished tasks on auto-close...');
    // Create an unfinished task
    const testTask = await Task.create({
      taskCode: `TSK-UNFIN-${Date.now().toString().slice(-4)}`,
      taskNumber: `TSK-UNFIN-${Date.now().toString().slice(-4)}`,
      hotelId: grdHotel._id,
      hotel: grdHotel._id,
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedStaffId: hkStaff._id
    });

    const sessionWithTask = await DutyLog.create({
      hotelId: grdHotel._id,
      staffId: hkStaff._id,
      staffCode: hkStaff.staffCode,
      staffName: hkStaff.name,
      department: 'housekeeping',
      workDate: '2026-01-02',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
      endedAt: null,
      status: 'ACTIVE',
      scheduledCutoffAt: new Date('2026-01-02T18:29:59.999Z')
    });

    hkStaff.duty = 'ON_DUTY';
    hkStaff.dutyStatus = 'ON_DUTY';
    hkStaff.currentTaskId = testTask._id;
    await hkStaff.save();

    await attendanceService.autoCloseExpiredAttendanceSessions();

    const verifiedTask = await Task.findById(testTask._id);
    assert.notStrictEqual(verifiedTask.status, 'COMPLETED', 'Unfinished task must NEVER be marked COMPLETED automatically');
    assert.strictEqual(verifiedTask.status, 'PENDING', 'Unfinished task must be unassigned to PENDING');
    assert.strictEqual(verifiedTask.assignmentState, 'NEEDS_MANAGER', 'Unfinished task must be flagged for manager review');

    const staffAfterTaskEscalate = await Staff.findById(hkStaff._id);
    assert.strictEqual(staffAfterTaskEscalate.currentTaskId, null, 'Staff currentTaskId must be cleared');

    await Task.deleteOne({ _id: testTask._id });
    await DutyLog.deleteOne({ _id: sessionWithTask._id });
    console.log('✓ [TEST 8 PASSED] Active tasks safely escalated to manager without false completion\n');

    // -------------------------------------------------------------
    // TEST 9: Closed/OFF_DUTY staff cannot receive task offers
    // -------------------------------------------------------------
    console.log('[TEST 9] Testing that OFF_DUTY / closed staff cannot receive task offers...');
    hkStaff.duty = 'OFF_DUTY';
    hkStaff.dutyStatus = 'OFF_DUTY';
    hkStaff.availability = 'AVAILABLE';
    await hkStaff.save();

    const dispatchTask = await Task.create({
      taskCode: `TSK-DISP-${Date.now().toString().slice(-4)}`,
      taskNumber: `TSK-DISP-${Date.now().toString().slice(-4)}`,
      hotelId: grdHotel._id,
      hotel: grdHotel._id,
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      priority: 'HIGH',
      status: 'PENDING'
    });

    await taskService.offerTaskToNextEligibleStaff(dispatchTask._id);

    const offerForHk = await TaskOffer.findOne({ taskId: dispatchTask._id, staffId: hkStaff._id });
    assert.strictEqual(offerForHk, null, 'OFF_DUTY staff must NOT receive task offers');

    await Task.deleteOne({ _id: dispatchTask._id });
    console.log('✓ [TEST 9 PASSED] OFF_DUTY staff cannot receive task offers\n');

    // -------------------------------------------------------------
    // TEST 10: Missed cutoffs handled on restart/startup catch-up
    // -------------------------------------------------------------
    console.log('[TEST 10] Testing startup catch-up for missed cutoffs during backend sleep...');
    const missedLog = await DutyLog.create({
      hotelId: grdHotel._id,
      staffId: hkStaff._id,
      staffCode: hkStaff.staffCode,
      staffName: hkStaff.name,
      department: 'housekeeping',
      workDate: '2026-01-03',
      startedAt: new Date('2026-01-03T08:00:00.000Z'),
      endedAt: null,
      status: 'ACTIVE',
      scheduledCutoffAt: new Date('2026-01-03T18:29:59.999Z')
    });

    hkStaff.duty = 'ON_DUTY';
    await hkStaff.save();

    // Simulate backend wake-up catch-up
    const catchupResult = await attendanceService.autoCloseExpiredAttendanceSessions();
    assert.ok(catchupResult.closedCount >= 1);

    const refreshedMissedLog = await DutyLog.findById(missedLog._id);
    assert.strictEqual(refreshedMissedLog.status, 'AUTO_CLOSED');
    await DutyLog.deleteOne({ _id: missedLog._id });
    console.log('✓ [TEST 10 PASSED] Startup catch-up correctly handles all missed cutoffs\n');

    // -------------------------------------------------------------
    // TEST 11: Existing staff login, duty, and manager endpoints still pass
    // -------------------------------------------------------------
    console.log('[TEST 11] Testing existing staff profile & duty status endpoints...');
    const res11Status = await fetch(`${baseUrl}/staff/duty/status`, {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res11Status.status, 200);

    const res11History = await fetch(`${baseUrl}/staff/duty/history`, {
      headers: { Authorization: `Bearer ${hkToken}` }
    });
    assert.strictEqual(res11History.status, 200);
    const json11Hist = await res11History.json();
    assert.ok(Array.isArray(json11Hist.data), 'Staff attendance history must return array');

    // Clean up test created logs
    await DutyLog.deleteOne({ _id: simulatedOpenLog._id });
    await DutyLog.deleteOne({ _id: activeDutyLog._id });

    console.log('✓ [TEST 11 PASSED] Duty status and attendance history APIs fully working\n');

    console.log('================================================================');
    console.log('ALL 11 ATTENDANCE AUTO-CLOSURE REGRESSION TESTS PASSED');
    console.log('================================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runAttendanceRegressionTests().catch((err) => {
  console.error('ATTENDANCE REGRESSION TEST FAILED:', err);
  process.exit(1);
});
