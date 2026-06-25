/**
 * SocketContext.jsx v2.4
 *
 * Key fixes vs v2.3:
 *  - WebSocket-only transport (no polling) — eliminates 400 errors on Render.com
 *  - Exponential back-off with jitter instead of flat reconnectionDelay
 *  - Deduped event registration via a single attach/detach cycle
 *  - Health-check ping keeps the Render dyno awake (prevents cold-start drops)
 *  - Auth token refreshed on every reconnect attempt
 *  - Visibility-change reconnect (tab refocus after dyno sleep)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { io } from "socket.io-client";

// ─── Config ───────────────────────────────────────────────────────────────────

const resolveSocketURL = () => {
  const raw =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "https://backend-jd8f.onrender.com";

  // Strip trailing slash and /api suffix
  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
};

const SOCKET_URL = resolveSocketURL();

const TOKEN_KEYS = [
  import.meta.env.VITE_TOKEN_KEY,
  "altuvera_admin_token",
  "adminToken",
  "admin_token",
  "authToken",
  "token",
].filter(Boolean);

const MAX_RECONNECT    = 8;
const CONNECT_TIMEOUT  = 20_000;
const PING_INTERVAL_MS = 25_000; // keep Render dyno alive

// ─── Helpers ─────────────────────────────────────────────────────────────────

const readToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    /* localStorage unavailable in SSR / sandboxed iframe */
  }
  return null;
};

/** Exponential back-off with ±30 % jitter — avoids thundering-herd reconnects */
const backoffMs = (attempt) => {
  const base = Math.min(1_000 * 2 ** attempt, 30_000);
  return base * (0.7 + Math.random() * 0.6);
};

// ─── Context ─────────────────────────────────────────────────────────────────

const DEFAULT_CTX = {
  socket:               null,
  isConnected:          false,
  connectionError:      null,
  reconnectAttempts:    0,
  maxReconnectAttempts: MAX_RECONNECT,
  reconnect:            () => {},
};

export const SocketContext = createContext(DEFAULT_CTX);

export const useSocketContext = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketContext must be inside <SocketProvider>");
  return ctx;
};

// Alias so both import styles work
export const useSocket = useSocketContext;

// ─── Provider ────────────────────────────────────────────────────────────────

export function SocketProvider({ children }) {
  const [isConnected,       setIsConnected]       = useState(false);
  const [connectionError,   setConnectionError]   = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef      = useRef(null);
  const pingRef        = useRef(null);
  const reconnTimerRef = useRef(null);
  const destroyingRef  = useRef(false);
  const initializedRef = useRef(false); // React 18 StrictMode guard
  const attemptRef     = useRef(0);

  // ─── Ping timer ───────────────────────────────────────────────────────────
  // Sends a lightweight event so Render doesn't kill the idle dyno connection.

  const startPing = useCallback(() => {
    stopPing();
    pingRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("ping");
      }
    }, PING_INTERVAL_MS);
  }, []);

  const stopPing = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  }, []);

  // ─── Build (or rebuild) the socket ────────────────────────────────────────

  const buildSocket = useCallback(() => {
    // Tear down any existing socket cleanly
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopPing();
    destroyingRef.current = false;

    const token = readToken();

    /**
     * TRANSPORT FIX
     * =============
     * Render.com rejects the polling→websocket *upgrade* handshake (HTTP 400).
     * Using websocket-only avoids polling entirely.
     * `upgrade: false` tells socket.io-client not to attempt any transport switch.
     */
    const socket = io(SOCKET_URL, {
      transports:  ["websocket"], // ← websocket only; no polling
      upgrade:     false,         // ← never try to switch transport

      auth: { token: token || undefined },

      // Socket.IO built-in reconnection is disabled — we manage it ourselves
      // so we can inject fresh tokens and use custom back-off.
      reconnection: false,

      timeout:         CONNECT_TIMEOUT,
      withCredentials: true,
    });

    // ── Event handlers ──────────────────────────────────────────────────────

    socket.on("connect", () => {
      if (destroyingRef.current) return;
      console.log("[Socket] Connected:", socket.id);
      attemptRef.current = 0;
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      startPing();
    });

    socket.on("disconnect", (reason) => {
      if (destroyingRef.current) return;
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
      stopPing();

      // "io server disconnect" = server deliberately kicked us (e.g. auth fail)
      // Don't auto-reconnect in that case unless the token changes.
      if (reason !== "io server disconnect") {
        scheduleReconnect();
      }
    });

    socket.on("connect_error", (err) => {
      if (destroyingRef.current) return;
      console.warn("[Socket] connect_error:", err.message);
      setConnectionError(err.message);
      setIsConnected(false);
      stopPing();
      scheduleReconnect();
    });

    socket.on("error", (err) => {
      if (destroyingRef.current) return;
      console.error("[Socket] Server error:", err);
    });

    socketRef.current = socket;
  }, [startPing, stopPing]); // scheduleReconnect defined below

  // ─── Custom reconnect scheduler ───────────────────────────────────────────

  const scheduleReconnect = useCallback(() => {
    if (destroyingRef.current) return;
    if (reconnTimerRef.current) return; // already pending

    attemptRef.current += 1;

    if (attemptRef.current > MAX_RECONNECT) {
      console.error("[Socket] Max reconnect attempts reached");
      setConnectionError("Unable to connect. Please refresh the page.");
      setReconnectAttempts(MAX_RECONNECT);
      return;
    }

    const delay = backoffMs(attemptRef.current);
    console.log(
      `[Socket] Reconnecting in ${Math.round(delay)}ms (attempt ${attemptRef.current}/${MAX_RECONNECT})`
    );
    setReconnectAttempts(attemptRef.current);

    reconnTimerRef.current = setTimeout(() => {
      reconnTimerRef.current = null;
      if (!destroyingRef.current) {
        // Inject fresh token before each attempt
        const t = readToken();
        if (socketRef.current) {
          socketRef.current.auth = { token: t || undefined };
        }
        buildSocket();
      }
    }, delay);
  }, [buildSocket]);

  // Re-attach scheduleReconnect into buildSocket's closure via ref so we don't
  // create a circular dependency in useCallback deps.
  const scheduleReconnectRef = useRef(scheduleReconnect);
  useEffect(() => { scheduleReconnectRef.current = scheduleReconnect; }, [scheduleReconnect]);

  // ─── Public manual reconnect ──────────────────────────────────────────────

  const reconnect = useCallback(() => {
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
    attemptRef.current = 0;
    setConnectionError(null);
    setReconnectAttempts(0);
    buildSocket();
  }, [buildSocket]);

  // ─── Mount / unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    // StrictMode in dev calls effects twice; the ref prevents a double socket.
    if (initializedRef.current) return;
    initializedRef.current = true;

    buildSocket();

    return () => {
      destroyingRef.current  = true;
      initializedRef.current = false;

      stopPing();

      if (reconnTimerRef.current) {
        clearTimeout(reconnTimerRef.current);
        reconnTimerRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [buildSocket, stopPing]);

  // ─── Reconnect when tab becomes visible again ─────────────────────────────
  // Render dynos may drop the WS connection while the tab is in the background.

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && !socketRef.current?.connected) {
        console.log("[Socket] Tab visible — reconnecting…");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reconnect]);

  // ─── Cross-tab token sync ─────────────────────────────────────────────────

  useEffect(() => {
    const onStorage = (e) => {
      if (!TOKEN_KEYS.includes(e.key)) return;

      const newToken = e.newValue || null;

      // Update auth on the live socket so the next reconnect uses it
      if (socketRef.current) {
        socketRef.current.auth = { token: newToken || undefined };
      }

      if (newToken && !isConnected) {
        reconnect();
      } else if (!newToken && isConnected && socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isConnected, reconnect]);

  // ─── Context value ────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      // Expose via getter so consumers always get the current socket ref
      get socket() {
        return socketRef.current;
      },
      isConnected,
      connectionError,
      reconnectAttempts,
      maxReconnectAttempts: MAX_RECONNECT,
      reconnect,
    }),
    [isConnected, connectionError, reconnectAttempts, reconnect]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;