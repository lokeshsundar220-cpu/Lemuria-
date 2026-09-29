const User = require('./User');
const Hotel = require('./Hotel');
const RoomType = require('./RoomType');
const Staff = require('./Staff');
const Guest = require('./Guest');
const Room = require('./Room');
const Reservation = require('./Reservation');
const Task = require('./Task');
const TaskOffer = require('./TaskOffer');
const ServiceRequest = require('./ServiceRequest');
const EmergencyRequest = require('./EmergencyRequest');
const Notification = require('./Notification');
const Feedback = require('./Feedback');
const Inspection = require('./Inspection');
const DutyLog = require('./DutyLog');
const Counter = require('./Counter');
const AuditLog = require('./AuditLog');
const Otp = require('./Otp');

module.exports = {
  User,
  Hotel,
  RoomType,
  Staff,
  Guest,
  Room,
  Reservation,
  Task,
  TaskOffer,
  ServiceRequest,
  EmergencyRequest,
  Emergency: EmergencyRequest,
  Notification,
  Feedback,
  Inspection,
  DutyLog,
  Counter,
  AuditLog,
  Otp
};
