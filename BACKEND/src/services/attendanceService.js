const mongoose = require('mongoose');
const { DutyLog, Staff, Hotel, Task, Notification, AuditLog } = require('../models');

/**
 * Helper to compute timezone offset in milliseconds for any timezone
 */
function getTimeZoneOffsetMs(date, timeZone = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(date);

    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const match = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const mins = parseInt(match[3] || '0', 10);
    return sign * (hours * 60 + mins) * 60000;
  } catch (err) {
    console.warn(`[AttendanceService] Timezone offset error for '${timeZone}', falling back to UTC+5:30:`, err.message);
    return 5.5 * 60 * 60000; // default to Asia/Kolkata (+5:30)
  }
}

/**
 * Format date as YYYY-MM-DD in the given timezone
 */
function getWorkDate(date = new Date(), timeZone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch (err) {
    console.warn(`[AttendanceService] WorkDate format error for '${timeZone}':`, err.message);
    return date.toISOString().split('T')[0];
  }
}

/**
 * Get the exact UTC Date corresponding to 23:59:59 (11:59 PM) in the given timezone for a workDate (YYYY-MM-DD)
 */
function getEndOfDayCutoff(workDateStr, timeZone = 'Asia/Kolkata') {
  const [year, month, day] = workDateStr.split('-').map(Number);
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const offset = getTimeZoneOffsetMs(approxUtc, timeZone);
  return new Date(approxUtc.getTime() - offset);
}

class AttendanceService {
  /**
   * Resolve hotel timezone
   */
  async getHotelTimezone(hotelId) {
    if (!hotelId) return 'Asia/Kolkata';
    try {
      const hotel = await Hotel.findById(hotelId);
      return (hotel && hotel.timezone) ? hotel.timezone : 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  }

  /**
   * Start Staff Attendance / Duty Shift
   */
  async startAttendance(staffId, userId = null) {
    // 1. Run catch-up first to close any previously expired open sessions
    await this.autoCloseExpiredAttendanceSessions();

    const staff = await Staff.findById(staffId).populate('hotelId');
    if (!staff) {
      throw new Error('Staff record not found');
    }

    if (staff.enabled === false || staff.accountStatus === 'DISABLED' || staff.accountStatus === 'DELETED' || staff.accountStatus === 'SUSPENDED') {
      throw new Error('Cannot start duty. Staff account is disabled or suspended.');
    }

    const hotelId = staff.hotelId?._id || staff.hotelId || staff.hotel;
    const timeZone = await this.getHotelTimezone(hotelId);
    const now = new Date();
    const workDate = getWorkDate(now, timeZone);
    const scheduledCutoffAt = getEndOfDayCutoff(workDate, timeZone);

    // 2. Prevent duplicate active attendance sessions
    let activeLog = await DutyLog.findOne({
      staffId: staff._id,
      status: 'ACTIVE',
      endedAt: null
    });

    if (activeLog) {
      console.log(`[AttendanceService] Staff ${staff.staffCode} already has an active attendance session ${activeLog._id}. Reusing session.`);
    } else {
      activeLog = await DutyLog.create({
        hotelId,
        staffId: staff._id,
        staffCode: staff.staffCode || staff.staffId,
        staffName: staff.name || staff.fullName,
        department: staff.department,
        workDate,
        startedAt: now,
        endedAt: null,
        status: 'ACTIVE',
        scheduledCutoffAt,
        endMethod: null,
        closureReason: '',
        tasksCompleted: 0
      });
      console.log(`[AttendanceService] Created new attendance session ${activeLog._id} for staff ${staff.staffCode} on ${workDate} (Cutoff: ${scheduledCutoffAt.toISOString()})`);
    }

    // 3. Update staff state
    staff.duty = 'ON_DUTY';
    staff.dutyStatus = 'ON_DUTY';
    staff.availability = 'AVAILABLE';
    staff.dutyStartedAt = activeLog.startedAt || now;
    staff.shiftStartTime = activeLog.startedAt || now;
    staff.lastDutyChangedAt = now;
    staff.lastAttendanceClosedReason = '';
    await staff.save();

    await AuditLog.create({
      performedBy: userId || staff._id,
      action: 'STAFF_ATTENDANCE_STARTED',
      entityType: 'DutyLog',
      entityId: activeLog._id.toString(),
      details: {
        staffCode: staff.staffCode,
        department: staff.department,
        workDate,
        startedAt: activeLog.startedAt,
        scheduledCutoffAt
      }
    });

    return { staff, dutyLog: activeLog };
  }

  /**
   * Manual End Duty Shift
   */
  async manualEndAttendance(staffId, userId = null) {
    const staff = await Staff.findById(staffId).populate('hotelId');
    if (!staff) {
      throw new Error('Staff record not found');
    }

    if (staff.currentTaskId) {
      const activeTask = await Task.findById(staff.currentTaskId);
      if (activeTask && (activeTask.status === 'IN_PROGRESS' || activeTask.status === 'ACCEPTED')) {
        throw new Error(
          `Cannot end duty while task '${activeTask.taskCode}' is active. Please complete or reassign the task first.`
        );
      }
    }

    const now = new Date();

    // Find and complete active session
    const activeLog = await DutyLog.findOne({
      staffId: staff._id,
      status: 'ACTIVE',
      endedAt: null
    }).sort({ startedAt: -1 });

    if (activeLog) {
      activeLog.endedAt = now;
      activeLog.status = 'COMPLETED';
      activeLog.endMethod = 'MANUAL';
      activeLog.closureReason = 'MANUAL_END_DUTY';
      await activeLog.save();
    }

    // Update staff state
    staff.duty = 'OFF_DUTY';
    staff.dutyStatus = 'OFF_DUTY';
    staff.availability = 'AVAILABLE';
    staff.currentTaskId = null;
    staff.lastDutyChangedAt = now;
    staff.lastAttendanceClosedReason = 'MANUAL';
    staff.lastAttendanceClosedAt = now;
    await staff.save();

    await AuditLog.create({
      performedBy: userId || staff._id,
      action: 'STAFF_ATTENDANCE_ENDED_MANUAL',
      entityType: 'DutyLog',
      entityId: activeLog ? activeLog._id.toString() : staff._id.toString(),
      details: {
        staffCode: staff.staffCode,
        department: staff.department,
        endedAt: now,
        endMethod: 'MANUAL'
      }
    });

    console.log(`[AttendanceService] Staff ${staff.staffCode} manually ended duty. Attendance marked COMPLETED.`);
    return { staff, dutyLog: activeLog };
  }

  /**
   * Automatic 11:59 PM Attendance Closure (Idempotent Scheduler & Catch-up)
   */
  async autoCloseExpiredAttendanceSessions() {
    const now = new Date();

    // Find all currently ACTIVE open duty logs
    const openLogs = await DutyLog.find({
      status: 'ACTIVE',
      endedAt: null
    }).populate('hotelId').populate('staffId');

    if (openLogs.length === 0) {
      return { closedCount: 0 };
    }

    let closedCount = 0;

    for (const log of openLogs) {
      const hotel = log.hotelId;
      const timeZone = (hotel && hotel.timezone) ? hotel.timezone : 'Asia/Kolkata';

      let cutoff = log.scheduledCutoffAt;
      if (!cutoff && log.workDate) {
        cutoff = getEndOfDayCutoff(log.workDate, timeZone);
      }

      // Check if current time has passed the 11:59 PM cutoff for this session's working date
      if (cutoff && now >= cutoff) {
        // Mark session auto-closed
        log.endedAt = cutoff > log.startedAt ? cutoff : now;
        log.status = 'AUTO_CLOSED';
        log.endMethod = 'AUTO';
        log.closureReason = 'AUTO_CLOSED_END_OF_DAY';
        await log.save();

        closedCount++;

        // Update corresponding staff record
        const staff = await Staff.findById(log.staffId?._id || log.staffId);
        if (staff) {
          staff.duty = 'OFF_DUTY';
          staff.dutyStatus = 'OFF_DUTY';
          staff.availability = 'AVAILABLE';
          staff.lastAttendanceClosedReason = 'AUTO_CLOSED_END_OF_DAY';
          staff.lastAttendanceClosedAt = now;

          // Safe task handling: if staff had an active task, do NOT mark completed; escalate to manager
          if (staff.currentTaskId) {
            const unfinishedTask = await Task.findById(staff.currentTaskId);
            if (unfinishedTask && unfinishedTask.status !== 'COMPLETED' && unfinishedTask.status !== 'CANCELLED') {
              unfinishedTask.status = 'PENDING';
              unfinishedTask.assignmentState = 'NEEDS_MANAGER';
              unfinishedTask.assignedStaffId = null;
              unfinishedTask.assignedStaff = null;
              unfinishedTask.assignedStaffName = null;
              await unfinishedTask.save();

              try {
                await Notification.create({
                  hotelId: staff.hotelId?._id || staff.hotelId || staff.hotel,
                  recipientType: 'STAFF',
                  recipientId: staff._id,
                  type: 'TASK_ESCALATED',
                  title: '⚠️ Unfinished Task Escalated',
                  body: `Task ${unfinishedTask.taskCode} was unassigned due to automatic shift closure at 11:59 PM.`,
                  read: false,
                  refType: 'Task',
                  refId: unfinishedTask._id
                });
              } catch (notifErr) {
                console.warn('[AttendanceService] Notification error on task escalation:', notifErr.message);
              }
            }
            staff.currentTaskId = null;
          }

          await staff.save();
        }

        await AuditLog.create({
          performedBy: log.staffId?._id || log.staffId,
          action: 'STAFF_ATTENDANCE_AUTO_CLOSED',
          entityType: 'DutyLog',
          entityId: log._id.toString(),
          details: {
            staffCode: log.staffCode,
            department: log.department,
            workDate: log.workDate,
            cutoffTime: cutoff,
            actualClosureTime: now,
            closureReason: 'AUTO_CLOSED_END_OF_DAY'
          }
        });

        console.log(`[AttendanceService] AUTO-CLOSED session ${log._id} for staff ${log.staffCode || log.staffId} (Cutoff: ${cutoff.toISOString()})`);
      }
    }

    if (closedCount > 0) {
      console.log(`[AttendanceService] Successfully auto-closed ${closedCount} expired attendance session(s).`);
    }

    return { closedCount };
  }

  /**
   * Get attendance history for a single staff member (with hotel scope verification)
   */
  async getStaffAttendanceHistory(staffId, hotelId, limit = 50) {
    // Run catch-up first
    await this.autoCloseExpiredAttendanceSessions();

    const query = {
      staffId,
      $or: [{ hotelId }, { hotel: hotelId }]
    };

    return await DutyLog.find(query)
      .sort({ startedAt: -1 })
      .limit(limit);
  }

  /**
   * Get attendance history for manager (with hotel multi-tenant isolation and filtering)
   */
  async getHotelAttendanceHistory(hotelId, filters = {}, limit = 100) {
    // Run catch-up first
    await this.autoCloseExpiredAttendanceSessions();

    const query = {
      $or: [{ hotelId }, { hotel: hotelId }]
    };

    if (filters.department) {
      query.department = { $in: [filters.department, filters.department.toLowerCase(), filters.department.toUpperCase()] };
    }
    if (filters.staffId) {
      query.staffId = filters.staffId;
    }
    if (filters.workDate) {
      query.workDate = filters.workDate;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.endMethod) {
      query.endMethod = filters.endMethod;
    }

    return await DutyLog.find(query)
      .populate('staffId', 'name fullName staffCode department')
      .sort({ startedAt: -1 })
      .limit(limit);
  }

  /**
   * Initialize background attendance scheduler for 11:59 PM auto-closure
   */
  initAttendanceScheduler(intervalMs = 30000) {
    this.autoCloseExpiredAttendanceSessions().catch((err) => {
      console.warn('[AttendanceScheduler] Initial catch-up check error:', err.message);
    });

    if (!this._intervalId) {
      this._intervalId = setInterval(() => {
        this.autoCloseExpiredAttendanceSessions().catch((err) => {
          console.warn('[AttendanceScheduler] Periodic check error:', err.message);
        });
      }, intervalMs);
      if (this._intervalId.unref) {
        this._intervalId.unref();
      }
      console.log(`[AttendanceService] Automatic 11:59 PM attendance scheduler running (check interval: ${intervalMs / 1000}s).`);
    }
  }

  stopAttendanceScheduler() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

module.exports = new AttendanceService();
module.exports.getWorkDate = getWorkDate;
module.exports.getEndOfDayCutoff = getEndOfDayCutoff;
module.exports.getTimeZoneOffsetMs = getTimeZoneOffsetMs;
