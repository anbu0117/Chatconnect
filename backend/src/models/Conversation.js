import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

// Speeds up "find conversation between these two users" lookups
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
