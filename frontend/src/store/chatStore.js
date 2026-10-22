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
  forwardingMessage: null, // message selected for forwarding
  setForwardingMessage: (message) => set({ forwardingMessage: message }),
  editingMessage: null, // message selected for editing
  setEditingMessage: (message) => set({ editingMessage: message }),

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
   * Ultra-fast message send:
   * 1. 0ms instant optimistic UI render with sound/feel.
   * 2. Direct WebSocket dispatch (<10ms) when socket is connected,
   *    bypassing slow HTTP handshakes.
   * 3. Seamless HTTP fallback for multipart images or offline state.
   */
  sendMessage: async (
    receiverId,
    { text = "", imageFile = null, imagePreview = null, isForwarded = false } = {}
  ) => {
    const authUser = useAuthStore.getState().authUser;
    const socket = useAuthStore.getState().socket;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser?._id,
      receiverId,
      text: text.trim(),
      imageUrl: imagePreview || "",
      isForwarded: Boolean(isForwarded),
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    // 1. Instantly display in chat window (0ms)
    set({ messages: [...get().messages, optimisticMessage] });

    // 2. Instantly update conversation snippet in sidebar
    const currentConversations = get().conversations;
    const convIndex = currentConversations.findIndex((c) =>
      c.participants.some((p) => p._id === receiverId)
    );
    if (convIndex !== -1) {
      const updatedConv = {
        ...currentConversations[convIndex],
        lastMessage: optimisticMessage,
        updatedAt: new Date().toISOString(),
      };
      const remaining = currentConversations.filter((_, i) => i !== convIndex);
      set({ conversations: [updatedConv, ...remaining] });
    }

    // 3. Fast-path: WebSocket transmission (<10ms)
    if (!imageFile && socket?.connected) {
      socket.emit(
        "sendMessage",
        {
          receiverId,
          text: text.trim(),
          imageUrl: imagePreview || "",
          isForwarded: Boolean(isForwarded),
          tempId,
        },
        (response) => {
          if (response?.error) {
            set({
              messages: get().messages.map((m) =>
                m._id === tempId ? { ...m, status: "failed" } : m
              ),
            });
            toast.error(response.error);
          } else if (response?.message) {
            const serverMessage = response.message;
            set({
              messages: get().messages.map((m) =>
                m._id === tempId ? serverMessage : m
              ),
              conversations: get().conversations.map((c) => {
                const isTarget = c.participants.some((p) => p._id === receiverId);
                return isTarget
                  ? {
                      ...c,
                      lastMessage: serverMessage,
                      updatedAt: serverMessage.createdAt || new Date().toISOString(),
                    }
                  : c;
              }),
            });
          }
        }
      );
      return;
    }

    // 4. HTTP fallback path (for file uploads or disconnected socket)
    try {
      let res;
      if (imageFile) {
        const formData = new FormData();
        if (text.trim()) formData.append("text", text.trim());
        if (isForwarded) formData.append("isForwarded", "true");
        formData.append("image", imageFile);
        res = await axiosInstance.post(`/messages/send/${receiverId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axiosInstance.post(`/messages/send/${receiverId}`, {
          text: text.trim(),
          imageUrl: imagePreview || "",
          isForwarded: Boolean(isForwarded),
        });
      }

      set({
        messages: get().messages.map((m) => (m._id === tempId ? res.data : m)),
        conversations: get().conversations.map((c) => {
          const isTarget = c.participants.some((p) => p._id === receiverId);
          return isTarget
            ? {
                ...c,
                lastMessage: res.data,
                updatedAt: res.data.createdAt || new Date().toISOString(),
              }
            : c;
        }),
      });
      return res.data;
    } catch (error) {
      set({
        messages: get().messages.map((m) =>
          m._id === tempId ? { ...m, status: "failed" } : m
        ),
      });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  /**
   * Ultra-fast Message Forwarding:
   * Dispatches the message to one or multiple recipients simultaneously via WebSocket.
   */
  forwardMessage: async (targetUserIds, message) => {
    if (!targetUserIds || targetUserIds.length === 0 || !message) return;
    const socket = useAuthStore.getState().socket;

    const payload = {
      text: message.text || "",
      imageUrl: message.imageUrl || "",
      isForwarded: true,
    };

    const promises = targetUserIds.map((receiverId) => {
      const currentSelected = get().selectedUser;
      if (currentSelected && currentSelected._id === receiverId) {
        return get().sendMessage(receiverId, {
          text: payload.text,
          imagePreview: payload.imageUrl,
          isForwarded: true,
        });
      }

      if (socket?.connected) {
        return new Promise((resolve) => {
          socket.emit(
            "sendMessage",
            {
              receiverId,
              text: payload.text,
              imageUrl: payload.imageUrl,
              isForwarded: true,
            },
            (res) => resolve(res?.message || null)
          );
        });
      }

      return axiosInstance
        .post(`/messages/send/${receiverId}`, payload)
        .then((r) => r.data)
        .catch(() => null);
    });

    await Promise.all(promises);
    get().getConversations();
    toast.success(
      `Forwarded to ${targetUserIds.length} contact${targetUserIds.length > 1 ? "s" : ""}!`
    );
    set({ forwardingMessage: null });
  },

  /** Edit an already sent message (only if current user is the author) */
  editMessage: async (messageId, newText) => {
    if (!messageId || !newText?.trim()) return false;
    const socket = useAuthStore.getState().socket;
    const trimmed = newText.trim();

    // 0ms Optimistic local update
    const previousMessages = get().messages;
    set({
      messages: previousMessages.map((m) =>
        m._id === messageId
          ? { ...m, text: trimmed, isEdited: true, editedAt: new Date().toISOString() }
          : m
      ),
      editingMessage: null,
    });

    if (socket?.connected) {
      socket.emit("editMessage", { messageId, text: trimmed }, (response) => {
        if (response?.error) {
          set({ messages: previousMessages });
          toast.error(response.error);
        } else {
          toast.success("Message edited");
        }
      });
      return true;
    }

    try {
      const res = await axiosInstance.put(`/messages/${messageId}`, { text: trimmed });
      set({
        messages: get().messages.map((m) => (m._id === messageId ? res.data : m)),
      });
      toast.success("Message edited");
      return true;
    } catch (err) {
      set({ messages: previousMessages });
      toast.error(err.response?.data?.message || "Failed to edit message");
      return false;
    }
  },

  /** Delete a message (only if current user is the author) */
  deleteMessage: async (messageId) => {
    if (!messageId) return false;
    const socket = useAuthStore.getState().socket;

    // 0ms Optimistic local removal
    const previousMessages = get().messages;
    set({
      messages: previousMessages.filter((m) => m._id !== messageId),
      editingMessage: get().editingMessage?._id === messageId ? null : get().editingMessage,
    });

    if (socket?.connected) {
      socket.emit("deleteMessage", { messageId }, (response) => {
        if (response?.error) {
          set({ messages: previousMessages });
          toast.error(response.error);
        } else {
          toast.success("Message deleted");
        }
      });
      return true;
    }

    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      toast.success("Message deleted");
      return true;
    } catch (err) {
      set({ messages: previousMessages });
      toast.error(err.response?.data?.message || "Failed to delete message");
      return false;
    }
  },

  /** Wires up the live socket listeners; call once after login/connect. */
  subscribeToSocketEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (message) => {
      const { selectedUser, messages, conversations } = get();
      const isRelevant =
        selectedUser &&
        (message.senderId === selectedUser._id || message.receiverId === selectedUser._id);

      if (isRelevant) {
        // Avoid duplicate if message already present (e.g. from optimistic update)
        const alreadyExists = messages.some((m) => m._id === message._id);
        if (!alreadyExists) {
          set({ messages: [...messages, message] });
        }
      }

      // Fast-path: Update conversation snippet in memory in 0ms without hitting the network
      const currentAuthUser = useAuthStore.getState().authUser;
      const otherUserId =
        message.senderId === currentAuthUser?._id
          ? message.receiverId
          : message.senderId;

      const convIndex = conversations.findIndex((c) =>
        c.participants.some((p) => p._id === otherUserId)
      );

      if (convIndex !== -1) {
        const updatedConv = {
          ...conversations[convIndex],
          lastMessage: message,
          updatedAt: message.createdAt || new Date().toISOString(),
        };
        const remaining = conversations.filter((_, i) => i !== convIndex);
        set({ conversations: [updatedConv, ...remaining] });
      } else {
        // New incoming conversation thread not yet in list
        get().getConversations();
      }
    });

    socket.on("messageEdited", (updatedMessage) => {
      if (!updatedMessage?._id) return;
      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id ? updatedMessage : m
        ),
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      if (!messageId) return;
      set({
        messages: get().messages.filter((m) => m._id !== messageId),
      });
    });

    socket.on("userProfileUpdated", (updatedUser) => {
      if (!updatedUser?._id) return;
      // Update contact list
      set({
        users: get().users.map((u) =>
          u._id === updatedUser._id ? { ...u, ...updatedUser } : u
        ),
      });
      // Update active chat header if open
      const active = get().selectedUser;
      if (active?._id === updatedUser._id) {
        set({ selectedUser: { ...active, ...updatedUser } });
      }
      // Update conversation participant details
      set({
        conversations: get().conversations.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === updatedUser._id ? { ...p, ...updatedUser } : p
          ),
        })),
      });
      // Also update logged in user if it matches self
      const authUser = useAuthStore.getState().authUser;
      if (authUser?._id === updatedUser._id) {
        useAuthStore.getState().updateProfileInStore(updatedUser);
      }
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
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("userProfileUpdated");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageSeen");
  },
}));
