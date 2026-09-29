const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema(
  {
    emergencyId: {
      type: String,
      default: ''
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    roomNumber: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      default: 'CRITICAL'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESPONDING', 'RESOLVED', 'CLOSED'],
      default: 'ACTIVE'
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    respondedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
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

emergencySchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

emergencySchema.virtual('guest').get(function () {
  return this.guestId;
}).set(function (v) {
  this.guestId = v;
});

emergencySchema.virtual('reservation').get(function () {
  return this.reservationId;
}).set(function (v) {
  this.reservationId = v;
});

emergencySchema.virtual('room').get(function () {
  return this.roomId;
}).set(function (v) {
  this.roomId = v;
});

emergencySchema.virtual('freeTextDescription').get(function () {
  return this.description;
}).set(function (v) {
  this.description = v;
});

emergencySchema.virtual('respondedByStaff').get(function () {
  return this.acknowledgedBy;
}).set(function (v) {
  this.acknowledgedBy = v;
});

emergencySchema.index({ hotelId: 1, status: 1 });

module.exports = mongoose.model('Emergency', emergencySchema, 'emergencies');
