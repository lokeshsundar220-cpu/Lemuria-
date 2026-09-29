const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['guest', 'staff'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'INFO'
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
