const bookingService = require('../services/bookingService');
const { Reservation } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const createReservation = async (req, res, next) => {
  try {
    const guestId = req.guest ? req.guest._id : req.body.guestId;
    if (!guestId) {
      return errorResponse(res, 400, 'Guest profile required');
    }

    const reservation = await bookingService.createReservation(guestId, req.body);
    return successResponse(res, 201, 'Reservation confirmed successfully', reservation);
  } catch (error) {
    if (error.code === 'ROOM_ALREADY_BOOKED') {
      return errorResponse(res, 409, 'ROOM_ALREADY_BOOKED: The selected room is already reserved for overlapping dates.');
    }
    if (error.code === 'HOUSE_FULL') {
      return errorResponse(res, 409, 'HOUSE_FULL: No rooms are available in this category for the specified dates.');
    }
    return errorResponse(res, 400, error.message);
  }
};

const requestCheckIn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const guestId = req.guest ? req.guest._id : null;
    let targetRes = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetRes = await Reservation.findById(id);
    }
    if (!targetRes) {
      targetRes = await Reservation.findOne({
        $or: [{ reservationCode: id }, { roomNumber: id }]
      });
    }
    if (!targetRes) return errorResponse(res, 404, 'Reservation not found');

    const reservation = await bookingService.requestCheckIn(targetRes._id, guestId, req.body);
    return successResponse(res, 200, 'Check-in request submitted for Reception approval', reservation);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const approveCheckIn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.staff ? req.staff._id : null;
    let targetRes = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetRes = await Reservation.findById(id);
    }
    if (!targetRes) {
      targetRes = await Reservation.findOne({
        $or: [{ reservationCode: id }, { roomNumber: id }]
      });
    }
    if (!targetRes) return errorResponse(res, 404, 'Reservation not found');

    const reservation = await bookingService.approveCheckIn(targetRes._id, staffId);
    return successResponse(res, 200, 'Guest check-in approved successfully', reservation);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const processCheckOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.staff ? req.staff._id : null;
    const guestId = req.guest ? req.guest._id : null;

    let targetReservation = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetReservation = await Reservation.findById(id);
    }
    if (!targetReservation) {
      targetReservation = await Reservation.findOne({
        $or: [
          { reservationCode: id },
          { roomId: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { roomNumber: id }
        ],
        status: 'CHECKED_IN'
      });
    }
    if (!targetReservation) {
      return errorResponse(res, 404, 'Active checked-in reservation not found');
    }

    if (guestId && targetReservation.guestId && targetReservation.guestId.toString() !== guestId.toString()) {
      return errorResponse(res, 403, 'Forbidden: Cannot check out another guest reservation');
    }

    const result = await bookingService.processCheckOut(targetReservation._id, staffId);
    return successResponse(res, 200, 'Guest checkout completed. Housekeeping deep cleaning task created.', result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const getGuestReservations = async (req, res, next) => {
  try {
    const guestId = req.guest._id;
    const reservations = await Reservation.find({ guestId })
      .populate('hotelId')
      .populate('roomId')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Reservations fetched', reservations);
  } catch (error) {
    return next(error);
  }
};

const getHotelReservations = async (req, res, next) => {
  try {
    const hotelId = req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : req.query.hotelId;
    const { status, date } = req.query;

    const query = { hotelId };
    if (status) query.status = status;
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.checkInDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const reservations = await Reservation.find(query)
      .populate('guestId')
      .populate('roomId')
      .populate('hotelId')
      .sort({ checkInDate: 1 });

    return successResponse(res, 200, 'Hotel reservations fetched', reservations);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createReservation,
  requestCheckIn,
  approveCheckIn,
  processCheckOut,
  getGuestReservations,
  getHotelReservations
};
