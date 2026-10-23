// src/pages/Likes.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// DESTINATION LIKES — Admin Overview
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { Heart, RefreshCw, Search, X, UserRound, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { apiClient, getErrorMessage } from "@api/client";
import { useDebounce } from "@hooks/useDebounce";

export default function Likes() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);

  const fetchLikes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/destinations", {
        params: { limit: 100, is_active: "true" },
      });
      const list = data?.data?.destinations || data?.data || data?.destinations || [];
      setDestinations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("[Likes] fetch error:", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  const [likeCounts, setLikeCounts] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [likeDetails, setLikeDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState({});
  const [detailErrors, setDetailErrors] = useState({});

  const toggleLikeDetails = useCallback(async (destination) => {
    const id = destination.id || destination.numericId;
    if (!id) return;
    if (String(expandedId) === String(id)) { setExpandedId(null); return; }
    setExpandedId(id);
    if (likeDetails[id]) return;
    setDetailLoading((prev) => ({ ...prev, [id]: true }));
    setDetailErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const { data } = await apiClient.get(`/destination-likes/${encodeURIComponent(id)}/likes`);
      const rows = data?.data?.likes || [];
      setLikeDetails((prev) => ({ ...prev, [id]: Array.isArray(rows) ? rows : [] }));
    } catch (err) {
      setDetailErrors((prev) => ({ ...prev, [id]: getErrorMessage(err) || "Could not load liked accounts." }));
    } finally {
      setDetailLoading((prev) => ({ ...prev, [id]: false }));
    }
  }, [expandedId, likeDetails]);

  useEffect(() => {
    if (!destinations.length) return;
    const ids = [...new Set(destinations.map((d) => d.id || d.numericId).filter(Boolean).map(String))];
    if (!ids.length) return;

    let active = true;
    const refreshLikeCounts = async () => {
      try {
        const { data } = await apiClient.post("/destination-likes/likes/stats", { destinationIds: ids });
        if (!active) return;
        const counts = {};
        (data?.data || []).forEach((item) => {
          counts[String(item.destinationId)] = Number(item.totalLikes) || 0;
        });
        setLikeCounts(counts);
      } catch {
        // Keep the last successful counts visible if the network is temporarily unavailable.
      }
    };

    refreshLikeCounts();
    // Keep the admin view in sync with likes created on the public website.
    const intervalId = window.setInterval(refreshLikeCounts, 15000);
    const handleFocus = () => refreshLikeCounts();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshLikeCounts();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [destinations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return destinations;
    const q = search.toLowerCase();
    return destinations.filter((d) =>
      (d.name || "").toLowerCase().includes(q) ||
      (d.country?.name || "").toLowerCase().includes(q)
    );
  }, [destinations, search]);

  const totalLikes = useMemo(() => {
    return Object.values(likeCounts).reduce((sum, n) => sum + (n || 0), 0);
  }, [likeCounts]);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <Heart className="text-rose-600" size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Destination Likes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {totalLikes.toLocaleString()} total like{totalLikes === 1 ? "" : "s"} across all destinations
            </p>
          </div>
        </div>
        <button
          onClick={fetchLikes}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-0 sm:min-w-[220px] mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search destinations…"
          aria-label="Search destinations"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-shadow"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
              <div className="w-12 h-8 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 sm:py-24 text-slate-400">
          <Heart size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-slate-500">No destinations found</p>
          <p className="text-sm mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const count = likeCounts[d.id || d.numericId] || 0;
            return (
              <div key={d.id || d.numericId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition">
                <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: "linear-gradient(135deg,#059669,#047857)" }}>
                    {(d.name || "D")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{d.name}</div>
                    <div className="text-xs text-slate-400 truncate">{d.country?.name || d.countryName || "Unknown location"}</div>
                  </div>
                  <button type="button" onClick={() => toggleLikeDetails(d)} aria-expanded={String(expandedId) === String(d.id || d.numericId)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold shrink-0" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #bbf7d0" }}>
                    <Heart size={14} /><span>{count}</span>
                    {String(expandedId) === String(d.id || d.numericId) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
                {String(expandedId) === String(d.id || d.numericId) && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Accounts that liked this destination</div>
                    {detailLoading[d.id || d.numericId] ? (
                      <div className="text-sm text-slate-500 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />Loading accounts…</div>
                    ) : detailErrors[d.id || d.numericId] ? (
                      <div role="alert" className="text-sm text-red-700 flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0" />{detailErrors[d.id || d.numericId]}</div>
                    ) : (likeDetails[d.id || d.numericId] || []).length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(likeDetails[d.id || d.numericId] || []).map((like, index) => (
                          <div key={like.id || `${like.user?.id || like.userId || "account"}-${index}`} className="min-w-0 flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3">
                            {like.user?.avatar ? <img src={like.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center shrink-0"><UserRound size={16} /></div>}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate">{like.user?.name || like.user?.fullName || "Account unavailable"}</div>
                              <div className="text-xs text-slate-500 truncate">{like.user?.email || "No email returned"}</div>
                              {like.createdAt && <div className="text-[11px] text-slate-400">{new Date(like.createdAt).toLocaleString()}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-sm text-slate-500">No linked accounts found for these likes.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
