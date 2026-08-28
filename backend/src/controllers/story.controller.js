import Story from "../models/Story.js";
import Conversation from "../models/Conversation.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

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

    // Upload to Cloudinary with auto resource_type so it handles videos properly
    const result = await uploadBufferToCloudinary(req.file.buffer, "chatconnect/stories", "auto");

    const story = await Story.create({
      userId,
      mediaUrl: result.secure_url,
      mediaType,
      caption: caption || "",
      viewers: [],
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
