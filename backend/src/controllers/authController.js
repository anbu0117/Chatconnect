import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

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

/**
 * POST /api/auth/forgot-password
 * Generates a 6-digit OTP reset code valid for 15 minutes.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    // Send password reset email
    await sendEmail({
      to: user.email,
      subject: "ChatConnect — Password Reset Code",
      text: `Your password reset code for ChatConnect is: ${otp}. It will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
          <h2 style="color: #6366f1; text-align: center;">ChatConnect</h2>
          <h3 style="margin-top: 20px;">Password Reset Request</h3>
          <p>You requested to reset your ChatConnect account password. Use the following 6-digit verification code:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 6px; color: #1e293b; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px;">This code is valid for 15 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      message: "Password reset code sent to your email.",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Verifies OTP and resets the user password.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, reset code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      email,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordOTP +resetPasswordExpires");

    if (!user || !user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully. Please sign in with your new password." });
  } catch (error) {
    next(error);
  }
};

