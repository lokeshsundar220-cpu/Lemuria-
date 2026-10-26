const taskService = require('../services/taskService');
const { Task, Staff } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const createTask = async (req, res, next) => {
  try {
    const staffId = req.staff ? req.staff._id : null;
    const hotelId = req.body.hotelId || (req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : null);

    if (!hotelId) {
      return errorResponse(res, 400, 'hotelId is required');
    }

    const taskData = {
      ...req.body,
      hotelId
    };

    const task = await taskService.createTask(taskData, staffId);
    return successResponse(res, 201, 'Task created and dispatched to eligible staff', task);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const { normalizeDepartment, getDepartmentVariants } = require('../utils/department');

const getTasks = async (req, res, next) => {
  try {
    const staff = req.staff;
    const hotelId = staff ? (staff.hotelId?._id || staff.hotelId) : req.query.hotelId;
    const { category, department, status, priority } = req.query;

    const query = {
      isDeleted: { $ne: true }
    };
    if (hotelId) {
      query.$or = [{ hotelId }, { hotel: hotelId }];
    }

    const userDept = normalizeDepartment(staff?.department);
    const isManagerOrFrontDesk = userDept === 'manager' || userDept === 'reception' || staff?.role === 'MANAGER';

    if (!isManagerOrFrontDesk && userDept) {
      // Non-manager staff can only query their own department's tasks
      query.department = { $in: getDepartmentVariants(userDept) };
    } else if (category || department) {
      const d = (category || department).trim();
      query.department = { $in: getDepartmentVariants(d) };
    }

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'DELETED' };
    }
    if (priority) query.priority = priority;

    const limit = parseInt(req.query.limit, 10) || 150;

    const tasks = await Task.find(query)
      .populate('roomId', 'roomNumber room floor type')
      .populate('assignedStaffId', 'name fullName staffCode staffId email department')
      .populate('createdByStaff', 'name fullName staffCode staffId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedTasks = tasks.map((t) => ({
      ...t,
      id: t._id
    }));

    return successResponse(res, 200, 'Tasks retrieved', formattedTasks);
  } catch (error) {
    return next(error);
  }
};

const getMyTasks = async (req, res, next) => {
  try {
    const staffId = req.staff._id;
    const result = await taskService.getStaffTasksAndOffers(staffId);
    return successResponse(res, 200, 'Staff tasks and offers retrieved', result);
  } catch (error) {
    return next(error);
  }
};

const acceptOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const staffId = req.staff._id;
    const result = await taskService.acceptTaskOffer(offerId, staffId);
    return successResponse(res, 200, 'Task offer accepted. You are now assigned to this task.', result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const declineOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const staffId = req.staff._id;
    const result = await taskService.declineTaskOffer(offerId, staffId);
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const startTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;
    const task = await taskService.startTask(id, staffId);
    return successResponse(res, 200, 'Task marked IN_PROGRESS', task);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;
    const { completionNotes, completionNote, proofImageUrl, afterImageUrl } = req.body;

    const task = await taskService.completeTask(id, staffId, { completionNotes, completionNote, proofImageUrl, afterImageUrl });
    return successResponse(res, 200, 'Task COMPLETED successfully. Staff is now AVAILABLE.', task);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const timeoutOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const result = await taskService.timeoutTaskOffer(offerId);
    return successResponse(res, 200, result.message, result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const assignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    if (!staffId) return errorResponse(res, 400, 'staffId is required');

    if (!req.staff) {
      return errorResponse(res, 403, 'Access denied: Staff authorization required');
    }

    const userDept = normalizeDepartment(req.staff.department);
    const isManager = userDept === 'manager' || req.staff.role === 'MANAGER';
    if (!isManager) {
      return errorResponse(res, 403, 'Access denied. Manager role required.');
    }

    // Persisted duty status check against MongoDB record (not relying on stale token or frontend state)
    const freshManager = await Staff.findById(req.staff._id);
    if (!freshManager) {
      return errorResponse(res, 401, 'Manager account no longer exists');
    }

    const managerDuty = (freshManager.duty || freshManager.dutyStatus || '').toUpperCase();
    if (managerDuty !== 'ON' && managerDuty !== 'ON_DUTY') {
      return errorResponse(res, 403, 'Start your duty before assigning tasks');
    }

    // Hotel tenant isolation check between manager and task
    const task = await Task.findById(id);
    if (!task || task.isDeleted) {
      return errorResponse(res, 404, 'Task not found');
    }

    const taskHotel = String(task.hotelId?._id || task.hotelId || task.hotel || '');
    const managerHotel = String(freshManager.hotelId?._id || freshManager.hotelId || freshManager.hotel || '');
    const managerAccess = (freshManager.hotelAccess || []).map(String);
    if (taskHotel && managerHotel && taskHotel !== managerHotel && !managerAccess.includes(taskHotel)) {
      return errorResponse(res, 403, 'Forbidden: Cross-hotel task assignment is not permitted');
    }

    const assignedTask = await taskService.assignTask(id, staffId, freshManager._id);
    return successResponse(res, 200, 'Task successfully assigned to staff member', assignedTask);
  } catch (error) {
    if (
      error.message.includes('belongs to a different hotel') ||
      error.message.includes('Forbidden') ||
      error.message.includes('Cross-hotel')
    ) {
      return errorResponse(res, 403, error.message);
    }
    return errorResponse(res, 400, error.message);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = req.staff;

    const userDept = normalizeDepartment(staff?.department);
    const isManager = userDept === 'manager' || staff?.role === 'MANAGER';
    if (!isManager) {
      return errorResponse(res, 403, 'Forbidden: Only managers can delete tasks');
    }

    const { reason } = req.body || {};
    const task = await taskService.deleteTask(id, staff, reason);
    return successResponse(res, 200, 'Task deleted successfully', task);
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return errorResponse(res, 403, error.message);
    }
    if (error.message.includes('not found')) {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 400, error.message);
  }
};

module.exports = {
  createTask,
  getTasks,
  getMyTasks,
  acceptOffer,
  declineOffer,
  timeoutOffer,
  assignTask,
  startTask,
  completeTask,
  deleteTask
};
