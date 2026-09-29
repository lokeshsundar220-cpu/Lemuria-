const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    bedType: {
      type: String,
      default: 'King'
    },
    maxGuests: {
      type: Number,
      default: 2
    },
    pricePerNight: {
      type: Number,
      required: true
    },
    totalUnits: {
      type: Number,
      default: 1
    },
    amenities: [
      {
        type: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

roomTypeSchema.index({ hotelId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('RoomType', roomTypeSchema, 'roomTypes');
