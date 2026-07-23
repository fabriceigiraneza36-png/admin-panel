// src/pages/Comments.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS v2.0 — Destination Comment Moderation
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements:
//  ✓ Optimistic UI (approve toggles instantly, rolls back on error)
//  ✓ Fully responsive (mobile-first cards, tighter breakpoints)
//  ✓ Extracted CommentCard component for clarity
//  ✓ Better skeleton loading
//  ✓ URL-friendly filter state (ready for query-param sync)
//  ✓ Accessibility improvements (aria-labels, keyboard focus)
//  ✓ Stat pills for at-a-glance moderation status
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  MessageSquare, RefreshCw, Trash2, Search, MapPin,
  CheckCircle, User as UserIcon, Eye, EyeOff,
  Filter, X,
} from "lucide-react";

import { commentsAPI, getErrorMessage } from "@api/comments";
import { maintenanceAPI } from "@api/maintenance";
import ConfirmDialog from "@components/common/ConfirmDialog";
import { useToast }  from "@hooks/useToast";
import { useDebounce } from "@hooks/useDebounce";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all",      label: "All",      color: "slate"   },
  { key: "approved", label: "Approved", color: "emerald" },
  { key: "pending",  label: "Hidden",   color: "amber"   },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d); }
};

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function StatPill({ label, count, color = "slate", active, onClick }) {
  const palette = {
    slate:   { base: "bg-slate-100 text-slate-700",       active: "bg-slate-800 text-white"       },
    emerald: { base: "bg-emerald-50 text-emerald-700",    active: "bg-emerald-600 text-white"     },
    amber:   { base: "bg-amber-50 text-amber-700",        active: "bg-amber-500 text-white"       },
  };
  const c = palette[color] || palette.slate;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-all
        border ${active ? `${c.active} border-transparent shadow-sm` : `${c.base} border-transparent hover:border-slate-300`}`}
    >
      {label}
      {count != null && (
        <span className={`ml-1.5 text-xs opacity-80`}>({count})</span>
      )}
    </button>
  );
}

function CommentSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-200 rounded w-1/4" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-9 h-9 rounded-lg bg-slate-200" />
        <div className="w-9 h-9 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function CommentAvatar({ user, fallbackName }) {
  const initial = (user?.name || fallbackName || "A").charAt(0).toUpperCase();
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || "avatar"}
        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                    text-white grid place-items-center font-bold flex-shrink-0">
      {initial}
    </div>
  );
}

function CommentCard({ comment, busy, onToggleApprove, onDelete }) {
  const { id, content, isApproved, createdAt, user, authorName, destination } = comment;
  return (
    <div
      className={`bg-white rounded-2xl border p-3 sm:p-4 flex gap-3 sm:gap-4 transition
        ${isApproved
          ? "border-slate-200 hover:border-slate-300"
          : "border-amber-200 bg-amber-50/40"
        }`}
    >
      <CommentAvatar user={user} fallbackName={authorName} />

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
          <span className="font-semibold text-slate-800 text-sm inline-flex items-center gap-1">
            <UserIcon size={12} className="text-slate-400" />
            {user?.name || authorName || "Anonymous"}
          </span>
          {user?.email && (
            <span className="text-xs text-slate-400 truncate max-w-[180px]">
              ({user.email})
            </span>
          )}
          <span className="text-xs text-slate-400">· {fmtDate(createdAt)}</span>
          {!isApproved && (
            <span className="text-[10px] font-bold uppercase tracking-wide
                             bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Hidden
            </span>
          )}
        </div>

        {/* Destination */}
        {destination && (
          <div className="text-xs text-primary-600 font-medium inline-flex items-center gap-1 mb-1.5">
            <MapPin size={11} />
            {destination.name}
          </div>
        )}

        {/* Content */}
        <p className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={() => onToggleApprove(comment)}
          disabled={busy}
          aria-label={isApproved ? "Hide comment" : "Approve comment"}
          title={isApproved ? "Hide from site" : "Approve"}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isApproved
              ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
              : "bg-primary-100 text-primary-600 hover:bg-primary-200"
            }`}
        >
          {isApproved ? <EyeOff size={16} /> : <CheckCircle size={16} />}
        </button>
        <button
          onClick={() => onDelete(id)}
          disabled={busy}
          aria-label="Delete comment"
          title="Delete"
          className="w-9 h-9 rounded-lg flex items-center justify-center
                     bg-red-50 text-red-500 hover:bg-red-100 transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function Comments() {
  const { success, error } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);

  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [filter, setFilter]           = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);

  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState({ open: false });

  /* ── Fetch ─────────────────────────────────────────────────────────────── */

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filter === "approved") params.approved = "true";
      if (filter === "pending")  params.approved = "false";
      if (search?.trim())        params.search   = search.trim();

      const res = await commentsAPI.adminGetAll(params);
      const payload = res.data?.data || res.data || {};
      const list = payload.comments || [];
      setComments(list);
      setTotal(payload.pagination?.total ?? list.length);
      setPages(payload.pagination?.pages ?? 1);
    } catch (err) {
      error(getErrorMessage(err));
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, error]);

  useEffect(() => { fetchComments(); }, [fetchComments]);
  useEffect(() => { setPage(1); }, [filter, search]);

  /* ── Optimistic approve toggle ─────────────────────────────────────────── */

  const handleApprove = useCallback(async (c) => {
    const nextApproved = !c.isApproved;
    setBusyId(c.id);

    // Optimistic update
    setComments((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, isApproved: nextApproved } : x))
    );

    try {
      await commentsAPI.approve(c.id, nextApproved);
      success(nextApproved ? "Comment approved" : "Comment hidden");
    } catch (err) {
      // Rollback
      setComments((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isApproved: c.isApproved } : x))
      );
      error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [success, error]);

  /* ── Delete ────────────────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    const id = confirm.id;
    if (!id) return;
    setBusyId(id);
    try {
      await commentsAPI.remove(id);
      setComments((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      success("Comment deleted");
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setConfirm({ open: false, id: null });
    }
  }, [confirm.id, success, error]);

  /* ── Clear all ──────────────────────────────────────────────────────────── */

  const handleClearAll = useCallback(async () => {
    setClearing(true);
    try {
      const { data } = await maintenanceAPI.purgeCategory('comments', 'DELETE_ALL');
      success(data.message || 'All comments cleared');
      setComments([]);
      setTotal(0);
      setPages(1);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setClearing(false);
      setClearConfirm({ open: false });
    }
  }, [success, error]);

  /* ── Derived stats ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const approved = comments.filter((c) => c.isApproved).length;
    return { approved, hidden: comments.length - approved };
  }, [comments]);

  const clearSearch = useCallback(() => setSearchInput(""), []);

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="text-primary-600" size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Destination Comments
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {total.toLocaleString()} total comment{total === 1 ? "" : "s"} across all destinations
            </p>
          </div>
        </div>
          <button
            onClick={fetchComments}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setClearConfirm({ open: true })}
            disabled={loading || total === 0}
            className="btn-danger flex items-center gap-2 text-xs"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comment text…"
            aria-label="Search comments"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40
                       focus:border-primary-500 transition-shadow"
          />
          {searchInput && (
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

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <Filter size={15} className="text-slate-400 flex-shrink-0 hidden sm:block" />
          {FILTERS.map((f) => (
            <StatPill
              key={f.key}
              label={f.label}
              color={f.color}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16 sm:py-24 text-slate-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-slate-500">No comments found</p>
          <p className="text-sm mt-1">
            {search || filter !== "all"
              ? "Try adjusting your filters."
              : "Comments posted on destinations will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              busy={busyId === c.id}
              onToggleApprove={handleApprove}
              onDelete={(id) => setConfirm({ open: true, id })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500 px-2">
            Page <strong className="text-slate-700">{page}</strong> of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        type="delete"
        title="Delete comment?"
        description="This permanently removes the comment. This action cannot be undone."
        loading={busyId === confirm.id}
      />

      <ConfirmDialog
        isOpen={clearConfirm.open}
        onClose={() => setClearConfirm({ open: false })}
        onConfirm={handleClearAll}
        type="delete"
        title="Clear all comments?"
        description="This will permanently delete ALL destination and country comments. This cannot be undone."
        confirmLabel="Clear All"
        loading={clearing}
      />
    </div>
  );
}