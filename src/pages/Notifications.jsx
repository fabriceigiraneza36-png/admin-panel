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
import { useNavigate } from "react-router-dom";
import {
  Bell, RefreshCw, CheckCheck, Trash2, Search, X,
  Info, AlertCircle, CheckCircle2, AlertTriangle, Calendar,
  Settings, ShieldCheck, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useNotifications } from "@context/NotificationContext";
import { usePush } from "@context/PushNotificationContext";
import apiClient from "@api/client";
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
  if (type.includes("alert") || type.includes("auth") || type.includes("diagnostic") || type.includes("error")) return TYPE_META.alert;
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
  notif, busy, onMarkRead, onDelete, clockNow, onOpenUser, onNavigate,
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
    if (target) onNavigate?.(target);
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

  const navigate = useNavigate();

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
  const [pushSettingsOpen, setPushSettingsOpen] = useState(false);
  const [allowUserPush, setAllowUserPush] = useState(true);
  const [pushSettingsLoading, setPushSettingsLoading] = useState(false);
  const [pushSettingsSaving, setPushSettingsSaving] = useState(false);
  const [pushSettingsError, setPushSettingsError] = useState("");
  const {
    supported: adminPushSupported,
    permission: adminPushPermission,
    subscribed: adminPushSubscribed,
    serverSynced: adminPushSynced,
    loading: adminPushBusy,
    subscribeUser: subscribeAdminBrowser,
    requestPermission: requestAdminPushPermission,
    syncSubscription: syncAdminBrowser,
  } = usePush();

  const loadPushSettings = useCallback(async () => {
    setPushSettingsLoading(true);
    setPushSettingsError("");
    try {
      const response = await apiClient.get("/push/user-delivery-settings");
      const data = response?.data || response;
      setAllowUserPush(data?.enabled !== false);
    } catch (error) {
      setPushSettingsError(error?.response?.data?.message || error?.message || "Could not load push settings.");
    } finally {
      setPushSettingsLoading(false);
    }
  }, []);

  const openPushSettings = useCallback(() => {
    setPushSettingsOpen(true);
    void loadPushSettings();
  }, [loadPushSettings]);

  const saveUserPushSetting = useCallback(async () => {
    const nextValue = !allowUserPush;
    setPushSettingsSaving(true);
    setPushSettingsError("");
    try {
      const response = await apiClient.patch("/push/user-delivery-settings", { enabled: nextValue });
      const data = response?.data || response;
      setAllowUserPush(data?.enabled !== false);
    } catch (error) {
      setPushSettingsError(error?.response?.data?.message || error?.message || "Could not save push settings.");
    } finally {
      setPushSettingsSaving(false);
    }
  }, [allowUserPush]);

  const enableAdminBrowserPush = useCallback(async () => {
    setPushSettingsError("");
    if (!adminPushSupported) {
      setPushSettingsError("This browser does not support web push notifications.");
      return;
    }
    let permission = adminPushPermission;
    if (permission !== "granted") permission = await requestAdminPushPermission();
    if (permission !== "granted") {
      setPushSettingsError(permission === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser or device site settings, then return here."
        : "Browser notification permission was not granted.");
      return;
    }
    if (adminPushSubscribed) {
      await syncAdminBrowser();
    } else {
      await subscribeAdminBrowser();
    }
  }, [adminPushSupported, adminPushPermission, requestAdminPushPermission, adminPushSubscribed, syncAdminBrowser, subscribeAdminBrowser]);

  const openUserProfile = useCallback((userId) => {
    if (!userId) return;
    navigate("/users?userId=" + encodeURIComponent(userId));
  }, [navigate]);

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

      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Settings size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900">External browser notifications</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Manage browser push delivery for subscribed travellers. Administrator and manager alerts remain enabled independently.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openPushSettings}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
        >
          <Bell size={14} />
          Manage delivery
        </button>
      </section>

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
              onNavigate={(target) => /^https?:\/\//i.test(target) ? window.location.assign(target) : navigate(target)}
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

      {/* Browser push settings — existing admin subscription stays one-way enabled. */}
      {pushSettingsOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPushSettingsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-settings-title"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-emerald-100 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-3 border-b border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-5 py-5 sm:px-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-white text-emerald-700">
                <Settings size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="push-settings-title" className="text-lg font-extrabold text-slate-900">Browser push settings</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Manage traveller push delivery while keeping administrator alerts available.</p>
              </div>
              <button type="button" onClick={() => setPushSettingsOpen(false)} aria-label="Close push settings" className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 border border-emerald-100">
                    <ShieldCheck size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900">Administrator browser alerts</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Admin and manager push delivery is not controlled by the traveller setting. This browser still needs notification permission and an active subscription.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${adminPushSubscribed && adminPushSynced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {adminPushSubscribed && adminPushSynced ? "This browser is registered" : adminPushPermission === "denied" ? "Permission blocked" : "Setup needed"}
                      </span>
                      {adminPushSupported && !(adminPushSubscribed && adminPushSynced) && (
                        <button
                          type="button"
                          onClick={enableAdminBrowserPush}
                          disabled={adminPushBusy || adminPushPermission === "unsupported"}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {adminPushBusy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                          {adminPushBusy ? "Enabling…" : adminPushSubscribed ? "Sync browser" : "Enable on this browser"}
                        </button>
                      )}
                    </div>
                    {adminPushPermission === "denied" && (
                      <p className="mt-2 text-xs leading-relaxed text-amber-800">Allow notifications for this site in your browser or device settings, then return and sync this browser.</p>
                    )}
                    {!adminPushSupported && <p className="mt-2 text-xs text-slate-500">Web push is not supported in this browser.</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900">Allow browser push to travellers</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">When enabled, subscribed Altuvera users can receive eligible booking, message, account, and other dashboard notifications while away from the website. Turning this off does not disable admin or manager push alerts.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowUserPush}
                    aria-label="Allow browser push notifications to travellers"
                    onClick={saveUserPushSetting}
                    disabled={pushSettingsLoading || pushSettingsSaving}
                    className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${allowUserPush ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowUserPush ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {pushSettingsLoading || pushSettingsSaving ? (
                    <><Loader2 size={13} className="animate-spin text-emerald-700" /><span className="text-slate-500">{pushSettingsSaving ? "Saving setting…" : "Loading setting…"}</span></>
                  ) : (
                    <><span className={`h-2 w-2 rounded-full ${allowUserPush ? "bg-emerald-500" : "bg-slate-400"}`} /><span className="font-semibold text-slate-600">{allowUserPush ? "Traveller push delivery allowed" : "Traveller push delivery paused"}</span></>
                  )}
                </div>
              </div>

              {pushSettingsError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700">{pushSettingsError}</p>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setPushSettingsOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Done</button>
            </div>
          </section>
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
