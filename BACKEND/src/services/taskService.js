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
      department: actualDept.toUpperCase(),
      category: actualDept.toUpperCase(),
      type,
      title: title || `${actualDept.toUpperCase()} Task`,
      description: description || '',
      priority: priority.toUpperCase(),
      status: 'PENDING',
      offerStatus: 'NONE',
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
      declinedBy: [],
      isDemo
    });

    console.log(`[TaskDispatcher] Created task ${task.taskCode} (${task.department}) for hotel ${actualHotelId}. Triggering dispatcher...`);
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

    task.status = 'PENDING';
    task.offerStatus = 'OFFERED';
    if (!task.offeredTo) task.offeredTo = [];
    task.offeredTo.push(staffId);
    await task.save();

    // Create a staff notification for this new task offer
    try {
      const roomTxt = task.roomNumber ? `Room ${task.roomNumber}` : 'General';
      const prioTxt = task.priority ? `${task.priority} Priority` : 'Normal Priority';
      await Notification.create({
        hotelId: task.hotelId || task.hotel,
        recipientType: 'STAFF',
        recipientId: staffId,
        type: 'TASK_OFFER',
        title: `🔔 New ${task.department} Task`,
        body: `${roomTxt} · ${task.title || task.type || 'Service Request'} (${prioTxt})`,
        read: false,
        refType: 'Task',
        refId: task._id
      });
    } catch (notifErr) {
      console.warn('[TaskDispatcher] Notification error:', notifErr.message);
    }

    console.log(`[TaskDispatcher] TaskOffer ${offer._id} created for Task ${task.taskCode} -> Staff ${staffId}. Expires at ${expiresAt.toISOString()}`);
    return offer;
  }


  async offerTaskToNextEligibleStaff(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      console.log(`[TaskDispatcher] Task ${taskId} not found`);
      return null;
    }

    if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(task.status)) {
      console.log(`[TaskDispatcher] Task ${task.taskCode} status is ${task.status}. Skipping dispatch.`);
      return null;
    }

    const deptMatch = (task.department === 'FOOD_AND_BEVERAGE' || task.department === 'fnb')
      ? ['FNB', 'FOOD_AND_BEVERAGE', 'fnb', 'food_and_beverage']
      : [task.department, (task.department || '').toLowerCase(), (task.department || '').toUpperCase()];
    
    const targetHotelId = task.hotelId || task.hotel;

    // Find staff who currently have an active unexpired offer
    const activeOfferStaffIds = await TaskOffer.find({
      status: 'OFFERED',
      expiresAt: { $gt: new Date() }
    }).distinct('staffId');

    const excludedStaffIds = [
      ...(task.offeredTo || []),
      ...(task.declinedBy || []),
      ...activeOfferStaffIds
    ];

    // Diagnostic counts
    const onDutyCount = await Staff.countDocuments({
      $or: [{ hotelId: targetHotelId }, { hotel: targetHotelId }, { hotelAccess: targetHotelId }],
      department: { $in: deptMatch },
      $or: [{ duty: { $in: ['ON', 'ON_DUTY'] } }, { dutyStatus: { $in: ['ON', 'ON_DUTY'] } }],
      enabled: { $ne: false },
      accountStatus: { $nin: ['DISABLED', 'SUSPENDED', 'DELETED'] }
    });

    const availableCount = await Staff.countDocuments({
      $or: [{ hotelId: targetHotelId }, { hotel: targetHotelId }, { hotelAccess: targetHotelId }],
      department: { $in: deptMatch },
      $or: [{ duty: { $in: ['ON', 'ON_DUTY'] } }, { dutyStatus: { $in: ['ON', 'ON_DUTY'] } }],
      $or: [{ availability: { $in: ['AVAILABLE', 'available'] } }, { availabilityStatus: { $in: ['AVAILABLE', 'available'] } }],
      $or: [{ currentTaskId: null }, { currentTaskId: { $exists: false } }],
      enabled: { $ne: false },
      accountStatus: { $nin: ['DISABLED', 'SUSPENDED', 'DELETED'] }
    });

    const eligibleStaff = await Staff.find({
      $or: [{ hotelId: targetHotelId }, { hotel: targetHotelId }, { hotelAccess: targetHotelId }],
      department: { $in: deptMatch },
      $and: [
        {
          $or: [
            { duty: { $in: ['ON', 'ON_DUTY'] } },
            { dutyStatus: { $in: ['ON', 'ON_DUTY'] } }
          ]
        },
        {
          $or: [
            { availability: { $in: ['AVAILABLE', 'available'] } },
            { availabilityStatus: { $in: ['AVAILABLE', 'available'] } }
          ]
        },
        {
          $or: [
            { currentTaskId: null },
            { currentTaskId: { $exists: false } }
          ]
        },
        {
          $or: [
            { enabled: true },
            { enabled: { $exists: false } }
          ]
        },
        {
          accountStatus: { $nin: ['DISABLED', 'SUSPENDED', 'DELETED'] }
        }
      ],
      _id: { $nin: excludedStaffIds }
    }).sort({ lastDutyChangedAt: 1, createdAt: 1 });

    if (!eligibleStaff || eligibleStaff.length === 0) {
      console.log(`[TaskDispatcher] NO ELIGIBLE STAFF\nhotel: ${targetHotelId}\ndepartment: ${task.department}\nonDuty: ${onDutyCount}\navailable: ${availableCount}`);

      if (task.offeredTo && task.offeredTo.length > 0) {
        task.status = 'ESCALATED';
      } else {
        task.status = 'PENDING';
      }
      task.offerStatus = 'NONE';
      await task.save();
      return null;
    }

    const selectedStaff = eligibleStaff[0];
    console.log(`[TaskDispatcher] Dispatched task ${task.taskCode} to staff ${selectedStaff.staffCode || selectedStaff._id} (${selectedStaff.name || selectedStaff.fullName})`);
    return await this.offerTask(task._id, selectedStaff._id);
  }

  async dispatchPendingTasksForHotelDepartment(hotelId, department) {
    if (!hotelId || !department) return [];

    const deptMatch = (department.toUpperCase() === 'FOOD_AND_BEVERAGE' || department.toUpperCase() === 'FNB')
      ? ['FNB', 'FOOD_AND_BEVERAGE', 'fnb', 'food_and_beverage']
      : [department, department.toLowerCase(), department.toUpperCase()];

    // Find active task offer task IDs to avoid duplicate dispatch
    const activeOfferTaskIds = await TaskOffer.find({
      hotelId,
      status: 'OFFERED',
      expiresAt: { $gt: new Date() }
    }).distinct('taskId');

    const pendingTasks = await Task.find({
      $or: [{ hotelId }, { hotel: hotelId }],
      department: { $in: deptMatch },
      status: { $in: ['PENDING', 'ESCALATED'] },
      assignedStaffId: null,
      _id: { $nin: activeOfferTaskIds }
    }).sort({ priority: -1, createdAt: 1 });

    console.log(`[TaskDispatcher] Found ${pendingTasks.length} pending task(s) waiting in ${department} for hotel ${hotelId}`);

    const dispatched = [];
    for (const task of pendingTasks) {
      const offer = await this.offerTaskToNextEligibleStaff(task._id);
      if (offer) {
        dispatched.push(offer);
      }
    }
    return dispatched;
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
    if (!staff) {
      throw new Error('Staff member not found');
    }
    if (staff.availability === 'BUSY' || staff.currentTaskId) {
      throw new Error('You are currently BUSY with another task');
    }

    // Atomically claim the task
    const task = await Task.findOneAndUpdate(
      {
        _id: offer.taskId,
        status: { $in: ['PENDING', 'OFFERED', 'ESCALATED'] },
        assignedStaffId: null
      },
      {
        status: 'ACCEPTED',
        offerStatus: 'ACCEPTED',
        assignedStaffId: staff._id,
        assignedStaff: staff._id,
        assignedStaffName: staff.name || staff.fullName,
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!task) {
      throw new Error('Task is no longer available or has already been assigned');
    }

    offer.status = 'ACCEPTED';
    offer.respondedAt = new Date();
    await offer.save();

    // Expire any other open offers for this task
    await TaskOffer.updateMany(
      { taskId: task._id, _id: { $ne: offer._id }, status: 'OFFERED' },
      { status: 'EXPIRED', respondedAt: new Date() }
    );

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

    console.log(`[TaskDispatcher] Task ${task.taskCode} successfully ACCEPTED by staff ${staff.staffCode} (${staff.name})`);
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

    const staff = await Staff.findById(staffId);
    if (!staff) throw new Error('Staff not found');
    if (staff.availability === 'BUSY' || staff.currentTaskId) {
      throw new Error('You are currently BUSY with another task');
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: taskIdOrOfferId,
        status: { $in: ['PENDING', 'OFFERED', 'ESCALATED'] },
        assignedStaffId: null
      },
      {
        status: 'ACCEPTED',
        offerStatus: 'ACCEPTED',
        assignedStaffId: staff._id,
        assignedStaff: staff._id,
        assignedStaffName: staff.name || staff.fullName,
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!task) throw new Error('Task not found or already assigned');

    staff.availability = 'BUSY';
    staff.currentTaskId = task._id;
    await staff.save();

    return task;
  }

  async timeoutTaskOffer(offerId) {
    const offer = await TaskOffer.findById(offerId);
    if (!offer) return { success: true, message: 'Offer not found' };
    if (offer.status === 'OFFERED') {
      offer.status = 'TIMEOUT';
      offer.respondedAt = new Date();
      await offer.save();
      console.log(`[TaskDispatcher] TaskOffer ${offerId} TIMED OUT. Attempting re-dispatch for Task ${offer.taskId}...`);
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

    console.log(`[TaskDispatcher] TaskOffer ${offerId} DECLINED by staff ${staffId}. Attempting re-dispatch for Task ${offer.taskId}...`);
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
      task.offerStatus = 'NONE';
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

      // Trigger dispatch for waiting pending tasks
      const targetHotelId = staff.hotelId?._id || staff.hotelId || staff.hotel;
      await this.dispatchPendingTasksForHotelDepartment(targetHotelId, staff.department);
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
    const now = new Date();

    // Auto-timeout any expired offers for this staff and trigger re-dispatch
    const expiredOffers = await TaskOffer.find({
      staffId: staffId,
      status: 'OFFERED',
      expiresAt: { $lte: now }
    });

    for (const exp of expiredOffers) {
      exp.status = 'TIMEOUT';
      exp.respondedAt = now;
      await exp.save();
      await this.offerTaskToNextEligibleStaff(exp.taskId);
    }

    const staff = await Staff.findById(staffId).populate('hotelId');
    if (
      staff &&
      (staff.duty === 'ON' || staff.duty === 'ON_DUTY' || staff.dutyStatus === 'ON_DUTY') &&
      (staff.availability === 'AVAILABLE' || staff.availability === 'available') &&
      !staff.currentTaskId &&
      (staff.enabled !== false && staff.accountStatus !== 'DISABLED')
    ) {
      const targetHotelId = staff.hotelId?._id || staff.hotelId || staff.hotel;
      await this.dispatchPendingTasksForHotelDepartment(targetHotelId, staff.department);
    }

    const pendingOffers = await TaskOffer.find({
      staffId: staffId,
      status: 'OFFERED',
      expiresAt: { $gt: now }
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
