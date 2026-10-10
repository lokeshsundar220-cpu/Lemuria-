const staffService = require('../services/staffService');
const attendanceService = require('../services/attendanceService');
const { Staff } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all staff for the current hotel
 */
const getHotelStaff = async (req, res, next) => {
  try {
    await attendanceService.autoCloseExpiredAttendanceSessions();
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
    await attendanceService.autoCloseExpiredAttendanceSessions();
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
    await attendanceService.autoCloseExpiredAttendanceSessions();
    const staff = await Staff.findById(req.staff._id) || req.staff;

    return successResponse(res, 200, 'Staff status retrieved', {
      staffId: staff.staffCode || staff.staffId,
      fullName: staff.name || staff.fullName,
      name: staff.name || staff.fullName,
      department: staff.department,
      accountStatus: staff.accountStatus || (staff.enabled ? 'ENABLED' : 'DISABLED'),
      dutyStatus: staff.duty || staff.dutyStatus,
      duty: staff.duty,
      availability: staff.availability,
      currentTaskId: staff.currentTaskId,
      shiftStartTime: staff.dutyStartedAt || staff.shiftStartTime,
      lastAttendanceClosedReason: staff.lastAttendanceClosedReason || '',
      lastAttendanceClosedAt: staff.lastAttendanceClosedAt || null
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get Staff Own Attendance History
 */
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const hotelId = req.staff.hotelId?._id || req.staff.hotelId;
    const history = await attendanceService.getStaffAttendanceHistory(req.staff._id, hotelId);
    return successResponse(res, 200, 'Staff attendance history retrieved', history);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHotelStaff,
  getMyProfile,
  startDuty,
  endDuty,
  getDutyStatus,
  getMyAttendanceHistory
};
