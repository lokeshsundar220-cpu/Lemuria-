const { Emergency, Reservation, Notification, Staff } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const createEmergencyRequest = async (req, res, next) => {
  try {
    const guest = req.guest;
    if (!guest) {
      return errorResponse(res, 401, 'Guest authentication required');
    }

    const activeStay = await Reservation.findOne({
      guestId: guest._id,
      status: 'CHECKED_IN'
    });

    if (!activeStay) {
      return errorResponse(res, 400, 'Emergency request requires an active guest stay');
    }

    const { freeTextDescription, description } = req.body;
    const desc = freeTextDescription || description;

    if (!desc || desc.trim().length === 0) {
      return errorResponse(res, 400, 'Free-text emergency description is required');
    }

    const count = await Emergency.countDocuments();
    const emergencyId = `EMG-${String(count + 101).padStart(4, '0')}`;

    const emergency = await Emergency.create({
      emergencyId,
      guestId: guest._id,
      hotelId: activeStay.hotelId,
      reservationId: activeStay._id,
      roomId: activeStay.roomId,
      roomNumber: activeStay.roomNumber,
      description: desc.trim(),
      status: 'ACTIVE',
      priority: 'CRITICAL',
      acknowledged: false
    });

    const onDutyStaff = await Staff.find({
      hotelId: activeStay.hotelId,
      department: { $in: ['RECEPTION', 'MANAGER'] },
      enabled: true
    });

    for (const staffMember of onDutyStaff) {
      await Notification.create({
        hotelId: activeStay.hotelId,
        recipientType: 'STAFF',
        recipientId: staffMember._id,
        department: staffMember.department,
        title: `CRITICAL EMERGENCY ALERT: ${emergency.emergencyId}`,
        body: `Guest in room ${activeStay.roomNumber} submitted emergency: "${desc}"`,
        type: 'EMERGENCY_ALERT',
        refType: 'Emergency',
        refId: emergency._id,
        metadata: { emergencyId: emergency._id, roomNumber: activeStay.roomNumber }
      });
    }

    return successResponse(res, 201, 'Emergency alert triggered. Hotel staff have been immediately alerted.', emergency);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const respondToEmergency = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;

    const emergency = await Emergency.findById(id);
    if (!emergency) return errorResponse(res, 404, 'Emergency record not found');

    emergency.status = 'RESPONDING';
    emergency.acknowledged = true;
    emergency.acknowledgedBy = staffId;
    emergency.respondedAt = new Date();
    await emergency.save();

    return successResponse(res, 200, 'Emergency response recorded', emergency);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const resolveEmergency = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const emergency = await Emergency.findById(id);
    if (!emergency) return errorResponse(res, 404, 'Emergency record not found');

    emergency.status = 'RESOLVED';
    emergency.resolvedAt = new Date();
    emergency.resolutionNotes = resolutionNotes || 'Resolved by hotel emergency response team';
    await emergency.save();

    return successResponse(res, 200, 'Emergency marked as resolved', emergency);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const getActiveEmergencies = async (req, res, next) => {
  try {
    const hotelId = req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : req.query.hotelId;
    const emergencies = await Emergency.find({ hotelId, status: { $ne: 'RESOLVED' } })
      .populate('guestId')
      .populate('roomId')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Active emergencies fetched', emergencies);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEmergencyRequest,
  respondToEmergency,
  resolveEmergency,
  getActiveEmergencies
};
