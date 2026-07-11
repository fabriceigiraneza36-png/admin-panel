// src/pages/Comments.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Admin — Destination Comments
//
// Displays EVERY comment posted to destinations (the public site only rotates
// through 3 at a time). Admins can search, filter, approve/unapprove and delete.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  MessageSquare, RefreshCw, Trash2, Search, MapPin,
  CheckCircle, XCircle, Eye, EyeOff, User as UserIcon,
} from "lucide-react";

import { commentsAPI, getErrorMessage } from "@api/comments";
import ConfirmDialog from "@components/common/ConfirmDialog";
import { useToast } from "@hooks/useToast";
import { useDebounce } from "@hooks/useDebounce";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Hidden" },
];

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d); }
};

export default function Comments() {
  const { success, error } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);

  const [confirm, setConfirm] = useState({ open: false, id: null });

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filter === "approved") params.approved = "true";
      if (filter === "pending") params.approved = "false";
      if (search && search.trim()) params.search = search.trim();

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

  // Reset to page 1 whenever filter/search changes
  useEffect(() => { setPage(1); }, [filter, search]);

  const handleApprove = useCallback(async (c) => {
    setBusyId(c.id);
    try {
      await commentsAPI.approve(c.id, !c.isApproved);
      setComments((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isApproved: !c.isApproved } : x))
      );
      success(!c.isApproved ? "Comment approved" : "Comment hidden");
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [success, error]);

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

  const stats = useMemo(() => {
    const approved = comments.filter((c) => c.isApproved).length;
    return { approved, hidden: comments.length - approved };
  }, [comments]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-100 flex items-center justify-center">
            <MessageSquare className="text-primary-600" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Destination Comments</h1>
            <p className="text-sm text-slate-500">
              {total} total comment{total === 1 ? "" : "s"} across all destinations
            </p>
          </div>
        </div>
        <button
          onClick={fetchComments}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comment text…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40
                       focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition
                ${filter === f.key
                  ? "bg-primary-600 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-primary-400"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="w-8 h-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold">No comments found</p>
          <p className="text-sm">Comments posted on destinations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl border p-4 flex gap-4 transition
                ${c.isApproved ? "border-slate-200" : "border-amber-200 bg-amber-50/40"}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {c.user?.avatar ? (
                  <img
                    src={c.user.avatar}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                                  text-white grid place-items-center font-bold">
                    {(c.user?.name || c.authorName || "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  <span className="font-semibold text-slate-800 text-sm inline-flex items-center gap-1">
                    <UserIcon size={12} className="text-slate-400" />
                    {c.user?.name || c.authorName || "Anonymous"}
                  </span>
                  {c.user?.email && (
                    <span className="text-xs text-slate-400">({c.user.email})</span>
                  )}
                  <span className="text-xs text-slate-400">· {fmtDate(c.createdAt)}</span>
                  {!c.isApproved && (
                    <span className="text-[10px] font-bold uppercase tracking-wide
                                     bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>

                {c.destination && (
                  <div className="text-xs text-primary-600 font-medium inline-flex items-center gap-1 mb-1.5">
                    <MapPin size={11} />
                    {c.destination.name}
                  </div>
                )}

                <p className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleApprove(c)}
                  disabled={busyId === c.id}
                  title={c.isApproved ? "Hide from site" : "Approve"}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition
                    ${c.isApproved
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      : "bg-primary-100 text-primary-600 hover:bg-primary-200"}`}
                >
                  {c.isApproved ? <EyeOff size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: c.id })}
                  disabled={busyId === c.id}
                  title="Delete"
                  className="w-9 h-9 rounded-lg flex items-center justify-center
                             bg-red-50 text-red-500 hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm
                       disabled:opacity-40 hover:border-primary-400"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm
                       disabled:opacity-40 hover:border-primary-400"
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
    </div>
  );
}
