import React, { useEffect } from "react";
import { X, Bell, Check, Trash2, Heart, MessageCircle, MessageSquare, CheckCheck, Sparkles } from "lucide-react";
import { useNotificationStore } from "../store/notificationStore.js";
import { useChatStore } from "../store/chatStore.js";
import { useStoryStore } from "../store/storyStore.js";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    closePanel,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getNotifications,
  } = useNotificationStore();

  const { setSelectedUser, users } = useChatStore();
  const { stories, openStoryViewer } = useStoryStore();

  useEffect(() => {
    if (isPanelOpen) {
      getNotifications();
    }
  }, [isPanelOpen, getNotifications]);

  if (!isPanelOpen) return null;

  const handleNotificationClick = (notification) => {
    // 1. Mark as read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // 2. Route based on notification type
    if (notification.type === "new_message") {
      const senderUser =
        users.find((u) => u._id === notification.sender?._id) || notification.sender;
      if (senderUser) {
        setSelectedUser(senderUser);
        closePanel();
      }
    } else if (
      notification.type === "story_comment" ||
      notification.type === "story_like"
    ) {
      // Find the story group and open story viewer if possible
      if (notification.relatedStoryId) {
        let foundUserIndex = -1;
        let foundStoryIndex = -1;

        stories.forEach((group, uIdx) => {
          const sIdx = group.stories?.findIndex((s) => s._id === notification.relatedStoryId);
          if (sIdx !== -1) {
            foundUserIndex = uIdx;
            foundStoryIndex = sIdx;
          }
        });

        if (foundUserIndex !== -1 && foundStoryIndex !== -1) {
          openStoryViewer(foundUserIndex, foundStoryIndex);
          closePanel();
        } else {
          // If story is own story (first group)
          openStoryViewer(0, 0);
          closePanel();
        }
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "story_like":
        return <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />;
      case "story_comment":
        return <MessageCircle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />;
      case "new_message":
        return <MessageSquare className="h-3.5 w-3.5 text-brand-500" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-150"
      onClick={closePanel}
    >
      <div
        className="w-full max-w-sm h-full bg-white dark:bg-surface-dark border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline p-1.5 font-medium"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={closePanel}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Close notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-neutral-400">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No notifications yet
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">
                When someone likes or comments on your stories or sends messages, you'll see them here!
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const senderAvatar = n.sender?.profileImage || "/default-avatar.svg";
              const senderName = n.sender?.username || "Someone";

              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex items-start gap-3 p-3 rounded-xl transition cursor-pointer text-left border ${
                    !n.isRead
                      ? "bg-brand-500/5 dark:bg-brand-500/10 border-brand-500/20"
                      : "bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  }`}
                >
                  {/* Sender Avatar with type icon */}
                  <div className="relative shrink-0">
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                    />
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-surface-dark shadow">
                      {getIcon(n.type)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {n.title || senderName}
                      </p>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed break-words line-clamp-2">
                      {n.message}
                    </p>
                  </div>

                  {/* Actions on hover */}
                  <div
                    className="absolute right-2 top-2 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n._id)}
                        className="p-1 rounded text-neutral-400 hover:text-brand-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(n._id)}
                      className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
            <span className="text-xs text-neutral-400">
              {notifications.length} notification{notifications.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
