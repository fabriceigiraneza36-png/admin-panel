// src/pages/Notifications.jsx
import React, { useState, useCallback } from "react";
import { useNotifications } from "@context/NotificationContext";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
};

const typeColor = (type = "") => {
  if (type.startsWith("booking"))  return "bg-blue-100   text-blue-800";
  if (type.includes("alert"))      return "bg-red-100    text-red-800";
  if (type.includes("success"))    return "bg-green-100  text-green-800";
  if (type.includes("warning"))    return "bg-yellow-100 text-yellow-800";
  return                                  "bg-gray-100   text-gray-700";
};

// ── Sub-components ─────────────────────────────────────────────────────────

function NotificationRow({ notif, onMarkRead, onDelete }) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        notif.is_read
          ? "bg-white border-gray-200"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        {!notif.is_read ? (
          <span className="block h-2.5 w-2.5 rounded-full bg-blue-500" />
        ) : (
          <span className="block h-2.5 w-2.5 rounded-full bg-gray-300" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor(notif.type)}`}
          >
            {notif.type || "system"}
          </span>
          {notif.title && (
            <span className="font-semibold text-gray-800 text-sm truncate">
              {notif.title}
            </span>
          )}
        </div>
        {notif.message && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {notif.message}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {formatDate(notif.created_at || notif.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-2">
        {!notif.is_read && (
          <button
            onClick={() => onMarkRead(notif.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark read
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Filters ────────────────────────────────────────────────────────────────

const TABS = ["all", "unread", "read", "booking", "system"];

// ── Page ───────────────────────────────────────────────────────────────────

export default function Notifications() {
  const {
    notifications,
    grouped,
    unreadCount,
    loading,
    hasMore,
    total,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    deleteOne,
    clearAll,
  } = useNotifications();

  const [tab,    setTab]    = useState("all");
  const [search, setSearch] = useState("");

  const displayed = (grouped[tab] ?? notifications).filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q) ||
      n.type?.toLowerCase().includes(q)
    );
  });

  const handleClearAll = useCallback(async () => {
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return;
    await clearAll();
  }, [clearAll]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors"
            >
              Mark all read
            </button>
          )}
          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg
                         hover:bg-red-700 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap
                        border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs
                               px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => (
            <NotificationRow
              key={notif.id}
              notif={notif}
              onMarkRead={markRead}
              onDelete={deleteOne}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700
                       rounded-lg text-sm font-medium disabled:opacity-50
                       transition-colors"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}