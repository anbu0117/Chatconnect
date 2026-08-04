import express from "express";
import {
  getMessages,
  sendMessage,
  getConversations,
} from "../controllers/messageController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.use(protectRoute);

router.get("/conversations", getConversations);
router.get("/:conversationId", getMessages);
router.post("/send/:receiverId", upload.single("image"), sendMessage);

export default router;
