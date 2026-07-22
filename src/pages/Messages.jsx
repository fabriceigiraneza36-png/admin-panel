// admin/src/pages/Messages.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES v2.0 — Admin Live Chat with Travellers
// ═══════════════════════════════════════════════════════════════════════════════
// Major improvements over v1:
//  ✓ Inline styles → Tailwind (consistent, themeable, responsive)
//  ✓ FULLY RESPONSIVE: mobile shows list OR chat (drill-down), desktop shows both
//  ✓ Extracted ConversationRow, MessageBubble, EmojiPicker sub-components
//  ✓ Memoized derived state and callbacks
//  ✓ Better notification hygiene (rate-limit, cleanup)
//  ✓ Optimistic UI with automatic rollback on socket failure
//  ✓ Accessibility (aria-labels, focus states, keyboard shortcuts)
//  ✓ Cleaner socket lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, MoreVertical, RefreshCw,
} from "lucide-react";

import { useAuth }   from "@context/AuthContext";
import { useSocket } from "@context/SocketContext";
import { API_BASE }  from "@utils/constants";

/* ─── Auth ─────────────────────────────────────────────────────────────────── */

const TOKEN_KEY = "altuvera_admin_token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch { return null; }
};

const authFetch = (url, opts = {}) => {
  const token = getToken();
  return fetch(url, {
    credentials: "include",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
};

/* ─── Formatting ───────────────────────────────────────────────────────────── */

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

const fmtTimeShort = (d) =>
  d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";

const STATUS_TONE = {
  open:    { text: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
  closed:  { text: "text-slate-600",   bg: "bg-slate-100",   dot: "bg-slate-400"   },
  pending: { text: "text-amber-700",   bg: "bg-amber-100",   dot: "bg-amber-500"   },
};

const QUICK_EMOJIS           = ["👍", "❤️", "😂", "🎉", "👏", "😮", "👎", "🔥", "🙏", "✨", "😊", "😢"];
const DESKTOP_REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉"];

/* ─── Sub-components ───────────────────────────────────────────────────────── */

const ConversationRow = React.memo(function ConversationRow({
  conv, active, onSelect,
}) {
  const title =
    conv.subject ||
    (conv.bookingNumber ? `Booking ${conv.bookingNumber}` : conv.guestName) ||
    "Conversation";

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={`w-full text-left px-3 sm:px-4 py-3 border-b border-slate-100 transition
        ${active
          ? "bg-emerald-50 border-l-[3px] border-l-emerald-600"
          : "bg-white hover:bg-slate-50 border-l-[3px] border-l-transparent"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-slate-800 truncate flex-1">
          {title}
        </span>
        {conv.unreadAdmin > 0 && (
          <span className="bg-red-500 text-white rounded-full text-[10px] font-bold
                           min-w-[18px] h-[18px] px-1.5 grid place-items-center flex-shrink-0">
            {conv.unreadAdmin > 99 ? "99+" : conv.unreadAdmin}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 truncate">
        {conv.lastMessage || "No messages yet"}
      </p>
      <p className="mt-1 text-[10px] text-slate-400 truncate">
        {conv.guestName || conv.guestEmail || "Guest"} · {fmtTime(conv.lastMessageAt)}
      </p>
    </button>
  );
});

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1
                      rounded-full capitalize ${tone.text} ${tone.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {status}
    </span>
  );
}

function ReactionPills({ reactions }) {
  if (!reactions) return null;
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {reactions.map(([emoji, ids]) => (
        <span
          key={emoji}
          className="bg-slate-100 border border-slate-200 rounded-lg px-1.5 py-0.5 text-xs"
        >
          {emoji} {ids.length}
        </span>
      ))}
    </div>
  );
}

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200
                 rounded-2xl shadow-lg p-2 grid grid-cols-6 gap-1 z-50"
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="text-xl p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

const MessageBubble = React.memo(function MessageBubble({
  msg, mine, replyTo, onReact, onReply,
}) {
  const reactions = useMemo(() => {
    const r = msg.reactions || {};
    const entries = Object.entries(r).filter(([, ids]) => Array.isArray(ids) && ids.length > 0);
    return entries.length ? entries : null;
  }, [msg.reactions]);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[75%] group">
        {/* Reply reference */}
        {msg.replyToId && replyTo && (
          <div className={`text-[11px] text-slate-500 mb-1 pl-2 border-l-2 border-slate-300
                          ${mine ? "text-right border-l-0 border-r-2 pr-2" : ""}`}>
            <span className="font-medium">
              {replyTo.senderName || (replyTo.senderType === "admin" ? "Admin" : "Traveller")}
            </span>
            {": "}
            <span className="italic">
              {(replyTo.body || "").slice(0, 60)}
              {(replyTo.body || "").length > 60 ? "…" : ""}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className={`inline-block px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap
          break-words rounded-2xl
          ${mine
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
          }`}>
          {msg.body}
        </div>

        {/* Meta */}
        <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400
                        ${mine ? "justify-end" : "justify-start"}`}>
          <span>{msg.senderName || (mine ? "Admin" : "Traveller")}</span>
          <span>·</span>
          <span>{fmtTimeShort(msg.createdAt)}</span>
          {mine && msg.isRead && <CheckCheck size={12} className="text-emerald-600" />}
          {mine && !msg.isRead && !String(msg.id).startsWith("tmp-") && <Check size={12} />}
        </div>

        {/* Reactions */}
        <div className={mine ? "flex justify-end" : ""}>
          <ReactionPills reactions={reactions} />
        </div>

        {/* Quick actions (shown on hover on desktop, always on mobile) */}
        <div className={`flex gap-0.5 mt-1 opacity-60 sm:opacity-0 group-hover:opacity-100
                        transition-opacity ${mine ? "justify-end" : ""}`}>
          {DESKTOP_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onMouseDown={(e) => { e.preventDefault(); onReact(msg.id, emoji); }}
              className="text-sm p-1 rounded-md hover:bg-slate-100 transition"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); onReply(msg.id); }}
            className="text-[11px] text-slate-500 hover:text-slate-700 p-1 rounded-md
                       hover:bg-slate-100 transition inline-flex items-center gap-0.5"
            title="Reply"
          >
            <CornerUpLeft size={11} /> Reply
          </button>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function Messages() {
  const { user }                          = useAuth();
  const { connected, on, off, emit }      = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loadingList, setLoadingList]     = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [draft, setDraft]                 = useState("");
  const [filter, setFilter]               = useState("open");
  const [replyToId, setReplyToId]         = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const scrollRef       = useRef(null);
  const notifShownRef   = useRef(new Set());

  /* ── Desktop notifications ────────────────────────────────────────────── */

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const showDesktopNotification = useCallback((title, body, conversationId) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    const key = `${conversationId}-${Math.floor(Date.now() / 5000)}`; // rate-limit: 1 per 5s per conv
    if (notifShownRef.current.has(key)) return;
    notifShownRef.current.add(key);

    try {
      const n = new Notification(`Altuvera — ${title}`, {
        body,
        icon: "/favicon.ico",
        tag:  `conversation-${conversationId}`,
        requireInteraction: false,
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => notifShownRef.current.delete(key), 30_000);
    } catch { /* non-fatal */ }
  }, []);

  /* ── Load conversations ─────────────────────────────────────────────── */

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations?status=${filter}&limit=100`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConversations(data.data || []);
    } catch (err) {
      console.warn("[AdminMessages] list error:", err.message);
    } finally {
      setLoadingList(false);
    }
  }, [filter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* ── Open conversation ─────────────────────────────────────────────── */

  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setReplyToId(null);
    setLoadingMsgs(true);
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveConv(data.data);
      setMessages(data.data.messages || []);
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: "PATCH" })
        .catch(() => {});
    } catch (err) {
      console.warn("[AdminMessages] open error:", err.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const closeMobileChat = useCallback(() => {
    setActiveId(null);
    setActiveConv(null);
    setMessages([]);
  }, []);

  /* ── Reactions ─────────────────────────────────────────────────────── */

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!activeId) return;
    const msg = messages.find((m) => String(m.id) === String(messageId));
    const current = msg?.reactions?.[emoji] || [];
    const isAdd = !current.includes(user?.id?.toString() || "0");
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages/${messageId}/react`,
        { method: "PATCH", body: JSON.stringify({ emoji, add: isAdd }) }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? { ...m, reactions: data.data.reactions || {} }
              : m
          )
        );
      }
    } catch { /* silent */ }
  }, [activeId, messages, user?.id]);

  /* ── Send message ──────────────────────────────────────────────────── */

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!activeId || !text || sending) return;
    setSending(true);

    const optimistic = {
      id:             `tmp-${Date.now()}`,
      conversationId: activeId,
      senderType:     "admin",
      body:           text,
      senderName:     user?.full_name || "Admin",
      isRead:         false,
      reactions:      {},
      createdAt:      new Date().toISOString(),
      replyToId:      replyToId || undefined,
    };
    setMessages((prev) => [...prev, optimistic]);

    const outgoing = draft;
    const replyTo  = replyToId;
    setDraft("");
    setReplyToId(null);

    // Prefer socket
    if (connected && emit) {
      emit(
        "msg:admin-send",
        {
          conversationId: activeId,
          body:           outgoing,
          replyToId:      replyTo || undefined,
        },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimistic.id ? ack.message : m))
            );
          } else if (ack?.error) {
            // Rollback on ack error
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          }
        }
      );
      setSending(false);
      loadConversations();
      return;
    }

    // REST fallback
    const body = JSON.stringify({
      body: outgoing,
      ...(replyTo ? { replyToId: replyTo } : {}),
    });

    authFetch(`${API_BASE}/messages/conversations/${activeId}/messages`, {
      method: "POST", body,
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimistic.id ? data.data : m))
            );
          }
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        }
      })
      .catch(() => {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      })
      .finally(() => {
        setSending(false);
        loadConversations();
      });
  }, [
    activeId, draft, sending, connected, emit,
    user, loadConversations, replyToId,
  ]);

  /* ── Status change ─────────────────────────────────────────────────── */

  const changeStatus = useCallback(async (status) => {
    if (!activeId) return;
    try {
      await authFetch(`${API_BASE}/messages/conversations/${activeId}/status`, {
        method: "PATCH",
        body:   JSON.stringify({ status }),
      });
      setActiveConv((p) => (p ? { ...p, status } : p));
      loadConversations();
    } catch { /* silent */ }
  }, [activeId, loadConversations]);

  /* ── Socket listeners ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!on || !off) return;

    const onMessage = (msg) => {
      setMessages((prev) => {
        if (msg.conversationId !== activeId) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (document.hidden) {
        showDesktopNotification(
          "New message",
          msg.body?.slice(0, 120) || "You have a new message",
          msg.conversationId
        );
      }
    };

    const onNewFromUser = (payload) => {
      loadConversations();
      if (document.hidden) {
        showDesktopNotification(
          "New message from traveller",
          payload.message?.body?.slice(0, 120) || "New message",
          payload.conversationId
        );
      }
    };

    const onUpdated = (conv) => {
      setActiveConv((p) => (p && p.id === conv.id ? { ...p, ...conv } : p));
      loadConversations();
    };

    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, reactions: reactions || {} }
            : m
        )
      );
    };

    on("msg:message",              onMessage);
    on("msg:new-from-user",        onNewFromUser);
    on("msg:conversation-updated", onUpdated);
    on("msg:user-registered",      onNewFromUser);
    on("msg:reaction",             onReaction);

    return () => {
      off("msg:message",              onMessage);
      off("msg:new-from-user",        onNewFromUser);
      off("msg:conversation-updated", onUpdated);
      off("msg:user-registered",      onNewFromUser);
      off("msg:reaction",             onReaction);
    };
  }, [on, off, activeId, loadConversations, showDesktopNotification]);

  /* ── Auto-scroll ───────────────────────────────────────────────────── */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Derived ───────────────────────────────────────────────────────── */

  const convTitle = useCallback((c) =>
    c?.subject ||
    (c?.bookingNumber ? `Booking ${c.bookingNumber}` : c?.guestName) ||
    "Conversation",
  []);

  const replyMap = useMemo(() => {
    const map = new Map(messages.map((m) => [String(m.id), m]));
    return map;
  }, [messages]);

  const insertEmoji = useCallback((emoji) => {
    setDraft((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  /* ── Render ────────────────────────────────────────────────────────── */

  const showChatOnMobile = !!activeId;

  return (
    <div className="p-3 sm:p-6 h-full flex flex-col max-h-screen">
      {/* Header (hidden when mobile chat is open) */}
      <div className={`mb-3 sm:mb-4 ${showChatOnMobile ? "hidden md:block" : ""}`}>
        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare size={22} className="text-emerald-600" />
          Messages
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Live conversations with travellers about their bookings.
          {!connected && (
            <span className="ml-2 text-amber-600 font-semibold">· Offline</span>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 flex-1 min-h-0
                      md:grid-cols-[minmax(260px,340px)_1fr]">
        {/* ══════════ LIST ══════════ */}
        <div className={`bg-white border border-slate-200 rounded-2xl flex-col overflow-hidden
          ${showChatOnMobile ? "hidden md:flex" : "flex"}`}>
          {/* Filter tabs */}
          <div className="flex gap-1 p-2 border-b border-slate-100">
            {[
              { key: "open",   label: "Open"   },
              { key: "closed", label: "Closed" },
              { key: "all",    label: "All"    },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition
                  ${filter === f.key
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversations */}
          <div className="overflow-y-auto flex-1">
            {loadingList && conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No {filter === "all" ? "" : filter} conversations.
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conv={c}
                  active={c.id === activeId}
                  onSelect={openConversation}
                />
              ))
            )}
          </div>
        </div>

        {/* ══════════ CHAT ══════════ */}
        <div className={`bg-white border border-slate-200 rounded-2xl flex-col overflow-hidden
          ${showChatOnMobile ? "flex" : "hidden md:flex"}`}>
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 p-6 text-center">
              <div>
                <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to reply.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-3 sm:px-4 py-3 border-b border-slate-100
                              flex items-center gap-2 flex-shrink-0">
                {/* Back button (mobile) */}
                <button
                  onClick={closeMobileChat}
                  className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} className="text-slate-600" />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base text-slate-900 truncate">
                    {convTitle(activeConv)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    {activeConv.guestName || activeConv.guestEmail || "Guest"}
                    {activeConv.bookingNumber ? ` · Booking ${activeConv.bookingNumber}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={activeConv.status} />
                  {activeConv.status !== "closed" ? (
                    <button
                      onClick={() => changeStatus("closed")}
                      className="text-xs border border-slate-300 bg-white rounded-lg
                                 px-2.5 py-1 text-slate-600 hover:bg-slate-50 transition
                                 hidden sm:inline-block"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus("open")}
                      className="text-xs border border-emerald-500 bg-emerald-50 rounded-lg
                                 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100 transition
                                 hidden sm:inline-block"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50 space-y-3"
              >
                {loadingMsgs && messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-8">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      msg={m}
                      mine={m.senderType === "admin"}
                      replyTo={m.replyToId ? replyMap.get(String(m.replyToId)) : null}
                      onReact={toggleReaction}
                      onReply={setReplyToId}
                    />
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="p-2 sm:p-3 border-t border-slate-100 flex-shrink-0">
                {/* Reply preview */}
                {replyToId && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200
                                  rounded-xl px-3 py-2 mb-2">
                    <CornerUpLeft size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-600 flex-1 truncate">
                      Replying to:{" "}
                      {(() => {
                        const r = replyMap.get(String(replyToId));
                        return r
                          ? `${r.senderName || "message"} — ${(r.body || "").slice(0, 50)}`
                          : "message";
                      })()}
                    </span>
                    <button
                      onClick={() => setReplyToId(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label="Cancel reply"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex gap-2 items-end relative">
                  {/* Emoji picker button */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowEmojiPicker((p) => !p)}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white
                                 hover:bg-slate-50 text-slate-500 transition
                                 flex items-center justify-center"
                      title="Emoji"
                      aria-label="Insert emoji"
                    >
                      <Smile size={18} />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPicker
                        onPick={insertEmoji}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Type a reply…"
                    className="flex-1 resize-none text-sm px-3 py-2.5 rounded-xl border
                               border-slate-200 outline-none max-h-32
                               focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                               transition"
                  />

                  {/* Send button */}
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="h-10 px-4 sm:px-5 rounded-xl bg-emerald-600 text-white font-bold
                               text-sm flex items-center gap-1.5 flex-shrink-0
                               hover:bg-emerald-700 transition
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">{sending ? "…" : "Send"}</span>
                  </button>
                </div>

                {/* Mobile status controls */}
                <div className="flex sm:hidden gap-2 mt-2">
                  {activeConv.status !== "closed" ? (
                    <button
                      onClick={() => changeStatus("closed")}
                      className="text-xs border border-slate-300 bg-white rounded-lg
                                 px-3 py-1.5 text-slate-600 flex-1"
                    >
                      Close conversation
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus("open")}
                      className="text-xs border border-emerald-500 bg-emerald-50 rounded-lg
                                 px-3 py-1.5 text-emerald-700 flex-1"
                    >
                      Reopen conversation
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}