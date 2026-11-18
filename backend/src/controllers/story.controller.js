import mongoose from "mongoose";
import Story from "../models/Story.js";
import Conversation from "../models/Conversation.js";
import { uploadBufferToCloudinary, deleteMediaFromCloudinary } from "../utils/cloudinaryUpload.js";
import { getIO } from "../socket/socket.js";

/**
 * POST /api/stories
 * Upload a new story (image or video)
 */
export const createStory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Media file is required" });
    }

    // Determine if it's an image or video based on mimetype
    const isVideo = req.file.mimetype.startsWith("video/");
    const mediaType = isVideo ? "video" : "image";

    let mediaUrl = "";
    let cloudinaryPublicId = "";

    try {
      // Upload to Cloudinary with auto resource_type so it handles videos properly
      const result = await uploadBufferToCloudinary(req.file.buffer, "chatconnect/stories", "auto");
      mediaUrl = result.secure_url;
      cloudinaryPublicId = result.public_id || "";
    } catch (uploadErr) {
      console.warn("[Story Upload] Cloudinary upload unavailable, falling back to data URI:", uploadErr.message);
      // Seamless fallback to base64 data URI so user is never blocked
      const mimeType = req.file.mimetype || (isVideo ? "video/mp4" : "image/jpeg");
      mediaUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
    }

    const story = await Story.create({
      userId,
      mediaUrl,
      mediaType,
      cloudinaryPublicId,
      caption: caption || "",
      viewers: [],
      likes: [],
      comments: [],
    });

    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stories
 * Fetch active (non-expired) stories from users you have chatted with,
 * plus your own active stories, grouped by user.
 */
export const getStories = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Find all users we have a conversation with
    const conversations = await Conversation.find({ participants: userId });
    
    // Extract unique user IDs from conversations
    const userIds = new Set();
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => {
        if (p.toString() !== userId.toString()) {
          userIds.add(p.toString());
        }
      });
    });

    // Add our own ID to see our own stories
    userIds.add(userId.toString());

    // 2. Find active stories for these users
    // Note: TTL index handles physical deletion, but we also filter in query just in case
    const activeStories = await Story.find({
      userId: { $in: Array.from(userIds) },
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "username profileImage")
      .populate("comments.userId", "username profileImage")
      .sort({ createdAt: 1 }); // Oldest stories first so they play in order

    // 3. Group stories by user
    const groupedStories = {};
    activeStories.forEach((story) => {
      const uId = story.userId._id.toString();
      if (!groupedStories[uId]) {
        groupedStories[uId] = {
          user: story.userId,
          stories: [],
        };
      }
      groupedStories[uId].stories.push(story);
    });

    // Convert object map to array
    const result = Object.values(groupedStories);

    // Sort the result: put the current user's stories first, then sort others by latest story update
    result.sort((a, b) => {
      if (a.user._id.toString() === userId.toString()) return -1;
      if (b.user._id.toString() === userId.toString()) return 1;
      
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return new Date(bLatest) - new Date(aLatest);
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stories/:id/view
 * Mark a story as viewed by the current user
 */
export const viewStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const story = await Story.findById(id);
    
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Don't add to viewers if it's our own story
    if (story.userId.toString() === userId.toString()) {
      return res.status(200).json(story);
    }

    // Check if already viewed
    const alreadyViewed = story.viewers.some((v) => v.userId.toString() === userId.toString());
    
    if (!alreadyViewed) {
      story.viewers.push({ userId, viewedAt: new Date() });
      await story.save();
    }

    res.status(200).json(story);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stories/:id/like
 * Like a story. Stores unique user ID in MongoDB. Prevents duplicate likes.
 */
export const likeStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Check if story is already expired
    if (story.expiresAt && new Date(story.expiresAt) <= new Date()) {
      return res.status(410).json({ message: "Story has expired" });
    }

    // Atomic $addToSet ensures unique user IDs and prevents duplicates
    const updatedStory = await Story.findByIdAndUpdate(
      id,
      { $addToSet: { likes: userId } },
      { new: true }
    );

    res.status(200).json({
      message: "Story liked successfully",
      likes: updatedStory.likes || [],
      likesCount: updatedStory.likes ? updatedStory.likes.length : 0,
      story: updatedStory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/stories/:id/like
 * Unlike a story. Removes the user ID from the story's likes in MongoDB.
 */
export const unlikeStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Atomic $pull removes user ID from likes array
    const updatedStory = await Story.findByIdAndUpdate(
      id,
      { $pull: { likes: userId } },
      { new: true }
    );

    res.status(200).json({
      message: "Story unliked successfully",
      likes: updatedStory.likes || [],
      likesCount: updatedStory.likes ? updatedStory.likes.length : 0,
      story: updatedStory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/stories/:id
 * Delete a story.
 * CRITICAL SECURITY RULE: Only the original owner who uploaded the story can delete it.
 * Verifies ownership using req.user._id from the authenticated JWT session.
 * Rejects unauthorized attempts with HTTP 403 Forbidden.
 */
export const deleteStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Security check: Only original creator can delete their story
    if (story.userId.toString() !== authenticatedUserId.toString()) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this story",
      });
    }

    // Delete associated media from Cloudinary if hosted there
    if (story.mediaUrl && story.mediaUrl.includes("cloudinary.com")) {
      try {
        await deleteMediaFromCloudinary(story.mediaUrl, story.mediaType, story.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn("[Cloudinary Delete Warning]", cloudErr.message);
      }
    }

    // Delete the story document
    await Story.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Story deleted successfully",
      storyId: id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stories/:id/comments
 * Add a comment to a story.
 * Validates text length, prevents empty submissions, ensures story is active.
 */
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 500) {
      return res.status(400).json({ message: "Comment cannot exceed 500 characters" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Check if story is already expired
    if (story.expiresAt && new Date(story.expiresAt) <= new Date()) {
      return res.status(410).json({ message: "Story has expired" });
    }

    const commentDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      text: trimmedText,
      createdAt: new Date(),
    };

    story.comments.push(commentDoc);
    await story.save();

    // Populate user info for the newly created comment
    const populatedStory = await Story.findById(id)
      .populate("comments.userId", "username profileImage")
      .select("comments");

    const createdComment = populatedStory.comments.id(commentDoc._id);

    // Broadcast real-time comment to other active viewers
    try {
      getIO().emit("storyCommentAdded", {
        storyId: id,
        comment: createdComment,
      });
    } catch (socketErr) {
      // Non-blocking socket broadcast
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: createdComment,
      comments: populatedStory.comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/stories/:storyId/comments/:commentId
 * Delete a comment on a story.
 * SECURITY RULE:
 * - Only the comment author can delete their own comment.
 * - OR the story owner can delete any comment on their story (moderation).
 * Returns HTTP 403 Forbidden for unauthorized requests.
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { storyId, commentId } = req.params;
    const authenticatedUserId = req.user._id;

    if (!mongoose.isValidObjectId(storyId) || !mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: "Invalid ID parameter" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const comment = story.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isCommentAuthor = comment.userId.toString() === authenticatedUserId.toString();
    const isStoryOwner = story.userId.toString() === authenticatedUserId.toString();

    if (!isCommentAuthor && !isStoryOwner) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this comment",
      });
    }

    story.comments.pull({ _id: commentId });
    await story.save();

    // Broadcast real-time comment deletion
    try {
      getIO().emit("storyCommentDeleted", {
        storyId,
        commentId,
      });
    } catch (socketErr) {
      // Non-blocking socket broadcast
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      storyId,
      commentId,
    });
  } catch (error) {
    next(error);
  }
};
