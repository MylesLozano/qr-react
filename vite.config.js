import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000, // Set the port if needed
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 600, // Increased from default 500kb to accommodate vendor-firebase chunk
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
          ],
          "vendor-ui": ["react-toastify", "react-virtualized-auto-sizer"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
          "dashboard-common": [
            "./src/dashboard/BaseDashboard.jsx",
            "./src/components/LoadingSpinner.jsx",
            "./src/components/ErrorBoundary.jsx",
            "./src/components/Button.jsx",
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["jspdf", "jspdf-autotable"],
  },
});
