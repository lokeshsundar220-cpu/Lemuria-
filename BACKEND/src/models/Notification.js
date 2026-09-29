const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    recipientType: {
      type: String,
      enum: ['STAFF', 'GUEST', 'DEPARTMENT', 'MANAGER'],
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    department: {
      type: String,
      default: null
    },
    type: {
      type: String,
      default: 'SYSTEM'
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      default: ''
    },
    read: {
      type: Boolean,
      default: false
    },
    refType: {
      type: String,
      default: null
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    metadata: {
      type: Object,
      default: {}
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

notificationSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

notificationSchema.virtual('recipientUser').get(function () {
  return this.recipientId;
}).set(function (v) {
  this.recipientId = v;
});

notificationSchema.virtual('message').get(function () {
  return this.body;
}).set(function (v) {
  this.body = v;
});

notificationSchema.virtual('isRead').get(function () {
  return this.read;
}).set(function (v) {
  this.read = v;
});

notificationSchema.index({ hotelId: 1, recipientType: 1, recipientId: 1, read: 1, createdAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
