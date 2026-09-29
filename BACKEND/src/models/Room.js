const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true
    },
    roomTypeId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    type: {
      type: String,
      default: 'DELUXE'
    },
    state: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'CLEANING_REQUIRED', 'OUT_OF_SERVICE', 'INSPECTED', 'MAINTENANCE'],
      default: 'AVAILABLE'
    },
    floor: {
      type: Number,
      default: 1
    },
    pricePerNight: {
      type: Number,
      default: 8500
    },
    maxOccupancy: {
      type: Number,
      default: 2
    },
    currentGuestName: {
      type: String,
      default: null
    },
    currentReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    isClean: {
      type: Boolean,
      default: true
    },
    amenities: [
      {
        type: String
      }
    ],
    lastCleanedAt: {
      type: Date,
      default: null
    },
    lastInspectedAt: {
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

roomSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

roomSchema.virtual('status').get(function () {
  return this.state;
}).set(function (v) {
  this.state = v;
});

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, state: 1 });

module.exports = mongoose.model('Room', roomSchema, 'rooms');
