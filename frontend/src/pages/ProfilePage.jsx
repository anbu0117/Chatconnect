import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../store/authStore.js";

const ProfilePage = () => {
  const { authUser, updateProfileInStore } = useAuthStore();
  const fileInputRef = useRef(null);

  const [bio, setBio] = useState(authUser?.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);

    setIsUploadingImage(true);
    try {
      const res = await axiosInstance.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateProfileInStore(res.data);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update photo");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleBioSave = async () => {
    setIsSavingBio(true);
    try {
      const formData = new FormData();
      formData.append("bio", bio);
      const res = await axiosInstance.put("/users/profile", formData);
      updateProfileInStore(res.data);
      toast.success("Bio updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update bio");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      await axiosInstance.put("/users/password", passwordForm);
      toast.success("Password changed");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500">
        <ArrowLeft className="h-4 w-4" /> Back to chats
      </Link>

      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Your profile</h1>

      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={authUser?.profileImage || "/default-avatar.svg"}
            alt={authUser?.username}
            className="h-28 w-28 rounded-full object-cover"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="absolute bottom-0 right-0 rounded-full bg-brand-500 p-2 text-white shadow-md hover:bg-brand-600 disabled:opacity-60"
            aria-label="Change profile photo"
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
        <p className="font-semibold">{authUser?.username}</p>
        <p className="text-sm text-neutral-500">{authUser?.email}</p>
      </div>

      <section className="mb-8">
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          maxLength={160}
          rows={3}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
          placeholder="Tell people a little about yourself"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{bio.length}/160</span>
          <button
            onClick={handleBioSave}
            disabled={isSavingBio}
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSavingBio ? "Saving..." : "Save bio"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Change password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              placeholder="Current password"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
              aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="New password (min. 6 characters)"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={isChangingPassword}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isChangingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
