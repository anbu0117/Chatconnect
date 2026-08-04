import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verifies the JWT stored in the httpOnly cookie and attaches the
 * authenticated user (minus password) to req.user. Blocks the request
 * with 401 if the token is missing, invalid, or the user no longer exists.
 */
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[authMiddleware] Error:", error.message);
    return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
};
