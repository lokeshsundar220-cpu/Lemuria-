const bcrypt = require('bcryptjs');
const { Staff, Task, AuditLog, Hotel } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const addStaff = async (req, res, next) => {
  try {
    const { email, password, fullName, name, phone, mobile, department } = req.body;
    const staffHotelId = req.staff?.hotelId?._id || req.staff?.hotelId;

    if (!email || !password || (!fullName && !name) || !department || !staffHotelId) {
      return errorResponse(res, 400, 'Email, password, name, department, and hotelId are required');
    }

    if (department === 'Floor Manager' || department === 'MANAGER' || department === 'manager') {
      return errorResponse(res, 400, 'Floor Manager role is not permitted. Each hotel has exactly one Manager.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Staff.findOne({ email: cleanEmail });
    if (existing) {
      return errorResponse(res, 400, 'A staff member with this email address already exists');
    }

    const hotel = await Hotel.findById(staffHotelId);
    const hotelCode = hotel ? (hotel.hotelCode || 'GRD') : 'GRD';

    const deptPrefixes = {
      HOUSEKEEPING: 'HK',
      housekeeping: 'HK',
      MAINTENANCE: 'MT',
      maintenance: 'MT',
      FNB: 'FB',
      fnb: 'FB',
      FOOD_AND_BEVERAGE: 'FB',
      food_and_beverage: 'FB',
      RECEPTION: 'RC',
      reception: 'RC'
    };
    const pfx = deptPrefixes[department] || 'STF';

    const count = await Staff.countDocuments({
      $or: [{ hotelId: staffHotelId }, { hotel: staffHotelId }],
      department: { $in: [department, department.toLowerCase(), department.toUpperCase()] }
    });

    let num = count + 1;
    let candidateCode = `${hotelCode}-${pfx}-${String(num).padStart(3, '0')}`;
    while (await Staff.findOne({ staffCode: candidateCode })) {
      num++;
      candidateCode = `${hotelCode}-${pfx}-${String(num).padStart(3, '0')}`;
    }
    const staffCode = candidateCode;

    const passwordHash = await bcrypt.hash(password, 10);

    const staff = await Staff.create({
      staffCode,
      staffId: staffCode,
      name: name || fullName,
      fullName: name || fullName,
      email: cleanEmail,
      phone: phone || mobile || '',
      passwordHash,
      department: department.toLowerCase(),
      role: (department.toLowerCase() === 'food_and_beverage' || department.toLowerCase() === 'fnb') ? 'FNB' : department.toUpperCase(),
      hotelId: staffHotelId,
      hotel: staffHotelId,
      hotelCode,
      hotelAccess: [staffHotelId],
      enabled: true,
      accountStatus: 'ENABLED',
      duty: 'OFF_DUTY',
      availability: 'AVAILABLE'
    });

    await AuditLog.create({
      performedBy: req.user?._id || req.staff?._id,
      action: 'MANAGER_ADD_STAFF',
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: { staffCode, department, name: staff.name }
    });

    return successResponse(res, 201, 'Staff member added successfully', staff);
  } catch (error) {
    return next(error);
  }
};

const getAllStaff = async (req, res, next) => {
  try {
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId;
    const { department, dutyStatus, duty, accountStatus, enabled } = req.query;

    const query = { $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }] };
    if (department) {
      query.department = { $in: [department, department.toLowerCase(), department.toUpperCase()] };
    }
    if (dutyStatus || duty) {
      const dVal = dutyStatus || duty;
      query.$and = [
        { $or: [{ duty: dVal }, { dutyStatus: dVal }] }
      ];
    }
    if (accountStatus === 'DISABLED' || enabled === 'false' || enabled === false) query.enabled = false;
    else if (accountStatus === 'ENABLED' || enabled === 'true' || enabled === true) query.enabled = true;

    const staffList = await Staff.find(query)
      .populate('currentTaskId')
      .sort({ department: 1, name: 1 });

    return successResponse(res, 200, 'Staff list retrieved', staffList);
  } catch (error) {
    return next(error);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, name, phone, mobile, department } = req.body;
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId;

    const staff = await Staff.findOne({
      $and: [
        { $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }] },
        {
          $or: [
            { _id: id && id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { staffCode: id },
            { staffId: id }
          ]
        }
      ]
    });
    if (!staff) return errorResponse(res, 404, 'Staff not found in your hotel property');

    if (name || fullName) {
      staff.name = name || fullName;
      staff.fullName = name || fullName;
    }
    if (phone || mobile) staff.phone = phone || mobile;
    if (department) {
      if (department === 'Floor Manager' || department.toUpperCase() === 'MANAGER') {
        return errorResponse(res, 400, 'Floor Manager role is not permitted');
      }
      staff.department = department.toLowerCase();
      staff.role = department.toUpperCase();
    }

    await staff.save();
    return successResponse(res, 200, 'Staff details updated', staff);
  } catch (error) {
    return next(error);
  }
};

const setStaffAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, enabled } = req.body;
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId;

    const staff = await Staff.findOne({
      $and: [
        { $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }] },
        {
          $or: [
            { _id: id && id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { staffCode: id },
            { staffId: id }
          ]
        }
      ]
    });
    if (!staff) return errorResponse(res, 404, 'Staff member not found in your hotel property');

    if (status === 'DISABLED' || status === 'DELETED' || status === 'SUSPENDED' || enabled === false) {
      staff.enabled = false;
      staff.accountStatus = status || 'DISABLED';
      staff.duty = 'OFF_DUTY';
      staff.availability = 'AVAILABLE';
      staff.currentTaskId = null;
    } else if (status === 'ENABLED' || enabled === true) {
      staff.enabled = true;
      staff.accountStatus = 'ENABLED';
    }

    await staff.save();

    await AuditLog.create({
      performedBy: req.user?._id || req.staff?._id,
      action: `MANAGER_SET_STATUS_STAFF`,
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: { enabled: staff.enabled, status: staff.accountStatus }
    });

    return successResponse(res, 200, `Staff status updated`, staff);
  } catch (error) {
    return next(error);
  }
};

const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId;

    const staff = await Staff.findOne({
      $and: [
        { $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }] },
        {
          $or: [
            { _id: id && id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { staffCode: id },
            { staffId: id }
          ]
        }
      ]
    });
    if (!staff) return errorResponse(res, 404, 'Staff member not found in your hotel property');

    staff.enabled = false;
    staff.accountStatus = 'DELETED';
    staff.duty = 'OFF_DUTY';
    staff.availability = 'AVAILABLE';
    staff.currentTaskId = null;
    await staff.save();

    await AuditLog.create({
      performedBy: req.user?._id || req.staff?._id,
      action: 'MANAGER_DELETE_STAFF',
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: { staffCode: staff.staffCode, name: staff.name }
    });

    return successResponse(res, 200, 'Staff member deactivated/removed', staff);
  } catch (error) {
    return next(error);
  }
};

const getStaffWorkload = async (req, res, next) => {
  try {
    const hotelId = req.staff?.hotelId?._id || req.staff?.hotelId;

    const totalStaff = await Staff.countDocuments({ $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }], enabled: { $ne: false }, accountStatus: { $nin: ['DISABLED', 'DELETED'] } });
    const onDutyStaff = await Staff.countDocuments({ $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }], $or: [{ duty: { $in: ['ON', 'ON_DUTY'] } }, { dutyStatus: { $in: ['ON', 'ON_DUTY'] } }], enabled: { $ne: false } });
    const busyStaff = await Staff.countDocuments({ $or: [{ hotelId }, { hotel: hotelId }, { hotelAccess: hotelId }], availability: 'BUSY', enabled: { $ne: false } });

    const activeTasks = await Task.countDocuments({ $or: [{ hotelId }, { hotel: hotelId }], status: { $in: ['ACCEPTED', 'IN_PROGRESS'] } });
    const pendingTasks = await Task.countDocuments({ $or: [{ hotelId }, { hotel: hotelId }], status: { $in: ['PENDING', 'OFFERED'] } });
    const completedTasksToday = await Task.countDocuments({
      $or: [{ hotelId }, { hotel: hotelId }],
      status: 'COMPLETED',
      completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    return successResponse(res, 200, 'Workload summary fetched', {
      totalStaff,
      onDutyStaff,
      availableStaff: onDutyStaff - busyStaff,
      busyStaff,
      activeTasks,
      pendingTasks,
      completedTasksToday
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addStaff,
  getAllStaff,
  updateStaff,
  setStaffAccountStatus,
  deleteStaff,
  getStaffWorkload
};
