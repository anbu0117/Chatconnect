import Notification from "../models/Notification.js";
import { getIO } from "../socket/socket.js";

/**
 * Creates a notification in MongoDB and broadcasts it in real time via Socket.IO
 */
export const createNotification = async ({
  recipient,
  sender,
  type,
  title = "",
  message,
  relatedStoryId = null,
  relatedConversationId = null,
}) => {
  try {
    // Don't notify oneself
    if (String(recipient) === String(sender)) return null;

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedStoryId,
      relatedConversationId,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "username profileImage")
      .lean();

    // Real-time broadcast to recipient's socket room
    try {
      getIO().to(String(recipient)).emit("newNotification", populatedNotification);
    } catch (socketErr) {
      // Non-blocking
    }

    return populatedNotification;
  } catch (err) {
    console.error("[Notification] Failed to create notification:", err.message);
    return null;
  }
};
