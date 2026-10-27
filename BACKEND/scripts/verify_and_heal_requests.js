require('dotenv').config();
const mongoose = require('mongoose');
const { ServiceRequest, Task, Staff, Hotel, Reservation, Room } = require('../src/models');
const taskService = require('../src/services/taskService');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'lemuria_production' });
  console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

  // 1. Check recent requests
  const recentReqs = await ServiceRequest.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('reservationId')
    .lean();

  console.log(`Found ${recentReqs.length} recent service requests:`);
  for (const r of recentReqs) {
    console.log(`- [${r.requestCode || r._id}] status=${r.status}, dept=${r.department}, taskId=${r.taskId}, resStatus=${r.reservationId?.status}, room=${r.roomNumber}, created=${r.createdAt}`);
  }

  // 2. Identify requests with taskId == null and status == 'OPEN'
  const unlinkedRequests = await ServiceRequest.find({
    taskId: null,
    status: { $in: ['OPEN', 'OFFERING'] }
  });

  console.log(`\nUnlinked requests needing healing: ${unlinkedRequests.length}`);

  for (const sr of unlinkedRequests) {
    console.log(`Healing request ${sr.requestCode} (${sr.department})...`);
    // Check if reservation is active
    const resv = await Reservation.findById(sr.reservationId);
    if (!resv || !['CHECKED_IN', 'CONFIRMED'].includes(resv.status)) {
      console.log(`  Reservation ${resv?._id} status is ${resv?.status}, skipping auto-dispatch.`);
      continue;
    }

    const taskDept = (sr.department === 'FOOD_AND_BEVERAGE') ? 'FNB' : sr.department;
    try {
      const task = await taskService.createTask(
        {
          title: `Guest Service: ${sr.serviceType || sr.department}`,
          description: sr.description,
          department: taskDept,
          priority: 'HIGH',
          hotelId: sr.hotelId,
          roomId: sr.roomId,
          roomNumber: sr.roomNumber,
          reservationId: sr.reservationId,
          serviceRequestId: sr._id
        },
        null,
        sr.guestId
      );

      sr.taskId = task._id;
      sr.status = 'OFFERING';
      await sr.save();
      console.log(`  Successfully created and dispatched task ${task.taskCode} (${task._id}) for request ${sr.requestCode}!`);
    } catch (err) {
      console.error(`  Failed to heal request ${sr.requestCode}:`, err.message);
    }
  }

  // 3. Check tasks created
  const recentTasks = await Task.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log(`\nRecent 10 Tasks in DB:`);
  for (const t of recentTasks) {
    console.log(`- [${t.taskCode}] dept=${t.department}, status=${t.status}, offerStatus=${t.offerStatus}, staff=${t.assignedStaffId}, created=${t.createdAt}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});
