// admin/src/pages/Messages.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@context/AuthContext";
import { useSocket } from "@context/SocketContext";
import { API_BASE } from "@utils/constants";

const TOKEN_KEY = "altuvera_admin_token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
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

const fmtTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const statusColor = {
  open:    "#059669",
  closed:  "#94a3b8",
  pending: "#d97706",
};

export default function Messages() {
  const { user } = useAuth();
  const { connected, on, off, emit } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [activeConv, setActiveConv]        = useState(null);
  const [messages, setMessages]            = useState([]);
  const [loadingList, setLoadingList]      = useState(false);
  const [loadingMsgs, setLoadingMsgs]      = useState(false);
  const [sending, setSending]               = useState(false);
  const [draft, setDraft]                   = useState("");
  const [filter, setFilter]                 = useState("open");

  const scrollRef = useRef(null);

  /* ── List conversations ── */
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations?status=${filter}&limit=100`);
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

  /* ── Open conversation ── */
  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setLoadingMsgs(true);
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveConv(data.data);
      setMessages(data.data.messages || []);
      // Mark read (clears admin unread badge)
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: "PATCH" }).catch(() => {});
    } catch (err) {
      console.warn("[AdminMessages] open error:", err.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  /* ── Send admin message ── */
  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!activeId || !text || sending) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`, conversationId: activeId, senderType: "admin",
      body: text, senderName: user?.full_name || "Admin", isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    // Prefer socket (live + realtime to user); fall back to REST
    if (connected && emit) {
      emit("msg:admin-send", { conversationId: activeId, body: text }, (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? ack.message : m)));
        }
      });
    }

    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages`,
        { method: "POST", body: JSON.stringify({ body: text }) },
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.data : m)));
      }
    } catch { /* socket likely already delivered */ }
    finally {
      setSending(false);
      loadConversations();
    }
  }, [activeId, draft, sending, connected, emit, user, loadConversations]);

  /* ── Status change ── */
  const changeStatus = useCallback(async (status) => {
    if (!activeId) return;
    await authFetch(`${API_BASE}/messages/conversations/${activeId}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }).catch(() => {});
    setActiveConv((p) => (p ? { ...p, status } : p));
    loadConversations();
  }, [activeId, loadConversations]);

  /* ── Socket live updates ── */
  useEffect(() => {
    if (!on || !off) return;
    const onMessage = (msg) => {
      setMessages((prev) => {
        if (msg.conversationId !== activeId) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    const onNewFromUser = (payload) => {
      // Refresh list (new conversation or new unread)
      loadConversations();
    };
    const onUpdated = (conv) => {
      setActiveConv((p) => (p && p.id === conv.id ? { ...p, ...conv } : p));
      loadConversations();
    };
    on("msg:message", onMessage);
    on("msg:new-from-user", onNewFromUser);
    on("msg:conversation-updated", onUpdated);
    on("msg:user-registered", onNewFromUser);
    return () => {
      off("msg:message", onMessage);
      off("msg:new-from-user", onNewFromUser);
      off("msg:conversation-updated", onUpdated);
      off("msg:user-registered", onNewFromUser);
    };
  }, [on, off, activeId, loadConversations]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const convTitle = (c) =>
    c.subject || (c.bookingNumber ? `Booking ${c.bookingNumber}` : c.guestName) || "Conversation";

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Messages</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
          Live conversations with travellers about their bookings.
        </p>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr",
        gap: 16, flex: 1, minHeight: 0,
      }}>
        {/* List */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ display: "flex", gap: 4, padding: 10, borderBottom: "1px solid #f1f5f9" }}>
            {["open", "closed", "all"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "6px 0", borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: filter === f ? "#059669" : "#f1f5f9",
                color: filter === f ? "#fff" : "#64748b",
              }}>
                {f === "all" ? "All" : f === "open" ? "Open" : "Closed"}
              </button>
            ))}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loadingList && conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                No {filter === "all" ? "" : filter} conversations.
              </div>
            ) : (
              conversations.map((c) => (
                <button key={c.id} onClick={() => openConversation(c.id)} style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "12px 14px", background: c.id === activeId ? "#ecfdf5" : "#fff",
                  borderBottom: "1px solid #f1f5f9",
                  borderLeft: c.id === activeId ? "3px solid #059669" : "3px solid transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{convTitle(c)}</span>
                    {c.unreadAdmin > 0 && (
                      <span style={{
                        background: "#ef4444", color: "#fff", borderRadius: 999, fontSize: 10,
                        fontWeight: 800, minWidth: 18, height: 18, display: "flex",
                        alignItems: "center", justifyContent: "center", padding: "0 5px",
                      }}>{c.unreadAdmin}</span>
                    )}
                  </div>
                  <p style={{
                    margin: "4px 0 0", fontSize: 12, color: "#64748b",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{c.lastMessage || "No messages yet"}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94a3b8" }}>
                    {c.guestName || c.guestEmail || "Guest"} · {fmtTime(c.lastMessageAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {!activeConv ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#94a3b8", textAlign: "center", padding: 24,
            }}>
              <div>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🗨️</div>
                Select a conversation to reply to a traveller.
              </div>
            </div>
          ) : (
            <>
              <div style={{
                padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{convTitle(activeConv)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                    {activeConv.guestName || activeConv.guestEmail || "Guest"}
                    {activeConv.bookingNumber ? ` · Booking ${activeConv.bookingNumber}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                    color: statusColor[activeConv.status] || "#64748b",
                    background: `${statusColor[activeConv.status] || "#64748b"}1a`,
                    textTransform: "capitalize",
                  }}>{activeConv.status}</span>
                  {activeConv.status !== "closed" ? (
                    <button onClick={() => changeStatus("closed")} style={{
                      fontSize: 12, border: "1px solid #e5e7eb", background: "#fff",
                      borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#64748b",
                    }}>Close</button>
                  ) : (
                    <button onClick={() => changeStatus("open")} style={{
                      fontSize: 12, border: "1px solid #059669", background: "#ecfdf5",
                      borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#059669",
                    }}>Reopen</button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} style={{
                flex: 1, overflowY: "auto", padding: 16, display: "flex",
                flexDirection: "column", gap: 10, background: "#f8fafc",
              }}>
                {loadingMsgs && messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>Loading…</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>No messages yet.</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderType === "admin";
                    return (
                      <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                        <div style={{
                          padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          background: mine ? "#059669" : "#fff", color: mine ? "#fff" : "#0f172a",
                          border: mine ? "none" : "1px solid #e2e8f0",
                          borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4,
                        }}>{m.body}</div>
                        <span style={{
                          fontSize: 10, color: "#94a3b8", marginTop: 3, display: "block",
                          textAlign: mine ? "right" : "left",
                        }}>{m.senderName || (mine ? "Admin" : "Traveller")} · {fmtTime(m.createdAt)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: 12, borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={1}
                  placeholder="Type a reply to the traveller…"
                  style={{
                    flex: 1, resize: "none", fontSize: 14, padding: "10px 12px",
                    borderRadius: 12, border: "1.5px solid #e2e8f0", outline: "none",
                    fontFamily: "inherit", maxHeight: 120,
                  }}
                />
                <button onClick={sendMessage} disabled={!draft.trim() || sending} style={{
                  padding: "0 20px", borderRadius: 12, border: "none", background: "#059669",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: draft.trim() && !sending ? "pointer" : "not-allowed",
                  opacity: draft.trim() && !sending ? 1 : 0.5,
                }}>{sending ? "…" : "Send"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
