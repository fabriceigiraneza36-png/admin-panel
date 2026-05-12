import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@":           path.resolve(__dirname, "./src"),
      "@api":        path.resolve(__dirname, "./src/api"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages":      path.resolve(__dirname, "./src/pages"),
      "@hooks":      path.resolve(__dirname, "./src/hooks"),
      "@context":    path.resolve(__dirname, "./src/context"),
      "@store":      path.resolve(__dirname, "./src/store"),
      "@utils":      path.resolve(__dirname, "./src/utils"),
      "@styles":     path.resolve(__dirname, "./src/styles"),
    },
  },

  server: {
    port: 5173,
    host: "localhost",
    open: true,

    // ── Fix: explicit HMR config stops Vite WS from appending app tokens ──
    hmr: {
      protocol:   "ws",
      host:       "localhost",
      port:       5173,
      clientPort: 5173,
      path:       "/__vite_hmr",   // isolated path, never collides with /socket.io
    },

    proxy: {
      /**
       * REST API proxy
       *
       * Request:  /api/messages/users
       * Rewrites: /api/messages/users  (no rewrite needed)
       * Forwards: https://backend-jd8f.onrender.com/api/messages/users  ✓
       *
       * IMPORTANT: target must be the BASE origin only (no /api suffix).
       * The /api prefix in the request path is preserved and forwarded as-is.
       */
      "/api": {
        target:       "https://backend-jd8f.onrender.com",
        changeOrigin: true,
        secure:       true,
        // No rewrite — the full /api/... path is forwarded to the target
      },

      /**
       * Socket.IO proxy
       * Forwards WebSocket upgrade + polling requests to the backend.
       */
      "/socket.io": {
        target:       "https://backend-jd8f.onrender.com",
        changeOrigin: true,
        ws:           true,
        secure:       true,
      },
    },
  },

  build: {
    outDir:    "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('socket.io-client')) return 'socket';
            if (id.includes('react-hot-toast')) return 'ui';
          }
        },
      },
    },
  },
});