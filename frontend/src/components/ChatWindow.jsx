import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, Unlock, Shield } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";
import { axiosInstance } from "../lib/axios.js";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageSkeleton from "./MessageSkeleton.jsx";
import toast from "react-hot-toast";

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
  const {
    selectedUser,
    setSelectedUser,
    messages,
    getMessages,
    isMessagesLoading,
    typingUserIds,
    setPinModalOpen,
    isLockedChatsUnlocked,
    toggleLockConversation,
  } = useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();
  const bottomRef = useRef(null);

  const [isChatLocked, setIsChatLocked] = useState(false);
  const [hasChatPin, setHasChatPin] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);

  // Check lock status for the selected contact
  const checkLockStatus = async () => {
    if (!selectedUser?._id) return;
    try {
      const res = await axiosInstance.get(`/messages/lock/status/${selectedUser._id}`);
      const locked = Boolean(res.data?.isLocked);
      setIsChatLocked(locked);
      setHasChatPin(Boolean(res.data?.hasChatPin));
      if (res.data?.conversationId) {
        setActiveConvId(res.data.conversationId);
      }
      // If conversation is locked and user hasn't unlocked with PIN:
      if (locked && !isLockedChatsUnlocked) {
        setIsAccessBlocked(true);
      } else {
        setIsAccessBlocked(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkLockStatus();
  }, [selectedUser?._id, isLockedChatsUnlocked]);

  // Fetch messages directly for the active selected contact.
  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id).catch((err) => {
        if (err?.response?.status === 423) {
          setIsAccessBlocked(true);
        }
      });
    } else {
      useChatStore.setState({ messages: [] });
    }
  }, [selectedUser?._id, isLockedChatsUnlocked, getMessages]);

  useEffect(() => {
    if (!isAccessBlocked) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUserIds, isAccessBlocked]);

  // Mark visible messages from the other user as seen
  useEffect(() => {
    if (!socket || !selectedUser || isAccessBlocked) return;
    messages
      .filter(
        (m) =>
          String(m.senderId?._id || m.senderId) === String(selectedUser._id) &&
          m.status !== "seen"
      )
      .forEach((m) => {
        socket.emit("messageSeen", { messageId: m._id, senderId: selectedUser._id });
      });
  }, [messages, selectedUser, socket, isAccessBlocked]);

  const handleToggleLock = async () => {
    if (!hasChatPin) {
      // User must first set a PIN
      setPinModalOpen(true, "set", activeConvId || selectedUser._id);
      return;
    }
    if (!activeConvId) {
      toast.error("Please send a message first to lock this conversation");
      return;
    }
    try {
      const res = await toggleLockConversation(activeConvId);
      setIsChatLocked(res.isLocked);
    } catch {}
  };

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUserIds.includes(selectedUser._id);

  return (
    <div className="flex flex-1 flex-col h-full bg-white dark:bg-surface-dark">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-center gap-3 min-w-0">
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
            className="h-10 w-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {selectedUser.username}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isOnline ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        {/* Lock Chat Option */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isChatLocked
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-sm"
                : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            }`}
            title={isChatLocked ? "Unlock conversation" : "Lock conversation with PIN"}
          >
            {isChatLocked ? (
              <Lock className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Unlock className="h-3.5 w-3.5 text-neutral-400" />
            )}
            <span className="hidden sm:inline">
              {isChatLocked ? "Locked" : "Lock Chat"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isAccessBlocked ? (
        /* Blocked / Protected Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-1 ring-amber-500/20 shadow-md">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            This Chat is Locked
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-xs leading-relaxed">
            This private conversation is protected by a PIN. Enter your PIN to view the messages.
          </p>
          <button
            type="button"
            onClick={() => setPinModalOpen(true, "unlock")}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md transition active:scale-95"
          >
            <Unlock className="h-4 w-4" />
            <span>Enter PIN to Unlock</span>
          </button>
        </div>
      ) : isMessagesLoading ? (
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
              isOwnMessage={
                String(message.senderId?._id || message.senderId) ===
                String(authUser?._id)
              }
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}

      {!isAccessBlocked && <MessageInput />}
    </div>
  );
};

export default ChatWindow;
