import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import {
  getCachedConversationId,
  getOrFindConversationId,
  setConversationCache,
} from "../utils/conversationCache.js";

let io;

// Maps userId -> socketId so we can target a specific user's socket
// (e.g. to deliver a new message or a typing indicator) even though
// a user could theoretically have multiple tabs/sockets open.
const userSocketMap = {};

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const parseClientUrls = (urlStr) => {
  if (!urlStr) return [];
  return urlStr
    .split(",")
    .map((u) => u.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, ""))
    .filter(Boolean);
};

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...parseClientUrls(process.env.CLIENT_URL),
  ...parseClientUrls(process.env.RENDER_EXTERNAL_URL),
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/+$/, "");
  if (allowedOrigins.includes(cleanOrigin)) return true;
  if (/^https:\/\/.*\.onrender\.com$/.test(cleanOrigin)) return true;
  if (/^https:\/\/.*\.netlify\.app$/.test(cleanOrigin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  return false;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== "undefined") {
      userSocketMap[userId] = socket.id;
      socket.userId = userId;
      console.log(`[Socket] User ${userId} connected (${socket.id})`);

      // Mark the user online and broadcast the updated online list
      User.findByIdAndUpdate(userId, { isOnline: true }).catch((err) =>
        console.error("[Socket] Failed to set isOnline:", err.message)
      );
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ---- Typing indicators ----
    socket.on("typing", ({ receiverId, senderId }) => {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId });
      }
    });

    socket.on("stopTyping", ({ receiverId, senderId }) => {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { senderId });
      }
    });

    // ---- Read receipts ----
    // Client emits this when the receiver views a message; we relay it
    // back to the original sender so their UI can flip the tick to "seen".
    socket.on("messageSeen", ({ messageId, senderId }) => {
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageSeen", { messageId });
      }
    });

    // ---- Real-time Edit Message (<5ms) ----
    socket.on("editMessage", async ({ messageId, text }, ack) => {
      try {
        const currentUserId = socket.userId || userId;
        if (!messageId || !text?.trim()) return ack?.({ error: "Text cannot be empty" });

        const message = await Message.findById(messageId);
        if (!message) return ack?.({ error: "Message not found" });
        if (String(message.senderId) !== String(currentUserId)) {
          return ack?.({ error: "You can only edit your own messages" });
        }

        message.text = text.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        const receiverSocketId = userSocketMap[message.receiverId.toString()];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageEdited", message);
        }

        ack?.({ success: true, message });
      } catch (err) {
        console.error("[Socket] editMessage error:", err.message);
        ack?.({ error: err.message });
      }
    });

    // ---- Real-time Delete Message (<5ms) ----
    socket.on("deleteMessage", async ({ messageId }, ack) => {
      try {
        const currentUserId = socket.userId || userId;
        if (!messageId) return ack?.({ error: "Invalid message ID" });

        const message = await Message.findById(messageId);
        if (!message) return ack?.({ error: "Message not found" });
        if (String(message.senderId) !== String(currentUserId)) {
          return ack?.({ error: "You can only delete your own messages" });
        }

        const conversationId = message.conversationId;
        const receiverId = message.receiverId.toString();

        await Message.findByIdAndDelete(messageId);

        // Update conversation lastMessage if needed
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.lastMessage && conversation.lastMessage.equals(messageId)) {
          const prevMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
          conversation.lastMessage = prevMessage ? prevMessage._id : null;
          await conversation.save();
        }

        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageDeleted", { messageId, conversationId });
        }

        ack?.({ success: true, messageId, conversationId });
      } catch (err) {
        console.error("[Socket] deleteMessage error:", err.message);
        ack?.({ error: err.message });
      }
    });

    // ---- High-Speed Real-Time Message Transmission (<5ms) ----
    socket.on("sendMessage", async (data, ack) => {
      try {
        const { receiverId, text, imageUrl, tempId } = data || {};
        const senderId = socket.userId || userId;

        if (!senderId || !receiverId || (!text && !imageUrl)) {
          return ack?.({ error: "Message must contain text or image" });
        }

        const receiverSocketId = userSocketMap[receiverId];
        const isReceiverOnline = Boolean(receiverSocketId);

        // Pre-create message ID for zero-latency dispatch
        const messageId = new mongoose.Types.ObjectId();

        // 0ms In-Memory conversation resolution
        let conversationId = getCachedConversationId(senderId, receiverId);
        if (!conversationId) {
          conversationId = await getOrFindConversationId(senderId, receiverId);
        }

        const messageDoc = {
          _id: messageId,
          conversationId,
          senderId,
          receiverId,
          text: text ? String(text).trim() : "",
          imageUrl: imageUrl || "",
          isForwarded: Boolean(data?.isForwarded),
          status: isReceiverOnline ? "delivered" : "sent",
          createdAt: new Date().toISOString(),
        };

        // 1. INSTANT real-time delivery to receiver (<2ms)
        if (isReceiverOnline) {
          io.to(receiverSocketId).emit("newMessage", messageDoc);
        }

        // 2. INSTANT confirmation acknowledgment to sender (<2ms)
        ack?.({ success: true, message: messageDoc, tempId });

        // 3. Persist to MongoDB in background asynchronously without blocking message dispatch
        Promise.all([
          Message.create(messageDoc),
          Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: messageId,
            updatedAt: new Date(),
          }),
        ]).catch((dbErr) => {
          console.error("[Socket] Background message save error:", dbErr.message);
        });
      } catch (err) {
        console.error("[Socket] sendMessage error:", err.message);
        ack?.({ error: err.message });
      }
    });

    // ---- Disconnect ----
    socket.on("disconnect", async () => {
      console.log(`[Socket] User ${userId} disconnected (${socket.id})`);

      if (userId && userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];

        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error("[Socket] Failed to update lastSeen:", err.message);
        }
      }

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized. Call initSocket(httpServer) first.");
  return io;
};
