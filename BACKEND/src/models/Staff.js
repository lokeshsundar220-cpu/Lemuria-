const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema(
  {
    staffCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    staffId: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    fullName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      trim: true
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel'
    },
    hotelCode: {
      type: String,
      default: ''
    },
    hotelAccess: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel'
      }
    ],
    legacyCodes: [
      {
        type: String
      }
    ],
    legacyEmails: [
      {
        type: String
      }
    ],
    enabled: {
      type: mongoose.Schema.Types.Mixed,
      default: true
    },
    accountStatus: {
      type: String,
      default: 'ENABLED'
    },
    duty: {
      type: String,
      default: 'OFF_DUTY'
    },
    dutyStatus: {
      type: String,
      default: 'OFF_DUTY'
    },
    availability: {
      type: String,
      default: 'AVAILABLE'
    },
    currentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    dutyStartedAt: {
      type: Date,
      default: null
    },
    shiftStartTime: {
      type: Date,
      default: null
    },
    shiftEndTime: {
      type: Date,
      default: null
    },
    lastDutyChangedAt: {
      type: Date,
      default: Date.now
    },
    lastAttendanceClosedReason: {
      type: String,
      default: ''
    },
    lastAttendanceClosedAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

staffSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

staffSchema.methods.isEnabled = function () {
  if (
    this.enabled === false ||
    this.enabled === 'DISABLED' ||
    this.accountStatus === 'DISABLED' ||
    this.accountStatus === 'DELETED' ||
    this.accountStatus === 'SUSPENDED'
  ) {
    return false;
  }
  return true;
};

staffSchema.index({ hotelId: 1, department: 1, duty: 1, availability: 1 });

module.exports = mongoose.model('Staff', staffSchema, 'staff');
