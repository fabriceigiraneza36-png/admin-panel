import { useState, useEffect } from "react";
import * as api from "../../api/destinations";
import { useToast } from "../../hooks/useToast";
import {
  StarIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

const STATUS_COLORS = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ReviewManager({ destinationId }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [aggregate, setAggregate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      const r = await api.getReviews(destinationId, params);
      setReviews(r.data || []);
      setAggregate(r.aggregate || null);
      setTotalPages(r.pagination?.totalPages || 1);
    } catch { toast("Failed to load reviews", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [destinationId, page]);

  const handleStatusUpdate = async (review, status) => {
    try {
      await api.updateReview(destinationId, review.id, { status });
      toast(`Review ${status}`, "success");
      await load();
    } catch { toast("Update failed", "error"); }
  };

  const handleDelete = async (review) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await api.removeReview(destinationId, review.id);
      toast("Review deleted", "success");
      await load();
    } catch { toast("Delete failed", "error"); }
  };

  const filtered = filterStatus === "all"
    ? reviews
    : reviews.filter((r) => r.status === filterStatus);

  return (
    <div className="space-y-4">
      {/* Aggregate */}
      {aggregate && (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{aggregate.avgRating?.toFixed(1) || "—"}</p>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <StarSolid
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(aggregate.avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{aggregate.totalReviews} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {[
              { label: "5★", val: aggregate.distribution?.fiveStar },
              { label: "4★", val: aggregate.distribution?.fourStar },
              { label: "3★", val: aggregate.distribution?.threeStar },
              { label: "2★", val: aggregate.distribution?.twoStar },
              { label: "1★", val: aggregate.distribution?.oneStar },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-gray-500">{label}</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: aggregate.totalReviews ? `${(val / aggregate.totalReviews) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-6 text-gray-500">{val || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-900 flex-1">Reviews</h3>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No reviews</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {review.reviewerName?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{review.reviewerName}</p>
                      {review.reviewerCountry && (
                        <span className="text-xs text-gray-400">{review.reviewerCountry}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[review.status] || "bg-gray-100 text-gray-600"}`}>
                        {review.status}
                      </span>
                      {review.isVerified && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✓ Verified</span>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex gap-0.5 my-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <StarSolid
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= review.rating ? "text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{review.rating}/5</span>
                    </div>

                    {review.title && (
                      <p className="font-medium text-sm text-gray-800">{review.title}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{review.content}</p>

                    {review.tripType && (
                      <p className="text-xs text-gray-400 mt-1">
                        {review.tripType}
                        {review.tripDate ? ` · ${new Date(review.tripDate).toLocaleDateString()}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {review.status !== "approved" && (
                    <button
                      onClick={() => handleStatusUpdate(review, "approved")}
                      title="Approve"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button
                      onClick={() => handleStatusUpdate(review, "rejected")}
                      title="Reject"
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                    >
                      <FlagIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review)}
                    title="Delete"
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm ${
                p === page ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}