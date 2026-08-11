import { useState } from "react";
import * as api from "../../api/destinations";
import ImageManager from "./ImageManager";
import ReviewManager from "./ReviewManager";
import { useToast } from "../../hooks/useToast";
import {
  XMarkIcon,
  PencilIcon,
  MapPinIcon,
  StarIcon,
  PhotoIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

const DETAIL_TABS = [
  { id: "overview", label: "Overview", icon: GlobeAltIcon },
  { id: "images", label: "Images", icon: PhotoIcon },
  { id: "itinerary", label: "Itinerary", icon: CalendarIcon },
  { id: "faqs", label: "FAQs", icon: ChatBubbleLeftRightIcon },
  { id: "reviews", label: "Reviews", icon: StarIcon },
  { id: "tags", label: "Tags", icon: TagIcon },
  { id: "practical", label: "Practical Info", icon: ShieldCheckIcon },
];

export default function DestinationDetail({
  destination: dest,
  onClose,
  onEdit,
  onRefresh,
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");

  if (!dest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="relative h-56 rounded-t-2xl overflow-hidden bg-gray-200">
          {dest.heroImage || dest.imageUrl ? (
            <img
              src={dest.heroImage || dest.imageUrl}
              alt={dest.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PhotoIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{dest.name}</h2>
              <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                <MapPinIcon className="w-4 h-4" />
                {dest.country?.flag} {dest.countryName || dest.country?.name}
                {dest.region ? ` · ${dest.region}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-100"
              >
                <PencilIcon className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b divide-x">
          {[
            {
              icon: StarSolid,
              val: dest.rating
                ? `${dest.rating.toFixed(1)} (${dest.reviewCount})`
                : "No reviews",
              label: "Rating",
            },
            { icon: ClockIcon, val: dest.duration || "—", label: "Duration" },
            {
              icon: UserGroupIcon,
              val: dest.minGroupSize
                ? `${dest.minGroupSize}–${dest.maxGroupSize || "∞"}`
                : "—",
              label: "Group Size",
            },
            {
              icon: GlobeAltIcon,
              val: dest.difficulty || "—",
              label: "Difficulty",
            },
          ].map((s) => (
            <div key={s.label} className="p-4 flex items-center gap-3">
              <s.icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="font-medium text-sm text-gray-900">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {DETAIL_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          {tab === "overview" && <OverviewTab dest={dest} />}
          {tab === "images" && (
            <ImageManager
              destinationId={dest.id}
              initialImages={dest.gallery || []}
              onRefresh={onRefresh}
            />
          )}
          {tab === "itinerary" && (
            <ItineraryTab
              destinationId={dest.id}
              initialData={dest.itinerary || []}
              onRefresh={onRefresh}
            />
          )}
          {tab === "faqs" && (
            <FaqTab
              destinationId={dest.id}
              initialData={dest.faqs || []}
              onRefresh={onRefresh}
            />
          )}
          {tab === "reviews" && <ReviewManager destinationId={dest.id} />}
          {tab === "tags" && (
            <TagTab
              destinationId={dest.id}
              initialData={dest.tags || []}
              onRefresh={onRefresh}
            />
          )}
          {tab === "practical" && (
            <PracticalTab
              destinationId={dest.id}
              initialData={dest.practicalInfo}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────── */
function OverviewTab({ dest }) {
  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            show: dest.isFeatured,
            label: "⭐ Featured",
            cls: "bg-yellow-100 text-yellow-800",
          },
          {
            show: dest.isPopular,
            label: "🔥 Popular",
            cls: "bg-orange-100 text-orange-800",
          },
          {
            show: dest.isNew,
            label: "🆕 New",
            cls: "bg-green-100 text-green-800",
          },
          {
            show: dest.isEcoFriendly,
            label: "🌿 Eco-Friendly",
            cls: "bg-green-100 text-green-700",
          },
          {
            show: dest.isFamilyFriendly,
            label: "👨‍👩‍👧 Family Friendly",
            cls: "bg-blue-100 text-blue-800",
          },
          {
            show: dest.isSoldOut,
            label: "❌ Sold Out",
            cls: "bg-red-100 text-red-800",
          },
        ]
          .filter((b) => b.show)
          .map((b) => (
            <span
              key={b.label}
              className={`text-xs px-3 py-1 rounded-full font-medium ${b.cls}`}
            >
              {b.label}
            </span>
          ))}
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
          {dest.status?.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      {dest.description && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {dest.description}
          </p>
        </div>
      )}

      {/* Highlights + Activities + Wildlife */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Highlights", data: dest.highlights, icon: "⭐" },
          { label: "Activities", data: dest.activities, icon: "🏃" },
          { label: "Wildlife", data: dest.wildlife, icon: "🦁" },
        ].map(
          ({ label, data, icon }) =>
            data?.length > 0 && (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {icon} {label}
                </h4>
                <ul className="space-y-1">
                  {data.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 flex items-start gap-1.5"
                    >
                      <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {dest.entranceFee && (
          <InfoCard label="Entrance Fee" value={dest.entranceFee} />
        )}
        {dest.operatingHours && (
          <InfoCard label="Operating Hours" value={dest.operatingHours} />
        )}
        {dest.bestTimeToVisit && (
          <InfoCard label="Best Time to Visit" value={dest.bestTimeToVisit} />
        )}
        {dest.gettingThere && (
          <InfoCard label="Getting There" value={dest.gettingThere} />
        )}
        {dest.whatToExpect && (
          <InfoCard label="What to Expect" value={dest.whatToExpect} />
        )}
        {dest.safetyInfo && (
          <InfoCard label="Safety Info" value={dest.safetyInfo} icon="⚠️" />
        )}
      </div>

      {/* Map */}
      {dest.latitude && dest.longitude && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" /> Location
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {dest.latitude}, {dest.longitude}
            {dest.altitudeMeters ? ` · ${dest.altitudeMeters}m altitude` : ""}
          </p>
          <a
            href={`https://www.google.com/maps?q=${dest.latitude},${dest.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {icon} {label}
      </p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}

/* ── Itinerary Tab ──────────────────────────────────────────── */
function ItineraryTab({ destinationId, initialData, onRefresh }) {
  const { toast } = useToast();
  const [days, setDays] = useState(initialData || []);
  const [editingDay, setEditingDay] = useState(null);
  const [newDay, setNewDay] = useState({
    title: "",
    description: "",
    day_number: "",
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const r = await api.getItinerary(destinationId);
    setDays(r.data || []);
    onRefresh?.();
  };

  const addDay = async () => {
    if (!newDay.title.trim()) return toast("Title required", "error");
    setSaving(true);
    try {
      await api.addItineraryDay(destinationId, newDay);
      setNewDay({ title: "", description: "", day_number: "" });
      setAdding(false);
      toast("Day added", "success");
      await refresh();
    } catch {
      toast("Failed to add day", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateDay = async (day) => {
    setSaving(true);
    try {
      await api.updateItineraryDay(destinationId, day.id, {
        title: day.title,
        description: day.description,
        day_number: day.dayNumber,
      });
      setEditingDay(null);
      toast("Day updated", "success");
      await refresh();
    } catch {
      toast("Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeDay = async (dayId) => {
    try {
      await api.removeItineraryDay(destinationId, dayId);
      toast("Day removed", "success");
      await refresh();
    } catch {
      toast("Failed to remove", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Itinerary ({days.length} days)
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4" /> Add Day
        </button>
      </div>

      {adding && (
        <div className="border rounded-xl p-4 bg-blue-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Day #"
              value={newDay.day_number}
              onChange={(e) =>
                setNewDay((d) => ({ ...d, day_number: e.target.value }))
              }
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Title *"
              value={newDay.title}
              onChange={(e) =>
                setNewDay((d) => ({ ...d, title: e.target.value }))
              }
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Description..."
            value={newDay.description}
            onChange={(e) =>
              setNewDay((d) => ({ ...d, description: e.target.value }))
            }
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addDay}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {saving ? "Saving..." : "Add"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          No itinerary days yet
        </p>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day.id} className="border rounded-xl p-4">
              {editingDay?.id === day.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={editingDay.dayNumber}
                      onChange={(e) =>
                        setEditingDay((d) => ({
                          ...d,
                          dayNumber: e.target.value,
                        }))
                      }
                      className="border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={editingDay.title}
                      onChange={(e) =>
                        setEditingDay((d) => ({ ...d, title: e.target.value }))
                      }
                      className="border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    value={editingDay.description || ""}
                    onChange={(e) =>
                      setEditingDay((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateDay(editingDay)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDay(null)}
                      className="px-3 py-1.5 border rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                    D{day.dayNumber}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{day.title}</p>
                    {day.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {day.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingDay(day)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeDay(day.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── FAQ Tab ────────────────────────────────────────────────── */
function FaqTab({ destinationId, initialData, onRefresh }) {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState(initialData || []);
  const [editingFaq, setEditingFaq] = useState(null);
  const [newFaq, setNewFaq] = useState({
    question: "",
    answer: "",
    category: "",
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const r = await api.getFaqs(destinationId);
    setFaqs(r.data || []);
    onRefresh?.();
  };

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      return toast("Question and answer are required", "error");
    }
    setSaving(true);
    try {
      await api.addFaq(destinationId, newFaq);
      setNewFaq({ question: "", answer: "", category: "" });
      setAdding(false);
      toast("FAQ added", "success");
      await refresh();
    } catch {
      toast("Failed to add FAQ", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateFaq = async (faq) => {
    setSaving(true);
    try {
      await api.updateFaq(destinationId, faq.id, {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      });
      setEditingFaq(null);
      toast("FAQ updated", "success");
      await refresh();
    } catch {
      toast("Failed to update FAQ", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeFaq = async (faqId) => {
    try {
      await api.removeFaq(destinationId, faqId);
      toast("FAQ removed", "success");
      await refresh();
    } catch {
      toast("Failed to remove FAQ", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">FAQs ({faqs.length})</h3>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      {adding && (
        <div className="border rounded-xl p-4 bg-blue-50 space-y-3">
          <input
            type="text"
            placeholder="Category (optional)"
            value={newFaq.category}
            onChange={(e) =>
              setNewFaq((f) => ({ ...f, category: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Question *"
            value={newFaq.question}
            onChange={(e) =>
              setNewFaq((f) => ({ ...f, question: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Answer *"
            value={newFaq.answer}
            onChange={(e) =>
              setNewFaq((f) => ({ ...f, answer: e.target.value }))
            }
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addFaq}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {saving ? "Saving..." : "Add FAQ"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {faqs.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No FAQs yet</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id} className="border rounded-xl p-4">
              {editingFaq?.id === faq.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingFaq.category || ""}
                    onChange={(e) =>
                      setEditingFaq((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="Category"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editingFaq.question}
                    onChange={(e) =>
                      setEditingFaq((f) => ({ ...f, question: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm font-medium"
                  />
                  <textarea
                    value={editingFaq.answer}
                    onChange={(e) =>
                      setEditingFaq((f) => ({ ...f, answer: e.target.value }))
                    }
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFaq(editingFaq)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingFaq(null)}
                      className="px-3 py-1.5 border rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {faq.category && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1 inline-block">
                        {faq.category}
                      </span>
                    )}
                    <p className="font-medium text-gray-900 text-sm">
                      {faq.question}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{faq.answer}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingFaq(faq)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFaq(faq.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tag Tab ────────────────────────────────────────────────── */
function TagTab({ destinationId, initialData, onRefresh }) {
  const { toast } = useToast();
  const [tags, setTags] = useState(initialData || []);
  const [newTag, setNewTag] = useState({ tag_name: "", tag_category: "" });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const r = await api.getDestinationTags(destinationId);
    setTags(r.data || []);
    onRefresh?.();
  };

  const addTag = async () => {
    if (!newTag.tag_name.trim()) return toast("Tag name required", "error");
    setSaving(true);
    try {
      await api.addDestinationTag(destinationId, newTag);
      setNewTag({ tag_name: "", tag_category: "" });
      toast("Tag added", "success");
      await refresh();
    } catch (err) {
      toast(err?.response?.data?.error || "Failed to add tag", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async (tagId) => {
    try {
      await api.removeDestinationTag(destinationId, tagId);
      toast("Tag removed", "success");
      await refresh();
    } catch {
      toast("Failed to remove tag", "error");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Tags ({tags.length})</h3>
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Tag name..."
          value={newTag.tag_name}
          onChange={(e) => setNewTag((t) => ({ ...t, tag_name: e.target.value }))}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), addTag())
          }
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={newTag.tag_category}
          onChange={(e) =>
            setNewTag((t) => ({ ...t, tag_category: e.target.value }))
          }
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTag}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Add Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">No tags yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full"
            >
              {tag.category && (
                <span className="text-gray-400 text-xs">[{tag.category}]</span>
              )}
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Practical Info Tab ─────────────────────────────────────── */

// ✅ Field component moved OUTSIDE PracticalTab to prevent recreation on every render
function Field({ label, path, type = "text", placeholder, form, onChange }) {
  const value = path.split(".").reduce((o, k) => o?.[k], form);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(path, e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) =>
            onChange(path, type === "checkbox" ? e.target.checked : e.target.value)
          }
          placeholder={placeholder}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

function PracticalTab({ destinationId, initialData, onRefresh }) {
  const { toast } = useToast();
  const [form, setForm] = useState(initialData || {});
  const [saving, setSaving] = useState(false);

  const set = (path, val) => {
    const keys = path.split(".");
    setForm((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = val;
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        nearest_airport: form.gettingThere?.nearestAirport || "",
        distance_from_airport: form.gettingThere?.distanceFromAirport || "",
        drive_time_from_capital: form.gettingThere?.driveTimeFromCapital || "",
        road_conditions: form.gettingThere?.roadConditions || "",
        malaria_risk: form.healthAndSafety?.malariaRisk || "",
        water_safety: form.healthAndSafety?.waterSafety || "",
        medical_facilities: form.healthAndSafety?.medicalFacilities || "",
        safety_rating: form.healthAndSafety?.safetyRating || "",
        safety_notes: form.healthAndSafety?.safetyNotes || "",
        permit_cost: form.permitsAndRegulations?.permitCost || "",
        booking_lead_time: form.permitsAndRegulations?.bookingLeadTime || "",
        visitor_limits: form.permitsAndRegulations?.visitorLimits || "",
        regulations: form.permitsAndRegulations?.regulations || "",
        avg_temp_low_c: form.climate?.avgTempLowC || "",
        avg_temp_high_c: form.climate?.avgTempHighC || "",
        climate_notes: form.climate?.climateNotes || "",
        clothing_tips: form.packing?.clothingTips || "",
        budget_range_usd: form.budget?.rangeUsd || "",
        entrance_fee_usd: form.budget?.entranceFeeUsd || "",
        guide_cost_usd: form.budget?.guideCostUsd || "",
        meal_cost_range: form.budget?.mealCostRange || "",
        cell_coverage: form.connectivity?.cellCoverage || "",
        wifi_available: form.connectivity?.wifiAvailable || false,
        electricity_voltage: form.connectivity?.electricityVoltage || "",
        currency_tips: form.culture?.currencyTips || "",
        tipping_culture: form.culture?.tippingCulture || "",
        photography_rules: form.culture?.photographyRules || "",
      };
      await api.upsertPracticalInfo(destinationId, payload);
      toast("Practical info saved", "success");
      onRefresh?.();
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          🚗 Getting There
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nearest Airport" path="gettingThere.nearestAirport" form={form} onChange={set} />
          <Field label="Distance from Airport" path="gettingThere.distanceFromAirport" form={form} onChange={set} />
          <Field label="Drive Time from Capital" path="gettingThere.driveTimeFromCapital" form={form} onChange={set} />
          <Field label="Road Conditions" path="gettingThere.roadConditions" form={form} onChange={set} />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-3">⚕️ Health & Safety</h4>
        {/* ✅ Removed invalid className prop from Field - use wrapper div instead */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Malaria Risk" path="healthAndSafety.malariaRisk" form={form} onChange={set} />
          <Field label="Water Safety" path="healthAndSafety.waterSafety" form={form} onChange={set} />
          <Field label="Medical Facilities" path="healthAndSafety.medicalFacilities" form={form} onChange={set} />
          <Field label="Safety Rating" path="healthAndSafety.safetyRating" form={form} onChange={set} />
          <div className="col-span-2">
            <Field label="Safety Notes" path="healthAndSafety.safetyNotes" type="textarea" form={form} onChange={set} />
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-3">🌤️ Climate</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Avg Low Temp (°C)" path="climate.avgTempLowC" type="number" form={form} onChange={set} />
          <Field label="Avg High Temp (°C)" path="climate.avgTempHighC" type="number" form={form} onChange={set} />
          <Field label="Climate Notes" path="climate.climateNotes" form={form} onChange={set} />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-3">💰 Budget</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget Range (USD)" path="budget.rangeUsd" placeholder="$100–$300/day" form={form} onChange={set} />
          <Field label="Entrance Fee (USD)" path="budget.entranceFeeUsd" placeholder="$400" form={form} onChange={set} />
          <Field label="Guide Cost (USD)" path="budget.guideCostUsd" form={form} onChange={set} />
          <Field label="Meal Cost Range" path="budget.mealCostRange" form={form} onChange={set} />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-3">📡 Connectivity</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cell Coverage" path="connectivity.cellCoverage" form={form} onChange={set} />
          <Field label="Electricity Voltage" path="connectivity.electricityVoltage" form={form} onChange={set} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.connectivity?.wifiAvailable}
              onChange={(e) => set("connectivity.wifiAvailable", e.target.checked)}
              className="accent-blue-600"
            />
            <label className="text-sm text-gray-600">WiFi Available</label>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-3">🎭 Culture</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency Tips" path="culture.currencyTips" form={form} onChange={set} />
          <Field label="Tipping Culture" path="culture.tippingCulture" form={form} onChange={set} />
          <div className="col-span-2">
            <Field label="Photography Rules" path="culture.photographyRules" type="textarea" form={form} onChange={set} />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save Practical Info"
          )}
        </button>
      </div>
    </div>
  );
}