import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { createSocket } from "../lib/socket.js";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isLoggingIn: false,
  isRegistering: false,
  onlineUsers: [],
  socket: null,

  /**
   * Called once on app load to see if the httpOnly cookie still
   * represents a valid session, so refreshing the page doesn't log
   * the user out.
   */
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  register: async (formData) => {
    set({ isRegistering: true });
    try {
      const res = await axiosInstance.post("/auth/register", formData);
      set({ authUser: res.data });
      toast.success("Account created!");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
      return false;
    } finally {
      set({ isRegistering: false });
    }
  },

  login: async (formData) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", formData);
      set({ authUser: res.data });
      toast.success("Welcome back!");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      get().disconnectSocket();
      toast.success("Logged out");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfileInStore: (updatedUser) => set({ authUser: updatedUser }),

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;

    const newSocket = createSocket(authUser._id);
    newSocket.connect();

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
