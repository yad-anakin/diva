import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        diva: {
          pink: "#f472b6",
          soft: "#fde7f3",
          deep: "#db2777",
        },
      },
      fontFamily: {
        display: ["var(--font-arabic)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
      },
      boxShadow: {
        soft: "0 10px 25px -5px rgba(219,39,119,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
