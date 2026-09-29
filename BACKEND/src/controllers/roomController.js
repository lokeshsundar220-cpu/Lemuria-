const { Room, Hotel, Task } = require('../models');
const bookingService = require('../services/bookingService');
const taskService = require('../services/taskService');
const { successResponse, errorResponse } = require('../utils/response');

const getRooms = async (req, res, next) => {
  try {
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId || req.query.hotelId;
    const { status, type } = req.query;

    const query = {};
    if (hotelId) query.$or = [{ hotelId }, { hotel: hotelId }];
    if (status) query.$or = [{ state: status }, { status }];
    if (type) query.$or = [{ type }, { roomTypeId: type }];

    const rooms = await Room.find(query).sort({ floor: 1, roomNumber: 1 });
    return successResponse(res, 200, 'Rooms fetched successfully', rooms);
  } catch (error) {
    return next(error);
  }
};

const getRoomsByHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { status, type } = req.query;

    let targetHotelId = hotelId;
    if (!targetHotelId.match(/^[0-9a-fA-F]{24}$/)) {
      const h = await Hotel.findOne({ $or: [{ hotelCode: hotelId.toUpperCase() }, { code: hotelId.toLowerCase() }] });
      if (h) targetHotelId = h._id;
    }

    const query = { $or: [{ hotelId: targetHotelId }, { hotel: targetHotelId }] };
    if (status) query.$or = [{ state: status }, { status }];
    if (type) query.type = type;

    const rooms = await Room.find(query).sort({ floor: 1, roomNumber: 1 });
    return successResponse(res, 200, 'Rooms fetched successfully', rooms);
  } catch (error) {
    return next(error);
  }
};

const checkAvailability = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut, type, roomTypeId } = req.query;

    if (!checkIn || !checkOut) {
      return errorResponse(res, 400, 'checkIn and checkOut dates are required');
    }

    let targetHotelId = hotelId;
    if (!targetHotelId.match(/^[0-9a-fA-F]{24}$/)) {
      const h = await Hotel.findOne({ $or: [{ hotelCode: hotelId.toUpperCase() }, { code: hotelId.toLowerCase() }] });
      if (h) targetHotelId = h._id;
    }

    const availableRooms = await bookingService.getAvailableRooms(targetHotelId, checkIn, checkOut, roomTypeId);
    return successResponse(res, 200, 'Available rooms retrieved', {
      availableRooms,
      count: availableRooms.length,
      isHouseFull: availableRooms.length === 0
    });
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const { hotelId, roomNumber, type, floor, pricePerNight, maxOccupancy, amenities, roomTypeId } = req.body;
    const room = await Room.create({
      hotelId: hotelId || req.staff?.hotelId,
      roomNumber,
      roomTypeId: roomTypeId || null,
      type: type || 'DELUXE',
      floor: floor || 1,
      pricePerNight: pricePerNight || 8500,
      maxOccupancy: maxOccupancy || 2,
      amenities: amenities || ['Wi-Fi', 'Smart TV', 'AC', 'Mini Bar', 'Safe']
    });
    return successResponse(res, 201, 'Room created successfully', room);
  } catch (error) {
    return next(error);
  }
};

const updateRoomStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, state, isClean, guest } = req.body;

    const room = await Room.findOne({ $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { roomNumber: id }] });
    if (!room) return errorResponse(res, 404, 'Room not found');

    if (status || state) {
      room.state = status || state;
      room.status = status || state;
    }
    if (typeof isClean === 'boolean') room.isClean = isClean;
    if (guest !== undefined) room.currentGuestName = guest;

    await room.save();
    return successResponse(res, 200, 'Room status updated', room);
  } catch (error) {
    return next(error);
  }
};

const approveRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { roomNumber: id }] });
    if (!room) return errorResponse(res, 404, 'Room not found');

    room.state = 'READY';
    room.status = 'READY';
    room.isClean = true;
    room.lastInspectedAt = new Date();
    await room.save();

    return successResponse(res, 200, `Room ${room.roomNumber} approved & marked READY`, room);
  } catch (error) {
    return next(error);
  }
};

const rejectRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { roomNumber: id }] });
    if (!room) return errorResponse(res, 404, 'Room not found');

    room.state = 'CHECKOUT';
    room.status = 'CHECKOUT';
    room.isClean = false;
    await room.save();

    const task = await taskService.createTask({
      title: `Rework Cleaning - Room ${room.roomNumber}`,
      description: 'Sent back by manager inspection for rework cleaning',
      department: 'HOUSEKEEPING',
      type: 'CLEANING',
      priority: 'HIGH',
      hotelId: room.hotelId || room.hotel,
      roomId: room._id,
      roomNumber: room.roomNumber
    }, req.staff?._id);

    return successResponse(res, 200, `Room ${room.roomNumber} rejected & sent for rework cleaning`, { room, task });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRooms,
  getRoomsByHotel,
  checkAvailability,
  createRoom,
  updateRoomStatus,
  approveRoom,
  rejectRoom
};
