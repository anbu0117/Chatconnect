import React, { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";
import SidebarSkeleton from "./SidebarSkeleton.jsx";
import StoryStrip from "./StoryStrip.jsx";

const Sidebar = () => {
  const { users, getUsers, isUsersLoading, selectedUser, setSelectedUser, getConversations } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const [search, setSearch] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
    getConversations();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => getUsers(search), 300); // debounce search
    return () => clearTimeout(timeout);
  }, [search]);

  const visibleUsers = onlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;

  return (
    <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
      <StoryStrip />
      <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full rounded-lg border border-neutral-300 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
          />
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="accent-brand-500"
          />
          Show online only
        </label>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isUsersLoading ? (
          <SidebarSkeleton />
        ) : visibleUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-neutral-400">
            <Users className="h-6 w-6" />
            No people found
          </div>
        ) : (
          <ul className="p-2">
            {visibleUsers.map((user) => {
              const isOnline = onlineUsers.includes(user._id);
              const isSelected = selectedUser?._id === user._id;
              return (
                <li key={user._id}>
                  <button
                    onClick={() => setSelectedUser(user)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${
                      isSelected
                        ? "bg-brand-500/10"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.profileImage || "/default-avatar.svg"}
                        alt={user.username}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-surface-dark" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.username}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {isOnline ? "Online" : user.bio || "Offline"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
