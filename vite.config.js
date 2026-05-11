import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@api": path.resolve(__dirname, "./src/api"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@context": path.resolve(__dirname, "./src/context"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@styles": path.resolve(__dirname, "./src/styles"),
    },
  },
  server: {
    port: 5173,
    open: true, // ✅ THIS OPENS BROWSER AUTOMATICALLY
    proxy: {
      "/api": {
        target: "https://backend-jd8f.onrender.com/api",
        changeOrigin: true,
        secure: true,
      },
      "/socket.io": {
        target: "https://backend-jd8f.onrender.com",
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    },
  },
});