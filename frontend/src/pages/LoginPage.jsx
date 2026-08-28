import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, EyeOff, X, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

const LoginPage = () => {
  const { login, isLoggingIn, forgotPassword, resetPassword, isSendingOTP, isResettingPassword } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Send OTP, 2: Reset Password
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    login(form);
  };

  const handleOpenForgotModal = () => {
    setResetEmail(form.email || "");
    setResetStep(1);
    setOtp("");
    setNewPassword("");
    setDevOtpHint("");
    setShowForgotModal(true);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    const res = await forgotPassword(resetEmail);
    if (res.success) {
      if (res.otp) {
        setDevOtpHint(res.otp);
      }
      setResetStep(2);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail || !otp || !newPassword) return;
    const success = await resetPassword({ email: resetEmail, otp, newPassword });
    if (success) {
      setForm((prev) => ({ ...prev, email: resetEmail, password: "" }));
      setShowForgotModal(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-surface-light px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/chatconnect-logo.png"
            alt="ChatConnect Logo"
            className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover shadow-md ring-1 ring-neutral-200 dark:ring-neutral-700"
          />
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to keep the conversation going</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 pr-10 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1 text-right">
              <button
                type="button"
                onClick={handleOpenForgotModal}
                className="text-xs font-semibold text-brand-500 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-lg bg-brand-500 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-brand-500 hover:underline">
            Create one
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-surface-dark dark:text-neutral-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">Reset Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter your account email address. We will generate a 6-digit password reset code for you.
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium">Account Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 rounded-lg border border-neutral-300 py-2 font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingOTP}
                    className="w-1/2 rounded-lg bg-brand-500 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                  >
                    {isSendingOTP ? "Sending Code..." : "Send Reset Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter the 6-digit code sent to <strong className="text-neutral-900 dark:text-neutral-100">{resetEmail}</strong> and choose a new password.
                </p>

                {devOtpHint && (
                  <div className="flex items-center gap-2 rounded-xl bg-brand-500/10 p-3 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Demo OTP Code: <strong className="text-sm font-bold tracking-widest">{devOtpHint}</strong></span>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">6-Digit Reset Code (OTP)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-center text-lg tracking-widest font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 pr-10 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="w-1/2 rounded-lg border border-neutral-300 py-2 font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-1/2 rounded-lg bg-brand-500 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                  >
                    {isResettingPassword ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

