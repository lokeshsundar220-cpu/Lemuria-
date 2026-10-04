const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskCode: {
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
    department: {
      type: String,
      required: true,
      enum: ['HOUSEKEEPING', 'MAINTENANCE', 'FNB', 'FOOD_AND_BEVERAGE', 'RECEPTION', 'MANAGER']
    },
    type: {
      type: String,
      enum: ['CLEANING', 'SERVICE', 'MAINTENANCE', 'DELIVERY', 'INSPECTION', 'SERVICE_REQUEST', 'CHECKOUT_CLEANING'],
      default: 'SERVICE'
    },
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    guestRequest: {
      type: String,
      default: ''
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
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      default: null
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      default: null
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED'],
      default: 'PENDING',
      index: true
    },
    offerStatus: {
      type: String,
      enum: ['NONE', 'OFFERED', 'ACCEPTED', 'EXPIRED'],
      default: 'NONE'
    },
    assignmentState: {
      type: String,
      enum: ['AUTO', 'NEEDS_MANAGER', 'ASSIGNED'],
      default: 'AUTO'
    },
    offeredTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
      }
    ],
    declinedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
      }
    ],
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true
    },
    assignedStaffName: {
      type: String,
      default: null
    },
    createdByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    estimatedDuration: {
      type: Number,
      default: 30
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    completionNote: {
      type: String,
      default: ''
    },
    beforeImageUrl: {
      type: String,
      default: null
    },
    afterImageUrl: {
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

taskSchema.virtual('taskNumber').get(function () {
  return this.taskCode;
}).set(function (v) {
  this.taskCode = v;
});

taskSchema.virtual('hotel').get(function () {
  return this.hotelId;
}).set(function (v) {
  this.hotelId = v;
});

taskSchema.virtual('category').get(function () {
  return this.department;
}).set(function (v) {
  this.department = v;
});

taskSchema.virtual('room').get(function () {
  return this.roomId;
}).set(function (v) {
  this.roomId = v;
});

taskSchema.virtual('serviceRequest').get(function () {
  return this.serviceRequestId;
}).set(function (v) {
  this.serviceRequestId = v;
});

taskSchema.virtual('reservation').get(function () {
  return this.reservationId;
}).set(function (v) {
  this.reservationId = v;
});

taskSchema.virtual('assignedStaff').get(function () {
  return this.assignedStaffId;
}).set(function (v) {
  this.assignedStaffId = v;
});

taskSchema.virtual('offeredToStaff').get(function () {
  return this.offeredTo;
}).set(function (v) {
  this.offeredTo = v;
});

taskSchema.virtual('completionNotes').get(function () {
  return this.completionNote;
}).set(function (v) {
  this.completionNote = v;
});

taskSchema.virtual('proofImageUrl').get(function () {
  return this.afterImageUrl;
}).set(function (v) {
  this.afterImageUrl = v;
});

taskSchema.index({ hotelId: 1, department: 1, status: 1, priority: 1, createdAt: 1 });
taskSchema.index({ hotelId: 1, assignedStaffId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema, 'tasks');
