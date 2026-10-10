const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Staff, Guest, User, AuditLog } = require('../models');
const otpService = require('./otpService');

class AuthService {
  generateToken(payload) {
    const secret = process.env.JWT_SECRET || 'Lemuria_jwt_secret_key_2026';
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }

  async loginStaff(emailOrCode, password, ipAddress = '', requestedDepartment = '', requestedHotelId = '') {
    let cleanInput = '';
    let pass = '';
    let ip = ipAddress;
    let dept = requestedDepartment;
    let targetHotel = requestedHotelId;

    if (typeof emailOrCode === 'object' && emailOrCode !== null) {
      cleanInput = (emailOrCode.emailOrCode || emailOrCode.email || emailOrCode.staffCode || emailOrCode.staffId || '').trim();
      pass = emailOrCode.password || '';
      ip = emailOrCode.ipAddress || ipAddress || '';
      dept = emailOrCode.department || emailOrCode.workspace || emailOrCode.dept || requestedDepartment || '';
      targetHotel = emailOrCode.hotelId || emailOrCode.hotel || emailOrCode.hotelCode || requestedHotelId || '';
    } else {
      cleanInput = (emailOrCode || '').trim();
      pass = password || '';
    }

    const createAuthError = (message, statusCode = 401) => {
      const err = new Error(message);
      err.statusCode = statusCode;
      return err;
    };

    if (!cleanInput || !pass) {
      throw createAuthError('Staff email or code and password are required', 400);
    }
    
    const staff = await Staff.findOne({
      $or: [
        { email: cleanInput.toLowerCase() },
        { staffCode: cleanInput.toUpperCase() },
        { staffId: cleanInput.toUpperCase() },
        { legacyEmails: cleanInput.toLowerCase() },
        { legacyCodes: cleanInput.toUpperCase() }
      ]
    }).populate('hotelId');

    if (!staff) {
      throw createAuthError('Invalid staff credentials', 401);
    }

    if (!staff.isEnabled() || staff.accountStatus === 'DISABLED' || staff.accountStatus === 'DELETED') {
      throw createAuthError('Your staff account is currently disabled. Please contact your manager.', 403);
    }
    if (staff.accountStatus === 'SUSPENDED') {
      throw createAuthError('Your staff account is currently suspended.', 403);
    }

    const isMatch = await staff.comparePassword(pass);
    if (!isMatch) {
      throw createAuthError('Invalid staff credentials', 401);
    }

    // Require department workspace and enforce strict matching
    const { normalizeDepartment } = require('../utils/department');
    const normRequestedDept = normalizeDepartment(dept);
    if (!normRequestedDept) {
      throw createAuthError('Department workspace is required for staff login.', 400);
    }

    const normActualDept = normalizeDepartment(staff.department);
    const staffRole = (staff.role || '').toUpperCase();

    if (normActualDept !== normRequestedDept) {
      throw createAuthError('Your account is not authorized for this department.', 403);
    }

    // Hotel tenant isolation verification
    if (targetHotel) {
      const staffHotelId = String(staff.hotelId?._id || staff.hotelId || staff.hotel || '');
      const staffHotelCode = String(staff.hotelCode || staff.hotelId?.hotelCode || staff.hotelId?.code || '').toUpperCase();
      const targetStr = String(targetHotel);
      const targetStrUpper = targetStr.toUpperCase();
      const staffAccess = (staff.hotelAccess || []).map(String);

      const matchesHotel =
        staffHotelId === targetStr ||
        staffHotelCode === targetStrUpper ||
        staffAccess.includes(targetStr);

      if (!matchesHotel) {
        throw createAuthError('Your account is not authorized for this hotel property.', 403);
      }
    }

    staff.lastLoginAt = new Date();
    await staff.save();

    await AuditLog.create({
      performedBy: staff._id,
      action: 'STAFF_LOGIN',
      entityType: 'Staff',
      entityId: staff._id.toString(),
      details: {
        staffCode: staff.staffCode,
        department: staff.department,
        requestedDepartment: dept,
        hotelCode: staff.hotelCode
      },
      ipAddress: ip
    });

    const token = this.generateToken({
      id: staff._id,
      staffId: staff.staffCode || staff.staffId,
      email: staff.email,
      role: 'STAFF',
      department: staff.department,
      hotelId: staff.hotelId?._id || staff.hotelId,
      hotelCode: staff.hotelCode
    });

    return {
      token,
      user: {
        id: staff._id,
        email: staff.email,
        role: 'STAFF'
      },
      staff: {
        id: staff._id,
        _id: staff._id,
        staffId: staff.staffCode || staff.staffId,
        staffCode: staff.staffCode || staff.staffId,
        fullName: staff.name || staff.fullName,
        name: staff.name || staff.fullName,
        email: staff.email,
        department: (staff.department || '').toUpperCase(),
        role: staff.role || (staff.department || '').toUpperCase(),
        dutyStatus: staff.duty || staff.dutyStatus,
        duty: staff.duty,
        availability: staff.availability,
        accountStatus: staff.accountStatus || (staff.enabled ? 'ENABLED' : 'DISABLED'),
        enabled: staff.isEnabled(),
        hotelId: staff.hotelId?._id || staff.hotelId,
        hotelCode: staff.hotelCode,
        hotel: staff.hotelId
      }
    };
  }

  async requestGuestOTP(email) {
    const cleanEmail = typeof email === 'object' && email !== null ? email.email : email;
    return await otpService.sendOTP(cleanEmail, 'GUEST_VERIFICATION');
  }

  async loginGuestWithOTP(email, otpCode, additionalDetails = {}, ipAddress = '') {
    let cleanEmail = '';
    let otp = '';
    let details = additionalDetails;
    let ip = ipAddress;

    if (typeof email === 'object' && email !== null) {
      cleanEmail = (email.email || '').toLowerCase().trim();
      otp = email.otp || email.otpCode || '';
      details = email.additionalDetails || email;
      ip = email.ipAddress || ipAddress || '';
    } else {
      cleanEmail = (email || '').toLowerCase().trim();
      otp = otpCode;
    }

    await otpService.verifyOTP(cleanEmail, otp, 'GUEST_VERIFICATION');

    let guest = await Guest.findOne({ email: cleanEmail });
    let isNew = false;

    if (!guest) {
      isNew = true;
      const count = await Guest.countDocuments();
      const guestCode = `GST-${String(count + 1001).padStart(5, '0')}`;

      const defaultPass = process.env.SEED_DEFAULT_PASSWORD || 'LemuriaGuest2026!';
      const passwordHash = await bcrypt.hash(defaultPass, 10);

      guest = await Guest.create({
        guestCode,
        name: details.fullName || details.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        mobile: details.phone || details.mobile || '+91 98765 00000',
        passwordHash,
        emailVerified: true,
        lifecycleStatus: 'NO_BOOKING',
        lastLoginAt: new Date()
      });
    } else {
      guest.emailVerified = true;
      guest.lastLoginAt = new Date();
      await guest.save();
    }

    await AuditLog.create({
      performedBy: guest._id,
      action: isNew ? 'GUEST_REGISTERED_VIA_OTP' : 'GUEST_LOGIN_VIA_OTP',
      entityType: 'Guest',
      entityId: guest._id.toString(),
      details: { email: cleanEmail },
      ipAddress: ip
    });

    const token = this.generateToken({
      id: guest._id,
      guestId: guest.guestCode,
      email: guest.email,
      role: 'GUEST'
    });

    return {
      token,
      user: {
        id: guest._id,
        email: guest.email,
        role: 'GUEST'
      },
      guest: {
        id: guest._id,
        _id: guest._id,
        guestId: guest.guestCode,
        guestCode: guest.guestCode,
        fullName: guest.name,
        name: guest.name,
        email: guest.email,
        phone: guest.mobile,
        mobile: guest.mobile,
        lifecycleStatus: guest.lifecycleStatus,
        emailVerified: guest.emailVerified
      }
    };
  }

  async loginGuestWithPassword(email, password, ipAddress = '') {
    let cleanEmail = '';
    let pass = '';
    let ip = ipAddress;

    if (typeof email === 'object' && email !== null) {
      cleanEmail = (email.email || '').toLowerCase().trim();
      pass = email.password || '';
      ip = email.ipAddress || ipAddress || '';
    } else {
      cleanEmail = (email || '').toLowerCase().trim();
      pass = password || '';
    }

    const guest = await Guest.findOne({ email: cleanEmail });

    if (!guest) {
      throw new Error('Invalid guest credentials');
    }

    const isMatch = await guest.comparePassword(pass);
    if (!isMatch) {
      throw new Error('Invalid guest credentials');
    }

    guest.lastLoginAt = new Date();
    await guest.save();

    const token = this.generateToken({
      id: guest._id,
      guestId: guest.guestCode,
      email: guest.email,
      role: 'GUEST'
    });

    return {
      token,
      user: {
        id: guest._id,
        email: guest.email,
        role: 'GUEST'
      },
      guest: {
        id: guest._id,
        _id: guest._id,
        guestId: guest.guestCode,
        guestCode: guest.guestCode,
        fullName: guest.name,
        name: guest.name,
        email: guest.email,
        phone: guest.mobile,
        mobile: guest.mobile,
        lifecycleStatus: guest.lifecycleStatus,
        emailVerified: guest.emailVerified
      }
    };
  }

  async loginGuest(email, password, ipAddress = '') {
    return await this.loginGuestWithPassword(email, password, ipAddress);
  }

  async registerGuest(guestData, ipAddress = '') {
    const { name, fullName, email, password, phone, mobile, idProofType, idProofNumber } = guestData;
    const cleanEmail = (email || '').toLowerCase().trim();

    const existing = await Guest.findOne({ email: cleanEmail });
    if (existing) {
      throw new Error('A guest with this email address already exists');
    }

    const count = await Guest.countDocuments();
    const guestCode = `GST-${String(count + 1001).padStart(5, '0')}`;

    const passwordHash = await bcrypt.hash(password || 'LemuriaGuest2026!', 10);

    const guest = await Guest.create({
      guestCode,
      name: name || fullName || cleanEmail.split('@')[0],
      email: cleanEmail,
      mobile: mobile || phone || '',
      passwordHash,
      emailVerified: true,
      idProofType: idProofType || 'PASSPORT',
      idProofNumber: idProofNumber || '',
      lifecycleStatus: 'NO_BOOKING',
      lastLoginAt: new Date()
    });

    await AuditLog.create({
      performedBy: guest._id,
      action: 'GUEST_REGISTERED',
      entityType: 'Guest',
      entityId: guest._id.toString(),
      details: { email: cleanEmail },
      ipAddress
    });

    const token = this.generateToken({
      id: guest._id,
      guestId: guest.guestCode,
      email: guest.email,
      role: 'GUEST'
    });

    return {
      token,
      user: { id: guest._id, email: guest.email, role: 'GUEST' },
      guest: {
        id: guest._id,
        _id: guest._id,
        guestId: guest.guestCode,
        guestCode: guest.guestCode,
        name: guest.name,
        fullName: guest.name,
        email: guest.email,
        mobile: guest.mobile,
        phone: guest.mobile,
        lifecycleStatus: guest.lifecycleStatus
      }
    };
  }
}

module.exports = new AuthService();
