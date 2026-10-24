import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Star, RefreshCw, Search, CheckCircle2, EyeOff, Trash2, MapPin,
  UserRound, CalendarDays, MessageSquareText, ChevronLeft, ChevronRight,
  StarHalf, ShieldCheck,
} from "lucide-react";
import apiClient, { getErrorMessage } from "@api/client";
import { useToast } from "@hooks/useToast";

const PAGE_SIZE = 25;

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

function RatingStars({ value, size = 15 }) {
  const score = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={score + " out of 5 stars"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} strokeWidth={1.8}
          className={star <= Math.round(score) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      ))}
    </span>
  );
}

const FILTERS = [
  { value: "all", label: "All ratings" },
  { value: "approved", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

export default function DestinationRatings() {
  const { success, error } = useToast();
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState({ total: 0, average: 0, approved: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchRatings = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await apiClient.get("/destination-ratings/admin/all", {
        params: { page, limit: PAGE_SIZE, status: filter },
      });
      const payload = response.data?.data || response.data || {};
      const rows = Array.isArray(payload.ratings) ? payload.ratings : [];
      setRatings(rows);
      setSummary(payload.summary || { total: 0, average: 0, approved: 0 });
      setTotal(Number(payload.pagination?.total ?? rows.length));
      setPages(Math.max(1, Number(payload.pagination?.pages) || 1));
    } catch (err) {
      error(getErrorMessage(err));
      setRatings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filter, error]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);
  useEffect(() => { setPage(1); }, [filter]);

  const visibleRatings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ratings;
    return ratings.filter((item) => [
      item.destinationName, item.user?.name, item.user?.email, item.review,
      item.rating, item.destinationSlug,
    ].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [ratings, search]);

  const toggleApproval = useCallback(async (item) => {
    const nextApproved = !item.isApproved;
    setBusyId(item.id);
    setRatings((current) => current.map((row) => row.id === item.id ? { ...row, isApproved: nextApproved } : row));
    try {
      await apiClient.patch(
        "/destination-ratings/" + encodeURIComponent(item.destinationId) + "/ratings/" + encodeURIComponent(item.id) + "/approve",
        { isApproved: nextApproved },
      );
      success(nextApproved ? "Rating is now visible on destination averages" : "Rating hidden from public averages");
      await fetchRatings(true);
    } catch (err) {
      setRatings((current) => current.map((row) => row.id === item.id ? { ...row, isApproved: item.isApproved } : row));
      error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [error, fetchRatings, success]);

  const deleteRating = useCallback(async (item) => {
    const confirmed = window.confirm("Delete this destination rating? The public average will be recalculated.");
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await apiClient.delete(
        "/destination-ratings/" + encodeURIComponent(item.destinationId) + "/ratings/" + encodeURIComponent(item.id),
      );
      success("Rating deleted and destination average recalculated");
      await fetchRatings(true);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [error, fetchRatings, success]);

  const average = Number(summary.average) || 0;
  const count = Number(summary.total) || 0;
  const approved = Number(summary.approved) || 0;
  const hidden = Math.max(0, count - approved);

  return (
    <main className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-7">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Star size={24} className="fill-emerald-600" />
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
              <ShieldCheck size={13} /> Traveller feedback
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Destination ratings</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Review submitted star ratings, moderate public visibility, and keep destination averages in sync with approved votes.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => fetchRatings(true)} disabled={refreshing || loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60">
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted ratings</p>
          <div className="mt-2 flex items-baseline gap-2">
            <strong className="text-3xl font-extrabold text-slate-900">{count}</strong>
            <span className="text-xs text-slate-500">total votes</span>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall average</p>
          <div className="mt-2 flex items-center gap-2">
            <strong className="text-3xl font-extrabold text-slate-900">{count ? average.toFixed(2) : "—"}</strong>
            <RatingStars value={average} size={16} />
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public visibility</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <strong className="text-3xl font-extrabold text-emerald-700">{approved}</strong>
            <span className="text-xs text-slate-500">visible</span>
            <strong className="text-2xl font-bold text-amber-600">{hidden}</strong>
            <span className="text-xs text-slate-500">hidden</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button key={item.value} type="button" onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={"rounded-xl px-3.5 py-2 text-sm font-bold transition " + (filter === item.value ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400 focus-within:border-emerald-400 sm:w-72">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search destination or traveller"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3 p-4" aria-busy="true">
            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : visibleRatings.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Star size={22} /></div>
            <h2 className="text-base font-bold text-slate-800">No ratings found</h2>
            <p className="mt-1 text-sm text-slate-500">{search ? "Try a different search term." : "New traveller ratings will appear here as they are submitted."}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRatings.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <strong className="text-sm">{item.rating}/5</strong>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-slate-900">
                      <MapPin size={13} className="text-emerald-600" /> {item.destinationName || "Unknown destination"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${item.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {item.isApproved ? "Visible" : "Hidden"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><UserRound size={12} /> {item.user?.name || "Account removed"}</span>
                    {item.user?.email && <span className="break-all">{item.user.email}</span>}
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDate(item.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <RatingStars value={item.rating} />
                    <span className="text-xs font-semibold text-amber-700">{item.rating} out of 5</span>
                  </div>
                  {item.review && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><MessageSquareText size={13} className="mr-1 inline text-slate-400" />{item.review}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <button type="button" disabled={busyId === item.id} onClick={() => toggleApproval(item)}
                    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition disabled:opacity-50 ${item.isApproved ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                    {item.isApproved ? <><EyeOff size={14} /> Hide</> : <><CheckCircle2 size={14} /> Show</>}
                  </button>
                  <button type="button" disabled={busyId === item.id} onClick={() => deleteRating(item)}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">Showing {visibleRatings.length} of {total} ratings in this filter</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17} /></button>
            <span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {page} / {pages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page >= pages || loading}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Next page"><ChevronRight size={17} /></button>
          </div>
        </footer>
      </section>
    </main>
  );
}
