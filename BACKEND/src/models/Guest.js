const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guestSchema = new mongoose.Schema(
  {
    guestCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    mobile: {
      type: String,
      default: '',
      trim: true
    },
    passwordHash: {
      type: String,
      default: ''
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    idProofType: {
      type: String,
      default: 'PASSPORT'
    },
    idProofNumber: {
      type: String,
      default: ''
    },
    nationality: {
      type: String,
      default: 'Indian'
    },
    address: {
      type: String,
      default: ''
    },
    lifecycleStatus: {
      type: String,
      enum: ['NO_BOOKING', 'BOOKED', 'CHECK_IN_PENDING', 'CHECKED_IN', 'CHECKED_OUT'],
      default: 'NO_BOOKING'
    },
    currentReservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    currentRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    currentHotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    preferences: {
      dietary: { type: String, default: 'Standard' },
      pillowType: { type: String, default: 'Soft' },
      floorPreference: { type: String, default: 'High Floor' },
      specialNotes: { type: String, default: '' }
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

guestSchema.virtual('fullName').get(function () {
  return this.name;
}).set(function (v) {
  this.name = v;
});

guestSchema.virtual('phone').get(function () {
  return this.mobile;
}).set(function (v) {
  this.mobile = v;
});

guestSchema.virtual('guestId').get(function () {
  return this.guestCode;
}).set(function (v) {
  this.guestCode = v;
});

guestSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Guest', guestSchema, 'guests');
