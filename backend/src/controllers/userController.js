import User from "../models/User.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

/**
 * GET /api/users?search=alice
 * Returns all users except the logged-in one. Supports a simple
 * case-insensitive username search for the sidebar search box.
 */
export const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;

    const filter = { _id: { $ne: req.user._id } };
    if (search) {
      filter.username = { $regex: search, $options: "i" };
    }

    const users = await User.find(filter)
      .select("username email profileImage bio isOnline lastSeen")
      .sort({ username: 1 });

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile
 * Updates bio and/or profile image. Image comes in as multipart/form-data
 * via multer (memory storage) and is streamed to Cloudinary.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.bio === "string") {
      updates.bio = req.body.bio.slice(0, 160);
    }

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        "chatconnect/profile_images"
      );
      updates.profileImage = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/password
 * Changes the current user's password after verifying the old one.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // pre-save hook will re-hash
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
