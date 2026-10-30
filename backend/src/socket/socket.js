import { Server } from "socket.io";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import {
  getCachedConversationId,
  getOrFindConversationId,
  setConversationCache,
} from "../utils/conversationCache.js";

let io;

// Maps userId -> Set of socketIds so users with multiple tabs/devices stay online
// and receive notifications on every open session seamlessly.
const userSocketMap = new Map();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
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
    let userId = socket.handshake.query?.userId || socket.handshake.auth?.userId;

    // Resilient fallback: extract userId from auth token if query is missing
    if (!userId || userId === "undefined" || userId === "null") {
      const token = socket.handshake.auth?.token;
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.userId) userId = String(decoded.userId);
        } catch {}
      }
    }

    if (userId && userId !== "undefined" && userId !== "null") {
      const strUserId = String(userId);
      socket.userId = strUserId;

      if (!userSocketMap.has(strUserId)) {
        userSocketMap.set(strUserId, new Set());
      }
      userSocketMap.get(strUserId).add(socket.id);

      // Join room for multi-device/multi-tab synchronized delivery
      socket.join(strUserId);
      console.log(`[Socket] User ${strUserId} connected (${socket.id}). Active sockets: ${userSocketMap.get(strUserId).size}`);

      // Mark the user online in DB
      User.findByIdAndUpdate(strUserId, { isOnline: true }).catch((err) =>
        console.error("[Socket] Failed to set isOnline:", err.message)
      );
    }

    // Broadcast current online user list to all connected clients
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

    // ---- Typing indicators ----
    socket.on("typing", ({ receiverId, senderId }) => {
      if (receiverId) {
        io.to(String(receiverId)).emit("typing", { senderId });
      }
    });

    socket.on("stopTyping", ({ receiverId, senderId }) => {
      if (receiverId) {
        io.to(String(receiverId)).emit("stopTyping", { senderId });
      }
    });

    // ---- Read receipts ----
    socket.on("messageSeen", ({ messageId, senderId }) => {
      if (senderId) {
        io.to(String(senderId)).emit("messageSeen", { messageId });
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

        // Emit to all sockets of receiver via user room
        io.to(message.receiverId.toString()).emit("messageEdited", message);

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

        // Emit to all sockets of receiver via user room
        io.to(receiverId).emit("messageDeleted", { messageId, conversationId });

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

        const strReceiverId = String(receiverId);
        const isReceiverOnline = userSocketMap.has(strReceiverId);

        // Pre-create message ID for zero-latency dispatch
        const messageId = new mongoose.Types.ObjectId();

        // 0ms In-Memory conversation resolution
        let conversationId = getCachedConversationId(senderId, strReceiverId);
        if (!conversationId) {
          conversationId = await getOrFindConversationId(senderId, strReceiverId);
        }

        const messageDoc = {
          _id: messageId,
          conversationId,
          senderId,
          receiverId: strReceiverId,
          text: text ? String(text).trim() : "",
          imageUrl: imageUrl || "",
          isForwarded: Boolean(data?.isForwarded),
          status: isReceiverOnline ? "delivered" : "sent",
          createdAt: new Date().toISOString(),
        };

        // 1. INSTANT real-time delivery to receiver (<2ms) via user room
        if (isReceiverOnline) {
          io.to(strReceiverId).emit("newMessage", messageDoc);
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
      const strUserId = socket.userId;
      console.log(`[Socket] User ${strUserId} disconnected (${socket.id})`);

      if (strUserId && userSocketMap.has(strUserId)) {
        const sockets = userSocketMap.get(strUserId);
        sockets.delete(socket.id);
        // Only mark offline if user has no remaining open tabs/windows
        if (sockets.size === 0) {
          userSocketMap.delete(strUserId);
          try {
            await User.findByIdAndUpdate(strUserId, {
              isOnline: false,
              lastSeen: new Date(),
            });
          } catch (err) {
            console.error("[Socket] Failed to update lastSeen:", err.message);
          }
        }
      }

      // Broadcast fresh online users list to all clients
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    });
  });

  return io;
};

export const getReceiverSocketId = (userId) => {
  const sockets = userSocketMap.get(String(userId));
  return sockets && sockets.size > 0 ? Array.from(sockets)[0] : null;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized. Call initSocket(httpServer) first.");
  return io;
};
