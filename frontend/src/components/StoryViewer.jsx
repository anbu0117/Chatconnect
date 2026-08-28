import { useEffect, useState, useRef } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const STORY_DURATION = 5000; // 5 seconds per image story

const StoryViewer = () => {
  const { 
    stories, 
    activeUserIndex, 
    activeStoryIndex, 
    isStoryViewerOpen, 
    closeStoryViewer, 
    nextStory, 
    prevStory,
    viewStory
  } = useStoryStore();
  
  const { authUser } = useAuthStore();
  
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef(null);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    
    // Mark as viewed if it's not our own story
    if (isStoryViewerOpen && activeUserIndex !== null && activeStoryIndex !== null) {
      const currentStoryGroup = stories[activeUserIndex];
      const currentStory = currentStoryGroup?.stories[activeStoryIndex];
      
      if (currentStory && authUser && currentStoryGroup.user._id !== authUser._id) {
        viewStory(currentStory._id);
      }
    }
  }, [activeUserIndex, activeStoryIndex, isStoryViewerOpen, stories, authUser?._id, viewStory]);

  // Handle story progress / timer
  useEffect(() => {
    if (!isStoryViewerOpen || isPaused) return;

    const currentStoryGroup = stories[activeUserIndex];
    const currentStory = currentStoryGroup?.stories[activeStoryIndex];
    
    if (!currentStory) return;

    let intervalId;
    let duration = STORY_DURATION;
    let increment = 100 / (duration / 100);

    // If it's a video, wait for metadata to set duration, or rely on the video's own onEnded event
    if (currentStory.mediaType === "video") {
      // For video, we don't use the simple interval progress, we use the video's timeupdate
      return; 
    }

    intervalId = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalId);
          nextStory();
          return 0;
        }
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [isStoryViewerOpen, isPaused, activeUserIndex, activeStoryIndex, stories, nextStory]);

  if (!isStoryViewerOpen || activeUserIndex === null || activeStoryIndex === null) return null;

  const currentStoryGroup = stories[activeUserIndex];
  if (!currentStoryGroup) {
    closeStoryViewer();
    return null;
  }

  const userStories = currentStoryGroup.stories;
  const currentStory = userStories[activeStoryIndex];

  if (!currentStory) {
    closeStoryViewer();
    return null;
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleVideoEnded = () => {
    nextStory();
  };

  // Click handling for navigation
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      prevStory();
    } else {
      nextStory();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md h-full max-h-[900px] flex flex-col"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-4 flex gap-1 z-20">
          {userStories.map((s, idx) => (
            <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: idx === activeStoryIndex 
                    ? `${progress}%` 
                    : idx < activeStoryIndex 
                      ? "100%" 
                      : "0%"
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info & Header */}
        <div className="absolute top-6 left-0 right-0 p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <img 
              src={currentStoryGroup.user.profileImage || "/avatar.png"} 
              alt="avatar" 
              className="w-10 h-10 rounded-full border border-white/20"
            />
            <div>
              <p className="text-white font-medium text-sm drop-shadow-md">
                {currentStoryGroup.user.username}
              </p>
              <p className="text-white/70 text-xs drop-shadow-md">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white">
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
            <button onClick={closeStoryViewer} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Media */}
        <div 
          className="flex-1 w-full h-full flex items-center justify-center relative bg-black cursor-pointer"
          onClick={handleClick}
        >
          {currentStory.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain select-none"
              draggable="false"
            />
          )}

          {/* Caption Overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-10 left-0 right-0 text-center p-4">
              <span className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm inline-block max-w-[80%]">
                {currentStory.caption}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
