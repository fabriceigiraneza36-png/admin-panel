import { useState } from "react";
import {
  PhotoIcon,
  GlobeAltIcon,
  TagIcon,
  SparklesIcon,
  PlusIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export default function DestinationForm({ onSubmit, initialData = {} }) {
  // ── Form States ──────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState(initialData.image_url || "");
  const [country, setCountry] = useState(initialData.country || "");
  const [category, setCategory] = useState(initialData.category || "");
  const [activities, setActivities] = useState(initialData.activities || []);
  const [activityInput, setActivityInput] = useState("");
  const [imgError, setImgError] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleAddActivity = (e) => {
    e.preventDefault();
    const cleanInput = activityInput.trim();
    if (cleanInput && !activities.includes(cleanInput)) {
      setActivities([...activities, cleanInput]);
      setActivityInput("");
    }
  };

  const handleRemoveActivity = (removedActivity) => {
    setActivities(activities.filter((act) => act !== removedActivity));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        imageUrl,
        country,
        category,
        activities,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white">
      {/* Form Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          Add Destination Site
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Provide the image, location details, and core activities of this travel spot.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. IMAGE FIELD & VISUAL PREVIEW */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Destination Site Image
          </label>
          
          {/* Dynamic Visual Preview Panel */}
          <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center transition-all">
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt="Destination Preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <PhotoIcon className="w-10 h-10 animate-pulse" />
                <span className="text-xs">Image preview will appear here</span>
              </div>
            )}
            {imageUrl && !imgError && (
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-white font-medium uppercase tracking-wider">Preview Active</span>
              </div>
            )}
          </div>

          {/* URL Input field */}
          <div className="relative">
            <input
              type="url"
              placeholder="Paste destination image link URL here..."
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgError(false);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-10 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              required
            />
          </div>
        </div>

        {/* 2. COUNTRY FIELD */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Country
          </label>
          <div className="relative">
            <GlobeAltIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="e.g., Switzerland, Japan, Kenya"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              required
            />
          </div>
        </div>

        {/* 3. CATEGORIES SELECTION */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Category
          </label>
          <div className="relative">
            <TagIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none cursor-pointer"
              required
            >
              <option value="" disabled>Select a main category...</option>
              <option value="Adventure">Adventure & Mountain</option>
              <option value="Beach">Beach & Coastline</option>
              <option value="Cultural">Historical & Culture</option>
              <option value="Wildlife">Wildlife & Safari</option>
              <option value="Urban">Urban Exploration</option>
            </select>
            {/* Custom select arrow indicator */}
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 4. ACTIVITIES CARRIED THERE */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Activities Carried There
          </label>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SparklesIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Type and add activities (e.g., Hiking, Kayaking...)"
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddActivity(e);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={handleAddActivity}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 flex items-center justify-center transition active:scale-95"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Activities Pill Badge Display Area */}
          <div className="flex flex-wrap gap-2 pt-2">
            {activities.length > 0 ? (
              activities.map((act, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs px-3 py-1.5 rounded-full transition"
                >
                  <span>{act}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveActivity(act)}
                    className="hover:bg-slate-700 rounded-full p-0.5"
                  >
                    <XMarkIcon className="w-3 h-3 text-slate-400 hover:text-rose-400" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No activities added yet. Add some above.</span>
            )}
          </div>
        </div>

        {/* 5. FORM SUBMISSION */}
        <button
          type="submit"
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] duration-150"
        >
          Save Destination Site Details
        </button>
      </form>
    </div>
  );
}