import express from "express";
import http from "http";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import { initSocket } from "./socket/socket.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const requiredSecrets = ["MONGO_URI", "JWT_SECRET"];
for (const secret of requiredSecrets) {
  if (!process.env[secret]) {
    console.error(`[Fatal] Missing required environment variable: ${secret}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5001;

// ---- Core middleware ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(apiLimiter);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . operators from user input to block NoSQL injection
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
  return allowedOrigins.includes(cleanOrigin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin)
      if (!origin || isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stories", storyRoutes);

// ---- Serve frontend build in production (optional, single-service deploy) ----
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ---- Error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

// ---- Socket.IO (attached to the same HTTP server) ----
initSocket(httpServer);

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`[Server] ChatConnect backend running on port ${PORT}`);
  });
};

startServer();
