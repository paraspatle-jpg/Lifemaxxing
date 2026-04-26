/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "sans-serif"] },
      colors: {
        creativity: { DEFAULT: "#a855f7", light: "#f3e8ff", dark: "#7e22ce" },
        physicality: { DEFAULT: "#f97316", light: "#fff7ed", dark: "#c2410c" },
        mentality: { DEFAULT: "#3b82f6", light: "#eff6ff", dark: "#1d4ed8" },
        social: { DEFAULT: "#22c55e", light: "#f0fdf4", dark: "#15803d" },
      },
    },
  },
  plugins: [],
};
