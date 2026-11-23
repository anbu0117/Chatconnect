import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useStoryStore = create((set, get) => ({
  stories: [],
  isStoriesLoading: false,
  isUploadingStory: false,
  activeStoryIndex: null, // Index of the user's stories we are currently viewing
  activeUserIndex: null, // Index of the user we are currently viewing
  isStoryViewerOpen: false,

  getStories: async () => {
    set({ isStoriesLoading: true });
    try {
      const res = await axiosInstance.get("/stories");
      set({ stories: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load stories");
    } finally {
      set({ isStoriesLoading: false });
    }
  },

  uploadStory: async (mediaFile, caption = "", visibility = "everyone", closeFriendIds = []) => {
    set({ isUploadingStory: true });
    try {
      const formData = new FormData();
      formData.append("media", mediaFile);
      if (caption) formData.append("caption", caption);
      formData.append("visibility", visibility);
      if (visibility === "closeFriends" && closeFriendIds.length > 0) {
        closeFriendIds.forEach((id) => formData.append("closeFriendIds[]", id));
      }

      const res = await axiosInstance.post("/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Refetch stories after upload
      await get().getStories();
      toast.success("Story uploaded successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error uploading story");
    } finally {
      set({ isUploadingStory: false });
    }
  },

  viewStory: async (storyId) => {
    try {
      await axiosInstance.post(`/stories/${storyId}/view`);
      // Update local state so viewed status updates immediately in the UI
      const { stories } = get();
      const authUserStr = localStorage.getItem("chatconnect_user");
      const currentAuthUser = authUserStr ? JSON.parse(authUserStr) : null;
      if (currentAuthUser?._id) {
        const updatedStories = stories.map((group) => ({
          ...group,
          stories: group.stories.map((story) => {
            if (story._id === storyId) {
              const alreadyViewed = story.viewers?.some(
                (v) => (v.userId?._id || v.userId) === currentAuthUser._id
              );
              if (!alreadyViewed) {
                return {
                  ...story,
                  viewers: [
                    ...(story.viewers || []),
                    { userId: currentAuthUser._id, viewedAt: new Date().toISOString() },
                  ],
                };
              }
            }
            return story;
          }),
        }));
        set({ stories: updatedStories });
      }
    } catch (error) {
      console.error("Failed to mark story as viewed:", error);
    }
  },

  openStoryViewer: (userIndex, storyIndex = 0) => {
    set({
      isStoryViewerOpen: true,
      activeUserIndex: userIndex,
      activeStoryIndex: storyIndex,
    });
  },

  closeStoryViewer: () => {
    set({
      isStoryViewerOpen: false,
      activeUserIndex: null,
      activeStoryIndex: null,
    });
  },

  nextStory: () => {
    const { activeUserIndex, activeStoryIndex, stories, closeStoryViewer } = get();
    if (activeUserIndex === null) return;

    const currentUserStories = stories[activeUserIndex].stories;
    
    // If there are more stories for this user, go to the next one
    if (activeStoryIndex < currentUserStories.length - 1) {
      set({ activeStoryIndex: activeStoryIndex + 1 });
    } 
    // Otherwise, go to the next user's first story
    else if (activeUserIndex < stories.length - 1) {
      set({ activeUserIndex: activeUserIndex + 1, activeStoryIndex: 0 });
    } 
    // If no more stories, close the viewer
    else {
      closeStoryViewer();
    }
  },

  prevStory: () => {
    const { activeUserIndex, activeStoryIndex, stories, closeStoryViewer } = get();
    if (activeUserIndex === null) return;

    // If there are previous stories for this user, go to the previous one
    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1 });
    } 
    // Otherwise, go to the previous user's last story
    else if (activeUserIndex > 0) {
      const prevUserStories = stories[activeUserIndex - 1].stories;
      set({ 
        activeUserIndex: activeUserIndex - 1, 
        activeStoryIndex: prevUserStories.length - 1 
      });
    } 
    // If at the very beginning, stay or close (usually stay)
    else {
      set({ activeStoryIndex: 0 });
    }
  },

  toggleLike: async (storyId, currentUserId) => {
    if (!currentUserId || !storyId) return;

    const previousStories = get().stories;

    // Check whether current user currently liked this story
    let isCurrentlyLiked = false;
    for (const group of previousStories) {
      const foundStory = group.stories?.find((s) => s._id === storyId);
      if (foundStory) {
        isCurrentlyLiked = (foundStory.likes || []).some(
          (like) => (like?._id || like)?.toString() === currentUserId.toString()
        );
        break;
      }
    }

    const willLike = !isCurrentlyLiked;

    // 1. Optimistic Update immediately in UI
    const updatedStories = previousStories.map((group) => ({
      ...group,
      stories: group.stories.map((story) => {
        if (story._id === storyId) {
          const currentLikes = story.likes || [];
          let nextLikes;
          if (willLike) {
            const alreadyIn = currentLikes.some(
              (like) => (like?._id || like)?.toString() === currentUserId.toString()
            );
            nextLikes = alreadyIn ? currentLikes : [...currentLikes, currentUserId];
          } else {
            nextLikes = currentLikes.filter(
              (like) => (like?._id || like)?.toString() !== currentUserId.toString()
            );
          }
          return {
            ...story,
            likes: nextLikes,
          };
        }
        return story;
      }),
    }));

    set({ stories: updatedStories });

    // 2. Call backend API
    try {
      let res;
      if (willLike) {
        res = await axiosInstance.post(`/stories/${storyId}/like`);
      } else {
        res = await axiosInstance.delete(`/stories/${storyId}/like`);
      }

      // Sync with server response if available
      if (res.data?.likes) {
        set((state) => ({
          stories: state.stories.map((group) => ({
            ...group,
            stories: group.stories.map((s) =>
              s._id === storyId ? { ...s, likes: res.data.likes } : s
            ),
          })),
        }));
      }
    } catch (error) {
      // 3. Rollback on failure
      console.error("Failed to update story like:", error);
      set({ stories: previousStories });
      toast.error(error.response?.data?.message || "Failed to update like status");
    }
  },

  deleteStory: async (storyId) => {
    try {
      await axiosInstance.delete(`/stories/${storyId}`);

      const { stories, activeUserIndex, activeStoryIndex, closeStoryViewer } = get();

      if (activeUserIndex === null || activeStoryIndex === null) {
        await get().getStories();
        toast.success("Story deleted successfully");
        return;
      }

      const currentGroup = stories[activeUserIndex];
      const remainingUserStories = (currentGroup?.stories || []).filter((s) => s._id !== storyId);

      if (remainingUserStories.length === 0) {
        // User has no remaining stories in this group
        const newStories = stories.filter((_, idx) => idx !== activeUserIndex);
        if (newStories.length === 0) {
          closeStoryViewer();
          set({ stories: [] });
        } else {
          // If deleted group was the last user group, go to previous group
          const nextUserIndex = activeUserIndex >= newStories.length ? newStories.length - 1 : activeUserIndex;
          set({
            stories: newStories,
            activeUserIndex: nextUserIndex,
            activeStoryIndex: 0,
          });
        }
      } else {
        // User still has remaining stories
        const newStories = stories.map((group, idx) => {
          if (idx === activeUserIndex) {
            return { ...group, stories: remainingUserStories };
          }
          return group;
        });

        let nextStoryIndex = activeStoryIndex;
        if (nextStoryIndex >= remainingUserStories.length) {
          nextStoryIndex = remainingUserStories.length - 1;
        }

        set({
          stories: newStories,
          activeStoryIndex: nextStoryIndex,
        });
      }

      toast.success("Story deleted successfully");
    } catch (error) {
      console.error("Failed to delete story:", error);
      toast.error(error.response?.data?.message || "Failed to delete story");
      throw error;
    }
  },

  addComment: async (storyId, text) => {
    if (!storyId || !text || !text.trim()) return false;

    const previousStories = get().stories;
    const authUserStr = localStorage.getItem("chatconnect_user");
    const currentAuthUser = authUserStr ? JSON.parse(authUserStr) : null;

    const tempComment = {
      _id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: {
        _id: currentAuthUser?._id,
        username: currentAuthUser?.username || "You",
        profileImage: currentAuthUser?.profileImage || "",
      },
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic update
    const updatedStories = previousStories.map((group) => ({
      ...group,
      stories: group.stories.map((story) => {
        if (story._id === storyId) {
          return {
            ...story,
            comments: [...(story.comments || []), tempComment],
          };
        }
        return story;
      }),
    }));

    set({ stories: updatedStories });

    // 2. Call backend API
    try {
      const res = await axiosInstance.post(`/stories/${storyId}/comments`, {
        text: text.trim(),
      });

      // Replace temp comment with server populated comment
      const serverComment = res.data?.comment;
      if (serverComment) {
        set((state) => ({
          stories: state.stories.map((group) => ({
            ...group,
            stories: group.stories.map((story) => {
              if (story._id === storyId) {
                const currentComments = story.comments || [];
                const replaced = currentComments.map((c) =>
                  c._id === tempComment._id ? serverComment : c
                );
                return { ...story, comments: replaced };
              }
              return story;
            }),
          })),
        }));
      }
      return true;
    } catch (error) {
      // 3. Rollback
      console.error("Failed to add comment:", error);
      set({ stories: previousStories });
      toast.error(error.response?.data?.message || "Failed to post comment");
      return false;
    }
  },

  deleteComment: async (storyId, commentId) => {
    if (!storyId || !commentId) return false;

    const previousStories = get().stories;

    // 1. Optimistic local removal
    const updatedStories = previousStories.map((group) => ({
      ...group,
      stories: group.stories.map((story) => {
        if (story._id === storyId) {
          return {
            ...story,
            comments: (story.comments || []).filter((c) => c._id !== commentId),
          };
        }
        return story;
      }),
    }));

    set({ stories: updatedStories });

    // 2. Call backend API
    try {
      await axiosInstance.delete(`/stories/${storyId}/comments/${commentId}`);
      toast.success("Comment deleted");
      return true;
    } catch (error) {
      // 3. Rollback
      console.error("Failed to delete comment:", error);
      set({ stories: previousStories });
      toast.error(error.response?.data?.message || "Failed to delete comment");
      return false;
    }
  },
}));
