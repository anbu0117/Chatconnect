import axios from "axios";

/**
 * Resolves the backend API base URL:
 * - Development: uses relative "/api" (proxied by Vite to http://localhost:5001)
 * - Production: uses VITE_API_URL (e.g. https://chatconnect-backend.onrender.com/api)
 *   If omitted, falls back to "/api" (same-origin or Netlify/Render proxy)
 */
const getBaseApiUrl = () => {
  if (import.meta.env.MODE === "development") {
    return "/api";
  }

  const raw = import.meta.env.VITE_API_URL;
  if (!raw || raw.includes("your-render-app") || raw.includes("your-backend")) {
    return "/api";
  }

  const cleaned = raw.trim().replace(/\/+$/, "");
  return cleaned.endsWith("/api") ? cleaned : `${cleaned}/api`;
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

