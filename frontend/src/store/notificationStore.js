import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isPanelOpen: false,

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  getNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/notifications");
      set({
        notifications: res.data.notifications || [],
        unreadCount: res.data.unreadCount || 0,
      });
    } catch (err) {
      console.warn("Failed to load notifications:", err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      set((state) => {
        const updated = state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        );
        const unread = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount: unread };
      });
      await axiosInstance.put(`/notifications/${id}/read`);
    } catch (err) {
      console.warn("Failed to mark notification as read:", err.message);
    }
  },

  markAllAsRead: async () => {
    try {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
      await axiosInstance.put("/notifications/mark-all-read");
      toast.success("All marked as read");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark all as read");
    }
  },

  deleteNotification: async (id) => {
    try {
      set((state) => {
        const updated = state.notifications.filter((n) => n._id !== id);
        const unread = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount: unread };
      });
      await axiosInstance.delete(`/notifications/${id}`);
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  },

  clearAll: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      await axiosInstance.delete("/notifications");
      toast.success("Notifications cleared");
    } catch (err) {
      toast.error("Failed to clear notifications");
    }
  },

  addNotificationFromSocket: (notification) => {
    if (!notification?._id) return;
    set((state) => {
      const exists = state.notifications.some((n) => n._id === notification._id);
      if (exists) return state;
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
