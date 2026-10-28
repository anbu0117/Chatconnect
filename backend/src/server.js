import express from "express";
import http from "http";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import { initSocket } from "./socket/socket.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { validate } from "./middleware/validate.js";
import { registerSchema, loginSchema } from "./validations/authValidation.js";
import { login, register, logout, checkAuth } from "./controllers/authController.js";

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
  // Allow all Netlify and Render deployments as well as localhost on any port
  if (/^https:\/\/.*\.onrender\.com$/.test(cleanOrigin)) return true;
  if (/^https:\/\/.*\.netlify\.app$/.test(cleanOrigin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  return false;
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
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- Routes ----
// Mount auth routes on both /api/auth and /auth
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// Mount user, message, and story routes on both /api/* and /*
app.use("/api/users", userRoutes);
app.use("/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/messages", messageRoutes);
app.use("/api/stories", storyRoutes);
app.use("/stories", storyRoutes);

// Direct convenience aliases for auth endpoints (prevents 404 if called without /auth or /api)
app.get("/api/check", checkAuth);
app.get("/check", checkAuth);
app.post("/api/login", authLimiter, validate(loginSchema), login);
app.post("/login", authLimiter, validate(loginSchema), login);
app.post("/api/register", authLimiter, validate(registerSchema), register);
app.post("/register", authLimiter, validate(registerSchema), register);
app.post("/api/logout", logout);
app.post("/logout", logout);

// ---- Serve frontend build if present (for single-service deploy or direct browser access) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(__dirname, "../../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "dist"),
];

const frontendDist = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html")));

if (frontendDist) {
  const indexHtmlPath = path.join(frontendDist, "index.html");
  console.log(`[Server] Serving frontend SPA from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    // Let API routes pass through to 404 handler
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(indexHtmlPath);
  });
} else {
  // Graceful fallback for browser requests if frontend dist is missing
  app.get(["/", "/login", "/register", "/profile"], (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>ChatConnect Backend</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; max-width: 480px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
            h1 { color: #6366f1; font-size: 24px; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            code { background: #0f172a; padding: 3px 8px; border-radius: 6px; color: #38bdf8; font-size: 13px; }
            a { color: #6366f1; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>ChatConnect Backend API</h1>
            <p>The backend server is running on port ${PORT}.</p>
            <p>To run the frontend in development, start Vite on <a href="http://localhost:5173">http://localhost:5173</a>.</p>
            <p>To serve the full frontend SPA from this server, run <code>npm run build</code>.</p>
          </div>
        </body>
      </html>
    `);
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
