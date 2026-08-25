// src/components/notifications/NotificationPanel.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch (error) {
    console.warn("Date parsing failed for notification:", dateStr, error);
    return dateStr;
  }
};

const typeStyles = (type = "") => {
  const t = String(type || "").toLowerCase();
  if (t.startsWith("booking") || t.includes("booking"))
    return { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" };
  if (t.includes("alert") || t.includes("error") || t.includes("fail") || t.includes("critical"))
    return { dot: "bg-red-500", badge: "bg-red-100 text-red-700" };
  if (t.includes("success") || t.includes("done") || t.includes("complete"))
    return { dot: "bg-green-500", badge: "bg-green-100 text-green-700" };
  if (t.includes("warning") || t.includes("pending") || t.includes("hold"))
    return { dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" };
  return { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" };
};

// Robust ID extractor supporting SQL (id), MongoDB (_id), and custom payload designs
const getNotifId = (notif) => {
  if (!notif) return null;
  return notif.id || notif._id || notif.notificationId || notif.uid;
};

// ── Bell Icon ──────────────────────────────────────────────────────────────

function BellIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12
           0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6
           0v-1m6 0H9"
      />
    </svg>
  );
}

// ── Single Notification Row ────────────────────────────────────────────────

function NotifRow({ notif, onMarkRead, onDelete }) {
  const { dot, badge } = typeStyles(notif?.type);
  const notifId = getNotifId(notif);

  const handleRowClick = () => {
    if (!notif.is_read && notifId && typeof onMarkRead === "function") {
      onMarkRead(notifId);
    }
    const redirectUrl = notif.link || notif.url;
    if (redirectUrl) {
      // Standard fallback redirection (SPA routers can hook into this easily)
      window.location.href = redirectUrl;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick();
    }
  };

  return (
    <div
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50
                  transition-colors border-b border-gray-100 last:border-0 
                  cursor-pointer focus:outline-none focus:bg-gray-50 ${
                    notif.is_read ? "opacity-75" : "bg-blue-50/20"
                  }`}
    >
      {/* Dot indicators */}
      <span
        className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full transition-all ${
          notif.is_read ? "bg-gray-300" : dot
        }`}
      />

      {/* Body contents */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${badge}`}
          >
            {notif.type || "system"}
          </span>
          {notif.title && (
            <span className={`text-sm ${notif.is_read ? "font-normal text-gray-600" : "font-semibold text-gray-800"} truncate`}>
              {notif.title}
            </span>
          )}
        </div>
        {notif.message && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">
            {notif.message}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-gray-400">
          {formatDate(notif.created_at || notif.createdAt)}
        </p>
      </div>

      {/* Action triggers (Hover targets on Desktop, Static triggers on Touch/Mobile Screens) */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {!notif.is_read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (notifId && typeof onMarkRead === "function") onMarkRead(notifId);
            }}
            title="Mark as read"
            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium
                       whitespace-nowrap bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            ✓ Read
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (notifId && typeof onDelete === "function") onDelete(notifId);
          }}
          title="Delete"
          className="text-[10px] text-red-500 hover:text-red-700 font-medium
                     bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-all focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <BellIcon className="w-10 h-10 text-gray-300 mb-3 animate-pulse" />
      <p className="text-sm font-medium text-gray-500">All caught up!</p>
      <p className="text-xs text-gray-400 mt-1">No notifications right now.</p>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────

export default function NotificationPanel() {
  const dispatch = useDispatch();
  const isMounted = useRef(true);

  // Track component lifecycle safety
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const panelOpen = useSelector(
    (state) => state.notifications?.panelOpen ?? false
  );

  const notificationContext = useNotifications();
  const {
    notifications = [],
    unreadCount = 0,
    loading = false,
    hasMore = false,
    refresh = async () => {},
    loadMore = async () => {},
    markRead = async () => {},
    markAllRead = async () => {},
    deleteOne = async () => {},
    clearAll = async () => {},
  } = notificationContext || {};

  const [filter, setFilter] = useState("all"); // all | unread
  const [actionLoading, setActionLoading] = useState(false);
  const panelRef = useRef(null);

  // ── Close on outside click ───────────────────────────────────────────────

  useEffect(() => {
    if (!panelOpen) return;

    const handleClick = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest?.('[data-notif-trigger="true"]')
      ) {
        dispatch({ type: "notifications/setPanelOpen", payload: false });
      }
    };

    const handleKey = (e) => {
      if (e.key === "Escape") {
        dispatch({ type: "notifications/setPanelOpen", payload: false });
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [panelOpen, dispatch]);

  // ── Fetch notifications when panel opens ─────────────────────────────────

  useEffect(() => {
    if (panelOpen && typeof refresh === "function") {
      refresh().catch((err) => console.error("Error refreshing notifications:", err));
    }
  }, [panelOpen, refresh]);

  // ── Filter handling ──────────────────────────────────────────────────────

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => n && !n.is_read)
      : notifications.filter(Boolean);

  // ── Actions Wrapped with Error & Unmount Loading Guards ──────────────────

  const handleMarkAllRead = useCallback(async () => {
    if (typeof markAllRead !== "function") return;
    try {
      setActionLoading(true);
      await markAllRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  }, [markAllRead]);

  const handleClearAll = useCallback(async () => {
    if (typeof clearAll !== "function") return;
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      setActionLoading(true);
      await clearAll();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  }, [clearAll]);

  const handleToggle = useCallback(() => {
    dispatch({ type: "notifications/togglePanel" });
  }, [dispatch]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        onClick={handleToggle}
        aria-label={`Notifications${
          unreadCount > 0 ? ` (${unreadCount} unread)` : ""
        }`}
        aria-expanded={panelOpen}
        aria-haspopup="true"
        data-notif-trigger="true"
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700
                   hover:bg-gray-100 transition-colors focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <BellIcon />

        {/* Unread badge count */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center
                       justify-center rounded-full bg-red-500 text-[9px]
                       font-bold text-white ring-2 ring-white z-10"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Pulsing ring indicator when active */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full
                       bg-red-400 opacity-75 animate-ping"
          />
        )}
      </button>

      {/* Dropdown panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl
                     shadow-xl border border-gray-200 z-50 flex flex-col
                     max-h-[520px] overflow-hidden transition-all duration-150"
          style={{ top: "calc(100% + 8px)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3
                          border-b border-gray-100"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span
                  className="bg-red-100 text-red-700 text-xs font-bold
                                 px-1.5 py-0.5 rounded-full"
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Filter toggles */}
            <div className="flex gap-1 text-xs">
              {["all", "unread"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium
                              transition-colors ${
                                filter === f
                                  ? "bg-blue-100 text-blue-700"
                                  : "text-gray-500 hover:bg-gray-100"
                              }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Action bar */}
          {notifications.length > 0 && (
            <div
              className="flex items-center justify-between px-4 py-2
                            border-b border-gray-100 bg-gray-50"
            >
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || actionLoading}
                className="text-xs text-blue-600 hover:text-blue-800
                           disabled:opacity-40 font-medium transition-colors"
              >
                Mark all read
              </button>
              <button
                onClick={handleClearAll}
                disabled={actionLoading}
                className="text-xs text-red-500 hover:text-red-700
                           font-medium transition-colors disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main List Scroller */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading && displayed.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="h-6 w-6 border-2 border-blue-500 border-t-transparent
                               rounded-full animate-spin"
                />
              </div>
            ) : displayed.length === 0 ? (
              <EmptyState />
            ) : (
              displayed.map((notif, index) => (
                <NotifRow
                  key={getNotifId(notif) || `notif-${index}`}
                  notif={notif}
                  onMarkRead={markRead}
                  onDelete={deleteOne}
                />
              ))
            )}

            {/* Pagination loader */}
            {hasMore && (
              <div className="px-4 py-3 text-center border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800
                             font-medium disabled:opacity-50 transition-colors focus:outline-none"
                >
                  {loading ? "Loading…" : "Load more notifications"}
                </button>
              </div>
            )}
          </div>

          {/* Footer view-all redirect link */}
          <div
            className="border-t border-gray-100 px-4 py-2.5 bg-gray-50
                          flex justify-center"
          >
            <a
              href="/notifications"
              onClick={() =>
                dispatch({
                  type: "notifications/setPanelOpen",
                  payload: false,
                })
              }
              className="text-xs text-blue-600 hover:text-blue-800
                           font-medium transition-colors focus:outline-none"
            >
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}