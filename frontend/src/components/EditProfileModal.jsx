import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Sparkles, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore.js";
import { axiosInstance } from "../lib/axios.js";

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Spark",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo",
  "https://api.dicebear.com/7.x/micah/svg?seed=Alex",
  "https://api.dicebear.com/7.x/micah/svg?seed=Sam",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
];

const EditProfileModal = ({ isOpen, onClose }) => {
  const { authUser, updateProfileInStore } = useAuthStore();
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authUser && isOpen) {
      setUsername(authUser.username || "");
      setBio(authUser.bio || "");
      setPreviewImage(authUser.profileImage || "");
      setSelectedImageFile(null);
    }
  }, [authUser, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setSelectedImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSelectPreset = (url) => {
    setSelectedImageFile(null);
    setPreviewImage(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      toast.error("Username cannot be empty");
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      toast.error("Username must be between 3 and 30 characters");
      return;
    }

    setIsSaving(true);
    try {
      let res;
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("username", trimmedUsername);
        formData.append("bio", bio.trim());
        formData.append("profileImage", selectedImageFile);

        res = await axiosInstance.put("/users/profile", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axiosInstance.put("/users/profile", {
          username: trimmedUsername,
          bio: bio.trim(),
          profileImage: previewImage,
        });
      }

      updateProfileInStore(res.data);
      toast.success("Profile updated successfully!");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Profile</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Customize your public appearance in ChatConnect
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img
                src={previewImage || "/default-avatar.svg"}
                alt="Avatar preview"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/20 shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-brand-500 p-2 text-white shadow hover:bg-brand-600 transition"
                title="Upload custom image"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Avatar Presets */}
            <div className="w-full">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                <span>Or choose an avatar style</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {AVATAR_PRESETS.map((preset, idx) => {
                  const isSelected = previewImage === preset;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative shrink-0 rounded-full p-0.5 transition ${
                        isSelected
                          ? "ring-2 ring-brand-500 scale-105"
                          : "opacity-75 hover:opacity-100 hover:scale-105"
                      }`}
                    >
                      <img
                        src={preset}
                        alt={`Preset ${idx + 1}`}
                        className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-500/30">
                          <Check className="h-4 w-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Username
              </label>
              <span className="text-[11px] text-neutral-400">{username.length}/30</span>
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_rivera"
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:text-white"
            />
          </div>

          {/* Bio Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Bio / Status
              </label>
              <span className="text-[11px] text-neutral-400">{bio.length}/160</span>
            </div>
            <textarea
              rows={3}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell others what you're up to..."
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:scale-95 disabled:opacity-50 transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
