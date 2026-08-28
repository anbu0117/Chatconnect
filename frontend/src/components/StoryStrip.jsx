import { useEffect, useRef } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

const StoryStrip = () => {
  const { stories, getStories, isStoriesLoading, openStoryViewer, uploadStory, isUploadingStory } = useStoryStore();
  const { authUser } = useAuthStore();
  const fileInputRef = useRef(null);

  useEffect(() => {
    getStories();
  }, [getStories]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: basic validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for stories
      return toast.error("File size exceeds 10MB limit");
    }

    await uploadStory(file);
    e.target.value = ""; // Reset input
  };

  // Guard: don't render anything if user is not authenticated
  if (!authUser) return null;

  if (isStoriesLoading && stories.length === 0) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto border-b border-base-300 scrollbar-hide">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-14 h-14 rounded-full skeleton" />
            <div className="w-12 h-3 skeleton" />
          </div>
        ))}
      </div>
    );
  }

  // Check if the current user has any active stories
  const currentUserStoryGroup = stories.find(s => s.user._id === authUser._id);
  const hasStories = !!currentUserStoryGroup;
  
  // Find index of current user's story if it exists
  const currentUserIndex = stories.findIndex(s => s.user._id === authUser._id);

  return (
    <div className="flex gap-4 p-4 overflow-x-auto border-b border-base-300 scrollbar-hide items-center">
      {/* Upload / My Story Button */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer relative">
        <div 
          className={`w-14 h-14 rounded-full p-[2px] ${
            hasStories ? "bg-gradient-to-tr from-yellow-400 to-fuchsia-600" : "bg-base-300"
          }`}
          onClick={() => hasStories ? openStoryViewer(currentUserIndex, 0) : handleUploadClick()}
        >
          <img
            src={authUser.profileImage || "/avatar.png"}
            alt="My Story"
            className="w-full h-full rounded-full object-cover border-2 border-base-100"
          />
        </div>
        
        {/* Plus badge if no stories (or always, for adding more) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleUploadClick();
          }}
          disabled={isUploadingStory}
          className="absolute bottom-5 right-0 bg-primary text-primary-content rounded-full p-1 shadow-md border-2 border-base-100"
        >
          {isUploadingStory ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Plus size={12} strokeWidth={4} />
          )}
        </button>

        <span className="text-xs font-medium truncate w-16 text-center">
          Your Story
        </span>

        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {/* Other Users' Stories */}
      {stories.map((storyGroup, index) => {
        // Skip current user as we rendered them first
        if (storyGroup.user._id === authUser._id) return null;

        // Check if all stories are viewed by this user (we could color the ring gray if all viewed)
        // For simplicity right now, any active story group gets a colorful ring
        return (
          <div 
            key={storyGroup.user._id} 
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => openStoryViewer(index, 0)}
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
              <img
                src={storyGroup.user.profileImage || "/avatar.png"}
                alt={storyGroup.user.username}
                className="w-full h-full rounded-full object-cover border-2 border-base-100"
              />
            </div>
            <span className="text-xs font-medium truncate w-16 text-center">
              {storyGroup.user.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoryStrip;
