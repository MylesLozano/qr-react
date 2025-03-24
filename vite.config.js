import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// No more PostCSS here!
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000, // Set the port if needed
  },
});
