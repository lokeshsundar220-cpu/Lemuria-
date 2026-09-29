const { Task, TaskOffer, Staff, Room, Notification, AuditLog } = require('../models');

class TaskService {
  async createTask(taskData, createdByStaffId = null, requestedByGuestId = null) {
    const {
      title,
      description,
      department,
      category,
      type = 'SERVICE',
      priority = 'MEDIUM',
      hotelId,
      roomId = null,
      roomNumber = '',
      reservationId = null,
      serviceRequestId = null,
      isDemo = false
    } = taskData;

    const actualDept = department || category || 'HOUSEKEEPING';
    const actualHotelId = hotelId || taskData.hotel;

    const count = await Task.countDocuments();
    const taskCode = `TSK-${String(count + 1001).padStart(5, '0')}`;

    let rNum = roomNumber;
    if (!rNum && roomId) {
      const rm = await Room.findById(roomId);
      if (rm) rNum = rm.roomNumber;
    }

    const task = await Task.create({
      taskCode,
      taskNumber: taskCode,
      hotelId: actualHotelId,
      hotel: actualHotelId,
      department: actualDept,
      category: actualDept,
      type,
      title: title || `Task: ${actualDept}`,
      description: description || '',
      priority,
      status: 'PENDING',
      roomId,
      room: roomId,
      roomNumber: rNum,
      reservationId,
      reservation: reservationId,
      serviceRequestId,
      serviceRequest: serviceRequestId,
      guestId: requestedByGuestId,
      requestedByGuest: requestedByGuestId,
      createdByStaff: createdByStaffId,
      offeredTo: [],
      offeredToStaff: [],
      isDemo
    });

    await this.offerTaskToNextEligibleStaff(task._id);

    return await Task.findById(task._id)
      .populate('hotelId')
      .populate('roomId')
      .populate('assignedStaffId');
  }

  async offerTask(taskId, staffId) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    const offerWindowMs = 15 * 1000;
    const expiresAt = new Date(Date.now() + offerWindowMs);

    const offer = await TaskOffer.create({
      taskId: task._id,
      staffId: staffId,
      hotelId: task.hotelId || task.hotel,
      status: 'OFFERED',
      offeredAt: new Date(),
      expiresAt,
      isDemo: task.isDemo || false
    });

    task.status = 'OFFERED';
    task.offerStatus = 'OFFERED';
    if (!task.offeredTo) task.offeredTo = [];
    task.offeredTo.push(staffId);
    await task.save();

    return offer;
  }

  async offerTaskToNextEligibleStaff(taskId) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(task.status)) {
      return null;
    }

    const deptMatch = task.department === 'FOOD_AND_BEVERAGE' || task.department === 'fnb'
      ? ['FNB', 'FOOD_AND_BEVERAGE', 'fnb', 'food_and_beverage']
      : [task.department, (task.department || '').toLowerCase(), (task.department || '').toUpperCase()];
    
    const targetHotelId = task.hotelId || task.hotel;

    const eligibleStaff = await Staff.find({
      $or: [{ hotelId: targetHotelId }, { hotel: targetHotelId }],
      department: { $in: deptMatch },
      duty: { $in: ['ON', 'ON_DUTY'] },
      availability: 'AVAILABLE',
      currentTaskId: null,
      _id: { $nin: task.offeredTo || [] }
    }).sort({ lastDutyChangedAt: 1 });

    if (!eligibleStaff || eligibleStaff.length === 0) {
      if (task.offeredTo && task.offeredTo.length > 0) {
        task.status = 'ESCALATED';
      } else {
        task.status = 'PENDING';
      }
      await task.save();
      return null;
    }

    const selectedStaff = eligibleStaff[0];
    return await this.offerTask(task._id, selectedStaff._id);
  }

  async acceptTaskOffer(offerId, staffId) {
    const offer = await TaskOffer.findById(offerId);
    if (!offer) {
      throw new Error('Task offer not found');
    }

    if (offer.staffId.toString() !== staffId.toString()) {
      throw new Error('You are not authorized to accept this task offer');
    }

    if (offer.status !== 'OFFERED') {
      throw new Error(`Cannot accept offer. Current status is ${offer.status}`);
    }

    if (new Date() > offer.expiresAt) {
      offer.status = 'TIMEOUT';
      offer.respondedAt = new Date();
      await offer.save();

      await this.offerTaskToNextEligibleStaff(offer.taskId);
      throw new Error('Task offer expired (15 second window exceeded)');
    }

    const staff = await Staff.findById(staffId);
    if (staff.availability === 'BUSY' || staff.currentTaskId) {
      throw new Error('You are currently BUSY with another task');
    }

    offer.status = 'ACCEPTED';
    offer.respondedAt = new Date();
    await offer.save();

    const task = await Task.findById(offer.taskId);
    task.status = 'ACCEPTED';
    task.offerStatus = 'ACCEPTED';
    task.assignedStaffId = staff._id;
    task.assignedStaff = staff._id;
    task.assignedStaffName = staff.name || staff.fullName;
    task.acceptedAt = new Date();
    await task.save();

    staff.availability = 'BUSY';
    staff.currentTaskId = task._id;
    await staff.save();

    await AuditLog.create({
      performedBy: staff._id,
      action: 'TASK_OFFER_ACCEPTED',
      entityType: 'Task',
      entityId: task._id.toString(),
      details: { taskCode: task.taskCode || task.taskNumber, staffCode: staff.staffCode }
    });

    return { task, offer, staff };
  }

  async acceptTask(taskIdOrOfferId, staffId) {
    const offer = await TaskOffer.findOne({
      $or: [{ _id: taskIdOrOfferId }, { taskId: taskIdOrOfferId }],
      staffId: staffId,
      status: 'OFFERED'
    });

    if (offer) {
      const res = await this.acceptTaskOffer(offer._id, staffId);
      return res.task;
    }

    const task = await Task.findById(taskIdOrOfferId);
    if (!task) throw new Error('Task not found');

    task.status = 'ACCEPTED';
    task.assignedStaffId = staffId;
    task.assignedStaff = staffId;
    task.acceptedAt = new Date();
    await task.save();

    const staff = await Staff.findById(staffId);
    if (staff) {
      staff.availability = 'BUSY';
      staff.currentTaskId = task._id;
      await staff.save();
    }

    return task;
  }

  async timeoutTaskOffer(offerId) {
    const offer = await TaskOffer.findById(offerId);
    if (!offer) return { success: true, message: 'Offer not found' };
    if (offer.status === 'OFFERED') {
      offer.status = 'TIMEOUT';
      offer.respondedAt = new Date();
      await offer.save();
      await this.offerTaskToNextEligibleStaff(offer.taskId);
    }
    return { success: true, message: 'Offer timed out and passed to next eligible worker.' };
  }

  async declineTaskOffer(offerId, staffId) {
    const offer = await TaskOffer.findById(offerId);
    if (!offer) throw new Error('Task offer not found');

    if (offer.staffId.toString() !== staffId.toString()) {
      throw new Error('You are not authorized to decline this task offer');
    }

    offer.status = 'DECLINED';
    offer.respondedAt = new Date();
    await offer.save();

    const task = await Task.findById(offer.taskId);
    if (task) {
      if (!task.declinedBy) task.declinedBy = [];
      task.declinedBy.push(staffId);
      await task.save();
    }

    await this.offerTaskToNextEligibleStaff(offer.taskId);

    return { success: true, message: 'Offer declined. Passed to next eligible staff.' };
  }

  async declineTask(taskIdOrOfferId, staffId, reason = '') {
    const offer = await TaskOffer.findOne({
      $or: [{ _id: taskIdOrOfferId }, { taskId: taskIdOrOfferId }],
      staffId: staffId,
      status: 'OFFERED'
    });

    if (offer) {
      await this.declineTaskOffer(offer._id, staffId);
    }

    const task = await Task.findById(taskIdOrOfferId);
    if (task) {
      task.status = 'PENDING';
      await task.save();
      return task;
    }

    return { status: 'PENDING' };
  }

  async startTask(taskId, staffId) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    const assigned = task.assignedStaffId || task.assignedStaff;
    if (assigned && assigned.toString() !== staffId.toString()) {
      throw new Error('You are not assigned to this task');
    }

    task.status = 'IN_PROGRESS';
    task.startedAt = new Date();
    await task.save();

    const targetRoomId = task.roomId || task.room;
    if (targetRoomId) {
      const room = await Room.findById(targetRoomId);
      if (room && (task.department === 'MAINTENANCE' || task.category === 'MAINTENANCE')) {
        room.status = 'MAINTENANCE';
        room.state = 'MAINTENANCE';
        await room.save();
      }
    }

    return task;
  }

  async completeTask(taskId, staffId, completionData = {}) {
    let notes = '';
    let proof = null;

    if (typeof completionData === 'string') {
      notes = completionData;
    } else if (typeof completionData === 'object' && completionData !== null) {
      notes = completionData.completionNotes || completionData.completionNote || '';
      proof = completionData.proofImageUrl || completionData.afterImageUrl || null;
    }

    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    const assigned = task.assignedStaffId || task.assignedStaff;
    if (assigned && assigned.toString() !== staffId.toString()) {
      throw new Error('You are not assigned to this task');
    }

    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.completionNotes = notes || 'Task completed';
    task.completionNote = notes || 'Task completed';
    task.proofImageUrl = proof;
    await task.save();

    const staff = await Staff.findById(staffId);
    if (staff) {
      staff.availability = 'AVAILABLE';
      staff.currentTaskId = null;
      await staff.save();
    }

    const targetRoomId = task.roomId || task.room;
    if (targetRoomId && (task.department === 'HOUSEKEEPING' || task.type === 'CLEANING' || task.category === 'HOUSEKEEPING')) {
      const room = await Room.findById(targetRoomId);
      if (room && (room.status === 'CLEANING_REQUIRED' || room.state === 'CLEANING_REQUIRED')) {
        room.status = 'AVAILABLE';
        room.state = 'AVAILABLE';
        room.isClean = true;
        room.lastCleanedAt = new Date();
        await room.save();
      }
    }

    if (targetRoomId && (task.department === 'MAINTENANCE' || task.category === 'MAINTENANCE')) {
      const room = await Room.findById(targetRoomId);
      if (room && (room.status === 'MAINTENANCE' || room.state === 'MAINTENANCE')) {
        room.status = 'AVAILABLE';
        room.state = 'AVAILABLE';
        await room.save();
      }
    }

    return task;
  }

  async getStaffTasksAndOffers(staffId) {
    const pendingOffers = await TaskOffer.find({
      staffId: staffId,
      status: 'OFFERED',
      expiresAt: { $gt: new Date() }
    }).populate('taskId');

    const activeTasks = await Task.find({
      $or: [{ assignedStaffId: staffId }, { assignedStaff: staffId }],
      status: { $in: ['ACCEPTED', 'IN_PROGRESS'] }
    }).populate('roomId').populate('hotelId');

    const completedTasks = await Task.find({
      $or: [{ assignedStaffId: staffId }, { assignedStaff: staffId }],
      status: 'COMPLETED'
    }).populate('roomId').sort({ completedAt: -1 }).limit(20);

    return {
      pendingOffers,
      activeTasks,
      completedTasks
    };
  }
}

module.exports = new TaskService();
