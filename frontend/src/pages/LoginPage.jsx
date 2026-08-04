import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

const LoginPage = () => {
  const { login, isLoggingIn } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    login(form);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-surface-light px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
            <MessageCircle className="h-6 w-6 text-brand-500" />
          </div>
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
    </div>
  );
};

export default LoginPage;
