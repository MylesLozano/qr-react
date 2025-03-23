import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No more PostCSS here!
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Set the port if needed
  },
});
