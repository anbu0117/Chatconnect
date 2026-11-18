import { useEffect, useState, useRef } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import { X, Pause, Play, Heart, Trash2, MoreVertical, Loader2, MessageCircle, Send } from "lucide-react";
import toast from "react-hot-toast";

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
    viewStory,
    toggleLike,
    deleteStory,
    addComment,
    deleteComment
  } = useStoryStore();
  
  const { authUser } = useAuthStore();
  
  const [progress, setProgress] = useState(0);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const videoRef = useRef(null);
  const menuRef = useRef(null);

  // Story is paused if manual pause, touch holding, menu open, delete dialog open, or comments drawer open
  const isPaused = isManualPaused || isHolding || isMenuOpen || isDeleteDialogOpen || isDeleting || isCommentsOpen;

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle ESC key to close modal or story viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isCommentsOpen) {
          setIsCommentsOpen(false);
        } else if (isDeleteDialogOpen) {
          setIsDeleteDialogOpen(false);
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        } else {
          closeStoryViewer();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommentsOpen, isDeleteDialogOpen, isMenuOpen, closeStoryViewer]);

  // Reset progress & state when story changes
  useEffect(() => {
    setProgress(0);
    setIsManualPaused(false);
    setIsHolding(false);
    setIsMenuOpen(false);
    setIsDeleteDialogOpen(false);
    setIsDeleting(false);
    setIsCommentsOpen(false);
    setCommentInput("");
    
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

    // For video, we rely on the video's timeupdate event
    if (currentStory.mediaType === "video") {
      return; 
    }

    let intervalId;
    const duration = STORY_DURATION;
    const increment = 100 / (duration / 100);

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

  const currentStoryGroup =
    activeUserIndex !== null && stories[activeUserIndex] ? stories[activeUserIndex] : null;
  const userStories = currentStoryGroup?.stories || [];
  const currentStory =
    activeStoryIndex !== null && userStories[activeStoryIndex]
      ? userStories[activeStoryIndex]
      : null;

  // Pause/play video element when isPaused state changes
  useEffect(() => {
    if (currentStory?.mediaType === "video" && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentStory?.mediaType]);

  if (!isStoryViewerOpen || activeUserIndex === null || activeStoryIndex === null) return null;

  if (!currentStoryGroup || !currentStory) {
    closeStoryViewer();
    return null;
  }

  // Security & ownership check for UI display
  const isOwner = Boolean(
    authUser &&
      (String(currentStoryGroup?.user?._id || "") === String(authUser._id) ||
        String(currentStory?.userId?._id || currentStory?.userId || "") === String(authUser._id))
  );

  // Like status and count
  const likesList = currentStory.likes || [];
  const isLiked = Boolean(
    authUser &&
      likesList.some(
        (likeId) => String(likeId?._id || likeId) === String(authUser._id)
      )
  );
  const likesCount = likesList.length;

  // Comments list and count
  const commentsList = currentStory.comments || [];
  const commentsCount = commentsList.length;

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleVideoEnded = () => {
    nextStory();
  };

  // Click handling for left/right navigation
  const handleClick = (e) => {
    if (isMenuOpen || isCommentsOpen) {
      setIsMenuOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      prevStory();
    } else {
      nextStory();
    }
  };

  // Toggle like handler
  const handleToggleLike = async (e) => {
    e.stopPropagation();
    if (!authUser) {
      toast.error("Please login to like stories");
      return;
    }
    await toggleLike(currentStory._id, authUser._id);
  };

  // Submit comment handler
  const handleSendComment = async (e) => {
    e?.preventDefault?.();
    if (!commentInput.trim() || isSubmittingComment || !currentStory?._id) return;
    if (!authUser) {
      toast.error("Please login to comment");
      return;
    }

    try {
      setIsSubmittingComment(true);
      const textToSend = commentInput.trim();
      setCommentInput("");
      await addComment(currentStory._id, textToSend);
    } catch {
      // Toast error handled in storyStore
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete story handler
  const handleDeleteStory = async (e) => {
    e.stopPropagation();
    if (isDeleting || !currentStory?._id) return;

    try {
      setIsDeleting(true);
      await deleteStory(currentStory._id);
      setIsDeleteDialogOpen(false);
      setIsMenuOpen(false);
    } catch {
      // Toast error handled in storyStore
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm select-none">
      <div 
        className="relative w-full max-w-md h-full max-h-[900px] flex flex-col"
        onMouseDown={() => setIsHolding(true)}
        onMouseUp={() => setIsHolding(false)}
        onTouchStart={() => setIsHolding(true)}
        onTouchEnd={() => setIsHolding(false)}
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
              className="w-10 h-10 rounded-full border border-white/20 object-cover"
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

          <div className="flex items-center gap-2 sm:gap-3 text-white">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsManualPaused((prev) => !prev);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>

            {/* Owner Actions: 3-dot Menu with Delete Option */}
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className={`p-1.5 hover:bg-white/10 rounded-full transition-colors ${
                    isMenuOpen ? "bg-white/20" : ""
                  }`}
                  title="Story options"
                >
                  <MoreVertical size={20} />
                </button>

                {isMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-36 bg-neutral-900/95 border border-white/15 rounded-xl shadow-2xl py-1 z-30 backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left"
                    >
                      <Trash2 size={15} />
                      <span>Delete Story</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeStoryViewer();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div 
          className="flex-1 w-full h-full flex items-center justify-center relative bg-black cursor-pointer overflow-hidden"
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

          {/* Bottom Story Footer: Caption Overlay & Like Button */}
          <div className="absolute bottom-5 left-0 right-0 px-4 flex items-end justify-between gap-3 z-20 pointer-events-none">
            {/* Caption on the left */}
            <div className="flex-1 min-w-0">
              {currentStory.caption ? (
                <span className="pointer-events-auto bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm inline-block max-w-[90%] break-words shadow-md border border-white/10">
                  {currentStory.caption}
                </span>
              ) : null}
            </div>

            {/* Story Action Buttons: Comments & Like */}
            <div className="pointer-events-auto shrink-0 flex items-center gap-2">
              {/* Comment Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentsOpen(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all border border-white/15 active:scale-95 shadow-lg group"
                title="View & add comments"
              >
                <MessageCircle
                  size={20}
                  className="text-white group-hover:text-brand-400 group-hover:scale-110 transition-transform duration-200"
                />
                <span className="text-white text-xs sm:text-sm font-semibold select-none">
                  {commentsCount}
                </span>
              </button>

              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all border border-white/15 active:scale-95 shadow-lg group"
                title={isLiked ? "Unlike story" : "Like story"}
              >
                <Heart
                  size={20}
                  className={`transition-transform duration-200 ${
                    isLiked
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-white group-hover:text-red-400 group-hover:scale-110"
                  }`}
                />
                <span className="text-white text-xs sm:text-sm font-semibold select-none">
                  {likesCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Story Comments Drawer / Bottom Sheet */}
        {isCommentsOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentsOpen(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="w-full bg-neutral-900 border-t border-white/10 rounded-t-3xl max-h-[75%] h-[420px] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-brand-400" />
                  <h3 className="text-white text-sm font-semibold">
                    Comments ({commentsCount})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommentsOpen(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-full transition"
                  title="Close comments"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Comments Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {commentsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                      <MessageCircle size={22} />
                    </div>
                    <p className="text-neutral-300 text-sm font-medium">No comments yet</p>
                    <p className="text-neutral-500 text-xs mt-0.5">
                      Be the first to share your thoughts on this story!
                    </p>
                  </div>
                ) : (
                  commentsList.map((c) => {
                    const commenterId = c.userId?._id || c.userId;
                    const commenterName = c.userId?.username || "User";
                    const commenterAvatar = c.userId?.profileImage || "/default-avatar.svg";
                    const canDelete =
                      authUser &&
                      (String(commenterId) === String(authUser._id) || isOwner);

                    return (
                      <div
                        key={c._id}
                        className="flex items-start gap-2.5 group/comment text-left"
                      >
                        <img
                          src={commenterAvatar}
                          alt={commenterName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {commenterName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {new Date(c.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-200 mt-0.5 break-words whitespace-pre-wrap leading-relaxed">
                            {c.text}
                          </p>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteComment(currentStory._id, c._id);
                            }}
                            className="opacity-0 group-hover/comment:opacity-100 text-neutral-400 hover:text-red-400 p-1 rounded transition shrink-0"
                            title="Delete comment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Input Footer */}
              <form
                onSubmit={handleSendComment}
                className="p-3 bg-neutral-950/80 border-t border-white/10 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  maxLength={500}
                  disabled={isSubmittingComment}
                  className="flex-1 bg-neutral-800 text-white placeholder-neutral-400 text-xs rounded-full px-3.5 py-2.5 outline-none border border-white/10 focus:border-brand-500 transition"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white flex items-center justify-center transition shrink-0 shadow-md"
                  title="Post comment"
                >
                  {isSubmittingComment ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteDialogOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 mx-auto flex items-center justify-center mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-white font-semibold text-base mb-1">Delete Story?</h3>
              <p className="text-neutral-400 text-xs mb-5 leading-relaxed">
                Are you sure you want to delete this story? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteStory}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
