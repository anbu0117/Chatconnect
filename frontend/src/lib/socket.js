import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === "development" ? "http://localhost:5001" : "/");

/**
 * Creates (but does not yet connect) a Socket.IO client for the given user.
 * autoConnect is false so the caller (authStore) controls exactly when the
 * socket connects/disconnects in step with login/logout.
 */
export const createSocket = (userId) =>
  io(SOCKET_URL, {
    query: { userId },
    withCredentials: true,
    autoConnect: false,
  });
