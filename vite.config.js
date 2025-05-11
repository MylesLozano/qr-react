import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "react-toastify",
            "react-virtualized-auto-sizer",
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["jspdf", "jspdf-autotable"],
    esbuildOptions: {
      target: "es2020",
    },
  },
});
