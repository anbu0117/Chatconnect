import { RateLimiterMemory } from 'rate-limiter-flexible';

// Auth Limiter: Exponential backoff instead of hard lockout.
// Tracks per-IP and per-account (email).
const authLimiterFlexible = new RateLimiterMemory({
  points: parseInt(process.env.AUTH_RATE_LIMIT_POINTS) || 1000, // Very high threshold to avoid hard lockouts
  duration: parseInt(process.env.AUTH_RATE_LIMIT_DURATION) || 60 * 60, // 1 hour window
});

export const authLimiter = async (req, res, next) => {
  const key = req.ip + (req.body.email ? `_${req.body.email}` : '');
  try {
    const rateLimiterRes = await authLimiterFlexible.consume(key);
    // Calculate exponential backoff delay based on consecutive requests
    // Starts at 100ms and doubles every request, capped at 10 seconds.
    const delayMs = Math.min(100 * Math.pow(2, rateLimiterRes.consumedPoints - 1), 10000);
    
    if (delayMs > 100) {
      setTimeout(() => next(), delayMs);
    } else {
      next();
    }
  } catch (rejRes) {
    // Only hit if they exceed 1000 requests in an hour (hard limit fallback)
    res.status(429).json({ message: "Too many authentication attempts, please try again later" });
  }
};

// Global API Limiter: Moderate limits for public endpoints
const apiLimiterFlexible = new RateLimiterMemory({
  points: parseInt(process.env.API_RATE_LIMIT_POINTS) || 100, // 100 requests
  duration: parseInt(process.env.API_RATE_LIMIT_DURATION) || 15 * 60, // per 15 minutes
});

export const apiLimiter = (req, res, next) => {
  apiLimiterFlexible.consume(req.ip)
    .then(() => next())
    .catch(() => {
      res.status(429).json({ message: "Too many requests from this IP, please try again later" });
    });
};

// Authenticated Actions Limiter: Looser limits
const userActionLimiterFlexible = new RateLimiterMemory({
  points: parseInt(process.env.USER_RATE_LIMIT_POINTS) || 500, // 500 requests
  duration: parseInt(process.env.USER_RATE_LIMIT_DURATION) || 15 * 60, // per 15 minutes
});

export const userActionLimiter = (req, res, next) => {
  const key = req.user?._id ? String(req.user._id) : req.ip;
  userActionLimiterFlexible.consume(key)
    .then(() => next())
    .catch(() => {
      res.status(429).json({ message: "Rate limit exceeded for user actions" });
    });
};
