const taskService = require('../services/taskService');
const { Task } = require('../models');
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

const getTasks = async (req, res, next) => {
  try {
    const hotelId = req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : req.query.hotelId;
    const { category, department, status, priority } = req.query;

    const query = {};
    if (hotelId) {
      query.$or = [{ hotelId }, { hotel: hotelId }];
    }
    if (category || department) {
      const d = (category || department).trim();
      const dUpper = d.toUpperCase();
      if (dUpper === 'FNB' || dUpper === 'FOOD_AND_BEVERAGE') {
        query.department = { $in: ['FNB', 'FOOD_AND_BEVERAGE', 'fnb', 'food_and_beverage'] };
      } else {
        query.department = { $in: [d, d.toLowerCase(), d.toUpperCase(), d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()] };
      }
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('roomId')
      .populate('assignedStaffId')
      .populate('createdByStaff')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Tasks retrieved', tasks);
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
    const managerStaffId = req.staff ? req.staff._id : null;
    if (!staffId) return errorResponse(res, 400, 'staffId is required');

    const task = await taskService.assignTask(id, staffId, managerStaffId);
    return successResponse(res, 200, 'Task successfully assigned to staff member', task);
  } catch (error) {
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
  completeTask
};
