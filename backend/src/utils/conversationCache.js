import Conversation from "../models/Conversation.js";

// In-memory conversation ID cache: "userId1:userId2" -> conversation ObjectId
const cache = new Map();

export const getConvKey = (id1, id2) => [String(id1), String(id2)].sort().join(":");

export const getCachedConversationId = (id1, id2) => {
  return cache.get(getConvKey(id1, id2)) || null;
};

export const setConversationCache = (id1, id2, conversationId) => {
  if (id1 && id2 && conversationId) {
    cache.set(getConvKey(id1, id2), conversationId);
  }
};

export const getOrFindConversationId = async (id1, id2) => {
  const key = getConvKey(id1, id2);
  const cachedId = cache.get(key);
  if (cachedId) {
    return cachedId;
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [id1, id2], $size: 2 },
  }).select("_id");

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [id1, id2],
    });
  }

  cache.set(key, conversation._id);
  return conversation._id;
};
