/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        highlight: "#ffc53b",
        primary: "#5e17eb",
        accent: "#4f003b",
        softPink: "#ff66c4",
      },
      animation: {
        "theme-fade": "themeFade 0.3s ease-in-out",
        "theme-slide": "themeSlide 0.4s ease-out",
        "progress-pulse":
          "progressPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        themeFade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        themeSlide: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        progressPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
      },
      transitionProperty: {
        theme: "background-color, border-color, color, fill, stroke",
      },
      transitionDuration: {
        250: "250ms",
        350: "350ms",
      },
      transitionTimingFunction: {
        theme: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
