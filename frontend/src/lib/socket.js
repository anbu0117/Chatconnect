import { io } from "socket.io-client";

/**
 * Resolves the Socket.IO server URL:
 * - Development: uses relative "/" (proxied by Vite to http://localhost:5001)
 * - Production: uses VITE_SOCKET_URL (e.g. https://chatconnect-backend.onrender.com)
 *   If not specified, derives from VITE_API_URL by stripping "/api"
 */
const getSocketUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    const raw = import.meta.env.VITE_SOCKET_URL;
    if (
      raw &&
      !raw.includes("localhost") &&
      !raw.includes("127.0.0.1") &&
      !raw.includes("your-render-app") &&
      !raw.includes("your-backend")
    ) {
      return raw.trim().replace(/\/+$/, "");
    }

    const rawApi = import.meta.env.VITE_API_URL;
    if (
      rawApi &&
      !rawApi.includes("localhost") &&
      !rawApi.includes("127.0.0.1") &&
      !rawApi.includes("your-render-app") &&
      !rawApi.includes("your-backend")
    ) {
      return rawApi.trim().replace(/\/+$/, "").replace(/\/api$/, "");
    }

    // Single-service deployment on Render: connect to same host
    return window.location.origin;
  }

  // Development
  return "/";
};

const SOCKET_URL = getSocketUrl();

/**
 * Creates (but does not yet connect) a Socket.IO client for the given user.
 * autoConnect is false so the caller (authStore) controls exactly when the
 * socket connects/disconnects in step with login/logout.
 */
export const createSocket = (userId) => {
  const token = localStorage.getItem("chatconnect_token");
  return io(SOCKET_URL, {
    query: { userId },
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10000,
  });
};
