const mongoose = require('mongoose');

const taskOfferSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'TIMEOUT'],
      default: 'OFFERED'
    },
    offeredAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    respondedAt: {
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

taskOfferSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

taskOfferSchema.virtual('task').get(function () {
  return this.taskId;
}).set(function (v) {
  this.taskId = v;
});

taskOfferSchema.virtual('staff').get(function () {
  return this.staffId;
}).set(function (v) {
  this.staffId = v;
});

taskOfferSchema.index({ hotelId: 1, staffId: 1, status: 1 });

module.exports = mongoose.model('TaskOffer', taskOfferSchema, 'taskOffers');
