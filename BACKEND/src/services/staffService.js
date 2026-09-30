const { Staff, Task, AuditLog } = require('../models');
const taskService = require('./taskService');

class StaffService {
  async startDuty(staffId, userId = null) {
    const staff = await Staff.findById(staffId).populate('hotelId');
    if (!staff) {
      throw new Error('Staff record not found');
    }

    if (staff.enabled === false || staff.accountStatus === 'DISABLED') {
      throw new Error('Cannot start duty. Account is disabled.');
    }

    staff.duty = 'ON_DUTY';
    staff.dutyStatus = 'ON_DUTY';
    staff.availability = 'AVAILABLE';
    staff.dutyStartedAt = new Date();
    staff.lastDutyChangedAt = new Date();
    await staff.save();

    await AuditLog.create({
      performedBy: userId || staff._id,
      action: 'STAFF_DUTY_STARTED',
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: { staffCode: staff.staffCode, department: staff.department, dutyStatus: 'ON_DUTY' }
    });

    console.log(`[StaffService] Staff ${staff.staffCode} (${staff.department}) started duty. Triggering dispatch for pending tasks...`);
    const targetHotelId = staff.hotelId?._id || staff.hotelId || staff.hotel;
    await taskService.dispatchPendingTasksForHotelDepartment(targetHotelId, staff.department);

    return staff;
  }

  async endDuty(staffId, userId = null) {
    const staff = await Staff.findById(staffId).populate('hotelId');
    if (!staff) {
      throw new Error('Staff record not found');
    }

    if (staff.currentTaskId) {
      const activeTask = await Task.findById(staff.currentTaskId);
      if (activeTask && activeTask.status === 'IN_PROGRESS') {
        throw new Error(
          `Cannot end duty while task '${activeTask.taskCode}' is in progress. Please complete the task first.`
        );
      }
    }

    staff.duty = 'OFF_DUTY';
    staff.dutyStatus = 'OFF_DUTY';
    staff.availability = 'AVAILABLE';
    staff.currentTaskId = null;
    staff.lastDutyChangedAt = new Date();
    await staff.save();

    await AuditLog.create({
      performedBy: userId || staff._id,
      action: 'STAFF_DUTY_ENDED',
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: { staffCode: staff.staffCode, department: staff.department, dutyStatus: 'OFF_DUTY' }
    });

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
