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
    if (validate()) register(form);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-surface-light px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
            <MessageCircle className="h-6 w-6 text-brand-500" />
          </div>
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
              placeholder="alice"
            />
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
