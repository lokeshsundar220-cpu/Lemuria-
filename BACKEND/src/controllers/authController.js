const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');

const loginStaff = async (req, res, next) => {
  try {
    const { email, staffCode, emailOrCode, staffId, password, department, workspace, dept, hotelId, hotelCode } = req.body;
    const loginIdentifier = emailOrCode || email || staffCode || staffId;
    if (!loginIdentifier || !password) {
      return errorResponse(res, 400, 'Staff email or code and password are required');
    }

    const requestedDept = department || workspace || dept;
    if (!requestedDept) {
      return errorResponse(res, 400, 'Department workspace is required for staff login');
    }

    const ip = req.ip || req.connection.remoteAddress;
    const result = await authService.loginStaff({
      emailOrCode: loginIdentifier,
      password,
      department: requestedDept,
      hotelId: hotelId || hotelCode,
      ipAddress: ip
    });
    return successResponse(res, 200, 'Staff authenticated successfully', result);
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return errorResponse(res, statusCode, error.message);
  }
};

const requestGuestOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 400, 'Email is required');
    }

    const result = await authService.requestGuestOTP(email);
    return successResponse(res, 200, result.message, { expiresAt: result.expiresAt });
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const verifyGuestOTP = async (req, res, next) => {
  try {
    const { email, otp, fullName, phone, name, mobile } = req.body;
    if (!email || !otp) {
      return errorResponse(res, 400, 'Email and OTP code are required');
    }

    const ip = req.ip || req.connection.remoteAddress;
    const result = await authService.loginGuestWithOTP(email, otp, { fullName: fullName || name, phone: phone || mobile }, ip);
    return successResponse(res, 200, 'Guest authenticated successfully', result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const loginGuestPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    const ip = req.ip || req.connection.remoteAddress;
    const result = await authService.loginGuestWithPassword(email, password, ip);
    return successResponse(res, 200, 'Guest logged in successfully', result);
  } catch (error) {
    return errorResponse(res, 401, error.message);
  }
};

const registerGuest = async (req, res, next) => {
  try {
    const { email, password, name, fullName, mobile, phone } = req.body;
    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    const ip = req.ip || req.connection.remoteAddress;
    const result = await authService.registerGuest({
      email,
      password,
      name: name || fullName,
      mobile: mobile || phone
    }, ip);

    return successResponse(res, 201, 'Guest registered successfully', result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const data = {
      user: req.user,
      staff: req.staff || null,
      guest: req.guest || null
    };
    return successResponse(res, 200, 'User profile fetched', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  loginStaff,
  requestGuestOTP,
  verifyGuestOTP,
  loginGuestPassword,
  registerGuest,
  getCurrentUser
};
