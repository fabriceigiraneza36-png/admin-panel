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

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Bell, RefreshCw, CheckCheck, Trash2, Search, X,
  Info, AlertCircle, CheckCircle2, AlertTriangle, Calendar,
  Send, Smartphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useNotifications } from "@context/NotificationContext";
import { usePush } from "@context/PushNotificationContext";
import ConfirmDialog        from "@components/common/ConfirmDialog";
import Avatar                from "@components/common/Avatar";
import { getNotificationTarget } from "@utils/notificationTarget";

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

const readSessionExpiry = (notification) => {
  const metadata = notification?.metadata || notification?.metadata_json || {};
  const value = metadata?.sessionExpiresAt || metadata?.session_expires_at;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const formatRemaining = (expiry, now) => {
  if (!expiry) return "";
  const seconds = Math.max(0, Math.floor((expiry - now) / 1000));
  if (!seconds) return "Session expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return "Session expires in " + (days ? days + "d " : "") + hours + "h " + minutes + "m";
};

/* ─── Sub-components ───────────────────────────────────────────────────────── */

const getNotificationMetadata = (notification) => {
  const raw = notification?.metadata ?? notification?.metadata_json ?? {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw && typeof raw === "object" ? raw : {};
};

const getNotificationUsers = (notification) => {
  const metadata = getNotificationMetadata(notification);
  const rawUsers = Array.isArray(metadata.users) ? metadata.users : [];
  const oneUser = metadata.user || metadata.actor || metadata.profile || null;
  const values = rawUsers.length ? rawUsers : (oneUser ? [oneUser] : []);
  const users = values.map((user) => ({
    id: user?.id ?? user?.userId ?? user?.user_id ?? null,
    name: user?.name || user?.full_name || user?.fullName || user?.email || "Traveller",
    email: user?.email || "",
    avatarUrl: user?.avatarUrl || user?.avatar_url || user?.profile_image_url || user?.picture || null,
  })).filter((user) => user.id || user.email || user.avatarUrl);
  if (users.length) return users;

  const userId = metadata.userId || metadata.user_id || notification?.user_id
    || metadata.senderId || metadata.sender_id || notification?.senderId || notification?.sender_id;
  const avatarUrl = notification?.image_url || notification?.imageUrl
    || notification?.senderAvatar || notification?.sender_avatar || notification?.senderAvatarUrl
    || notification?.sender_avatar_url || metadata.senderAvatar || metadata.sender_avatar
    || metadata.senderAvatarUrl || metadata.sender_avatar_url;
  const name = metadata.userName || metadata.user_name || metadata.travellerName
    || notification?.user_name || notification?.senderName || notification?.sender_name
    || notification?.user_email || metadata.email || "";
  const email = notification?.user_email || metadata.userEmail || metadata.user_email || metadata.email || "";
  if (userId || avatarUrl || name || email) {
    return [{ id: userId || null, name: name || email || "Traveller", email, avatarUrl: avatarUrl || null }];
  }
  return [];
};



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
  notif, busy, onMarkRead, onDelete, clockNow, onOpenUser,
}) {
  const target = getNotificationTarget(notif);
  const notificationUsers = getNotificationUsers(notif);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const firstUser = notificationUsers[0] || null;
  const groupedUsers = notificationUsers.length > 1;
  const openUser = (user) => {
    if (!user?.id || !onOpenUser) return;
    onOpenUser(user.id);
  };
  const openTarget = () => {
    if (!notif.is_read) onMarkRead(notif.id)
    if (target) window.location.href = target;
    else if (firstUser?.id) openUser(firstUser);
  };
  return (
    <div
      onClick={openTarget}
      role={target ? "link" : undefined}
      tabIndex={target ? 0 : undefined}
      onKeyDown={(event) => event.key === "Enter" && openTarget()}
      className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-colors
        ${notif.is_read
          ? "bg-white border-slate-200"
          : "bg-blue-50/60 border-blue-200"
        } ${target ? "cursor-pointer hover:shadow-sm" : ""}`}
    >
      {/* Read/unread state and user identity */}
      <div className="mt-1.5 flex flex-col items-center gap-2 flex-shrink-0">
        <span className={`block h-2.5 w-2.5 rounded-full
          ${!notif.is_read ? "bg-blue-500" : "bg-slate-300"}`} />
        {firstUser && (
          <Avatar
            src={firstUser.avatarUrl}
            name={firstUser.name || firstUser.email}
            size="md"
            rounded="full"
          />
        )}
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

        {groupedUsers && (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={showAllUsers}
              onClick={(event) => {
                event.stopPropagation();
                setShowAllUsers((value) => !value);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              {showAllUsers ? "Less" : "More"}
              <span className="text-slate-400 font-medium">({notificationUsers.length} travellers)</span>
            </button>
            {showAllUsers && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {notificationUsers.map((user, index) => (
                  <div key={String(user.id || user.email || index)} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar
                      src={user.avatarUrl}
                      name={user.name || user.email}
                      size="sm"
                      rounded="full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      {user.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
                    </div>
                    {user.id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openUser(user);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 whitespace-nowrap"
                      >
                        View profile
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {firstUser?.id && !groupedUsers && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openUser(firstUser);
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            View traveller
          </button>
        )}
        {readSessionExpiry(notif) && (
          <p role="status" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <CheckCircle2 size={14} />
            {formatRemaining(readSessionExpiry(notif), clockNow)}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {formatDate(notif.created_at || notif.createdAt)}
        </p>

        {target && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openTarget();
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            {notif.action_label || "Open related page"} →
          </button>
        )}

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
  const [clockNow, setClockNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const openUserProfile = useCallback((userId) => {
    if (!userId) return;
    window.location.href = "/users?userId=" + encodeURIComponent(userId);
  }, []);

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
    <div className="notifications-command-center admin-page premium-page max-w-5xl mx-auto space-y-4 sm:space-y-5">
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

      {/* ── Push Notifications ── */}
      <PushNotificationBar />

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
              clockNow={clockNow}
              onOpenUser={openUserProfile}
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

/* ── Push Notification Bar ─────────────────────────────────────────── */

function PushNotificationBar () {
  const {
    supported,
    permission,
    subscribed,
    serverSynced,
    loading,
    subscribeUser,
    unsubscribeUser,
    requestPermission,
    syncSubscription,
  } = usePush()
  const [showDetails, setShowDetails] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTest = async () => {
    setTestSending(true)
    setTestResult({ tone: 'pending', message: 'Sending a real push to this admin’s registered browsers…' })

    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api').replace(/\/+$/, '')
      const token = localStorage.getItem('altuvera_admin_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('altuvera_admin_token') ||
        sessionStorage.getItem('adminToken') || ''
      if (!token) throw new Error('Your admin session token is missing. Sign in again before testing push notifications.')

      const headers = { Authorization: 'Bearer ' + token }
      const sendResponse = await fetch(apiBase + '/push/test', {
        method: 'POST',
        credentials: 'include',
        headers,
        cache: 'no-store',
      })
      const sendData = await sendResponse.json().catch(() => ({}))
      if (!sendResponse.ok || sendData.success === false || !sendData.testId) {
        throw new Error(sendData.message || 'The backend could not send the browser push test (HTTP ' + sendResponse.status + ').')
      }

      const testId = sendData.testId
      const total = Number(sendData.total || 0)
      const accepted = Number(sendData.providerAccepted || 0)
      setTestResult({
        tone: accepted > 0 ? 'pending' : 'error',
        message: accepted + ' of ' + total + ' push request(s) were accepted by the push service. Waiting for browser confirmation…',
      })

      const deadline = Date.now() + 25000
      let latest = null

      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500))
        const statusResponse = await fetch(apiBase + '/push/test/' + encodeURIComponent(testId), {
          method: 'GET',
          credentials: 'include',
          headers,
          cache: 'no-store',
        })
        const statusData = await statusResponse.json().catch(() => ({}))
        if (!statusResponse.ok || statusData.success === false) {
          throw new Error(statusData.message || 'Could not verify whether a browser received the test notification.')
        }

        latest = statusData
        const received = Number(statusData.browserReceived || 0)
        const awaiting = Number(statusData.awaitingBrowserReceipt || 0)
        const failed = Number(statusData.providerFailed || 0)
        const allConfirmed = received === Number(statusData.total || 0) && Number(statusData.total || 0) > 0

        if (allConfirmed) {
          setTestResult({
            tone: 'success',
            message: 'Confirmed: ' + received + ' of ' + statusData.total + ' browser(s) received the push and completed the notification display request.',
          })
          return
        }

        if (received > 0) {
          setTestResult({
            tone: 'partial',
            message: 'Browser confirmation: ' + received + ' of ' + statusData.total + '. Still waiting for ' + awaiting + ' browser(s); ' + failed + ' push request(s) failed.',
          })
        } else if (Number(statusData.providerAccepted || 0) > 0) {
          setTestResult({
            tone: 'pending',
            message: 'The push service accepted ' + statusData.providerAccepted + ' request(s), but no browser receipt has arrived yet. Waiting…',
          })
        } else {
          setTestResult({
            tone: 'error',
            message: 'No browser push was accepted. Check the browser subscription and backend push configuration.',
          })
          return
        }
      }

      if (latest) {
        const received = Number(latest.browserReceived || 0)
        const awaiting = Number(latest.awaitingBrowserReceipt || 0)
        setTestResult({
          tone: received > 0 ? 'partial' : 'pending',
          message: 'Final check: ' + received + ' of ' + latest.total + ' browser(s) confirmed receipt; ' + awaiting + ' are still awaiting confirmation. Provider acceptance alone is not counted as browser delivery. Check the browser’s notification permission, device connection, and notification/Do Not Disturb settings.',
        })
      }
    } catch (error) {
      setTestResult({
        tone: 'error',
        message: error?.message || 'Test notification failed. The browser receipt was not confirmed.',
      })
    } finally {
      setTestSending(false)
    }
  }

  if (!supported) return null

  const resultColor = testResult?.tone === 'success'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : testResult?.tone === 'error'
      ? 'text-red-700 bg-red-50 border-red-200'
      : testResult?.tone === 'partial'
        ? 'text-amber-800 bg-amber-50 border-amber-200'
        : 'text-slate-700 bg-slate-50 border-slate-200'

  return (
    <div className="mb-4 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="text-purple-600" size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">Browser Push Notifications</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {subscribed
                ? serverSynced
                  ? 'This browser is registered to the signed-in admin account.'
                  : 'A browser subscription exists but needs to sync with the admin account.'
                : 'Enable push to receive admin alerts when the panel is not open.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {subscribed ? (
            <button
              onClick={unsubscribeUser}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={permission === 'granted' ? subscribeUser : requestPermission}
              disabled={loading || permission === 'denied' || permission === 'unsupported'}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Working…' : permission === 'granted' ? 'Enable' : permission === 'denied' ? 'Blocked' : 'Allow'}
            </button>
          )}
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-purple-100 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Permission:</span>
              <span className="ml-1 font-semibold text-slate-800">{permission}</span>
            </div>
            <div>
              <span className="text-slate-500">Browser:</span>
              <span className={'ml-1 font-bold ' + (subscribed ? 'text-purple-700' : 'text-slate-600')}>
                {subscribed ? 'Subscribed' : 'Not subscribed'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Server sync:</span>
              <span className={'ml-1 font-bold ' + (serverSynced ? 'text-emerald-700' : 'text-amber-700')}>
                {serverSynced ? 'Confirmed' : 'Not synced'}
              </span>
            </div>
          </div>

          {subscribed && !serverSynced && (
            <button
              onClick={syncSubscription}
              disabled={loading}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              {loading ? 'Syncing…' : 'Sync this browser'}
            </button>
          )}

          <button
            onClick={handleTest}
            disabled={!subscribed || !serverSynced || testSending}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            <Send size={14} className={testSending ? 'animate-spin' : ''} />
            {testSending ? 'Verifying browser receipt…' : 'Send real browser test'}
          </button>

          {testResult && (
            <p
              role="status"
              aria-live="polite"
              className={'text-xs leading-relaxed border rounded-xl px-3 py-2 ' + resultColor}
            >
              {testResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
