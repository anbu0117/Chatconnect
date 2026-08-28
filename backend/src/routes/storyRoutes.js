import express from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import { createStory, getStories, viewStory } from "../controllers/story.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", upload.single("media"), createStory);
router.get("/", getStories);
router.post("/:id/view", viewStory);

export default router;
