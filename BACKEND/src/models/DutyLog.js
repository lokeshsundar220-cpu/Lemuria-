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
    staffCode: {
      type: String,
      trim: true,
      default: ''
    },
    staffName: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    workDate: {
      type: String,
      required: true,
      index: true // Formatted as YYYY-MM-DD in hotel timezone
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    endedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'AUTO_CLOSED'],
      default: 'ACTIVE',
      index: true
    },
    endMethod: {
      type: String,
      enum: ['MANUAL', 'AUTO', null],
      default: null
    },
    closureReason: {
      type: String,
      default: ''
    },
    scheduledCutoffAt: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

dutyLogSchema.index({ hotelId: 1, staffId: 1, status: 1 });
dutyLogSchema.index({ hotelId: 1, workDate: 1 });
dutyLogSchema.index({ status: 1, scheduledCutoffAt: 1 });

module.exports = mongoose.model('DutyLog', dutyLogSchema, 'dutyLogs');

