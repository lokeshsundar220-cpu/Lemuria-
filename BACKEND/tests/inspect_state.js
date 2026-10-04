const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Hotel, Staff, Task, TaskOffer, ServiceRequest, Room } = require('../src/models');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- HOTELS ---');
  const hotels = await Hotel.find({});
  for (const h of hotels) console.log(h.hotelCode, h.name, h._id.toString());

  console.log('\n--- STAFF ---');
  const staff = await Staff.find({}).populate('hotelId');
  for (const s of staff) {
    console.log(s.staffCode, s.name, 'Hotel:', s.hotelId?.hotelCode || s.hotelId, 'Dept:', s.department, 'Duty:', s.duty, s.dutyStatus, 'Avail:', s.availability, 'Enabled:', s.enabled, 'CurrTask:', s.currentTaskId);
  }

  console.log('\n--- TASKS ---');
  const tasks = await Task.find({ status: { $ne: 'COMPLETED' } }).sort({ createdAt: -1 });
  for (const t of tasks) {
    console.log(t.taskCode, 'Hotel:', t.hotelId?.toString(), 'Dept:', t.department, 'Type:', t.type, 'Room:', t.roomNumber, 'Status:', t.status, 'OfferStatus:', t.offerStatus, 'Assigned:', t.assignedStaffId, 'OfferedTo:', t.offeredTo, 'DeclinedBy:', t.declinedBy, 'Created:', t.createdAt);
  }

  console.log('\n--- TASK OFFERS (ALL) ---');
  const offers = await TaskOffer.find({}).sort({ createdAt: -1 }).limit(10);
  for (const o of offers) {
    console.log(o._id.toString(), 'Task:', o.taskId?.toString(), 'Staff:', o.staffId?.toString(), 'Hotel:', o.hotelId?.toString(), 'Status:', o.status, 'OfferedAt:', o.offeredAt, 'ExpiresAt:', o.expiresAt);
  }

  await mongoose.disconnect();
}
inspect().catch(console.error);
