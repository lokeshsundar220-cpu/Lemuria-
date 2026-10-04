require('dotenv').config();
const mongoose = require('mongoose');
const { Staff, Task, TaskOffer, Hotel } = require('../src/models');

async function inspectDb() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lemuria_production');
  console.log('=== MONGO DB LIVE INSPECTION ===');

  const staff = await Staff.find({ staffCode: /^HIL/i });
  console.log('\n--- HILLS STAFF ---');
  for (const s of staff) {
    console.log(`StaffCode: ${s.staffCode} | Name: ${s.name} | Dept: ${s.department} | Duty: ${s.dutyStatus || s.duty} | Avail: ${s.availability} | CurrentTask: ${s.currentTaskId} | AccountStatus: ${s.accountStatus}`);
  }

  const tasks = await Task.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('\n--- LATEST 10 TASKS ---');
  for (const t of tasks) {
    console.log(`Task: ${t.taskCode} | Dept: ${t.department} | Status: ${t.status} | OfferStatus: ${t.offerStatus} | AssignedStaff: ${t.assignedStaffId} | OfferedTo: ${JSON.stringify(t.offeredTo)} | CreatedAt: ${t.createdAt}`);
  }

  const offers = await TaskOffer.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('\n--- LATEST 10 TASK OFFERS ---');
  for (const o of offers) {
    console.log(`Offer: ${o._id} | TaskId: ${o.taskId} | StaffId: ${o.staffId} | Status: ${o.status} | ExpiresAt: ${o.expiresAt} | OfferedAt: ${o.offeredAt}`);
  }

  await mongoose.disconnect();
}

inspectDb().catch(console.error);
