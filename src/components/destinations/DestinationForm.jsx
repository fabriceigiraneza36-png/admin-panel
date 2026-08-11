import { useState, useEffect, useRef } from "react";
import * as api from "../../api/destinations";
import { useToast } from "../../hooks/useToast";
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  LinkIcon,
  CheckIcon, // ✅ Fixed: was HiCheckIcon which doesn't exist in heroicons
} from "@heroicons/react/24/outline";

const CATEGORIES = [
  "Safari", "Mountain Climbing", "Beach", "Cultural", "Wildlife",
  "Adventure", "Historical", "Eco-Tourism", "Water Sports", "Hiking",
  "City Tour", "Desert", "Rainforest", "National Park", "Island",
];

const DIFFICULTIES = ["easy", "moderate", "challenging", "strenuous", "expert"];

const TABS = [
  { id: "basic", label: "Basic Info" },
  { id: "media", label: "Images & Media" },
  { id: "details", label: "Details" },
  { id: "location", label: "Location" },
  { id: "highlights", label: "Highlights" },
  { id: "seo", label: "SEO & Flags" },
];

const emptyForm = {
   // Basic
   name: "",
   tagline: "",
   short_description: "",
   description: "",
   overview: "",
   country_id: "",
   category: "Safari",
   difficulty: "moderate",
   destination_type: "",
   status: "draft",

  // Media
  image_url: "",
  image_urls: [],
  hero_image: "",
  thumbnail_url: "",
  cover_image_url: "",
  video_url: "",
  virtual_tour_url: "",

   // Details
   duration_days: "",
   duration_nights: "",
   min_group_size: 1,
   max_group_size: "",
   min_age: "",
   fitness_level: "",
   entrance_fee: "",
   operating_hours: "",
   best_time_to_visit: "",
   getting_there: "",
   what_to_expect: "",

  // Location
  latitude: "",
  longitude: "",
  altitude_meters: "",
  nearest_city: "",
  nearest_airport: "",
  distance_from_airport_km: "",
  address: "",

  // Highlights / Arrays
  highlights: [],
  activities: [],
  wildlife: [],

  // Flags
  is_featured: false,
  is_popular: false,
  is_new: false,
  is_eco_friendly: false,
  is_family_friendly: false,
  is_sold_out: false,

  // SEO
  meta_title: "",
  meta_description: "",
};

// ✅ Fixed: Moved ArrayField OUTSIDE the main component to prevent
// state loss on every parent re-render
function ArrayField({ label, fieldKey, placeholder, values, onAdd, onRemove }) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v) return;
    onAdd(fieldKey, v);
    setInput("");
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), add())
          }
          placeholder={placeholder}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(values || []).map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(fieldKey, i)}
              className="ml-1 text-blue-400 hover:text-blue-700"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ✅ Fixed: Moved Input outside to prevent recreation on each render
function Input({ label, field, type = "text", placeholder, className = "", help, form, onChange }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

// ✅ Fixed: Moved Textarea outside
function Textarea({ label, field, rows = 3, placeholder, className = "", form, onChange }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={form[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}

// ✅ Fixed: Moved Toggle outside
function Toggle({ label, field, form, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={!!form[field]}
          onChange={(e) => onChange(field, e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${
            form[field] ? "bg-blue-600" : "bg-gray-300"
          }`}
        />
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            form[field] ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function DestinationForm({
  mode,
  destination,
  countries = [],
  onSuccess,
  onClose,
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef();

  // Populate form in edit mode
  useEffect(() => {
    if (mode === "edit" && destination) {
      setForm({
        name: destination.name || "",
         tagline: destination.tagline || "",
         short_description: destination.shortDescription || "",
         description: destination.description || "",
         overview: destination.overview || "",
         country_id: destination.countryId || destination.country?.id || "",
         category: destination.category || "Safari",
         difficulty: destination.difficulty || "moderate",
         destination_type: destination.destinationType || "",
         status: destination.status || "draft",

        image_url: destination.imageUrl || "",
        image_urls: destination.images || [],
        hero_image: destination.heroImage || "",
        thumbnail_url: destination.thumbnailUrl || "",
        cover_image_url: destination.coverImageUrl || "",
        video_url: destination.videoUrl || "",
        virtual_tour_url: destination.virtualTourUrl || "",

         duration_days: destination.durationDays ?? "",
         duration_nights: destination.durationNights ?? "",
         min_group_size: destination.minGroupSize || 1,
         max_group_size: destination.maxGroupSize ?? "",
         min_age: destination.minAge ?? "",
         fitness_level: destination.fitnessLevel || "",
         entrance_fee: destination.entranceFee || "",
         operating_hours: destination.operatingHours || "",
         best_time_to_visit: destination.bestTimeToVisit || "",
         getting_there: destination.gettingThere || "",
         what_to_expect: destination.whatToExpect || "",

        latitude: destination.latitude ?? "",
        longitude: destination.longitude ?? "",
        altitude_meters: destination.altitudeMeters ?? "",
        nearest_city: destination.nearestCity || "",
        nearest_airport: destination.nearestAirport || "",
        distance_from_airport_km: destination.distanceFromAirportKm ?? "",
        address: destination.address || "",

        highlights: destination.highlights || [],
        activities: destination.activities || [],
        wildlife: destination.wildlife || [],

        is_featured: destination.isFeatured || false,
        is_popular: destination.isPopular || false,
        is_new: destination.isNew || false,
        is_eco_friendly: destination.isEcoFriendly || false,
        is_family_friendly: destination.isFamilyFriendly || false,
        is_sold_out: destination.isSoldOut || false,

        meta_title: destination.metaTitle || "",
        meta_description: destination.metaDescription || "",
      });
      setImagePreview(destination.imageUrl || null);
    }
  }, [mode, destination]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ── File pick ─────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    set("image_url", "");
  };

  // ── Add URL to image_urls list ────────────────────────────────
  const addImageUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    set("image_urls", [...(form.image_urls || []), url]);
    setUrlInput("");
    if (!form.image_url) set("image_url", url);
  };

  const removeImageUrl = (idx) => {
    const updated = form.image_urls.filter((_, i) => i !== idx);
    set("image_urls", updated);
    if (form.image_url === form.image_urls[idx]) {
      set("image_url", updated[0] || "");
    }
  };

  const setPrimaryImage = (url) => {
    set("image_url", url);
    set("hero_image", url);
    set("thumbnail_url", url);
  };

  // ✅ Fixed: Array helpers for the external ArrayField component
  const handleArrayAdd = (fieldKey, value) => {
    set(fieldKey, [...(form[fieldKey] || []), value]);
  };

  const handleArrayRemove = (fieldKey, index) => {
    set(
      fieldKey,
      form[fieldKey].filter((_, j) => j !== index)
    );
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required", "error");
    if (!form.country_id) return toast("Country is required", "error");

    setSaving(true);
    try {
      const fd = new FormData();

      const scalarFields = [
         "name", "tagline", "short_description", "description", "overview",
         "country_id", "category", "difficulty", "destination_type",
         "status", "image_url", "hero_image", "thumbnail_url", "cover_image_url",
         "video_url", "virtual_tour_url", "duration_days", "duration_nights",
         "min_group_size", "max_group_size", "min_age", "fitness_level",
         "entrance_fee", "operating_hours", "best_time_to_visit", "getting_there",
         "what_to_expect", "latitude", "longitude",
         "altitude_meters", "nearest_city", "nearest_airport",
         "distance_from_airport_km", "address", "is_featured", "is_popular",
         "is_new", "is_eco_friendly", "is_family_friendly", "is_sold_out",
         "meta_title", "meta_description",
       ];

      scalarFields.forEach((key) => {
        if (form[key] !== "" && form[key] !== null && form[key] !== undefined) {
          fd.append(key, form[key]);
        }
      });

      ["highlights", "activities", "wildlife", "image_urls"].forEach((key) => {
        if (Array.isArray(form[key])) {
          form[key].forEach((v) => fd.append(`${key}[]`, v));
          fd.append(key, JSON.stringify(form[key]));
        }
      });

      if (imageFile) fd.append("image", imageFile);

      let saved;
      if (mode === "create") {
        const res = await api.create(fd);
        saved = res.data;
      } else {
        const res = await api.update(destination.id, fd);
        saved = res.data;
      }
      onSuccess(saved);
    } catch (err) {
      toast(err?.response?.data?.error || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === "create"
              ? "Add New Destination"
              : `Edit: ${destination?.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">

            {/* ── BASIC INFO ── */}
            {tab === "basic" && (
              <div className="space-y-4">
                <Input label="Name *" field="name" placeholder="e.g. Mount Karisimbi" form={form} onChange={set} />
                <Input label="Tagline" field="tagline" placeholder="e.g. The Roof of the Virungas" form={form} onChange={set} />
                <Textarea label="Short Description" field="short_description" rows={2} form={form} onChange={set} />
                <Textarea label="Full Description" field="description" rows={5} form={form} onChange={set} />
                <Textarea label="Overview (truncated version)" field="overview" rows={3} form={form} onChange={set} />

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Country *
                     </label>
                     <select
                       value={form.country_id}
                       onChange={(e) => set("country_id", e.target.value)}
                       className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                       <option value="">Select country...</option>
                       {countries.map((c) => (
                         <option key={c.id} value={c.id}>
                           {c.flag} {c.name}
                         </option>
                       ))}
                     </select>
                   </div>
                 </div>

                {/* ✅ Fixed: label closed with </label> not </div> */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="space-y-2">
                    {/* Predefined options */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => set("category", category)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 ${
                            form.category === category
                              ? "border-emerald-400 bg-emerald-50/80 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <span className="text-sm font-semibold text-gray-800">
                            {category}
                          </span>
                          {/* ✅ Fixed: CheckIcon instead of HiCheckIcon */}
                          {form.category === category && (
                            <CheckIcon className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* ✅ Fixed: Removed invalid id/value/onChange props,
                        Input uses field + form + onChange pattern */}
                    <Input
                      label="Or enter custom category"
                      field="category"
                      type="text"
                      placeholder="e.g., Safari, Cultural, Adventure, Custom Category..."
                      form={form}
                      onChange={set}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => set("difficulty", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => set("status", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[
                        { value: "draft", label: "Draft" },
                        { value: "published", label: "Published" },
                        { value: "archived", label: "Archived" },
                      ].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ Fixed: Removed duplicate, kept only one */}
                <Input
                  label="Destination Type"
                  field="destination_type"
                  placeholder="e.g. volcano, beach..."
                  form={form}
                  onChange={set}
                />
              </div>
            )}

            {/* ── IMAGES & MEDIA ── */}
            {tab === "media" && (
              <div className="space-y-6">
                {/* Primary image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Image
                  </label>
                  <div className="flex gap-4 items-start flex-wrap">
                    {/* Preview */}
                    <div className="w-40 h-32 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                      {imagePreview || form.image_url ? (
                        <img
                          src={imagePreview || form.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <PhotoIcon className="w-10 h-10 text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* File upload */}
                      <div>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <PhotoIcon className="w-4 h-4" />
                          Upload File
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {imageFile && (
                          <p className="text-xs text-gray-500 mt-1">
                            {imageFile.name}
                          </p>
                        )}
                      </div>

                      {/* URL input */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Or enter image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={form.image_url}
                            onChange={(e) => {
                              set("image_url", e.target.value);
                              setImagePreview(e.target.value);
                              setImageFile(null);
                            }}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional image URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Images (Gallery)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Add multiple image URLs. Click a thumbnail to set as
                    primary.
                  </p>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addImageUrl())
                      }
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" /> Add
                    </button>
                  </div>

                  {/* Gallery grid */}
                  {(form.image_urls || []).length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {form.image_urls.map((url, i) => (
                        <div
                          key={i}
                          className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer ${
                            form.image_url === url
                              ? "border-blue-500"
                              : "border-transparent"
                          }`}
                          onClick={() => setPrimaryImage(url)}
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-20 object-cover"
                            onError={(e) => {
                              e.target.src = "";
                              e.target.parentElement.classList.add("bg-gray-100");
                            }}
                          />
                          {form.image_url === url && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700 bg-white px-1 rounded">
                                Primary
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImageUrl(i);
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Special image URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" /> Hero Image URL
                    </label>
                    <input
                      type="url"
                      value={form.hero_image}
                      onChange={(e) => set("hero_image", e.target.value)}
                      placeholder="https://..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {form.hero_image && (
                      <img
                        src={form.hero_image}
                        alt=""
                        className="mt-1 h-12 w-full object-cover rounded"
                        onError={() => {}}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" /> Thumbnail URL
                    </label>
                    <input
                      type="url"
                      value={form.thumbnail_url}
                      onChange={(e) => set("thumbnail_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {form.thumbnail_url && (
                      <img
                        src={form.thumbnail_url}
                        alt=""
                        className="mt-1 h-12 w-full object-cover rounded"
                        onError={() => {}}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" /> Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={form.cover_image_url}
                      onChange={(e) => set("cover_image_url", e.target.value)}
                      placeholder="https://... (1200×600)"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" /> Video URL
                    </label>
                    <input
                      type="url"
                      value={form.video_url}
                      onChange={(e) => set("video_url", e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" /> Virtual Tour URL
                    </label>
                    <input
                      type="url"
                      value={form.virtual_tour_url}
                      onChange={(e) => set("virtual_tour_url", e.target.value)}
                      placeholder="https://matterport.com/..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── DETAILS ── */}
            {tab === "details" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Input label="Duration (Days)" field="duration_days" type="number" placeholder="2" form={form} onChange={set} />
                  <Input label="Duration (Nights)" field="duration_nights" type="number" placeholder="1" form={form} onChange={set} />
                  <Input label="Min Group Size" field="min_group_size" type="number" placeholder="1" form={form} onChange={set} />
                  <Input label="Max Group Size" field="max_group_size" type="number" placeholder="12" form={form} onChange={set} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Minimum Age" field="min_age" type="number" placeholder="12" form={form} onChange={set} />
                  <Input label="Fitness Level" field="fitness_level" placeholder="e.g. High" form={form} onChange={set} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Entrance Fee" field="entrance_fee" placeholder="e.g. $400 climbing permit" form={form} onChange={set} />
                  <Input label="Operating Hours" field="operating_hours" placeholder="e.g. Trek starts 07:00" form={form} onChange={set} />
                </div>
                 <Input label="Best Time to Visit" field="best_time_to_visit" placeholder="e.g. June–September" form={form} onChange={set} />
                 <Textarea label="Getting There" field="getting_there" rows={2} form={form} onChange={set} />
                 <Textarea label="What to Expect" field="what_to_expect" rows={3} form={form} onChange={set} />
              </div>
            )}

            {/* ── LOCATION ── */}
            {tab === "location" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Latitude" field="latitude" type="number" placeholder="-1.5067" form={form} onChange={set} />
                  <Input label="Longitude" field="longitude" type="number" placeholder="29.4431" form={form} onChange={set} />
                </div>
                <Input label="Altitude (meters)" field="altitude_meters" type="number" placeholder="4507" form={form} onChange={set} />
                <Input label="Address" field="address" placeholder="Physical address..." form={form} onChange={set} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nearest City" field="nearest_city" placeholder="e.g. Kigali" form={form} onChange={set} />
                  <Input label="Nearest Airport" field="nearest_airport" placeholder="e.g. KGL" form={form} onChange={set} />
                </div>
                <Input
                  label="Distance from Airport (km)"
                  field="distance_from_airport_km"
                  type="number"
                  placeholder="110"
                  form={form}
                  onChange={set}
                />
                {form.latitude && form.longitude && (
                  <div className="rounded-xl overflow-hidden border h-48 bg-gray-100 flex items-center justify-center">
                    <a
                      href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      📍 View on Google Maps ({form.latitude},{" "}
                      {form.longitude})
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ── HIGHLIGHTS ── */}
            {tab === "highlights" && (
              <div className="space-y-6">
                {/* ✅ Fixed: ArrayField now receives values and callbacks as props */}
                <ArrayField
                  label="Highlights"
                  fieldKey="highlights"
                  placeholder="e.g. Summit at 4,507m"
                  values={form.highlights}
                  onAdd={handleArrayAdd}
                  onRemove={handleArrayRemove}
                />
                <ArrayField
                  label="Activities"
                  fieldKey="activities"
                  placeholder="e.g. Mountain trekking"
                  values={form.activities}
                  onAdd={handleArrayAdd}
                  onRemove={handleArrayRemove}
                />
                <ArrayField
                  label="Wildlife"
                  fieldKey="wildlife"
                  placeholder="e.g. Mountain gorilla"
                  values={form.wildlife}
                  onAdd={handleArrayAdd}
                  onRemove={handleArrayRemove}
                />
              </div>
            )}

            {/* ── SEO & FLAGS ── */}
            {tab === "seo" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="Meta Title"
                    field="meta_title"
                    placeholder="SEO page title..."
                    help="Leave empty to use destination name"
                    form={form}
                    onChange={set}
                  />
                  <Textarea
                    label="Meta Description"
                    field="meta_description"
                    rows={2}
                    placeholder="SEO description (150–160 chars)..."
                    form={form}
                    onChange={set}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                    Feature Flags
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Toggle label="Featured" field="is_featured" form={form} onChange={set} />
                    <Toggle label="Popular" field="is_popular" form={form} onChange={set} />
                    <Toggle label="New" field="is_new" form={form} onChange={set} />
                    <Toggle label="Eco-Friendly" field="is_eco_friendly" form={form} onChange={set} />
                    <Toggle label="Family Friendly" field="is_family_friendly" form={form} onChange={set} />
                    <Toggle label="Sold Out" field="is_sold_out" form={form} onChange={set} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              {mode === "edit" && (
                <button
                  type="submit"
                  onClick={() => set("status", "draft")}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                >
                  Save as Draft
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Create Destination"
                ) : (
                  "Update Destination"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} // ✅ Fixed: was }) instead of }