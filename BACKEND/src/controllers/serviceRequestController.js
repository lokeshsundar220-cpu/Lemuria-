const { ServiceRequest, Reservation } = require('../models');
const taskService = require('../services/taskService');
const { successResponse, errorResponse } = require('../utils/response');

const createServiceRequest = async (req, res, next) => {
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
      return errorResponse(res, 403, 'Stay services are only accessible during an active CHECKED_IN reservation.');
    }

    const { department, serviceType, description } = req.body;
    if (!department || !description) {
      return errorResponse(res, 400, 'Department and description are required');
    }

    const count = await ServiceRequest.countDocuments();
    const requestCode = `REQ-${String(count + 1001).padStart(5, '0')}`;

    const serviceRequest = await ServiceRequest.create({
      requestCode,
      guestId: guest._id,
      hotelId: activeStay.hotelId,
      reservationId: activeStay._id,
      roomId: activeStay.roomId,
      roomNumber: activeStay.roomNumber,
      department,
      serviceType: serviceType || department,
      description,
      status: 'OPEN'
    });

    if (['HOUSEKEEPING', 'MAINTENANCE', 'FNB', 'FOOD_AND_BEVERAGE'].includes(department)) {
      const task = await taskService.createTask(
        {
          title: `Guest Service: ${serviceType || department}`,
          description,
          department,
          priority: 'HIGH',
          hotelId: activeStay.hotelId,
          roomId: activeStay.roomId,
          roomNumber: activeStay.roomNumber,
          reservationId: activeStay._id,
          serviceRequestId: serviceRequest._id
        },
        null,
        guest._id
      );

      serviceRequest.taskId = task._id;
      serviceRequest.status = 'OFFERING';
      await serviceRequest.save();
    }

    return successResponse(res, 201, 'Service request submitted successfully', serviceRequest);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const getGuestRequests = async (req, res, next) => {
  try {
    const guestId = req.guest._id;
    const requests = await ServiceRequest.find({ guestId })
      .populate('roomId')
      .populate('assignedStaffId')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Service requests retrieved', requests);
  } catch (error) {
    return next(error);
  }
};

const getDepartmentRequests = async (req, res, next) => {
  try {
    const hotelId = req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : req.query.hotelId;
    const { department, status } = req.query;

    const query = { hotelId };
    if (department) query.department = department;
    if (status) query.status = status;

    const requests = await ServiceRequest.find(query)
      .populate('guestId')
      .populate('roomId')
      .populate('assignedStaffId')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Department requests retrieved', requests);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createServiceRequest,
  getGuestRequests,
  getDepartmentRequests
};
