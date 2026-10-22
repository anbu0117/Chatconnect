import React, { useState, useEffect } from "react";
import { X, Search, Forward, Check, Send, Loader2 } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";

const ForwardModal = () => {
  const { forwardingMessage, setForwardingMessage, forwardMessage, users, getUsers } =
    useChatStore();
  const { authUser } = useAuthStore();

  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sentMap, setSentMap] = useState({});

  useEffect(() => {
    if (forwardingMessage) {
      getUsers("");
      setSelectedUserIds([]);
      setSentMap({});
      setSearch("");
    }
  }, [forwardingMessage, getUsers]);

  if (!forwardingMessage) return null;

  const filteredUsers = users.filter((u) => {
    if (u._id === authUser?._id) return false;
    if (!search.trim()) return true;
    return u.username?.toLowerCase().includes(search.toLowerCase().trim());
  });

  const toggleSelectUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleInstantForward = async (targetUserId) => {
    if (sentMap[targetUserId] || isSending) return;
    setIsSending(true);
    try {
      await forwardMessage([targetUserId], forwardingMessage);
      setSentMap((prev) => ({ ...prev, [targetUserId]: true }));
    } finally {
      setIsSending(false);
    }
  };

  const handleBatchForward = async () => {
    if (selectedUserIds.length === 0 || isSending) return;
    setIsSending(true);
    try {
      await forwardMessage(selectedUserIds, forwardingMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setForwardingMessage(null)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl transition-all dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Forward className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Forward Message
              </h3>
              <p className="text-[11px] text-neutral-400">Share with other contacts instantly</p>
            </div>
          </div>
          <button
            onClick={() => setForwardingMessage(null)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Preview snippet */}
        <div className="my-3 flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
          {forwardingMessage.imageUrl && (
            <img
              src={forwardingMessage.imageUrl}
              alt="Preview"
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          )}
          <p className="truncate text-xs text-neutral-600 dark:text-neutral-300 italic">
            "{forwardingMessage.text || (forwardingMessage.imageUrl ? "Photo attachment" : "Message")}"
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-xl border border-neutral-200 bg-transparent pl-8 pr-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
          />
        </div>

        {/* Contacts List */}
        <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin pr-1">
          {filteredUsers.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">No contacts found</p>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user._id);
              const isSent = Boolean(sentMap[user._id]);

              return (
                <div
                  key={user._id}
                  onClick={() => toggleSelectUser(user._id)}
                  className={`flex items-center justify-between gap-2 rounded-xl p-2 cursor-pointer transition ${
                    isSelected
                      ? "bg-brand-50/70 dark:bg-brand-500/10 border border-brand-500/30"
                      : "hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={user.profileImage || "/default-avatar.svg"}
                        alt={user.username}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {user.username}
                      </p>
                      <p className="truncate text-[10px] text-neutral-400">
                        {user.isOnline ? "Online" : user.bio || "Available"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action button */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isSent || isSending}
                      onClick={() => handleInstantForward(user._id)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                        isSent
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default"
                          : "bg-neutral-100 hover:bg-brand-500 hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-brand-500"
                      }`}
                    >
                      {isSent ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Sent</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with multi-forward if multiple contacts selected */}
        {selectedUserIds.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">
              {selectedUserIds.length} contact{selectedUserIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              disabled={isSending}
              onClick={handleBatchForward}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-600 active:scale-95 transition disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Forward className="h-3.5 w-3.5" />
                  <span>Forward ({selectedUserIds.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForwardModal;
