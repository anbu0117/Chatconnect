import axios from "axios";

/**
 * Resolves the backend API base URL:
 * - Development: uses relative "/api" (proxied by Vite to http://localhost:5001)
 * - Production: uses VITE_API_URL (e.g. https://chatconnect-backend.onrender.com/api)
 *   If omitted, falls back to "/api" (same-origin or Netlify/Render proxy)
 */
const getBaseApiUrl = () => {
  // If running in browser and NOT on localhost/127.0.0.1 (i.e. on Render or any production domain):
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    const raw = import.meta.env.VITE_API_URL;
    // If an external production URL is explicitly provided and is NOT localhost or placeholder:
    if (
      raw &&
      !raw.includes("localhost") &&
      !raw.includes("127.0.0.1") &&
      !raw.includes("your-render-app") &&
      !raw.includes("your-backend")
    ) {
      const cleaned = raw.trim().replace(/\/+$/, "");
      return cleaned.endsWith("/api") ? cleaned : `${cleaned}/api`;
    }
    // In production single-service deployment (like Render), frontend and backend share same origin
    return "/api";
  }

  // Local development fallback
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseApiUrl(),
  withCredentials: true, // send httpOnly JWT cookies on every request
});

// Attach Authorization Bearer token header if token is stored in localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatconnect_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

