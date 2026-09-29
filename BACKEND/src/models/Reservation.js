const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reservationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
      index: true
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    roomTypeId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
      index: true
    },
    roomNumber: {
      type: String,
      default: ''
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required']
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required']
    },
    nights: {
      type: Number,
      default: 1
    },
    guestsCount: {
      type: Number,
      default: 1
    },
    partyNote: {
      type: String,
      default: ''
    },
    subtotal: {
      type: Number,
      default: 0
    },
    taxPercent: {
      type: Number,
      default: 18
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: [
          'BOOKED',
          'CHECK_IN_PENDING',
          'CHECKED_IN',
          'CHECKED_OUT',
          'CANCELLED'
        ],
        message: '{VALUE} is not a valid reservation status'
      },
      default: 'BOOKED',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED'],
      default: 'PAID'
    },
    wifi: {
      ssid: { type: String, default: '' },
      password: { type: String, default: '' }
    },
    keyCardPin: {
      type: String,
      default: null
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedOutAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: String,
      default: null
    },
    idType: {
      type: String,
      default: 'PASSPORT'
    },
    idNumberMasked: {
      type: String,
      default: ''
    },
    verification: {
      idChecked: { type: Boolean, default: false },
      reservationChecked: { type: Boolean, default: false },
      paymentChecked: { type: Boolean, default: false }
    },
    eta: {
      type: String,
      default: '14:00'
    },
    source: {
      type: String,
      default: 'DIRECT'
    },
    specialRequest: {
      type: String,
      default: ''
    },
    receptionApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    checkoutProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
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

reservationSchema.virtual('reservationNumber').get(function () {
  return this.reservationCode;
}).set(function (v) {
  this.reservationCode = v;
});

reservationSchema.virtual('guest').get(function () {
  return this.guestId;
}).set(function (v) {
  this.guestId = v;
});

reservationSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

reservationSchema.virtual('room').get(function () {
  return this.roomId;
}).set(function (v) {
  this.roomId = v;
});

reservationSchema.virtual('adults').get(function () {
  return this.guestsCount;
}).set(function (v) {
  this.guestsCount = v;
});

reservationSchema.virtual('totalAmount').get(function () {
  return this.total;
}).set(function (v) {
  this.total = v;
});

reservationSchema.virtual('actualCheckInTime').get(function () {
  return this.checkedInAt;
}).set(function (v) {
  this.checkedInAt = v;
});

reservationSchema.virtual('actualCheckOutTime').get(function () {
  return this.checkedOutAt;
}).set(function (v) {
  this.checkedOutAt = v;
});

reservationSchema.virtual('specialRequests').get(function () {
  return this.specialRequest;
}).set(function (v) {
  this.specialRequest = v;
});

reservationSchema.index({ hotelId: 1, status: 1 });
reservationSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1, status: 1 });
reservationSchema.index({ guestId: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema, 'reservations');
