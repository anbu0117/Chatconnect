import { io } from "socket.io-client";

/**
 * Resolves the Socket.IO server URL:
 * - Development: uses relative "/" (proxied by Vite to http://localhost:5001)
 * - Production: uses VITE_SOCKET_URL (e.g. https://chatconnect-backend.onrender.com)
 *   If not specified, derives from VITE_API_URL by stripping "/api"
 */
const getSocketUrl = () => {
  if (import.meta.env.MODE === "development") {
    return "/";
  }

  const raw = import.meta.env.VITE_SOCKET_URL;
  if (raw && !raw.includes("your-render-app") && !raw.includes("your-backend")) {
    return raw.trim().replace(/\/+$/, "");
  }

  const rawApi = import.meta.env.VITE_API_URL;
  if (rawApi && !rawApi.includes("your-render-app") && !rawApi.includes("your-backend")) {
    return rawApi.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  }

  return "/";
};

/**
 * Creates (but does not yet connect) a Socket.IO client for the given user.
 * autoConnect is false so the caller (authStore) controls exactly when the
 * socket connects/disconnects in step with login/logout.
 */
export const createSocket = (userId) =>
  io(SOCKET_URL, {
    query: { userId },
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10000,
  });
