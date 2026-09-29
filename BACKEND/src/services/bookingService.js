const mongoose = require('mongoose');
const { Reservation, Room, RoomType, Hotel, Guest, Task, AuditLog } = require('../models');
const taskService = require('./taskService');

class BookingService {
  async checkRoomAvailability(roomId, checkInDate, checkOutDate, excludeReservationId = null) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('Invalid check-in or check-out date format');
    }

    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be strictly after check-in date');
    }

    const query = {
      $or: [{ roomId: roomId }, { room: roomId }],
      status: { $in: ['BOOKED', 'CHECK_IN_PENDING', 'CHECKED_IN'] },
      $and: [
        { checkInDate: { $lt: checkOut } },
        { checkOutDate: { $gt: checkIn } }
      ]
    };

    if (excludeReservationId) {
      query._id = { $ne: excludeReservationId };
    }

    const overlappingBooking = await Reservation.findOne(query);
    return !overlappingBooking;
  }

  async getAvailableRooms(hotelId, checkInDate, checkOutDate, roomTypeId = null) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }

    const roomQuery = {
      $or: [{ hotelId: hotelId }, { hotel: hotelId }],
      status: { $ne: 'OUT_OF_SERVICE' }
    };
    if (roomTypeId) {
      roomQuery.$or = [{ roomTypeId: roomTypeId }, { type: roomTypeId }];
    }

    const allRooms = await Room.find(roomQuery);
    if (allRooms.length === 0) {
      return [];
    }

    const overlappingBookings = await Reservation.find({
      $or: [{ hotelId: hotelId }, { hotel: hotelId }],
      status: { $in: ['BOOKED', 'CHECK_IN_PENDING', 'CHECKED_IN'] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn }
    }).select('roomId room');

    const bookedRoomIds = new Set(overlappingBookings.map((b) => (b.roomId || b.room)?.toString()));
    return allRooms.filter((r) => !bookedRoomIds.has(r._id.toString()));
  }

  async createReservation(guestIdOrData, bookingData = {}) {
    let actualGuestId = null;
    let data = {};

    if (typeof guestIdOrData === 'object' && guestIdOrData !== null && !bookingData.roomId && !bookingData.hotelId) {
      data = guestIdOrData;
      actualGuestId = data.guestId || data.guest;
    } else {
      actualGuestId = guestIdOrData;
      data = bookingData;
    }

    const {
      hotelId,
      roomId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      adults = 1,
      guestsCount,
      specialRequests = '',
      specialRequest = '',
      partyNote = ''
    } = data;

    let rawHotelId = hotelId || data.hotel;
    let rawRoomId = roomId || data.room;

    let hotel = null;
    if (rawHotelId) {
      if (typeof rawHotelId === 'object' && rawHotelId._id) {
        hotel = await Hotel.findById(rawHotelId._id);
      } else if (typeof rawHotelId === 'string' && rawHotelId.match(/^[0-9a-fA-F]{24}$/)) {
        hotel = await Hotel.findById(rawHotelId);
      } else if (rawHotelId instanceof mongoose.Types.ObjectId) {
        hotel = await Hotel.findById(rawHotelId);
      }
      if (!hotel) {
        const hStr = String(rawHotelId || '');
        hotel = await Hotel.findOne({
          $or: [
            { hotelCode: hStr.toUpperCase() },
            { code: hStr.toLowerCase() },
            { name: new RegExp(hStr, 'i') }
          ]
        });
      }
    }
    if (!hotel || hotel.isActive === false) {
      throw new Error('Selected hotel is not active or does not exist');
    }
    const actualHotelId = hotel._id;

    let room = null;
    if (rawRoomId) {
      if (typeof rawRoomId === 'object' && rawRoomId._id) {
        room = await Room.findById(rawRoomId._id);
      } else if (typeof rawRoomId === 'string' && rawRoomId.match(/^[0-9a-fA-F]{24}$/)) {
        room = await Room.findById(rawRoomId);
      } else if (rawRoomId instanceof mongoose.Types.ObjectId) {
        room = await Room.findById(rawRoomId);
      }
      if (!room) {
        const rStr = String(rawRoomId || '');
        room = await Room.findOne({
          $or: [
            { hotelId: actualHotelId, roomNumber: rStr },
            { hotelId: actualHotelId, type: new RegExp(rStr, 'i') },
            { hotelId: actualHotelId, roomTypeId: rawRoomId }
          ]
        });
      }
    }
    if (!room) {
      room = await Room.findOne({ hotelId: actualHotelId });
    }
    if (!room) {
      throw new Error('Selected room not found');
    }
    const actualRoomId = room._id;

    const roomHotelId = room.hotelId || room.hotel;
    if (roomHotelId.toString() !== actualHotelId.toString()) {
      throw new Error('Selected room does not belong to the chosen hotel');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('Invalid dates provided');
    }

    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }

    const isAvailable = await this.checkRoomAvailability(actualRoomId, checkIn, checkOut);
    if (!isAvailable) {
      const alternativeRooms = await this.getAvailableRooms(actualHotelId, checkIn, checkOut, room.roomTypeId || room.type);
      if (alternativeRooms.length === 0) {
        const error = new Error('No rooms are available for the selected dates (HOUSE FULL)');
        error.code = 'HOUSE_FULL';
        throw error;
      }

      const error = new Error('The selected room is already booked for the specified dates');
      error.code = 'ROOM_ALREADY_BOOKED';
      throw error;
    }

    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const pricePerNight = room.pricePerNight || 8500;
    const totalAmount = data.totalAmount || data.total || (diffDays * pricePerNight);

    const count = await Reservation.countDocuments();
    const reservationCode = `LEM-${String(count + 10001).padStart(6, '0')}`;

    const guests = guestsCount || adults || 1;

    const reservation = await Reservation.create({
      reservationCode,
      guestId: actualGuestId,
      hotelId: actualHotelId,
      hotel: actualHotelId,
      roomId: actualRoomId,
      room: actualRoomId,
      roomTypeId: roomTypeId || room.roomTypeId || room.type || null,
      roomNumber: room.roomNumber,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights: diffDays,
      guestsCount: guests,
      total: totalAmount,
      subtotal: totalAmount,
      status: 'BOOKED',
      paymentStatus: 'PAID',
      partyNote: partyNote,
      specialRequest: specialRequests || specialRequest || '',
      isDemo: data.isDemo || false
    });

    if (actualGuestId) {
      const guest = await Guest.findById(actualGuestId);
      if (guest) {
        guest.lifecycleStatus = 'BOOKED';
        guest.currentReservation = reservation._id;
        guest.currentHotel = actualHotelId;
        guest.currentRoom = actualRoomId;
        await guest.save();
      }
    }

    return await Reservation.findById(reservation._id)
      .populate('hotelId')
      .populate('roomId')
      .populate('guestId');
  }

  async createBooking(guestIdOrData, bookingData = {}) {
    return await this.createReservation(guestIdOrData, bookingData);
  }

  async requestCheckIn(reservationId, guestId = null, verificationDetails = {}) {
    let resId = reservationId;
    let gId = guestId;
    let details = verificationDetails;

    if (typeof reservationId === 'object' && reservationId !== null && reservationId._id) {
      resId = reservationId._id;
    }

    const reservation = await Reservation.findById(resId);
    if (!reservation) throw new Error('Reservation not found');

    if (gId && reservation.guestId && reservation.guestId.toString() !== gId.toString()) {
      throw new Error('Unauthorized access to reservation');
    }

    if (reservation.status !== 'BOOKED') {
      throw new Error(`Cannot request check-in for status '${reservation.status}'`);
    }

    reservation.status = 'CHECK_IN_PENDING';
    await reservation.save();

    const targetGuestId = gId || reservation.guestId;
    if (targetGuestId) {
      const guest = await Guest.findById(targetGuestId);
      if (guest) {
        guest.lifecycleStatus = 'CHECK_IN_PENDING';
        if (details.idProofType) guest.idProofType = details.idProofType;
        if (details.idProofNumber) guest.idProofNumber = details.idProofNumber;
        if (details.address) guest.address = details.address;
        await guest.save();
      }
    }

    return reservation;
  }

  async approveCheckIn(reservationId, staffIdOrOptions = null) {
    let sId = staffIdOrOptions;
    let rId = null;

    if (typeof staffIdOrOptions === 'object' && staffIdOrOptions !== null) {
      sId = staffIdOrOptions.staffId;
      rId = staffIdOrOptions.roomId;
    }

    const reservation = await Reservation.findById(reservationId).populate('roomId');
    if (!reservation) throw new Error('Reservation not found');

    if (!['BOOKED', 'CHECK_IN_PENDING'].includes(reservation.status)) {
      throw new Error(`Cannot check in reservation in status '${reservation.status}'`);
    }

    const keyCardPin = Math.floor(1000 + Math.random() * 9000).toString();

    reservation.status = 'CHECKED_IN';
    reservation.keyCardPin = keyCardPin;
    reservation.checkedInAt = new Date();
    if (sId) reservation.checkedInBy = sId;
    await reservation.save();

    const targetRoomId = rId || reservation.roomId?._id || reservation.roomId || reservation.room;
    if (targetRoomId) {
      const room = await Room.findById(targetRoomId);
      if (room) {
        room.status = 'OCCUPIED';
        room.state = 'OCCUPIED';
        room.currentReservationId = reservation._id;
        await room.save();
      }
    }

    const guest = await Guest.findById(reservation.guestId);
    if (guest) {
      guest.lifecycleStatus = 'CHECKED_IN';
      await guest.save();
    }

    if (sId) {
      await AuditLog.create({
        performedBy: sId,
        action: 'GUEST_CHECK_IN_APPROVED',
        entityType: 'Reservation',
        entityId: reservation._id.toString(),
        details: { reservationCode: reservation.reservationCode, roomNumber: reservation.roomNumber }
      });
    }

    return reservation;
  }

  async processCheckOut(reservationId, staffId = null) {
    const reservation = await Reservation.findById(reservationId).populate('roomId').populate('hotelId');
    if (!reservation) throw new Error('Reservation not found');

    if (reservation.status !== 'CHECKED_IN') {
      throw new Error(`Cannot checkout reservation in status '${reservation.status}'. Must be 'CHECKED_IN'.`);
    }

    reservation.status = 'CHECKED_OUT';
    reservation.checkedOutAt = new Date();
    if (staffId) reservation.checkedOutBy = staffId;
    await reservation.save();

    let room = null;
    const targetRoomId = reservation.roomId?._id || reservation.roomId || reservation.room;
    if (targetRoomId) {
      room = await Room.findById(targetRoomId);
      if (room) {
        room.status = 'CLEANING_REQUIRED';
        room.state = 'CLEANING_REQUIRED';
        room.isClean = false;
        room.currentReservationId = null;
        room.currentGuestName = null;
        await room.save();
      }
    }

    const guest = await Guest.findById(reservation.guestId);
    if (guest) {
      guest.lifecycleStatus = 'CHECKED_OUT';
      guest.currentRoom = null;
      await guest.save();
    }

    const housekeepingTask = await taskService.createTask(
      {
        title: `Checkout Deep Clean - Room ${reservation.roomNumber || (room ? room.roomNumber : '')}`,
        description: `Complete deep sanitization and restocking after checkout of reservation ${reservation.reservationCode}.`,
        department: 'HOUSEKEEPING',
        type: 'CLEANING',
        priority: 'HIGH',
        hotelId: reservation.hotelId?._id || reservation.hotelId || reservation.hotel,
        roomId: room ? room._id : null,
        roomNumber: reservation.roomNumber || (room ? room.roomNumber : ''),
        reservationId: reservation._id
      },
      staffId
    );

    if (staffId) {
      await AuditLog.create({
        performedBy: staffId,
        action: 'GUEST_CHECKED_OUT',
        entityType: 'Reservation',
        entityId: reservation._id.toString(),
        details: {
          reservationCode: reservation.reservationCode,
          cleaningTaskId: housekeepingTask ? housekeepingTask._id : null
        }
      });
    }

    return {
      reservation,
      status: 'CHECKED_OUT',
      housekeepingTask
    };
  }

  async processCheckout(reservationId, staffId = null) {
    return await this.processCheckOut(reservationId, staffId);
  }
}

module.exports = new BookingService();
