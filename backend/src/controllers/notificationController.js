import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username profileImage")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    ).populate("sender", "username profileImage");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({ success: true, notification, unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications for the authenticated user as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

    res.status(200).json({ success: true, message: "All notifications marked as read", unreadCount: 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const result = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!result) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({ success: true, message: "Notification deleted", notificationId: id, unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications
 * Clear all notifications for the authenticated user
 */
export const clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ recipient: userId });

    res.status(200).json({ success: true, message: "All notifications cleared", unreadCount: 0 });
  } catch (error) {
    next(error);
  }
};
