import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { createSocket } from "../lib/socket.js";

const getErrorMessage = (error, defaultMsg) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (Array.isArray(error.response?.data?.errors) && error.response.data.errors.length > 0) {
    return error.response.data.errors[0].message;
  }
  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "Cannot connect to server. Please check if the backend is running.";
  }
  return error.message || defaultMsg;
};

const getInitialUser = () => {
  try {
    const token = localStorage.getItem("chatconnect_token");
    const userStr = localStorage.getItem("chatconnect_user");
    if (token && userStr) {
      return JSON.parse(userStr);
    }
  } catch {}
  return null;
};

export const useAuthStore = create((set, get) => ({
  authUser: getInitialUser(),
  isCheckingAuth: true,
  isLoggingIn: false,
  isRegistering: false,
  isSendingOTP: false,
  isResettingPassword: false,
  onlineUsers: [],
  socket: null,

  /**
   * Called once on app load to verify session via cookie or Authorization header.
   */
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (res.data && res.data._id) {
        if (res.data.token) {
          localStorage.setItem("chatconnect_token", res.data.token);
        }
        localStorage.setItem("chatconnect_user", JSON.stringify(res.data));
        set({ authUser: res.data });
        try {
          get().connectSocket();
        } catch (socketErr) {
          console.warn("Socket connection failed on checkAuth:", socketErr);
        }
      } else {
        localStorage.removeItem("chatconnect_token");
        localStorage.removeItem("chatconnect_user");
        set({ authUser: null });
      }
    } catch {
      localStorage.removeItem("chatconnect_token");
      localStorage.removeItem("chatconnect_user");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  register: async (formData) => {
    set({ isRegistering: true });
    try {
      const res = await axiosInstance.post("/auth/register", formData);
      if (!res.data || !res.data._id) {
        throw new Error("Invalid response received from server. Please verify backend connection.");
      }
      if (res.data.token) {
        localStorage.setItem("chatconnect_token", res.data.token);
      }
      localStorage.setItem("chatconnect_user", JSON.stringify(res.data));
      set({ authUser: res.data });
      toast.success("Account created!");
      try {
        get().connectSocket();
      } catch (socketErr) {
        console.warn("Socket connection failed on register:", socketErr);
      }
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Registration failed"));
      return false;
    } finally {
      set({ isRegistering: false });
    }
  },

  login: async (formData) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", formData);
      if (!res.data || !res.data._id) {
        throw new Error("Invalid response received from server. Please verify backend connection.");
      }
      if (res.data.token) {
        localStorage.setItem("chatconnect_token", res.data.token);
      }
      localStorage.setItem("chatconnect_user", JSON.stringify(res.data));
      set({ authUser: res.data });
      toast.success("Welcome back!");
      try {
        get().connectSocket();
      } catch (socketErr) {
        console.warn("Socket connection failed on login:", socketErr);
      }
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Login failed"));
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      localStorage.removeItem("chatconnect_token");
      localStorage.removeItem("chatconnect_user");
      set({ authUser: null });
      get().disconnectSocket();
      toast.success("Logged out");
    }
  },

  forgotPassword: async (email) => {
    set({ isSendingOTP: true });
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data?.message || "Reset code sent to your email!");
      return { success: true, otp: res.data?.otp };
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send reset code"));
      return { success: false };
    } finally {
      set({ isSendingOTP: false });
    }
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/reset-password", { email, otp, newPassword });
      toast.success(res.data?.message || "Password reset successfully!");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reset password"));
      return false;
    } finally {
      set({ isResettingPassword: false });
    }
  },

  updateProfileInStore: (updatedUser) => {
    const current = get().authUser;
    const merged = { ...current, ...updatedUser };
    localStorage.setItem("chatconnect_user", JSON.stringify(merged));
    set({ authUser: merged });
  },

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
