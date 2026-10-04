require('dotenv').config();
const mongoose = require('mongoose');
const { Reservation, Hotel, Guest } = require('../src/models');

async function checkRes() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lemuria_production');
  const hills = await Hotel.findOne({ $or: [{ code: 'HIL' }, { name: /Hills/i }] });
  console.log('Hills hotel:', hills._id, hills.name);
  const reservations = await Reservation.find({ hotelId: hills._id });
  console.log('Found reservations:', reservations.length);
  for (const r of reservations) {
    console.log(`ResId: ${r._id} | GuestId: ${r.guestId} | RoomNumber: ${r.roomNumber} | Status: ${r.status}`);
  }
  await mongoose.disconnect();
}
checkRes();
