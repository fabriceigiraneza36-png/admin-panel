// admin/vite.config.js
// ═══════════════════════════════════════════════════════════════════════════════
// VITE CONFIG v2.0 — Production-Optimized for Vercel
// ═══════════════════════════════════════════════════════════════════════════════
// - Dev proxy preserved (REST /api + Socket.IO)
// - Isolated HMR path (won't collide with /socket.io)
// - Smart chunk splitting for smaller vendor bundles
// - Terser minification with console/debugger stripping in prod
// - Correct base path + asset naming for Vercel CDN
// ═══════════════════════════════════════════════════════════════════════════════

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";

  // Public defaults keep local/CI builds functional; production Vercel settings override these.
  const apiUrl = (env.VITE_API_URL || "https://backend-jd8f.onrender.com").replace(/\/+$/, "");
  const socketUrl = (env.VITE_SOCKET_URL || apiUrl.replace(/\/api$/, "")).replace(/\/+$/, "");

  return {
    plugins: [react()],

    // ── Base path (root deploy on Vercel) ─────────────────────────────────────
    base: "/",

    // ── Path aliases ──────────────────────────────────────────────────────────
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

    // ── Dev server (local only, ignored by Vercel) ────────────────────────────
    server: {
      port: 5173,
      host: "localhost",
      open: true,

      // Explicit HMR — isolated path so it never collides with /socket.io
      hmr: {
        protocol:   "ws",
        host:       "localhost",
        port:       5173,
        clientPort: 5173,
        path:       "/__vite_hmr",
      },

      proxy: {
        /**
         * REST API proxy
         * Request:  /api/messages/users
         * Forwards: VITE_API_URL + "/api/messages/users"
         */
        "/api": {
          target:       apiUrl.replace(/\/api$/, ""),
          changeOrigin: true,
          secure:       true,
        },

        /**
         * Socket.IO proxy — WS upgrade + polling
         */
        "/socket.io": {
          target:       socketUrl,
          changeOrigin: true,
          ws:           true,
          secure:       true,
        },
      },
    },

    // ── Preview server (npm run preview) ──────────────────────────────────────
    preview: {
      port: 4173,
      host: "localhost",
      open: true,
    },

    // ── Build ─────────────────────────────────────────────────────────────────
    build: {
      outDir:        "dist",
      assetsDir:     "assets",
      sourcemap:     isProd ? "hidden" : false, // Hidden sourcemaps for production debugging
      minify:        "terser",
      cssMinify:     true,
      cssCodeSplit:  true,
      target:        "es2020",
      chunkSizeWarningLimit: 500, // More conservative limit to catch large bundles earlier
      reportCompressedSize:  false, // Speeds up build on Vercel

      terserOptions: {
        compress: {
          drop_console:  isProd,      // Strip console.* in prod
          drop_debugger: isProd,
          pure_funcs:    isProd ? ["console.log", "console.info", "console.debug"] : [],
        },
        format: {
          comments: false,
        },
      },

      rollupOptions: {
        output: {
          // ── Smart chunk splitting ─────────────────────────────────────────
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            const normalizedId = id.split(String.fromCharCode(92)).join("/");

            // Keep framework and state packages in stable shared chunks.
            if (normalizedId.includes("/node_modules/react-dom/")) return "react-dom";
            if (normalizedId.includes("/node_modules/react-router")) return "router";
            if (normalizedId.includes("/node_modules/react/")) return "react";
            if (normalizedId.includes("/node_modules/@reduxjs/toolkit/") || normalizedId.includes("/node_modules/react-redux/") || normalizedId.includes("/node_modules/redux/")) return "redux";

            // Isolate substantial optional UI packages; route-level lazy loading keeps
            // page-only dependencies from inflating the initial dashboard bundle.
            if (normalizedId.includes("/node_modules/@tiptap/") || normalizedId.includes("/node_modules/prosemirror-")) return "editor";
            if (normalizedId.includes("/node_modules/@headlessui/")) return "headless-ui";
            if (normalizedId.includes("/node_modules/emoji-picker-react/")) return "emoji-picker";

            // Real-time and presentation libraries.
            if (normalizedId.includes("/node_modules/socket.io-client/") || normalizedId.includes("/node_modules/engine.io-client/")) return "socket";
            if (normalizedId.includes("/node_modules/react-hot-toast/")) return "toast";
            if (normalizedId.includes("/node_modules/lucide-react/") || normalizedId.includes("/node_modules/react-icons/")) return "icons";
            if (normalizedId.includes("/node_modules/framer-motion/")) return "motion";
            if (normalizedId.includes("/node_modules/recharts/") || normalizedId.includes("/node_modules/chart.js/") || normalizedId.includes("/node_modules/d3-")) return "charts";
            if (normalizedId.includes("/node_modules/date-fns/") || normalizedId.includes("/node_modules/dayjs/") || normalizedId.includes("/node_modules/moment/")) return "date";
            if (normalizedId.includes("/node_modules/axios/")) return "http";

            return "vendor";
          },

          // ── Hashed filenames for aggressive CDN caching ───────────────────
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },

    // ── Dependency pre-bundling ───────────────────────────────────────────────
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "react-redux",
        "@reduxjs/toolkit",
        "socket.io-client",
        "react-hot-toast",
      ],
    },

    // ── Env prefix (default: VITE_) ───────────────────────────────────────────
    envPrefix: "VITE_",
  };
});