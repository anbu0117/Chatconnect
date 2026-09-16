import { io } from "socket.io-client";

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;
const isPlaceholder =
  !rawSocketUrl ||
  rawSocketUrl.toLowerCase().includes("your-render-app") ||
  rawSocketUrl.toLowerCase().includes("your-") ||
  rawSocketUrl.toLowerCase().includes("chatconnect-backend");

const SOCKET_URL = !isPlaceholder
  ? rawSocketUrl
  : (import.meta.env.MODE === "development" ? "http://localhost:5001" : "/");

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
