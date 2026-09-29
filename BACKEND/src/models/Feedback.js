const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      default: null
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      default: null
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    department: {
      type: String,
      default: null
    },
    kind: {
      type: String,
      enum: ['SERVICE', 'SERVICE_REQUEST', 'OVERALL_STAY', 'STAY', 'OVERALL', 'GENERAL', 'HOTEL', 'SERVICE_FEEDBACK', 'OVERALL_HOTEL_FEEDBACK'],
      default: 'OVERALL_STAY'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: ''
    },
    cleanlinessRating: {
      type: Number,
      default: null
    },
    staffRating: {
      type: Number,
      default: null
    },
    amenitiesRating: {
      type: Number,
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

feedbackSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

feedbackSchema.virtual('guest').get(function () {
  return this.guestId;
}).set(function (v) {
  this.guestId = v;
});

feedbackSchema.virtual('reservation').get(function () {
  return this.reservationId;
}).set(function (v) {
  this.reservationId = v;
});

feedbackSchema.virtual('serviceRequest').get(function () {
  return this.serviceRequestId;
}).set(function (v) {
  this.serviceRequestId = v;
});

feedbackSchema.virtual('feedbackType').get(function () {
  return this.kind;
}).set(function (v) {
  this.kind = v;
});

feedbackSchema.virtual('comments').get(function () {
  return this.comment;
}).set(function (v) {
  this.comment = v;
});

feedbackSchema.index({ hotelId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema, 'feedback');
