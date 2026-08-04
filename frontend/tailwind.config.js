/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Signature palette: deep indigo/violet accent on a clean neutral base.
        // Deliberately avoiding both the cream+terracotta and black+neon defaults.
        brand: {
          50: "#f2f1fd",
          100: "#e6e4fb",
          200: "#c3bef5",
          300: "#a098ee",
          400: "#7c6fe6",
          500: "#5b4bdb", // primary accent — sent bubbles, links, active states
          600: "#4837c2",
          700: "#392b98",
          800: "#2a2071",
          900: "#1b154a",
        },
        surface: {
          light: "#fafafa",
          dark: "#14141a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
