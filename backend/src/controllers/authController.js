import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

/**
 * POST /api/auth/register
 * Creates a new user account and logs them in immediately by issuing a JWT cookie.
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are all required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const user = await User.create({ username, email, password });

    generateToken(user._id, res);

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      bio: user.bio,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    generateToken(user._id, res);

    user.isOnline = true;
    await user.save();

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      bio: user.bio,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clears the JWT cookie. Client-side, the socket connection should also be closed.
 */
export const logout = async (req, res, next) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/check
 * Used by the frontend on app load to check whether the httpOnly cookie
 * still represents a valid session, and to fetch the current user.
 */
export const checkAuth = (req, res) => {
  res.status(200).json(req.user);
};
