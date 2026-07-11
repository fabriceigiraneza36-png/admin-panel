// context/ChatContext.jsx  — Fixed: uses conversations table + socket msg:admin-send
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, useMemo,
} from "react";
import { chatAPI }          from "../api/chat";
import { useSocketContext } from "./SocketContext";

const ChatCtx = createContext(null);
export const useChatContext = () => {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatContext must be inside <ChatProvider>");
  return ctx;
};

export function ChatProvider({ children }) {
  const { socket, isConnected } = useSocketContext();

  /* ── State ── */
  const [sessions,          setSessions]          = useState([]);
  const [selectedSession,   setSelectedSession]   = useState(null);
  const [messages,          setMessages]          = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending,         setIsSending]         = useState(false);
  const [typingUsers,       setTypingUsers]       = useState([]);
  const [unreadTotal,       setUnreadTotal]       = useState(0);
  const [allUsers,          setAllUsers]          = useState([]);
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false);

  const selectedRef = useRef(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep ref in sync
  useEffect(() => { selectedRef.current = selectedSession; }, [selectedSession]);

  /* ══════════════════════════════════════════════════════════
     FETCH ALL SESSIONS (conversations)
  ══════════════════════════════════════════════════════════ */
  const fetchSessions = useCallback(async (params = {}) => {
    if (!mountedRef.current) return;
    setIsLoadingSessions(true);
    try {
      const res = await chatAPI.getConversations({ status: "all", limit: 100, ...params });
      const data = res.data?.data ?? res.data ?? [];
      if (!mountedRef.current) return;
      setSessions(Array.isArray(data) ? data : []);
      // Sum unread
      const unread = (Array.isArray(data) ? data : []).reduce(
        (s, c) => s + (c.unreadAdmin ?? 0), 0,
      );
      setUnreadTotal(unread);
    } catch (err) {
      console.error("[ChatContext] fetchSessions:", err.message);
    } finally {
      if (mountedRef.current) setIsLoadingSessions(false);
    }
  }, []);

  const refreshSessions = useCallback(() => fetchSessions(), [fetchSessions]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  /* ══════════════════════════════════════════════════════════
     SELECT SESSION — load messages + join socket room
  ══════════════════════════════════════════════════════════ */
  const selectSession = useCallback(async (session) => {
    if (!session || !mountedRef.current) return;
    setSelectedSession(session);
    setMessages([]);
    setIsLoadingMessages(true);

    try {
      // Mark admin read via HTTP
      chatAPI.markRead(session.id).catch(() => {});

      // Load messages
      const res  = await chatAPI.getMessages(session.id);
      const data = res.data?.data ?? res.data ?? [];
      if (!mountedRef.current) return;
      setMessages(Array.isArray(data) ? data : []);

      // Update session unread count locally
      setSessions((prev) =>
        prev.map((s) => s.id === session.id ? { ...s, unreadAdmin: 0 } : s),
      );
      setUnreadTotal((p) => Math.max(0, p - (session.unreadAdmin ?? 0)));
    } catch (err) {
      console.error("[ChatContext] selectSession:", err.message);
    } finally {
      if (mountedRef.current) setIsLoadingMessages(false);
    }

    // Join socket room so we get real-time updates for this conversation
    if (socket) {
      socket.emit("msg:admin-join", {
        conversationId: session.id,
        sessionId:      session.sessionId,
      }, (ack) => {
        if (!mountedRef.current) return;
        if (ack?.messages) {
          setMessages(Array.isArray(ack.messages) ? ack.messages : []);
        }
      });
    }
  }, [socket]);

  const closeSession = useCallback(() => {
    setSelectedSession(null);
    setMessages([]);
  }, []);

  /* ══════════════════════════════════════════════════════════
     SEND MESSAGE — socket-first, HTTP fallback
  ══════════════════════════════════════════════════════════ */
  const sendMessage = useCallback(async (body) => {
    const text = String(body || "").trim();
    if (!text) return;

    const conv = selectedRef.current;
    if (!conv) return;

    setIsSending(true);

    // Optimistic bubble
    const optId = `opt-${Date.now()}`;
    const optMsg = {
      id:             optId,
      conversationId: conv.id,
      sessionId:      conv.sessionId,
      body:           text,
      senderType:     "admin",
      senderName:     "Support",
      isOptimistic:   true,
      isRead:         false,
      createdAt:      new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optMsg]);

    const removeOpt = () =>
      setMessages((prev) => prev.filter((m) => m.id !== optId));

    /* ── Socket path (preferred) ── */
    if (socket && isConnected) {
      socket.emit("msg:admin-send", {
        conversationId: conv.id,
        sessionId:      conv.sessionId,
        body:           text,
      }, (ack) => {
        if (!mountedRef.current) return;
        setIsSending(false);
        if (!ack?.success) {
          removeOpt();
          console.error("[ChatContext] msg:admin-send failed:", ack?.error);
          // Fall back to HTTP
          chatAPI.adminReply(conv.id, { body: text })
            .then((res) => {
              const saved = res.data?.data ?? res.data;
              if (saved) setMessages((prev) => [...prev.filter((m) => m.id !== optId), saved]);
            })
            .catch(console.error);
          return;
        }
        if (ack.message) {
          setMessages((prev) =>
            prev.map((m) => m.id === optId ? ack.message : m),
          );
        }
      });
      return;
    }

    /* ── HTTP fallback ── */
    try {
      const res  = await chatAPI.adminReply(conv.id, { body: text });
      const saved = res.data?.data ?? res.data;
      if (!mountedRef.current) return;
      if (saved) {
        setMessages((prev) => prev.map((m) => m.id === optId ? saved : m));
      }
    } catch (err) {
      console.error("[ChatContext] sendMessage HTTP fallback:", err.message);
      removeOpt();
    } finally {
      if (mountedRef.current) setIsSending(false);
    }
  }, [socket, isConnected]);

  /* ══════════════════════════════════════════════════════════
     STATUS UPDATE
  ══════════════════════════════════════════════════════════ */
  const updateSessionStatus = useCallback(async (sessionId, status) => {
    const conv = sessions.find(
      (s) => s.sessionId === sessionId || s.id === sessionId,
    );
    if (!conv) return;

    try {
      await chatAPI.updateStatus(conv.id, { status });
      setSessions((prev) =>
        prev.map((s) => (s.id === conv.id ? { ...s, status } : s)),
      );
      if (selectedRef.current?.id === conv.id) {
        setSelectedSession((p) => ({ ...p, status }));
      }
    } catch (err) {
      console.error("[ChatContext] updateSessionStatus:", err.message);
    }
  }, [sessions]);

  /* ══════════════════════════════════════════════════════════
     FETCH ALL USERS (for "New Conversation" modal)
  ══════════════════════════════════════════════════════════ */
  const fetchAllUsers = useCallback(async (search = "") => {
    if (!mountedRef.current) return;
    setIsLoadingAllUsers(true);
    try {
      const res  = await chatAPI.getUsers({ search, limit: 100 });
      const data = res.data?.data ?? res.data ?? [];
      if (mountedRef.current) setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ChatContext] fetchAllUsers:", err.message);
    } finally {
      if (mountedRef.current) setIsLoadingAllUsers(false);
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     START CONVERSATION WITH USER
  ══════════════════════════════════════════════════════════ */
  const startSessionWithUser = useCallback(async (user, message = "") => {
    try {
      const res  = await chatAPI.startWithUser({ userId: user.id, message });
      const data = res.data?.data ?? res.data;
      if (!data) return null;

      // Add/update in sessions list
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === data.id);
        return exists
          ? prev.map((s) => (s.id === data.id ? data : s))
          : [data, ...prev];
      });

      // Auto-select the new conversation
      setSelectedSession(data);
      setMessages(data.messages ?? []);
      return data;
    } catch (err) {
      console.error("[ChatContext] startSessionWithUser:", err.message);
      return null;
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     STUB actions (edit/delete/pin/react — extend as needed)
  ══════════════════════════════════════════════════════════ */
  const editAdminMessage   = useCallback(() => {}, []);
  const deleteAdminMessage = useCallback(() => {}, []);
  const pinAdminMessage    = useCallback(() => {}, []);
  const reactAdminMessage  = useCallback(() => {}, []);

  /* ══════════════════════════════════════════════════════════
     SOCKET LISTENERS — real-time updates
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (!mountedRef.current || !msg) return;
      const currentConvId = selectedRef.current?.id;

      // Add to active conversation
      if (msg.conversationId && currentConvId === msg.conversationId) {
        setMessages((prev) => {
          // Replace optimistic
          const optIdx = prev.findIndex(
            (m) => m.isOptimistic && m.body === msg.body && m.senderType === msg.senderType,
          );
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = { ...msg, isOptimistic: false };
            return next;
          }
          // Dedupe
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // Update sidebar (last message + unread)
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== msg.conversationId) return s;
          const isCurrentlyOpen = currentConvId === msg.conversationId;
          return {
            ...s,
            lastMessage:   msg.body,
            lastMessageAt: msg.createdAt,
            unreadAdmin:   (msg.senderType !== "admin" && !isCurrentlyOpen)
              ? (s.unreadAdmin ?? 0) + 1
              : s.unreadAdmin,
          };
        }),
      );

      // Update total unread badge
      if (msg.senderType !== "admin" && currentConvId !== msg.conversationId) {
        setUnreadTotal((p) => p + 1);
      }
    };

    const onNewFromUser = (data) => {
      if (!mountedRef.current) return;
      // New message from user — ensure session is in the list
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === data.conversationId);
        if (!exists) {
          fetchSessions(); // refresh to get the new session
        }
        return prev;
      });
    };

    const onRead = (data) => {
      if (!mountedRef.current) return;
      if (selectedRef.current?.id !== data.conversationId) return;
      if (data.readBy === "user") {
        setMessages((prev) =>
          prev.map((m) => m.senderType === "admin" ? { ...m, isRead: true } : m),
        );
      }
    };

    const onTyping = (data) => {
      if (!mountedRef.current) return;
      if (selectedRef.current?.id !== data.conversationId) return;
      if (data.senderType === "user") {
        if (data.isTyping) {
          setTypingUsers((prev) =>
            prev.includes(data.senderName) ? prev : [...prev, data.senderName],
          );
        } else {
          setTypingUsers((prev) => prev.filter((n) => n !== data.senderName));
        }
      }
    };

    const onSessionUpdated = (data) => {
      if (!mountedRef.current) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === data.conversationId || s.id === data.id
            ? { ...s, ...data }
            : s,
        ),
      );
    };

    const onUserRegistered = (data) => {
      if (!mountedRef.current) return;
      // New guest registered — add to session list if not present
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === data.conversationId);
        if (!exists) fetchSessions();
        return prev;
      });
    };

    socket.on("msg:message",              onMessage);
    socket.on("msg:new-from-user",        onNewFromUser);
    socket.on("msg:read",                 onRead);
    socket.on("msg:typing",               onTyping);
    socket.on("msg:conversation-updated", onSessionUpdated);
    socket.on("msg:user-registered",      onUserRegistered);

    // Legacy compat
    socket.on("chat:message",             onMessage);
    socket.on("new-chat-message",         onNewFromUser);

    return () => {
      socket.off("msg:message",              onMessage);
      socket.off("msg:new-from-user",        onNewFromUser);
      socket.off("msg:read",                 onRead);
      socket.off("msg:typing",               onTyping);
      socket.off("msg:conversation-updated", onSessionUpdated);
      socket.off("msg:user-registered",      onUserRegistered);
      socket.off("chat:message",             onMessage);
      socket.off("new-chat-message",         onNewFromUser);
    };
  }, [socket, fetchSessions]);

  /* ══════════════════════════════════════════════════════════
     CONTEXT VALUE
  ══════════════════════════════════════════════════════════ */
  const value = useMemo(() => ({
    sessions,
    isLoadingSessions,
    selectedSession,
    messages,
    isLoadingMessages,
    isSending,
    typingUsers,
    unreadTotal,
    allUsers,
    isLoadingAllUsers,
    selectSession,
    closeSession,
    sendMessage,
    refreshSessions,
    updateSessionStatus,
    startSessionWithUser,
    fetchAllUsers,
    editAdminMessage,
    deleteAdminMessage,
    pinAdminMessage,
    reactAdminMessage,
  }), [
    sessions, isLoadingSessions, selectedSession,
    messages, isLoadingMessages, isSending,
    typingUsers, unreadTotal,
    allUsers, isLoadingAllUsers,
    selectSession, closeSession, sendMessage,
    refreshSessions, updateSessionStatus,
    startSessionWithUser, fetchAllUsers,
    editAdminMessage, deleteAdminMessage,
    pinAdminMessage, reactAdminMessage,
  ]);

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export default ChatCtx;