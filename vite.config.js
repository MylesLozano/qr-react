import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// No more PostCSS here!
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000, // Set the port if needed
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      external: ['jspdf', 'jspdf-autotable'],
      output: {
        globals: {
          jspdf: 'jsPDF',
          'jspdf-autotable': 'jsPDFAutoTable'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable']
  }
});
