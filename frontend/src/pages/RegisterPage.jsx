import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore.js";

const RegisterPage = () => {
  const { register, isRegistering } = useAuthStore();
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const validate = () => {
    if (form.username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_ .-]+$/.test(form.username)) {
      toast.error("Username can only contain letters, numbers, spaces, underscores, hyphens, and dots");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error("Please enter a valid email");
      return false;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
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
          <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-neutral-500">Join ChatConnect in a few seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
              placeholder="e.g. Alice or Anbukkumaran A"
            />
            <p className="mt-1 text-xs text-neutral-400">Letters, numbers, spaces, underscores, hyphens and dots allowed</p>
          </div>

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
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full rounded-lg bg-brand-500 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isRegistering ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
