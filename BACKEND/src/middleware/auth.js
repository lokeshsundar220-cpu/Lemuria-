const jwt = require('jsonwebtoken');
const { Staff, Guest, User } = require('../models');
const { errorResponse } = require('../utils/response');

/**
 * Verify JWT token and attach user / staff / guest to request object
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication token required');
    }

    const secret = process.env.JWT_SECRET || 'Lemuria_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    if (decoded.role === 'STAFF') {
      const staffProfile = await Staff.findById(decoded.id).populate('hotelId');
      if (!staffProfile) {
        return errorResponse(res, 401, 'Staff account no longer exists');
      }

      if (staffProfile.accountStatus === 'DISABLED' || staffProfile.enabled === false) {
        return errorResponse(res, 403, 'Staff account is disabled. Contact manager.');
      }
      if (staffProfile.accountStatus === 'SUSPENDED') {
        return errorResponse(res, 403, 'Staff account is suspended.');
      }

      req.staff = staffProfile;
      req.user = {
        _id: staffProfile._id,
        email: staffProfile.email,
        role: 'STAFF'
      };
    } else if (decoded.role === 'GUEST') {
      const guestProfile = await Guest.findById(decoded.id);
      if (!guestProfile) {
        return errorResponse(res, 401, 'Guest account no longer exists');
      }

      req.guest = guestProfile;
      req.user = {
        _id: guestProfile._id,
        email: guestProfile.email,
        role: 'GUEST'
      };
    } else {
      const user = await User.findById(decoded.id);
      if (!user) {
        return errorResponse(res, 401, 'User account no longer exists');
      }
      req.user = user;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Authentication token expired');
    }
    return errorResponse(res, 500, `Authentication failed: ${error.message}`);
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }
    next();
  };
};

const { normalizeDepartment } = require('../utils/department');

const authorizeDepartment = (...allowedDepartments) => {
  return (req, res, next) => {
    if (!req.staff) {
      return errorResponse(res, 403, 'Access denied: Staff authorization required');
    }

    const userDept = normalizeDepartment(req.staff.department);
    const userRole = (req.staff.role || '').toUpperCase();
    const allowed = allowedDepartments.map((d) => normalizeDepartment(d));

    if (
      userDept === 'manager' ||
      userRole === 'MANAGER' ||
      allowed.includes(userDept)
    ) {
      return next();
    }

    return errorResponse(
      res,
      403,
      `Access denied. Requires department: ${allowedDepartments.join(', ')}`
    );
  };
};

const requireOnDuty = (req, res, next) => {
  if (!req.staff) {
    return errorResponse(res, 403, 'Staff profile required');
  }

  if (req.staff.duty !== 'ON_DUTY' && req.staff.dutyStatus !== 'ON_DUTY') {
    return errorResponse(res, 400, 'Staff is currently OFF_DUTY. Please start duty first.');
  }

  next();
};

module.exports = {
  authenticate,
  authorizeRole,
  authorizeDepartment,
  requireOnDuty
};
