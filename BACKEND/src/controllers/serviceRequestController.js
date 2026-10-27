const { ServiceRequest, Reservation, Task } = require('../models');
const taskService = require('../services/taskService');
const { successResponse, errorResponse } = require('../utils/response');

const ensureLinkedTask = async (serviceRequest) => {
  if (serviceRequest.taskId) return serviceRequest.taskId;
  const dept = (serviceRequest.department || '').toUpperCase();
  if (!['HOUSEKEEPING', 'MAINTENANCE', 'FNB', 'FOOD_AND_BEVERAGE'].includes(dept)) {
    return null;
  }
  const taskDept = (dept === 'FOOD_AND_BEVERAGE') ? 'FNB' : dept;
  try {
    const task = await taskService.createTask(
      {
        title: `Guest Service: ${serviceRequest.serviceType || serviceRequest.department}`,
        description: serviceRequest.description,
        department: taskDept,
        priority: 'HIGH',
        hotelId: serviceRequest.hotelId,
        roomId: serviceRequest.roomId,
        roomNumber: serviceRequest.roomNumber,
        reservationId: serviceRequest.reservationId,
        serviceRequestId: serviceRequest._id
      },
      null,
      serviceRequest.guestId
    );

    serviceRequest.taskId = task._id;
    serviceRequest.status = 'OFFERING';
    await ServiceRequest.updateOne(
      { _id: serviceRequest._id },
      { $set: { taskId: task._id, status: 'OFFERING' } }
    );
    return task;
  } catch (err) {
    console.error(`[ensureLinkedTask] Auto-healing task failed for ${serviceRequest.requestCode}:`, err.message);
    return null;
  }
};

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

    const normalizedDept = (department || '').toUpperCase().trim();

    // Prevent rapid duplicate requests within 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const recentDuplicate = await ServiceRequest.findOne({
      guestId: guest._id,
      reservationId: activeStay._id,
      department: normalizedDept,
      description: description.trim(),
      status: { $in: ['OPEN', 'OFFERING', 'OFFERED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
      createdAt: { $gte: thirtySecondsAgo }
    })
      .populate('roomId', 'roomNumber room floor type')
      .populate('assignedStaffId', 'name fullName staffCode staffId email department');

    if (recentDuplicate) {
      const dupObj = recentDuplicate.toObject ? recentDuplicate.toObject() : recentDuplicate;
      return successResponse(res, 200, 'Service request already submitted', {
        ...dupObj,
        id: dupObj.requestCode || dupObj._id
      });
    }

    let count = await ServiceRequest.countDocuments();
    let requestCode = `REQ-${String(count + 1001).padStart(5, '0')}`;
    while (await ServiceRequest.exists({ requestCode })) {
      count++;
      requestCode = `REQ-${String(count + 1001).padStart(5, '0')}`;
    }

    const serviceRequest = await ServiceRequest.create({
      requestCode,
      guestId: guest._id,
      hotelId: activeStay.hotelId,
      reservationId: activeStay._id,
      roomId: activeStay.roomId,
      roomNumber: activeStay.roomNumber,
      department: normalizedDept,
      serviceType: serviceType || department,
      description: description.trim(),
      status: 'OPEN'
    });

    if (['HOUSEKEEPING', 'MAINTENANCE', 'FNB', 'FOOD_AND_BEVERAGE'].includes(normalizedDept)) {
      const taskDept = (normalizedDept === 'FOOD_AND_BEVERAGE') ? 'FNB' : normalizedDept;
      const task = await taskService.createTask(
        {
          title: `Guest Service: ${serviceType || department}`,
          description: description.trim(),
          department: taskDept,
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
    const { reservationId, all } = req.query;

    const query = { guestId };

    if (reservationId) {
      query.reservationId = reservationId;
    } else if (all !== 'true') {
      const activeStay = await Reservation.findOne({
        guestId,
        status: 'CHECKED_IN'
      }).sort({ createdAt: -1 });

      if (activeStay) {
        query.reservationId = activeStay._id;
      }
    }

    const requests = await ServiceRequest.find(query)
      .populate('roomId', 'roomNumber room floor type')
      .populate('assignedStaffId', 'name fullName staffCode staffId email department')
      .populate('taskId', 'status assignedStaffId priority')
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = [];
    for (const r of requests) {
      let modified = false;

      // 0. Auto-heal missing task if request is OPEN/OFFERING and stay is active
      if (!r.taskId && ['OPEN', 'OFFERING'].includes(r.status)) {
        const healedTask = await ensureLinkedTask(r);
        if (healedTask) {
          r.taskId = healedTask;
        }
      }

      // 1. Reconcile with linked task status if present
      if (r.taskId) {
        const taskStatus = r.taskId.status;
        if (taskStatus === 'COMPLETED' && r.status !== 'COMPLETED') {
          r.status = 'COMPLETED';
          modified = true;
        } else if (taskStatus === 'IN_PROGRESS' && r.status !== 'IN_PROGRESS') {
          r.status = 'IN_PROGRESS';
          modified = true;
        } else if ((taskStatus === 'ACCEPTED' || taskStatus === 'ASSIGNED') && !['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(r.status)) {
          r.status = 'ACCEPTED';
          modified = true;
        } else if (taskStatus === 'CANCELLED' && !['CANCELLED', 'CANCELLED_AFTER_CHECKOUT', 'COMPLETED'].includes(r.status)) {
          r.status = 'CANCELLED';
          modified = true;
        }

        if (r.taskId.assignedStaffId && !r.assignedStaffId) {
          r.assignedStaffId = r.taskId.assignedStaffId;
          modified = true;
        }
      }

      // 2. Reconcile if reservation was checked out or cancelled
      if (r.reservationId && !['COMPLETED', 'RESOLVED', 'CANCELLED', 'CANCELLED_AFTER_CHECKOUT', 'CLOSED_AFTER_CHECKOUT'].includes(r.status)) {
        const resv = await Reservation.findById(r.reservationId).select('status');
        if (resv && ['CHECKED_OUT', 'CANCELLED'].includes(resv.status)) {
          if (r.taskId && r.taskId.status === 'COMPLETED') {
            r.status = 'COMPLETED';
          } else if (r.department === 'MAINTENANCE') {
            r.status = 'CLOSED_AFTER_CHECKOUT';
          } else {
            r.status = 'CANCELLED_AFTER_CHECKOUT';
          }
          modified = true;
        }
      }

      if (modified) {
        await ServiceRequest.updateOne(
          { _id: r._id },
          { $set: { status: r.status, ...(r.assignedStaffId ? { assignedStaffId: r.assignedStaffId } : {}) } }
        );
      }

      const rObj = r.toObject ? r.toObject() : r;
      formatted.push({
        ...rObj,
        id: rObj.requestCode || rObj._id
      });
    }

    return successResponse(res, 200, 'Service requests retrieved', formatted);
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
    if (status) {
      query.status = status;
    } else if (req.query.activeOnly === 'true') {
      query.status = { $nin: ['COMPLETED', 'CANCELLED', 'CANCELLED_AFTER_CHECKOUT', 'CLOSED_AFTER_CHECKOUT'] };
    }

    const requests = await ServiceRequest.find(query)
      .populate('guestId', 'fullName name email phone guestCode')
      .populate('roomId', 'roomNumber room floor type')
      .populate('assignedStaffId', 'name fullName staffCode staffId email department')
      .sort({ createdAt: -1 })
      .limit(100);

    for (const r of requests) {
      if (!r.taskId && ['OPEN', 'OFFERING'].includes(r.status)) {
        await ensureLinkedTask(r);
      }
    }

    const formatted = requests.map((r) => {
      const rObj = r.toObject ? r.toObject() : r;
      return {
        ...rObj,
        id: rObj.requestCode || rObj._id
      };
    });

    return successResponse(res, 200, 'Department requests retrieved', formatted);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createServiceRequest,
  getGuestRequests,
  getDepartmentRequests
};
