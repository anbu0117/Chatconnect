import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { getReceiverSocketId, getIO } from "../socket/socket.js";

/**
 * GET /api/messages/:conversationId
 * Returns the full message history for a conversation, oldest first.
 * Verifies the requesting user is actually a participant before returning data.
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    if (!conversation.participants.some((p) => p.equals(req.user._id))) {
      return res.status(403).json({ message: "Not authorized to view this conversation" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

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

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: [senderId, receiverId] });
    }

    let imageUrl = "";
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "chatconnect/messages");
      imageUrl = result.secure_url;
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId,
      text: text || "",
      imageUrl,
      status: "sent",
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    // Real-time delivery: push straight to the receiver's socket if connected
    const receiverSocketId = getReceiverSocketId(receiverId.toString());
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("newMessage", message);
      message.status = "delivered";
      await message.save();
    }

    res.status(201).json(message);
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

    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
};
