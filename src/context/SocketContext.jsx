// src/context/SocketContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "https://backend-jd8f.onrender.com");

const TOKEN_KEY = "altuvera_admin_token";

const getStoredToken = () => {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
};

export function SocketProvider({ children }) {
  const socketRef   = useRef(null);
  const [connected, setConnected]       = useState(false);
  const [socketId,  setSocketId]        = useState(null);
  const [apiReachable, setApiReachable] = useState(false);
  const healthTimerRef = useRef(null);

  const checkApiHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch('/api/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const ok = res.ok;
      setApiReachable(ok);
      return ok;
    } catch {
      setApiReachable(false);
      return false;
    }
  }, []);

  const startHealthCheck = useCallback(() => {
    checkApiHealth();
    healthTimerRef.current = setInterval(() => {
      checkApiHealth();
    }, 30_000);
  }, [checkApiHealth]);

  const stopHealthCheck = useCallback(() => {
    if (healthTimerRef.current) {
      clearInterval(healthTimerRef.current);
      healthTimerRef.current = null;
    }
  }, []);

  const connect = useCallback((token) => {
    if (socketRef.current?.connected) return socketRef.current;

    const authToken = token || getStoredToken();

    const socket = io(SOCKET_URL, {
      auth:                  authToken ? { token: authToken } : {},
      transports:            ["websocket", "polling"],
      reconnection:          true,
      reconnectionAttempts:  10,
      reconnectionDelay:     500,
      reconnectionDelayMax:  15_000,
      timeout:               15_000,
      forceNew:              false,
    });

    socket.on("connect", () => {
      setConnected(true);
      setSocketId(socket.id);
      if (import.meta.env.DEV) {
        console.info("[AdminSocket] Connected:", socket.id);
      }
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      setSocketId(null);
      if (import.meta.env.DEV) {
        console.info("[AdminSocket] Disconnected:", reason);
      }
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      if (import.meta.env.DEV) {
        console.warn("[AdminSocket] Connection error:", err.message);
      }
    });

    socketRef.current = socket;
    return socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setSocketId(null);
    }
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  const emit = useCallback((event, data, cb) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, cb);
    } else if (import.meta.env.DEV) {
      console.warn("[AdminSocket] emit() called but socket not connected:", event);
    }
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    startHealthCheck();
    return () => {
      disconnect();
      stopHealthCheck();
    };
  }, [connect, disconnect, startHealthCheck, stopHealthCheck]);

  const isOnline = connected || apiReachable;

  const value = {
    socket:    socketRef.current,
    connected,
    socketId,
    apiReachable,
    isOnline,
    connect,
    disconnect,
    getSocket,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
}

export default SocketContext;