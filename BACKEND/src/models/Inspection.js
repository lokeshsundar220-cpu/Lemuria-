const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema(
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
      default: null
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
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    result: {
      type: String,
      enum: ['PASSED', 'FAILED', 'NEEDS_TOUCHUP', 'PENDING'],
      default: 'PASSED'
    },
    notes: {
      type: String,
      default: ''
    },
    checklist: {
      type: Object,
      default: {}
    },
    inspectedAt: {
      type: Date,
      default: Date.now
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

inspectionSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

inspectionSchema.virtual('room').get(function () {
  return this.roomId;
}).set(function (v) {
  this.roomId = v;
});

inspectionSchema.virtual('inspectorStaff').get(function () {
  return this.inspectedBy;
}).set(function (v) {
  this.inspectedBy = v;
});

inspectionSchema.virtual('status').get(function () {
  return this.result;
}).set(function (v) {
  this.result = v;
});

inspectionSchema.virtual('comments').get(function () {
  return this.notes;
}).set(function (v) {
  this.notes = v;
});

inspectionSchema.index({ hotelId: 1, roomId: 1 });

module.exports = mongoose.model('Inspection', inspectionSchema, 'inspections');
