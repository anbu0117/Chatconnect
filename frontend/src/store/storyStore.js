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

  uploadStory: async (mediaFile, caption = "") => {
    set({ isUploadingStory: true });
    try {
      const formData = new FormData();
      formData.append("media", mediaFile);
      if (caption) formData.append("caption", caption);

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
      // Optionally update the local state to reflect it's been viewed
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
}));
