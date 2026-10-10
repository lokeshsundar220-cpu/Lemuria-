const { Staff, Task, AuditLog } = require('../models');
const taskService = require('./taskService');
const attendanceService = require('./attendanceService');

class StaffService {
  async startDuty(staffId, userId = null) {
    const { staff } = await attendanceService.startAttendance(staffId, userId);

    console.log(`[StaffService] Staff ${staff.staffCode} (${staff.department}) started duty. Triggering dispatch for pending tasks...`);
    const targetHotelId = staff.hotelId?._id || staff.hotelId || staff.hotel;
    await taskService.dispatchPendingTasksForHotelDepartment(targetHotelId, staff.department);

    return staff;
  }

  async endDuty(staffId, userId = null) {
    const { staff } = await attendanceService.manualEndAttendance(staffId, userId);
    return staff;
  }

  async getStaffList(hotelId, filters = {}) {
    const query = {};
    if (hotelId) {
      query.$or = [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }];
    }
    if (filters.department) {
      query.department = { $in: [filters.department, filters.department.toLowerCase(), filters.department.toUpperCase()] };
    }
    if (filters.dutyStatus || filters.duty) {
      const dutyVal = filters.dutyStatus || filters.duty;
      query.$or = [{ duty: dutyVal }, { dutyStatus: dutyVal }];
    }
    if (filters.availability) {
      query.availability = filters.availability;
    }
    if (filters.accountStatus === 'DISABLED' || filters.enabled === false) {
      query.enabled = false;
    } else if (filters.accountStatus === 'ENABLED' || filters.enabled === true) {
      query.enabled = true;
    }

    return await Staff.find(query).populate('hotelId').populate('currentTaskId').sort({ department: 1, name: 1 });
  }

  async updateAvailability(staffId, availability, taskId = null) {
    const staff = await Staff.findById(staffId);
    if (!staff) throw new Error('Staff not found');

    staff.availability = availability;
    if (taskId) {
      staff.currentTaskId = taskId;
    } else if (availability === 'AVAILABLE') {
      staff.currentTaskId = null;
    }

    await staff.save();
    return staff;
  }
}

module.exports = new StaffService();
