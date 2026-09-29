const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    hotelCode: {
      type: String,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'India'
    },
    address: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    staffEmailDomain: {
      type: String,
      default: ''
    },
    wifiSSID: {
      type: String,
      default: 'Lemuria-Guest'
    },
    wifiPassword: {
      type: String,
      default: 'Lemuria2026'
    },
    amenities: [
      {
        type: String
      }
    ],
    starRating: {
      type: Number,
      default: 5
    },
    startingPrice: {
      type: Number,
      default: 8000
    },
    description: {
      type: String,
      default: ''
    },
    dining: {
      type: String,
      default: ''
    },
    facilities: {
      type: String,
      default: ''
    },
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

hotelSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('Hotel', hotelSchema, 'hotels');
