import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
const isPlaceholder =
  !rawApiUrl ||
  rawApiUrl.toLowerCase().includes("your-render-app") ||
  rawApiUrl.toLowerCase().includes("your-") ||
  rawApiUrl.toLowerCase().includes("chatconnect-backend");

const API_URL = !isPlaceholder
  ? rawApiUrl
  : (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api");

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly JWT cookie on every request
});
