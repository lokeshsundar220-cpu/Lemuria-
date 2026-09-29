const staffService = require('../services/staffService');
const { Staff } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all staff for the current hotel
 */
const getHotelStaff = async (req, res, next) => {
  try {
    const hotelId = req.staff.hotelId?._id || req.staff.hotelId;
    const staffList = await Staff.find({
      $or: [{ hotelId }, { hotel: hotelId }]
    }).sort({ department: 1, name: 1 });
    return successResponse(res, 200, 'Hotel staff retrieved', staffList);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current logged in staff profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.staff._id).populate('currentTaskId').populate('hotelId');
    if (!staff) return errorResponse(res, 404, 'Staff profile not found');
    return successResponse(res, 200, 'Staff profile retrieved', staff);
  } catch (error) {
    return next(error);
  }
};

/**
 * Start Staff Duty
 */
const startDuty = async (req, res, next) => {
  try {
    const staffId = req.staff._id;
    const updatedStaff = await staffService.startDuty(staffId, req.user._id);
    return successResponse(res, 200, 'Duty started successfully. You are now ON_DUTY and AVAILABLE.', updatedStaff);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

/**
 * End Staff Duty
 */
const endDuty = async (req, res, next) => {
  try {
    const staffId = req.staff._id;
    const updatedStaff = await staffService.endDuty(staffId, req.user._id);
    return successResponse(res, 200, 'Duty ended successfully. You are now OFF_DUTY.', updatedStaff);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

/**
 * Get Staff Duty & Availability Status
 */
const getDutyStatus = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'Staff status retrieved', {
      staffId: req.staff.staffCode || req.staff.staffId,
      fullName: req.staff.name || req.staff.fullName,
      name: req.staff.name || req.staff.fullName,
      department: req.staff.department,
      accountStatus: req.staff.accountStatus || (req.staff.enabled ? 'ENABLED' : 'DISABLED'),
      dutyStatus: req.staff.duty || req.staff.dutyStatus,
      duty: req.staff.duty,
      availability: req.staff.availability,
      currentTaskId: req.staff.currentTaskId,
      shiftStartTime: req.staff.dutyStartedAt || req.staff.shiftStartTime
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHotelStaff,
  getMyProfile,
  startDuty,
  endDuty,
  getDutyStatus
};
