const mongoose = require('mongoose');

const dutyLogSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    department: {
      type: String,
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    tasksCompleted: {
      type: Number,
      default: 0
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

dutyLogSchema.index({ hotelId: 1, staffId: 1 });

module.exports = mongoose.model('DutyLog', dutyLogSchema, 'dutyLogs');
