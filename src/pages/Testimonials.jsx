// src/pages/admin/Testimonials.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Admin Testimonials Panel v3.0
//
// Field mapping (backend → frontend display):
//   testimonial_text  → "content" in form (mapped on save/load)
//   name              → author_name
//   location          → author_location
//   avatar_url        → author_avatar
//   is_active         → status (Active / Inactive / Pending)
//   is_featured       → featured star
//
// Key fixes:
//   - Uses adminGetAll() so pending reviews (is_active=false) are visible
//   - Maps backend field names ↔ frontend form field names correctly
//   - toggleActive / toggleFeatured use dedicated PATCH endpoints
//   - Stats banner shows total / pending / featured counts
//   - Approve button for pending reviews
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  useEffect, useState, useCallback, useMemo,
} from "react";
import {
  Star, Plus, Pencil, Trash2, RefreshCw,
  Eye, Quote, CheckCircle, XCircle,
  BarChart2, Clock, Filter,
} from "lucide-react";

import { testimonialsAPI }  from "@api/testimonials";
import { getErrorMessage }  from "@api/client";
import Table, {
  TableActions, TableAction,
}                           from "@components/common/Table";
import Pagination           from "@components/common/Pagination";
import SearchBar            from "@components/common/SearchBar";
import Modal, {
  ModalGrid,
}                           from "@components/common/Modal";
import Badge                from "@components/common/Badge";
import Avatar               from "@components/common/Avatar";
import ConfirmDialog        from "@components/common/ConfirmDialog";
import ImageUpload          from "@components/common/ImageUpload";
import { useModal }         from "@hooks/useModal";
import { useToast }         from "@hooks/useToast";
import { usePagination }    from "@hooks/usePagination";
import { useDebounce }      from "@hooks/useDebounce";
import { formatDate }       from "@utils/formatters";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Empty form state — uses FRONTEND field names.
 * On save these are mapped → backend field names.
 * On load backend fields are mapped → these names.
 */
const EMPTY_FORM = Object.freeze({
  content:          "",   // → testimonial_text
  author_name:      "",   // → name
  author_location:  "",   // → location
  author_avatar:    "",   // → avatar_url
  rating:           5,
  trip:             "",
  date_text:        "",
  is_featured:      false,
  is_active:        true,
});

// ── Map backend row → form state ──────────────────────────────────────────
const rowToForm = (row) => ({
  content:          row.testimonial_text ?? row.content         ?? "",
  author_name:      row.name             ?? row.author_name     ?? "",
  author_location:  row.location         ?? row.author_location ?? "",
  author_avatar:    row.avatar_url       ?? row.author_avatar   ?? "",
  rating:           Number(row.rating)   || 5,
  trip:             row.trip             ?? "",
  date_text:        row.date_text        ?? "",
  is_featured:      Boolean(row.is_featured),
  is_active:        Boolean(row.is_active),
});

// ── Map form state → backend payload ─────────────────────────────────────
const formToPayload = (form) => ({
  testimonial_text: form.content.trim(),
  name:             form.author_name.trim()     || undefined,
  location:         form.author_location.trim() || undefined,
  avatar_url:       form.author_avatar.trim()   || undefined,
  rating:           Number(form.rating),
  trip:             form.trip.trim()            || undefined,
  date_text:        form.date_text.trim()       || undefined,
  is_featured:      Boolean(form.is_featured),
  is_active:        Boolean(form.is_active),
});

// ── Filter tab options ────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",      label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "active",   label: "Active"   },
  { key: "featured", label: "Featured" },
];

// ═══════════════════════════════════════════════════════════════════════════
// STAR DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

const StarDisplay = ({ rating, size = 12 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={size}
        className={
          i < Math.round(Number(rating) || 0)
            ? "text-amber-500 fill-amber-500"
            : "text-slate-200"
        }
      />
    ))}
  </div>
);

// ── Interactive star picker ───────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="p-0.5 rounded transition-transform hover:scale-110"
        aria-label={`${n} star`}
      >
        <Star
          size={24}
          className={
            n <= value
              ? "text-amber-500 fill-amber-500"
              : "text-slate-200 hover:text-amber-300"
          }
        />
      </button>
    ))}
    <span className="ml-2 text-sm text-slate-500">
      {value}/5
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// STATS BANNER
// ═══════════════════════════════════════════════════════════════════════════

const StatCard = ({ icon: Icon, label, value, color = "text-slate-700" }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
    <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ row }) => {
  // Pending = submitted by user but not yet approved (is_active = false, user_id set)
  const isPending = !row.is_active && row.user_id != null;

  if (isPending)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={10} />
        Pending
      </span>
    );

  return (
    <Badge
      status={row.is_active ? "active" : "inactive"}
      label={row.is_active ? "Active" : "Inactive"}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Testimonials() {
  const toast       = useToast();
  const pag         = usePagination();
  const viewModal   = useModal();
  const formModal   = useModal();
  const deleteModal = useModal();

  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");   // all | pending | active | featured
  const [form,    setForm]     = useState({ ...EMPTY_FORM });
  const [editing, setEditing]  = useState(null);

  const dSearch = useDebounce(search, 400);

  // ── Build query params from current filter tab ──────────────────────────
  const filterParams = useMemo(() => {
    switch (filter) {
      case "pending":  return { active: "false" };
      case "active":   return { active: "true"  };
      case "featured": return { featured: "true" };
      default:         return {};
    }
  }, [filter]);

  // ── Load data ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page:  pag.page,
        limit: pag.limit,
        ...filterParams,
        ...(dSearch ? { search: dSearch } : {}),
      };

      // Use adminGetAll to see ALL testimonials including pending ones
      const { data } = await testimonialsAPI.adminGetAll(params);

      const rows  = data?.data ?? data?.testimonials ?? [];
      const total = data?.pagination?.total ?? data?.total ?? rows.length;

      setItems(rows);
      pag.setTotal(total);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [pag.page, pag.limit, dSearch, filterParams]); // eslint-disable-line

  // ── Load stats ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const { data } = await testimonialsAPI.getStats();
      setStats(data?.data ?? data ?? null);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    pag.goTo(1);
  }, [filter, dSearch]); // eslint-disable-line

  // ── Form helpers ──────────────────────────────────────────────────────────
  const upd = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    formModal.open();
  }, [formModal]);

  const openEdit = useCallback((row) => {
    setForm(rowToForm(row));
    setEditing(row);
    formModal.open();
  }, [formModal]);

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.content.trim()) {
      toast.error("Review content is required.");
      return;
    }
    if (Number(form.rating) < 1 || Number(form.rating) > 5) {
      toast.error("Rating must be between 1 and 5.");
      return;
    }

    setSaving(true);
    try {
      const payload = formToPayload(form);

      if (editing) {
        await testimonialsAPI.update(editing.id, payload);
        toast.success("Testimonial updated successfully.");
      } else {
        await testimonialsAPI.create(payload);
        toast.success("Testimonial created successfully.");
      }

      formModal.close();
      load();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, editing, formModal, load, loadStats, toast]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteModal.data?.id) return;
    try {
      await testimonialsAPI.remove(deleteModal.data.id);
      toast.success("Testimonial deleted.");
      deleteModal.close();
      load();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [deleteModal, load, loadStats, toast]);

  // ── Toggle featured ───────────────────────────────────────────────────────
  const handleToggleFeatured = useCallback(async (row) => {
    try {
      await testimonialsAPI.toggleFeatured(row.id);
      toast.success(
        row.is_featured ? "Removed from featured." : "Marked as featured.",
      );
      load();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [load, loadStats, toast]);

  // ── Approve (toggle active) ───────────────────────────────────────────────
  const handleApprove = useCallback(async (row) => {
    try {
      await testimonialsAPI.toggleActive(row.id);
      toast.success(
        row.is_active ? "Testimonial deactivated." : "Testimonial approved and published!",
      );
      load();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [load, loadStats, toast]);

  // ── Pending count for badge ───────────────────────────────────────────────
  const pendingCount = Number(stats?.pending_approval ?? 0);

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key:    "testimonial_text",
      label:  "Review",
      render: (v, row) => {
        // Backend field is testimonial_text; row also has content in older data
        const text = v || row.content || "";
        return (
          <p className="max-w-[240px] truncate text-sm text-slate-700 italic">
            &ldquo;{text || "—"}&rdquo;
          </p>
        );
      },
    },
    {
      key:    "name",
      label:  "Author",
      render: (v, row) => {
        const name   = v || row.author_name || "";
        const avatar = row.avatar_url || row.author_avatar || "";
        return (
          <div className="flex items-center gap-2">
            <Avatar
              src={avatar}
              name={name}
              size="xs"
              rounded="full"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {name || "—"}
              </p>
              {(row.location || row.author_location) && (
                <p className="text-xs text-slate-400 truncate">
                  {row.location || row.author_location}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key:    "trip",
      label:  "Trip",
      render: (v) => (
        <span className="text-xs text-slate-500">{v || "—"}</span>
      ),
    },
    {
      key:    "rating",
      label:  "Rating",
      render: (v) => <StarDisplay rating={v} />,
    },
    {
      key:    "is_featured",
      label:  "Featured",
      align:  "center",
      render: (v, row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleFeatured(row); }}
          title={v ? "Remove from featured" : "Mark as featured"}
          className="mx-auto block transition-transform hover:scale-110"
        >
          <Star
            size={16}
            className={
              v
                ? "text-amber-500 fill-amber-500"
                : "text-slate-300 hover:text-amber-400"
            }
          />
        </button>
      ),
    },
    {
      key:    "is_active",
      label:  "Status",
      render: (_, row) => <StatusBadge row={row} />,
    },
    {
      key:    "created_at",
      label:  "Date",
      render: (v) => (
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {v ? formatDate(v) : "—"}
        </span>
      ),
    },
  ], [
    handleToggleFeatured, handleApprove,
    viewModal, deleteModal, openEdit,
  ]);

  // ── Derive display name for the viewed/deleted item ───────────────────────
  const itemDisplayName = (row) =>
    row?.name || row?.author_name || "this testimonial";

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5 page-enter">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Quote size={26} className="text-primary-600" />
            Testimonials
          </h1>
          <p className="page-subtitle">
            {pag.total} review{pag.total !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                · <Clock size={12} /> {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { load(); loadStats(); }}
            disabled={loading}
            className="btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary"
          >
            <Plus size={16} />
            Add Testimonial
          </button>
        </div>
      </div>

      {/* ── Stats banner ────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Quote}
            label="Total"
            value={stats.total}
            color="text-primary-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Active"
            value={stats.active}
            color="text-emerald-600"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats.pending_approval ?? 0}
            color="text-amber-600"
          />
          <StatCard
            icon={Star}
            label="Avg Rating"
            value={stats.avg_rating ? `${Number(stats.avg_rating).toFixed(1)} ★` : "—"}
            color="text-amber-500"
          />
        </div>
      )}

      {/* ── Filters + search ────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filter === tab.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search reviews, authors, locations…"
          className="flex-1 max-w-sm"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="card">
        <Table
          columns={columns.filter(c => c.key !== 'actions')}
          data={items}
          loading={loading}
          emptyMessage={
            filter === "pending"
              ? "No pending reviews — all caught up! ✅"
              : search
                ? "No results match your search."
                : "No testimonials yet. Add one or wait for user submissions."
          }
          onRowClick={(row) => viewModal.open(row)}
          hoverActions={[
            { icon: Eye,    label: "View",   onClick: (r) => viewModal.open(r), alwaysVisible: true },
            { icon: CheckCircle, label: "Approve", onClick: (r) => handleApprove(r), variant: "success", disabled: (r) => r.is_active },
            { icon: XCircle, label: "Deactivate", onClick: (r) => handleApprove(r), variant: "warning", disabled: (r) => !r.is_active },
            { icon: Pencil, label: "Edit",   onClick: (r) => openEdit(r), alwaysVisible: true },
            { icon: Trash2, label: "Delete", onClick: (r) => deleteModal.open(r), variant: "danger", alwaysVisible: true },
          ]}
        />
        <Pagination
          {...pag}
          onNext={pag.next}
          onPrev={pag.prev}
          onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title="Review Preview"
        size="sm"
        icon={<Quote size={20} />}
        footer={
          <div className="flex justify-between w-full gap-2">
            <div className="flex gap-2">
              {viewModal.data && !viewModal.data.is_active && (
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(viewModal.data);
                    viewModal.close();
                  }}
                  className="btn-primary text-sm"
                >
                  <CheckCircle size={14} />
                  Approve &amp; Publish
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={viewModal.close}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  viewModal.close();
                  openEdit(viewModal.data);
                }}
                className="btn-primary"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        }
      >
        {viewModal.data && (() => {
          const row  = viewModal.data;
          const text = row.testimonial_text || row.content || "";
          const name = row.name || row.author_name || "Traveler";
          const loc  = row.location || row.author_location || "";
          const av   = row.avatar_url || row.author_avatar || "";

          return (
            <div className="space-y-5">
              {/* Status banner */}
              {!row.is_active && row.user_id && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                  <Clock size={16} />
                  Pending approval — submitted by a user
                </div>
              )}

              {/* Author + stars */}
              <div className="text-center space-y-3">
                <Avatar
                  src={av}
                  name={name}
                  size="xl"
                  rounded="full"
                  className="mx-auto"
                />
                <div>
                  <p className="font-bold text-slate-800 text-base">{name}</p>
                  {loc && (
                    <p className="text-xs text-slate-400 mt-0.5">{loc}</p>
                  )}
                  {row.trip && (
                    <p className="text-xs text-primary-600 font-medium mt-1">
                      🧭 {row.trip}
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <StarDisplay rating={row.rating} size={16} />
                </div>
              </div>

              {/* Review text */}
              <blockquote className="text-slate-600 italic text-sm leading-relaxed text-center border-l-4 border-primary-200 pl-4 py-2">
                &ldquo;{text}&rdquo;
              </blockquote>

              {/* Meta */}
              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div>
                  <dt className="font-semibold text-slate-400 mb-0.5">Featured</dt>
                  <dd>{row.is_featured ? "✅ Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400 mb-0.5">Status</dt>
                  <dd><StatusBadge row={row} /></dd>
                </div>
                {row.date_text && (
                  <div>
                    <dt className="font-semibold text-slate-400 mb-0.5">Period</dt>
                    <dd>{row.date_text}</dd>
                  </div>
                )}
                {row.created_at && (
                  <div>
                    <dt className="font-semibold text-slate-400 mb-0.5">Submitted</dt>
                    <dd>{formatDate(row.created_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          );
        })()}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          FORM MODAL (Create / Edit)
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? "Edit Testimonial" : "Add Testimonial"}
        size="md"
        icon={<Quote size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={formModal.close}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.content.trim()}
              className="btn-primary min-w-[100px]"
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">

          {/* Review content */}
          <div className="input-group">
            <label className="input-label" htmlFor="tm-content">
              Review Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="tm-content"
              className="input min-h-[120px] resize-y"
              value={form.content}
              onChange={(e) => upd("content", e.target.value)}
              placeholder="What the customer said about their experience…"
              maxLength={2000}
            />
            <p className="text-xs text-slate-400 mt-1">
              {form.content.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* Author name + location */}
          <ModalGrid>
            <div className="input-group">
              <label className="input-label" htmlFor="tm-name">
                Author Name
              </label>
              <input
                id="tm-name"
                className="input"
                value={form.author_name}
                onChange={(e) => upd("author_name", e.target.value)}
                placeholder="e.g. Sarah Johnson"
                maxLength={255}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="tm-location">
                Location
              </label>
              <input
                id="tm-location"
                className="input"
                value={form.author_location}
                onChange={(e) => upd("author_location", e.target.value)}
                placeholder="e.g. London, UK"
                maxLength={255}
              />
            </div>
          </ModalGrid>

          {/* Trip + Date text */}
          <ModalGrid>
            <div className="input-group">
              <label className="input-label" htmlFor="tm-trip">
                Trip / Package
                <span className="ml-1 text-xs text-slate-400 font-normal">
                  — optional
                </span>
              </label>
              <input
                id="tm-trip"
                className="input"
                value={form.trip}
                onChange={(e) => upd("trip", e.target.value)}
                placeholder="e.g. Gorilla Trek"
                maxLength={255}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="tm-date">
                Date Label
                <span className="ml-1 text-xs text-slate-400 font-normal">
                  — optional
                </span>
              </label>
              <input
                id="tm-date"
                className="input"
                value={form.date_text}
                onChange={(e) => upd("date_text", e.target.value)}
                placeholder="e.g. March 2024"
                maxLength={100}
              />
            </div>
          </ModalGrid>

          {/* Rating */}
          <div className="input-group">
            <label className="input-label">Rating</label>
            <StarPicker
              value={form.rating}
              onChange={(v) => upd("rating", v)}
            />
          </div>

          {/* Avatar upload */}
          <ImageUpload
            label="Author Photo"
            value={form.author_avatar}
            onChange={(v) => upd("author_avatar", v)}
            folder="testimonials"
          />

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => upd("is_featured", e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">
                ⭐ Featured
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => upd("is_active", e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">
                ✅ Active (published)
              </span>
            </label>
          </div>

        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete testimonial?"
        description={
          deleteModal.data
            ? `This will permanently delete the review by "${itemDisplayName(deleteModal.data)}". This cannot be undone.`
            : "This will permanently delete the testimonial."
        }
      />

    </div>
  );
}