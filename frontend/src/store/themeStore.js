import { create } from "zustand";

const STORAGE_KEY = "chatconnect-theme";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage?.getItem(STORAGE_KEY);
  if (saved) return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyThemeClass = (theme) => {
  const root = window.document.documentElement;
  root.classList.toggle("dark", theme === "dark");
};

const initialTheme = getInitialTheme();
if (typeof window !== "undefined") applyThemeClass(initialTheme);

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    window.localStorage?.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
    set({ theme: next });
  },
}));
