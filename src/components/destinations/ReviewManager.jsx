// admin/src/components/destinations/ReviewManager.jsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Star, MessageSquare, CheckCircle, XCircle, Trash2,
  RefreshCw, AlertCircle, Search, Filter, Eye, Shield,
  Award, TrendingUp, Loader2, ChevronDown, MoreVertical,
  ThumbsUp, Calendar, Flag, User
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
const getToken = () => localStorage.getItem('token') || ''

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

// ── Star display ──────────────────────────────────────────────────────────────

const StarRow = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        size={size}
        className={s <= Math.round(rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ))}
  </div>
)

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cfg = {
    approved: { cls: 'bg-green-100 text-green-800 border-green-200',  label: 'Approved' },
    pending:  { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
    rejected: { cls: 'bg-red-100 text-red-800 border-red-200',        label: 'Rejected' },
    spam:     { cls: 'bg-gray-100 text-gray-600 border-gray-200',     label: 'Spam' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ── Aggregate mini chart ──────────────────────────────────────────────────────

const RatingChart = ({ aggregate }) => {
  if (!aggregate) return null
  const { avgRating, totalReviews, distribution } = aggregate
  const bars = [
    { label: '5★', count: distribution?.fiveStar  || 0 },
    { label: '4★', count: distribution?.fourStar  || 0 },
    { label: '3★', count: distribution?.threeStar || 0 },
    { label: '2★', count: distribution?.twoStar   || 0 },
    { label: '1★', count: distribution?.oneStar   || 0 },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-green-600" /> Rating Overview
      </h3>
      <div className="flex items-center gap-6">
        <div className="text-center shrink-0">
          <p className="text-5xl font-bold text-gray-900">{avgRating?.toFixed(1) || '—'}</p>
          <StarRow rating={avgRating} size={16} />
          <p className="text-xs text-gray-500 mt-1">{totalReviews} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {bars.map(({ label, count }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-7 text-gray-500 shrink-0">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalReviews ? (count / totalReviews) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-gray-500 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Review Card ───────────────────────────────────────────────────────────────

const ReviewCard = ({ review, onApprove, onReject, onDelete, onFeature, onUnfeature, busy }) => {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isLong = review.content?.length > 200

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
      review.isFeatured ? 'border-purple-300 shadow-sm shadow-purple-50' : 'border-gray-200'
    } ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        {review.reviewerAvatar ? (
          <img src={review.reviewerAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(review.reviewerName || 'A')[0].toUpperCase()}
          </div>
        )}

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{review.reviewerName || 'Anonymous'}</span>
              {review.reviewerCountry && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Flag size={11} /> {review.reviewerCountry}
                </span>
              )}
              {review.isVerified && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Shield size={11} /> Verified
                </span>
              )}
              {review.isFeatured && (
                <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <Award size={11} /> Featured
                </span>
              )}
            </div>

            {/* Actions menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(m => !m)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-xl z-10 overflow-hidden">
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => { onApprove(review.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors text-left"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                  )}
                  {review.status !== 'rejected' && (
                    <button
                      onClick={() => { onReject(review.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                  {review.isFeatured ? (
                    <button
                      onClick={() => { onUnfeature(review.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Award size={14} /> Remove Featured
                    </button>
                  ) : (
                    <button
                      onClick={() => { onFeature(review.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors text-left"
                    >
                      <Award size={14} /> Mark Featured
                    </button>
                  )}
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { onDelete(review.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StarRow rating={review.rating} />
            <StatusBadge status={review.status} />
            {review.tripType && (
              <span className="text-xs text-gray-500">🎒 {review.tripType}</span>
            )}
            {review.tripDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(review.tripDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {review.title && (
          <p className="font-semibold text-gray-800 text-sm mb-1">{review.title}</p>
        )}
        <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {review.content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-green-600 hover:text-green-700 mt-1 font-medium flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'Read more'}
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Review images */}
        {review.images?.length > 0 && (
          <div className="flex gap-2 mt-3">
            {review.images.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
            ))}
          </div>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} /> {review.helpfulCount || 0} helpful
            </span>
            <span>
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </span>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5">
            {review.status !== 'approved' && (
              <button
                onClick={() => onApprove(review.id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
              >
                <CheckCircle size={12} /> Approve
              </button>
            )}
            {review.status !== 'rejected' && review.status !== 'approved' && (
              <button
                onClick={() => onReject(review.id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
              >
                <XCircle size={12} /> Reject
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

const FilterBar = ({ filters, onChange, total }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
    {/* Search */}
    <div className="relative flex-1 min-w-48">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        placeholder="Search reviews..."
        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>

    {/* Status */}
    <select
      value={filters.status}
      onChange={e => onChange({ ...filters, status: e.target.value })}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
    >
      <option value="">All Statuses</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>

    {/* Sort */}
    <select
      value={filters.sort}
      onChange={e => onChange({ ...filters, sort: e.target.value })}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
    >
      <option value="-created">Newest First</option>
      <option value="created">Oldest First</option>
      <option value="rating">Highest Rated</option>
      <option value="helpful">Most Helpful</option>
    </select>

    <span className="text-xs text-gray-400 ml-auto">{total} result{total !== 1 ? 's' : ''}</span>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReviewManager({ destinationId, destinationName, onClose }) {
  const [reviews, setReviews]     = useState([])
  const [aggregate, setAggregate] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [busy, setBusy]           = useState(null)
  const [toast, setToast]         = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [filters, setFilters]     = useState({ search: '', status: '', sort: '-created' })

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async (page = 1) => {
    if (!destinationId) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        page, limit: 10,
        sort: filters.sort,
        ...(filters.status && { status: filters.status }),
      })
      const [reviewData, aggData] = await Promise.all([
        apiFetch(`/destinations/${destinationId}/reviews?${qs}`),
        apiFetch(`/destinations/${destinationId}/reviews?page=1&limit=1`),
      ])
      // Filter client-side by search
      let rows = reviewData.data || []
      if (filters.search) {
        const q = filters.search.toLowerCase()
        rows = rows.filter(r =>
          r.content?.toLowerCase().includes(q) ||
          r.reviewerName?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q)
        )
      }
      setReviews(rows)
      setAggregate(reviewData.aggregate || aggData.aggregate)
      setPagination(reviewData.pagination || { page: 1, total: rows.length, totalPages: 1 })
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setLoading(false)
    }
  }, [destinationId, filters])

  useEffect(() => { load(1) }, [load])

  // Admin review status update (uses the admin endpoint if available)
  const updateReview = async (reviewId, updates) => {
    setBusy(reviewId)
    try {
      // Note: patch via PUT to the review — backend admin routes handle status updates
      await apiFetch(`/destinations/${destinationId}/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }).catch(async () => {
        // Fallback: use the admin endpoint
        await apiFetch(`/admin/reviews/${reviewId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      })
      showToast('success', 'Review updated')
      load(pagination.page)
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setBusy(null)
    }
  }

  const deleteReview = async (reviewId) => {
    if (!confirm('Permanently delete this review?')) return
    setBusy(reviewId)
    try {
      await apiFetch(`/destinations/${destinationId}/reviews/${reviewId}`, { method: 'DELETE' })
        .catch(async () => {
          await apiFetch(`/admin/reviews/${reviewId}`, { method: 'DELETE' })
        })
      showToast('success', 'Review deleted')
      load(pagination.page)
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setBusy(null)
    }
  }

  const pendingCount   = reviews.filter(r => r.status === 'pending').length
  const approvedCount  = reviews.filter(r => r.status === 'approved').length

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
        <div className="h-full w-full max-w-4xl bg-gray-50 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Review Manager</h2>
                <p className="text-xs text-gray-500">{destinationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status summary */}
              <div className="hidden sm:flex items-center gap-2">
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-2.5 py-1 rounded-full text-xs font-medium">
                    <AlertCircle size={12} /> {pendingCount} pending
                  </span>
                )}
                {approvedCount > 0 && (
                  <span className="flex items-center gap-1 bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 rounded-full text-xs font-medium">
                    <CheckCircle size={12} /> {approvedCount} approved
                  </span>
                )}
              </div>
              <button onClick={() => load(1)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={16} />
              </button>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Aggregate */}
            {aggregate && <RatingChart aggregate={aggregate} />}

            {/* Filters */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              total={pagination.total}
            />

            {/* Reviews */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 size={32} className="animate-spin text-green-600" />
                <p className="text-gray-500 text-sm">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <MessageSquare size={40} className="opacity-30" />
                <p className="font-medium">No reviews found</p>
                {filters.status && (
                  <button
                    onClick={() => setFilters(f => ({ ...f, status: '' }))}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    Clear status filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onApprove={id => updateReview(id, { status: 'approved' })}
                    onReject={id => updateReview(id, { status: 'rejected' })}
                    onFeature={id => updateReview(id, { is_featured: true })}
                    onUnfeature={id => updateReview(id, { is_featured: false })}
                    onDelete={deleteReview}
                    busy={busy === review.id}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => load(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => load(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-500">
              {pagination.total} total review{pagination.total !== 1 ? 's' : ''}
            </p>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-sm ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2"><X size={14} /></button>
        </div>
      )}
    </>
  )
}