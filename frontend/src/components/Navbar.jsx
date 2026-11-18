import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Moon, Sun, User, LogOut, Bell } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";
import { useThemeStore } from "../store/themeStore.js";
import { useNotificationStore } from "../store/notificationStore.js";

const Navbar = () => {
  const { authUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount, togglePanel, getNotifications } = useNotificationStore();

  useEffect(() => {
    if (authUser?._id) {
      getNotifications();
    }
  }, [authUser?._id, getNotifications]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
      <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
        <img
          src="/chatconnect-logo.png"
          alt="ChatConnect Logo"
          className="h-7 w-7 rounded-lg object-cover shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700"
        />
        <span>ChatConnect</span>
      </Link>

      {authUser && (
        <div className="flex items-center gap-1">
          {/* Real-time Notification Bell with Badge */}
          <button
            type="button"
            onClick={togglePanel}
            aria-label="Notifications"
            className="relative rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-surface-dark">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/profile"
            aria-label="Profile"
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            onClick={logout}
            aria-label="Log out"
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
