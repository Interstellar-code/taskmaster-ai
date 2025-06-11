import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          // Log proxy target for debugging
          console.log(`🔗 API Proxy: ${options.target}`);
        }
      },
      '/health': {
        target: process.env.VITE_API_URL || `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
}));
