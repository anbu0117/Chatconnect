import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { getReceiverSocketId, getIO } from "../socket/socket.js";
import {
  getCachedConversationId,
  getOrFindConversationId,
  setConversationCache,
} from "../utils/conversationCache.js";

/**
 * GET /api/messages/:conversationId
 * Returns the full message history for a conversation or user pair, oldest first.
 * Supports both conversation ID and other user's ID for instant lookups.
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    let convId = null;
    let isAuthorized = true;

    // Check if conversationId is cached as (currentUserId : targetUserId)
    const cachedId = getCachedConversationId(req.user._id, conversationId);
    if (cachedId) {
      convId = cachedId;
    } else {
      // Direct conversation ID check
      let conversation = await Conversation.findById(conversationId).select("_id participants").lean();

      if (!conversation) {
        // Fallback: check if conversationId is the other participant's user ID
        conversation = await Conversation.findOne({
          participants: { $all: [req.user._id, conversationId], $size: 2 },
        }).select("_id participants").lean();

        if (conversation) {
          setConversationCache(req.user._id, conversationId, conversation._id);
        }
      }

      if (!conversation) {
        // No conversation between these users yet -> return empty message list immediately
        return res.status(200).json([]);
      }

      isAuthorized = conversation.participants.some(
        (p) => String(p?._id || p) === String(req.user._id)
      );
      convId = conversation._id;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to view this conversation" });
    }

    const messages = await Message.find({ conversationId: convId })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messages/send/:receiverId
 * Finds (or creates) the 1:1 conversation between the sender and receiver,
 * saves the message (text and/or image), updates the conversation's
 * lastMessage, and emits it in real time to the receiver if they're online.
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }
    if (!text && !req.file) {
      return res.status(400).json({ message: "Message must contain text or an image" });
    }
    if (receiverId === senderId.toString()) {
      return res.status(400).json({ message: "Cannot send a message to yourself" });
    }

    let conversationId = getCachedConversationId(senderId, receiverId);
    if (!conversationId) {
      conversationId = await getOrFindConversationId(senderId, receiverId);
    }

    let imageUrl = "";
    if (req.file) {
      try {
        const result = await uploadBufferToCloudinary(req.file.buffer, "chatconnect/messages");
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.warn("[Cloudinary] Message image upload failed, falling back to base64:", uploadErr.message);
        const mimeType = req.file.mimetype || "image/jpeg";
        imageUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
      }
    } else if (typeof req.body.imageUrl === "string" && req.body.imageUrl.trim()) {
      imageUrl = req.body.imageUrl.trim();
    }

    // Determine receiver status upfront to avoid redundant second database write
    const receiverSocketId = getReceiverSocketId(receiverId.toString());
    const isReceiverOnline = Boolean(receiverSocketId);

    const messageId = new mongoose.Types.ObjectId();
    const messageDoc = {
      _id: messageId,
      conversationId,
      senderId,
      receiverId,
      text: text ? String(text).trim() : "",
      imageUrl,
      isForwarded: Boolean(req.body.isForwarded === true || req.body.isForwarded === "true"),
      status: isReceiverOnline ? "delivered" : "sent",
      createdAt: new Date().toISOString(),
    };

    // 1. Emit to receiver instantly (<5ms)
    if (isReceiverOnline) {
      try {
        getIO().to(receiverSocketId).emit("newMessage", messageDoc);
      } catch (socketErr) {
        console.error("[Socket] Failed to emit newMessage:", socketErr.message);
      }
    }

    // 2. Return HTTP response to sender immediately (<5ms)
    res.status(201).json(messageDoc);

    // 3. Persist to MongoDB in background asynchronously
    Promise.all([
      Message.create(messageDoc),
      Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: messageId,
        updatedAt: new Date(),
      }),
    ]).catch((err) => {
      console.error("[DB] Background message save error:", err.message);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messages/conversations
 * Returns all conversations for the logged-in user, populated with the
 * other participant's public info and the last message, sorted by recency.
 * Powers the sidebar list.
 */
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "username profileImage isOnline lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    // Warm up in-memory conversation cache for instant 0ms routing
    conversations.forEach((conv) => {
      if (conv.participants?.length === 2) {
        setConversationCache(conv.participants[0]._id, conv.participants[1]._id, conv._id);
      }
    });

    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/messages/:messageId
 * Allows the sender to edit their sent message text.
 */
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Broadcast update to receiver if online
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      try {
        getIO().to(receiverSocketId).emit("messageEdited", message);
      } catch (err) {
        console.error("[Socket] Failed to emit messageEdited:", err.message);
      }
    }

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/messages/:messageId
 * Allows sender to delete their sent message.
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    const conversationId = message.conversationId;
    const receiverId = message.receiverId.toString();

    await Message.findByIdAndDelete(messageId);

    // Update conversation lastMessage if this message was the latest one
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage && conversation.lastMessage.equals(messageId)) {
      const prevMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
      conversation.lastMessage = prevMessage ? prevMessage._id : null;
      await conversation.save();
    }

    // Broadcast deletion to receiver if online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      try {
        getIO().to(receiverSocketId).emit("messageDeleted", { messageId, conversationId });
      } catch (err) {
        console.error("[Socket] Failed to emit messageDeleted:", err.message);
      }
    }

    res.status(200).json({ success: true, messageId, conversationId });
  } catch (error) {
    next(error);
  }
};
