import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, Camera, Edit3, Loader2, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../store/authStore.js";

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

const ProfilePage = () => {
  const { authUser, updateProfileInStore } = useAuthStore();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(authUser?.username || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [previewImage, setPreviewImage] = useState(authUser?.profileImage || "");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authUser && !isEditing) {
      setUsername(authUser.username || "");
      setBio(authUser.bio || "");
      setPreviewImage(authUser.profileImage || "");
      setSelectedImageFile(null);
    }
  }, [authUser, isEditing]);

  const handleStartEdit = () => {
    setUsername(authUser?.username || "");
    setBio(authUser?.bio || "");
    setPreviewImage(authUser?.profileImage || "");
    setSelectedImageFile(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setUsername(authUser?.username || "");
    setBio(authUser?.bio || "");
    setPreviewImage(authUser?.profileImage || "");
    setSelectedImageFile(null);
    setIsEditing(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
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

  const handleSaveChanges = async (e) => {
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
      setSelectedImageFile(null);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      {/* Back to chats navigation */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to chats
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Your profile</h1>
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode Form */
        <form onSubmit={handleSaveChanges} className="space-y-6">
          {/* Profile Picture (Editable) */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={previewImage || "/default-avatar.svg"}
                alt={username || "User avatar"}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-500/20 shadow-md bg-neutral-100 dark:bg-neutral-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className="absolute bottom-0 right-0 rounded-full bg-brand-500 p-2.5 text-white shadow-md hover:bg-brand-600 disabled:opacity-60 transition"
                aria-label="Change profile photo"
                title="Upload photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-neutral-400">Click the camera to upload a new picture</p>

            {/* Avatar Presets */}
            <div className="w-full mt-1">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                <span>Or pick an avatar preset</span>
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
                        className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 object-cover"
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
              <label className="text-sm font-semibold">Username</label>
              <span className="text-xs text-neutral-400">{username.length}/30</span>
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
              placeholder="Username"
            />
          </div>

          {/* Email Field (Non-editable) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Email
              </label>
              <span className="text-xs text-neutral-400">Not editable</span>
            </div>
            <input
              type="email"
              value={authUser?.email || ""}
              disabled
              readOnly
              className="w-full rounded-lg border border-neutral-200 bg-neutral-100/70 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 select-none"
            />
          </div>

          {/* Bio Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold">Bio</label>
              <span className="text-xs text-neutral-400">{bio.length}/160</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              maxLength={160}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 resize-none"
              placeholder="Tell people a little about yourself"
            />
          </div>

          {/* Action Buttons: Save Changes & Cancel */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 disabled:opacity-60 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-60 transition"
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
      ) : (
        /* View Mode */
        <div className="space-y-6">
          {/* Profile Picture, Username & Email */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={authUser?.profileImage || "/default-avatar.svg"}
              alt={authUser?.username || "Profile picture"}
              className="h-28 w-28 rounded-full object-cover ring-4 ring-neutral-200/60 dark:ring-neutral-800 shadow-md bg-neutral-100 dark:bg-neutral-800"
            />
            <div className="text-center space-y-0.5">
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {authUser?.username}
              </p>
              <p className="text-sm text-neutral-500">{authUser?.email}</p>
            </div>
          </div>

          {/* Bio Display */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Bio</label>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300 min-h-[4.5rem] whitespace-pre-wrap">
              {authUser?.bio?.trim() || "No bio added yet. Tell people a little about yourself"}
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-600 transition"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
