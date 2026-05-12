/**
 * SocketContext.jsx v2.3
 *
 * Changes vs v2.2:
 *  - Connects to BASE_URL (no /api, no namespace suffix)
 *  - polling-first transport for Render.com cold-start compatibility
 *  - Strict-mode double-invoke guard via initializedRef
 *  - Cross-tab token sync
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

/**
 * Socket connects to the BARE origin — no /api, no namespace suffix.
 * Strip /api if it was accidentally included in VITE_API_URL.
 */
const resolveSocketURL = () => {
  const raw =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL    ||
    "https://backend-jd8f.onrender.com";

  // Remove trailing slashes and any /api suffix
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

const MAX_RECONNECT   = 10;
const BASE_DELAY_MS   = 2_000;
const CONNECT_TIMEOUT = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const readToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch { /* localStorage unavailable */ }
  return null;
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

export const useSocket = useSocketContext;

// ─── Provider ────────────────────────────────────────────────────────────────

export function SocketProvider({ children }) {
  const [isConnected,       setIsConnected]       = useState(false);
  const [connectionError,   setConnectionError]   = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef      = useRef(null);
  const timerRef       = useRef(null);
  const destroyingRef  = useRef(false);
  const initializedRef = useRef(false); // strict-mode guard

  // ─── Build socket ─────────────────────────────────────────────────────────

  const buildSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    destroyingRef.current = false;
    const token = readToken();

    const socket = io(SOCKET_URL, {
      auth:   { token: token || undefined },

      // polling first → upgrades to websocket once handshake succeeds
      // prevents the "WebSocket closed before connection established"
      // race condition on Render.com SSL cold-starts
      transports:           ["polling", "websocket"],
      upgrade:              true,

      reconnection:         true,
      reconnectionAttempts: MAX_RECONNECT,
      reconnectionDelay:    BASE_DELAY_MS,
      reconnectionDelayMax: 15_000,
      randomizationFactor:  0.5,

      timeout:         CONNECT_TIMEOUT,
      withCredentials: true,
    });

    socket.on("connect", () => {
      if (destroyingRef.current) return;
      console.log("[Socket] Connected:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
    });

    socket.on("disconnect", (reason) => {
      if (destroyingRef.current) return;
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        timerRef.current = setTimeout(() => {
          if (!destroyingRef.current) socket.connect();
        }, BASE_DELAY_MS);
      }
    });

    socket.on("connect_error", (err) => {
      if (destroyingRef.current) return;
      console.error("[Socket] Connection error:", err.message);
      setConnectionError(err.message);
      setIsConnected(false);
    });

    socket.on("reconnect_attempt", (n) => {
      if (destroyingRef.current) return;
      console.log(`[Socket] Reconnect attempt ${n}/${MAX_RECONNECT}`);
      setReconnectAttempts(n);
      const t = readToken();
      socket.auth = { token: t || undefined };
    });

    socket.on("reconnect", (n) => {
      if (destroyingRef.current) return;
      console.log(`[Socket] Reconnected after ${n} attempt(s)`);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
    });

    socket.on("reconnect_failed", () => {
      if (destroyingRef.current) return;
      console.error("[Socket] Max reconnect attempts reached");
      setConnectionError("Unable to connect. Please refresh the page.");
      setReconnectAttempts(MAX_RECONNECT);
    });

    socket.on("error", (err) => {
      if (destroyingRef.current) return;
      console.error("[Socket] Error:", err);
    });

    socketRef.current = socket;
  }, []);

  // ─── Manual reconnect ─────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setConnectionError(null);
    setReconnectAttempts(0);
    setIsConnected(false);
    timerRef.current = setTimeout(() => buildSocket(), 300);
  }, [buildSocket]);

  // ─── Mount / unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    buildSocket();

    return () => {
      destroyingRef.current  = true;
      initializedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [buildSocket]);

  // ─── Cross-tab token changes ───────────────────────────────────────────────

  useEffect(() => {
    const onStorage = (e) => {
      if (!TOKEN_KEYS.includes(e.key)) return;

      const newToken = e.newValue || null;
      if (socketRef.current) {
        socketRef.current.auth = { token: newToken || undefined };
      }

      if (newToken && !isConnected)  reconnect();
      if (!newToken && isConnected && socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isConnected, reconnect]);

  // ─── Stable context value ─────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      get socket() { return socketRef.current; },
      isConnected,
      connectionError,
      reconnectAttempts,
      maxReconnectAttempts: MAX_RECONNECT,
      reconnect,
    }),
    [isConnected, connectionError, reconnectAttempts, reconnect],
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;