import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./authStore.js";

export const useChatStore = create((set, get) => ({
  users: [],
  conversations: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUserIds: [], // userIds currently typing to the logged-in user

  getUsers: async (search = "") => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/users", { params: { search } });
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getConversations: async () => {
    try {
      const res = await axiosInstance.get("/messages/conversations");
      set({ conversations: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load conversations");
    }
  },

  setSelectedUser: (user) => set({ selectedUser: user }),

  getMessages: async (conversationId) => {
    if (!conversationId) return set({ messages: [] });
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${conversationId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  /**
   * Sends a message. `payload` is a FormData instance so it can carry
   * an optional image file alongside the text.
   */
  sendMessage: async (receiverId, payload) => {
    try {
      const res = await axiosInstance.post(`/messages/send/${receiverId}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set({ messages: [...get().messages, res.data] });
      get().getConversations(); // refresh sidebar ordering/last message
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  /** Wires up the live socket listeners; call once after login/connect. */
  subscribeToSocketEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (message) => {
      const { selectedUser, messages } = get();
      const isRelevant =
        selectedUser &&
        (message.senderId === selectedUser._id || message.receiverId === selectedUser._id);

      if (isRelevant) {
        set({ messages: [...messages, message] });
      }
      get().getConversations();
    });

    socket.on("typing", ({ senderId }) => {
      set({ typingUserIds: [...new Set([...get().typingUserIds, senderId])] });
    });

    socket.on("stopTyping", ({ senderId }) => {
      set({ typingUserIds: get().typingUserIds.filter((id) => id !== senderId) });
    });

    socket.on("messageSeen", ({ messageId }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, status: "seen" } : m
        ),
      });
    });
  },

  unsubscribeFromSocketEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageSeen");
  },
}));
