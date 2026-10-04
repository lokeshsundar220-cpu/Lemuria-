const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function run() {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');
  const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false }), 'hotels');
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');

  const hillsHotel = await Hotel.findOne({ code: 'hills' });
  console.log('Hills Hotel:', hillsHotel);

  const hillsStaff = await Staff.find({
    $or: [{ hotelId: hillsHotel._id }, { hotel: hillsHotel._id }]
  });
  console.log('\nHills Staff Count:', hillsStaff.length);
  hillsStaff.forEach(s => {
    console.log({
      _id: s._id.toString(),
      staffCode: s.staffCode,
      name: s.name,
      email: s.email,
      department: s.department,
      duty: s.duty,
      dutyStatus: s.dutyStatus,
      availability: s.availability,
      accountStatus: s.accountStatus,
      enabled: s.enabled
    });
  });

  const hillsTasks = await Task.find({
    $or: [{ hotelId: hillsHotel._id }, { hotel: hillsHotel._id }]
  });
  console.log('\nHills Tasks Count:', hillsTasks.length);
  hillsTasks.forEach(t => {
    console.log({
      _id: t._id.toString(),
      taskCode: t.taskCode,
      title: t.title,
      department: t.department,
      status: t.status,
      assignedStaffId: t.assignedStaffId ? t.assignedStaffId.toString() : null,
      offeredTo: t.offeredTo
    });
  });

  await mongoose.disconnect();
}
run();
