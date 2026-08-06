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

  // Validate required environment variables
  const requiredEnvVars = ["VITE_API_URL", "VITE_SOCKET_URL"];
  for (const varName of requiredEnvVars) {
    if (!env[varName]) {
      console.error(`��❌ Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

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
          target:       env.VITE_API_URL.replace(/\/api$/, ""),
          changeOrigin: true,
          secure:       true,
        },

        /**
         * Socket.IO proxy — WS upgrade + polling
         */
        "/socket.io": {
          target:       env.VITE_SOCKET_URL,
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

            // React core
            if (id.includes("react-dom"))            return "react-dom";
            if (id.includes("react-router"))         return "router";
            if (id.match(/[\\/]react[\\/]/))         return "react";

            // Redux stack
            if (id.includes("@reduxjs/toolkit") || id.includes("react-redux") || id.includes("redux")) {
              return "redux";
            }

            // Real-time
            if (id.includes("socket.io-client") || id.includes("engine.io-client")) {
              return "socket";
            }

            // UI libs
            if (id.includes("react-hot-toast")) return "toast";
            if (id.includes("lucide-react") || id.includes("react-icons")) return "icons";
            if (id.includes("framer-motion")) return "motion";

            // Charts (if you use any)
            if (id.includes("recharts") || id.includes("chart.js") || id.includes("d3")) {
              return "charts";
            }

            // Date libs
            if (id.includes("date-fns") || id.includes("dayjs") || id.includes("moment")) {
              return "date";
            }

            // HTTP
            if (id.includes("axios")) return "http";

            // Everything else from node_modules
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