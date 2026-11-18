import mongoose from "mongoose";

const lockedChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

lockedChatSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

const LockedChat = mongoose.model("LockedChat", lockedChatSchema);
export default LockedChat;
