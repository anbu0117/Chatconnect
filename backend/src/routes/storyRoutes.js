import express from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import {
  createStory,
  getStories,
  viewStory,
  likeStory,
  unlikeStory,
  deleteStory,
  addComment,
  deleteComment,
} from "../controllers/story.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", upload.single("media"), createStory);
router.get("/", getStories);
router.post("/:id/view", viewStory);
router.post("/:id/like", likeStory);
router.delete("/:id/like", unlikeStory);
router.post("/:id/comments", addComment);
router.delete("/:storyId/comments/:commentId", deleteComment);
router.delete("/:id", deleteStory);

export default router;
