import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Globe,
  Users,
  CheckSquare,
  Square,
  Search,
  ChevronLeft,
  Upload,
  ImageIcon,
  VideoIcon,
  Loader2,
} from "lucide-react";
import { useStoryStore } from "../store/storyStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

/**
 * StoryUploadModal
 * Multi-step modal for uploading a story with pre-upload privacy selection.
 *
 * Step 1 – Preview: shows selected media + optional caption
 * Step 2 – Privacy: Everyone vs Close Friends (with friend picker)
 */
const StoryUploadModal = ({ file, onClose }) => {
  const { uploadStory, isUploadingStory } = useStoryStore();

  // ── local state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1 = preview, 2 = privacy
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("everyone");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  // Friend picker state
  const [friends, setFriends] = useState([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Preview URL
  const [previewUrl, setPreviewUrl] = useState(null);
  const isVideo = file?.type?.startsWith("video/");

  // ── generate preview on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── load friends when user picks "Close Friends" ─────────────────────────
  useEffect(() => {
    if (visibility !== "closeFriends") return;
    const fetchFriends = async () => {
      setIsFriendsLoading(true);
      try {
        const res = await axiosInstance.get("/users");
        setFriends(res.data || []);
      } catch (err) {
        toast.error("Failed to load friends list");
      } finally {
        setIsFriendsLoading(false);
      }
    };
    fetchFriends();
  }, [visibility]);

  // ── derived: filtered friends list based on search ───────────────────────
  const filteredFriends = friends.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── friend selection helpers ─────────────────────────────────────────────
  const toggleFriend = (id) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedFriendIds(filteredFriends.map((u) => u._id));
  const deselectAll = () => setSelectedFriendIds([]);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (visibility === "closeFriends" && selectedFriendIds.length === 0) {
      toast.error("Please select at least one close friend");
      return;
    }
    await uploadStory(file, caption.trim(), visibility, selectedFriendIds);
    onClose();
  };

  // ── close guard ──────────────────────────────────────────────────────────
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isUploadingStory) onClose();
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="btn btn-ghost btn-sm btn-circle"
              disabled={isUploadingStory}
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <div className="w-8" />
          )}
          <h2 className="font-bold text-base">
            {step === 1 ? "New Story" : "Story Privacy"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isUploadingStory}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Step 1: Preview + Caption ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Media preview */}
            <div className="relative bg-black flex items-center justify-center min-h-[240px] max-h-[380px] overflow-hidden">
              {previewUrl ? (
                isVideo ? (
                  <video
                    src={previewUrl}
                    className="max-h-[380px] w-full object-contain"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="max-h-[380px] w-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-base-content/40 py-16">
                  {isVideo ? <VideoIcon size={48} /> : <ImageIcon size={48} />}
                  <span className="text-sm">Loading preview…</span>
                </div>
              )}
              {/* Media type badge */}
              <span className="absolute top-2 left-2 badge badge-sm bg-black/50 text-white border-0 gap-1">
                {isVideo ? <VideoIcon size={10} /> : <ImageIcon size={10} />}
                {isVideo ? "Video" : "Image"}
              </span>
            </div>

            {/* Caption */}
            <div className="px-5 py-4">
              <label className="label pb-1">
                <span className="label-text text-xs font-medium">Caption (optional)</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption…"
                maxLength={200}
                rows={2}
                className="textarea textarea-bordered w-full resize-none text-sm"
              />
              <p className="text-xs text-base-content/40 text-right mt-1">
                {caption.length}/200
              </p>
            </div>

            {/* Next button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary w-full"
                disabled={!previewUrl}
              >
                Next: Choose Privacy →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Privacy Screen ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-sm text-base-content/60">
                Who can see your story?
              </p>

              {/* Everyone option */}
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  visibility === "everyone"
                    ? "border-primary bg-primary/10"
                    : "border-base-300 hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  className="hidden"
                  value="everyone"
                  checked={visibility === "everyone"}
                  onChange={() => {
                    setVisibility("everyone");
                    setSelectedFriendIds([]);
                  }}
                />
                <div className={`p-2 rounded-full ${visibility === "everyone" ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                  <Globe size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Everyone</p>
                  <p className="text-xs text-base-content/50">
                    All your connections can see this story
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${visibility === "everyone" ? "border-primary bg-primary" : "border-base-300"}`}>
                  {visibility === "everyone" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              {/* Close Friends option */}
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  visibility === "closeFriends"
                    ? "border-secondary bg-secondary/10"
                    : "border-base-300 hover:border-secondary/40"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  className="hidden"
                  value="closeFriends"
                  checked={visibility === "closeFriends"}
                  onChange={() => setVisibility("closeFriends")}
                />
                <div className={`p-2 rounded-full ${visibility === "closeFriends" ? "bg-secondary text-secondary-content" : "bg-base-200"}`}>
                  <Users size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Close Friends</p>
                  <p className="text-xs text-base-content/50">
                    Only selected friends can see this story
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${visibility === "closeFriends" ? "border-secondary bg-secondary" : "border-base-300"}`}>
                  {visibility === "closeFriends" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>
            </div>

            {/* ── Friend Picker (shown when closeFriends selected) ── */}
            {visibility === "closeFriends" && (
              <div className="flex flex-col flex-1 overflow-hidden border-t border-base-300">
                {/* Search + bulk actions */}
                <div className="px-5 pt-3 pb-2 flex flex-col gap-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search friends…"
                      className="input input-bordered input-sm w-full pl-9"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-base-content/50">
                      {selectedFriendIds.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="btn btn-xs btn-ghost text-primary"
                        disabled={isFriendsLoading}
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="btn btn-xs btn-ghost"
                        disabled={isFriendsLoading || selectedFriendIds.length === 0}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Friend list */}
                <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-[120px] max-h-[220px]">
                  {isFriendsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-secondary" />
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <p className="text-center text-sm text-base-content/40 py-8">
                      {searchQuery ? "No friends match your search" : "No friends found"}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {filteredFriends.map((user) => {
                        const isSelected = selectedFriendIds.includes(user._id);
                        return (
                          <li key={user._id}>
                            <button
                              onClick={() => toggleFriend(user._id)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                                isSelected
                                  ? "bg-secondary/15 hover:bg-secondary/25"
                                  : "hover:bg-base-200"
                              }`}
                            >
                              <img
                                src={user.profileImage || "/avatar.png"}
                                alt={user.username}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              />
                              <span className="flex-1 text-sm font-medium truncate">
                                {user.username}
                              </span>
                              {isSelected ? (
                                <CheckSquare size={18} className="text-secondary flex-shrink-0" />
                              ) : (
                                <Square size={18} className="text-base-content/30 flex-shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── Share Story button ── */}
            <div className="px-5 py-4 border-t border-base-300">
              <button
                onClick={handleSubmit}
                disabled={
                  isUploadingStory ||
                  (visibility === "closeFriends" && selectedFriendIds.length === 0)
                }
                className="btn btn-primary w-full gap-2"
              >
                {isUploadingStory ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Share Story
                  </>
                )}
              </button>
              {visibility === "closeFriends" && selectedFriendIds.length === 0 && (
                <p className="text-xs text-error text-center mt-2">
                  Select at least one friend to continue
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryUploadModal;
