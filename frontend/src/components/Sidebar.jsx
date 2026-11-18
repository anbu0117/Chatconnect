import React, { useEffect, useState } from "react";
import { Search, Users, MessageSquare, Plus, Edit3, CheckCheck, Clock, UserCheck } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";
import SidebarSkeleton from "./SidebarSkeleton.jsx";
import StoryStrip from "./StoryStrip.jsx";
import EditProfileModal from "./EditProfileModal.jsx";

const formatSnippetTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Sidebar = () => {
  const {
    users,
    getUsers,
    isUsersLoading,
    conversations,
    getConversations,
    selectedUser,
    setSelectedUser,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("chats"); // "chats" | "users"
  const [search, setSearch] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    getUsers();
    getConversations();
  }, [getUsers, getConversations]);

  useEffect(() => {
    const timeout = setTimeout(() => getUsers(search), 300); // debounce search
    return () => clearTimeout(timeout);
  }, [search, getUsers]);

  const visibleUsers = onlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;

  // Filter conversations by search query if in chats tab
  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const partner = conv.participants?.find((p) => p._id !== authUser?._id) || conv.participants?.[0];
    return partner?.username?.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate total unread messages across all conversations
  const totalUnreadCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  return (
    <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark">
      {/* Story Strip at Top */}
      <StoryStrip />

      {/* Navigation Tabs: Chats & All Users */}
      <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 px-3 pt-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === "chats"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chats</span>
          {totalUnreadCount > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "chats"
                  ? "bg-white text-brand-600"
                  : "bg-brand-500 text-white"
              }`}
            >
              {totalUnreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === "users"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Users</span>
          <span
            className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "users"
                ? "bg-white text-brand-600"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {users.length}
          </span>
        </button>
      </div>

      {/* Search & Filter Header */}
      <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "chats" ? "Search chats..." : "Search users to message..."
            }
            className="w-full rounded-lg border border-neutral-300 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
          />
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-neutral-500 cursor-pointer">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="accent-brand-500 rounded"
          />
          Show online contacts only
        </label>
      </div>

      {/* Main Content Area */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isUsersLoading ? (
          <SidebarSkeleton />
        ) : activeTab === "chats" ? (
          /* ================= CHATS TAB ================= */
          filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-neutral-400">
              <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                  No active chats yet
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Start a private conversation with any registered user!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Start Private Chat</span>
              </button>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const partner =
                  conv.participants?.find((p) => p._id !== authUser?._id) ||
                  conv.participants?.[0];
                if (!partner) return null;

                const isOnline = onlineUsers.includes(partner._id);
                if (onlineOnly && !isOnline) return null;

                const isSelected = selectedUser?._id === partner._id;
                const lastMsg = conv.lastMessage;
                const unreadCount = conv.unreadCount || 0;

                return (
                  <li key={conv._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(partner)}
                      className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                        isSelected
                          ? "bg-brand-500/15 dark:bg-brand-500/20"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={partner.profileImage || "/default-avatar.svg"}
                          alt={partner.username}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-surface-dark" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {partner.username}
                          </p>
                          <span className="text-[10px] text-neutral-400 shrink-0">
                            {formatSnippetTime(conv.updatedAt || lastMsg?.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {lastMsg?.imageUrl && !lastMsg?.text
                              ? "📷 Photo"
                              : lastMsg?.text || "Started conversation"}
                          </p>
                          {unreadCount > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          /* ================= ALL USERS TAB ================= */
          visibleUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-neutral-400">
              <Users className="h-6 w-6" />
              No people found
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {visibleUsers.map((user) => {
                const isOnline = onlineUsers.includes(user._id);
                const isSelected = selectedUser?._id === user._id;

                return (
                  <li key={user._id}>
                    <div
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl p-2.5 text-left transition ${
                        isSelected
                          ? "bg-brand-500/15 dark:bg-brand-500/20"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {/* User Info */}
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.profileImage || "/default-avatar.svg"}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                          />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-surface-dark" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {user.username}
                          </p>
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {isOnline ? (
                              <span className="text-emerald-500 font-medium">Online</span>
                            ) : (
                              user.bio || "Available"
                            )}
                          </p>
                        </div>
                      </button>

                      {/* Start Private Chat Action Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-600 hover:text-white dark:bg-brand-500/20 dark:hover:bg-brand-500 dark:text-brand-300 dark:hover:text-white transition text-xs font-medium shrink-0"
                        title={`Start private chat with ${user.username}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </div>

      {/* User Profile Bar with 1-click Edit Option */}
      {authUser && (
        <div className="border-t border-neutral-200 p-2.5 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between gap-2 rounded-xl p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
              title="Click to edit profile"
            >
              <div className="relative shrink-0">
                <img
                  src={authUser.profileImage || "/default-avatar.svg"}
                  alt={authUser.username}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-500/30 group-hover:ring-brand-500 transition"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-surface-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-500 transition">
                  {authUser.username}
                </p>
                <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                  {authUser.bio || "Available"}
                </p>
              </div>
            </button>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 transition shrink-0 shadow-sm"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Dialog Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
