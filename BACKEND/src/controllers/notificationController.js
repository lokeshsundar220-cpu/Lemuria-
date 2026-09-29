const { Notification } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const getMyNotifications = async (req, res, next) => {
  try {
    const recipientId = req.staff ? req.staff._id : req.guest ? req.guest._id : req.user._id;

    const notifications = await Notification.find({
      $or: [
        { recipientId: recipientId },
        { recipientUser: recipientId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      $or: [
        { recipientId: recipientId },
        { recipientUser: recipientId }
      ],
      read: false
    });

    return successResponse(res, 200, 'Notifications fetched', {
      notifications,
      unreadCount
    });
  } catch (error) {
    return next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipientId = req.staff ? req.staff._id : req.guest ? req.guest._id : req.user._id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { recipientId: recipientId },
          { recipientUser: recipientId }
        ]
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    return successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    return next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const recipientId = req.staff ? req.staff._id : req.guest ? req.guest._id : req.user._id;

    await Notification.updateMany(
      {
        $or: [
          { recipientId: recipientId },
          { recipientUser: recipientId }
        ],
        read: false
      },
      { read: true }
    );

    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
