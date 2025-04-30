/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // ← enable dark mode using class strategy
  theme: {
    extend: {
      colors: {
        // Optional: include your custom harmonized colors
        highlight: "#ffc53b",
        primary: "#5e17eb",
        accent: "#4f003b",
        softPink: "#ff66c4",
      },
    },
  },
  plugins: [],
};
