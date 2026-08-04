import { Server } from "socket.io";
import User from "../models/User.js";

let io;

// Maps userId -> socketId so we can target a specific user's socket
// (e.g. to deliver a new message or a typing indicator) even though
// a user could theoretically have multiple tabs/sockets open.
const userSocketMap = {};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== "undefined") {
      userSocketMap[userId] = socket.id;
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
