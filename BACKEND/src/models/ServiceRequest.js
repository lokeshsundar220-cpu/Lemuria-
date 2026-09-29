const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
      index: true
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      index: true
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
    department: {
      type: String,
      required: true,
      enum: ['HOUSEKEEPING', 'MAINTENANCE', 'FNB', 'FOOD_AND_BEVERAGE', 'RECEPTION', 'OTHER']
    },
    serviceType: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['OPEN', 'PENDING', 'REQUESTED', 'OFFERING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    assignedStaffName: {
      type: String,
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

serviceRequestSchema.virtual('requestNumber').get(function () {
  return this.requestCode;
}).set(function (v) {
  this.requestCode = v;
});

serviceRequestSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

serviceRequestSchema.virtual('guest').get(function () {
  return this.guestId;
}).set(function (v) {
  this.guestId = v;
});

serviceRequestSchema.virtual('reservation').get(function () {
  return this.reservationId;
}).set(function (v) {
  this.reservationId = v;
});

serviceRequestSchema.virtual('room').get(function () {
  return this.roomId;
}).set(function (v) {
  this.roomId = v;
});

serviceRequestSchema.virtual('linkedTask').get(function () {
  return this.taskId;
}).set(function (v) {
  this.taskId = v;
});

serviceRequestSchema.virtual('assignedStaff').get(function () {
  return this.assignedStaffId;
}).set(function (v) {
  this.assignedStaffId = v;
});

serviceRequestSchema.virtual('requestType').get(function () {
  return this.serviceType;
}).set(function (v) {
  this.serviceType = v;
});

serviceRequestSchema.virtual('notes').get(function () {
  return this.description;
}).set(function (v) {
  this.description = v;
});

serviceRequestSchema.index({ hotelId: 1, status: 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema, 'serviceRequests');
