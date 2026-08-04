import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageSkeleton from "./MessageSkeleton.jsx";

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
    </div>
  </div>
);

const ChatWindow = () => {
  const { selectedUser, setSelectedUser, messages, getMessages, isMessagesLoading, typingUserIds } =
    useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();
  const bottomRef = useRef(null);

  // Find (or lazily rely on backend to create) the conversation for this pair.
  // We fetch messages by conversationId once the backend returns it via
  // getConversations; for a freshly-started chat there may be no history yet.
  const { conversations } = useChatStore();
  const conversation = conversations.find((c) =>
    c.participants.some((p) => p._id === selectedUser?._id)
  );

  useEffect(() => {
    if (conversation?._id) {
      getMessages(conversation._id);
    } else {
      useChatStore.setState({ messages: [] });
    }
  }, [selectedUser?._id, conversation?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUserIds]);

  // Mark visible messages from the other user as seen
  useEffect(() => {
    if (!socket || !selectedUser) return;
    messages
      .filter((m) => m.senderId === selectedUser._id && m.status !== "seen")
      .forEach((m) => {
        socket.emit("messageSeen", { messageId: m._id, senderId: selectedUser._id });
      });
  }, [messages, selectedUser, socket]);

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUserIds.includes(selectedUser._id);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <button
          onClick={() => setSelectedUser(null)}
          className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <img
          src={selectedUser.profileImage || "/default-avatar.svg"}
          alt={selectedUser.username}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-semibold">{selectedUser.username}</p>
          <p className="text-xs text-neutral-500">{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {isMessagesLoading ? (
        <MessageSkeleton />
      ) : (
        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="mt-8 text-center text-sm text-neutral-400">
              No messages yet — say hi to {selectedUser.username}!
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwnMessage={message.senderId === authUser._id}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatWindow;
