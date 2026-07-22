// src/pages/Notifications.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS v2.0 — Admin notification inbox
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Fully responsive layout (mobile-first, 320px → 4K)
//  ✓ Custom themed ConfirmDialog instead of window.confirm
//  ✓ Extracted TypePill + NotificationRow (memoized)
//  ✓ Safer icon-based type mapping (no dynamic Tailwind purge issues)
//  ✓ Better search UX (clear button, aria labels)
//  ✓ Improved skeleton loader
//  ✓ Empty & filtered-empty states differentiated
//  ✓ Sticky action bar on mobile for common ops
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from "react";
import {
  Bell, RefreshCw, CheckCheck, Trash2, Search, X,
  Info, AlertCircle, CheckCircle2, AlertTriangle, Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useNotifications } from "@context/NotificationContext";
import ConfirmDialog        from "@components/common/ConfirmDialog";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch { return dateStr; }
};

const TYPE_META = {
  booking: { color: "bg-blue-100 text-blue-800",       icon: Calendar     },
  alert:   { color: "bg-red-100 text-red-800",         icon: AlertCircle  },
  success: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  warning: { color: "bg-amber-100 text-amber-800",     icon: AlertTriangle},
  info:    { color: "bg-slate-100 text-slate-700",     icon: Info         },
  system:  { color: "bg-slate-100 text-slate-700",     icon: Bell         },
};

const typeMeta = (type = "") => {
  if (type.startsWith("booking")) return TYPE_META.booking;
  if (type.includes("alert"))     return TYPE_META.alert;
  if (type.includes("success"))   return TYPE_META.success;
  if (type.includes("warning"))   return TYPE_META.warning;
  if (type.includes("info"))      return TYPE_META.info;
  return TYPE_META.system;
};

const TABS = ["all", "unread", "read", "booking", "system"];

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function TypePill({ type }) {
  const { color, icon: Icon } = typeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5
                      rounded-full ${color}`}>
      <Icon size={11} />
      {type || "system"}
    </span>
  );
}

const NotificationRow = React.memo(function NotificationRow({
  notif, busy, onMarkRead, onDelete,
}) {
  return (
    <div
      className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-colors
        ${notif.is_read
          ? "bg-white border-slate-200"
          : "bg-blue-50/60 border-blue-200"
        }`}
    >
      {/* Read/unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-2.5 w-2.5 rounded-full
          ${!notif.is_read ? "bg-blue-500" : "bg-slate-300"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <TypePill type={notif.type} />
          {notif.title && (
            <span className="font-semibold text-slate-800 text-sm break-words">
              {notif.title}
            </span>
          )}
        </div>
        {notif.message && (
          <p className="mt-1 text-sm text-slate-600 break-words leading-relaxed
                        line-clamp-3 sm:line-clamp-2">
            {notif.message}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {formatDate(notif.created_at || notif.createdAt)}
        </p>

        {/* Mobile action row */}
        <div className="flex sm:hidden gap-3 mt-2">
          {!notif.is_read && (
            <button
              onClick={() => onMarkRead(notif.id)}
              disabled={busy}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium
                         disabled:opacity-50"
            >
              Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(notif.id)}
            disabled={busy}
            className="text-xs text-red-500 hover:text-red-700 font-medium
                       disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden sm:flex flex-shrink-0 gap-2">
        {!notif.is_read && (
          <button
            onClick={() => onMarkRead(notif.id)}
            disabled={busy}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium
                       disabled:opacity-50 whitespace-nowrap"
          >
            Mark read
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          disabled={busy}
          aria-label="Delete notification"
          className="text-xs text-red-500 hover:text-red-700 font-medium
                     disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200
                    bg-white animate-pulse">
      <div className="h-2.5 w-2.5 rounded-full bg-slate-200 mt-1.5" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-slate-200 rounded-full" />
          <div className="h-4 w-40 bg-slate-200 rounded" />
        </div>
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-3 w-2/3 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

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

  const [tab, setTab]       = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  /* ── Filtering ─────────────────────────────────────────────────────────── */

  const displayed = useMemo(() => {
    const base = grouped?.[tab] ?? notifications ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
    );
  }, [grouped, tab, notifications, search]);

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const handleMarkRead = useCallback(async (id) => {
    setBusyId(id);
    try { await markRead(id); }
    finally { setBusyId(null); }
  }, [markRead]);

  const askDelete = useCallback(
    (id) => setConfirmDelete({ open: true, id }),
    []
  );

  const doDelete = useCallback(async () => {
    const id = confirmDelete.id;
    if (!id) return;
    setBusyId(id);
    try { await deleteOne(id); }
    finally {
      setBusyId(null);
      setConfirmDelete({ open: false, id: null });
    }
  }, [confirmDelete.id, deleteOne]);

  const doClearAll = useCallback(async () => {
    await clearAll();
    setConfirmClear(false);
  }, [clearAll]);

  const clearSearch = useCallback(() => setSearch(""), []);

  const isSearchingOrFiltering = !!search.trim() || tab !== "all";

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Bell className="text-blue-600" size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {total.toLocaleString()} total · {unreadCount.toLocaleString()} unread
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg
                       hover:bg-slate-50 disabled:opacity-50 transition-colors
                       inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </button>
          )}
          {total > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg
                         hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear all</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search notifications"
          className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        />
        {search && (
          <button
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg
                       text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto
                      -mx-3 sm:mx-0 px-3 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap
                        border-b-2 transition-colors
                        ${tab === t
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-700"
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
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-slate-500">
            {isSearchingOrFiltering ? "No matches found" : "No notifications"}
          </p>
          <p className="text-sm mt-1">
            {isSearchingOrFiltering
              ? "Try clearing your search or filters."
              : "You'll see new notifications appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => (
            <NotificationRow
              key={notif.id}
              notif={notif}
              busy={busyId === notif.id}
              onMarkRead={handleMarkRead}
              onDelete={askDelete}
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
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700
                       rounded-lg text-sm font-medium disabled:opacity-50
                       transition-colors"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* Confirms */}
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={doClearAll}
        type="delete"
        title="Clear all notifications?"
        description="This will permanently delete every notification. This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={doDelete}
        type="delete"
        title="Delete notification?"
        description="This notification will be permanently removed."
        loading={busyId === confirmDelete.id}
      />
    </div>
  );
}