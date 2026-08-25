import { useState } from "react";
import { 
  MapPinIcon, 
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { HeartIcon, ShareIcon } from "@heroicons/react/24/outline";

// ── Skeleton loader ─────────────────────────────────────────────
export function DestinationCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-slate-800 animate-pulse h-[420px]">
      <div className="h-full bg-gradient-to-br from-slate-800 to-slate-900" />
    </div>
  );
}

// ── Main card ───────────────────────────────────────────────────
export default function DestinationCard({
  destination,
  onBookNow,
  onLearnMore,
  onWishlist,
  priority = false,          // true → larger card variant
  compact  = false,          // true → smaller card variant
}) {
  const [imgError,    setImgError]    = useState(false);
  const [wishlisted,  setWishlisted]  = useState(false);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [shareHover,  setShareHover]  = useState(false);

  if (!destination) return <DestinationCardSkeleton />;

  // ── Form Destructuring ─────────────────────────────────────────
  const {
    name,               // Destination Title
    image_url,          // Image URL field
    imageUrl,           // fallback matching form state structure
    country,            // Country field
    category,           // Category field
    activities = [],    // Activities Carried There array
  } = destination;

  // ── Derived values ─────────────────────────────────────────
  const imageSrc = !imgError && (image_url || imageUrl);
  const countryName = typeof country === "object" ? country?.name : country;
  const cardHeight = priority ? "h-[500px]" : compact ? "h-[340px]" : "h-[420px]";

  // ── Handlers ────────────────────────────────────────────────
  const handleWishlist = (e) => {
    e.stopPropagation();
    setWishlisted((w) => !w);
    onWishlist?.(destination);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: name, text: category, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <article
      className={`
        group relative ${cardHeight} rounded-3xl overflow-hidden
        shadow-lg hover:shadow-2xl
        transition-all duration-500 ease-out
        hover:-translate-y-1
        cursor-pointer select-none
      `}
      onClick={() => onLearnMore?.(destination)}
    >
      {/* ── Background image ─────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {imageSrc ? (
          <>
            {/* blur-up placeholder */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse" />
            )}
            <img
              src={imageSrc}
              alt={name || "Destination Spot"}
              loading={priority ? "eager" : "lazy"}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`
                w-full h-full object-cover
                transition-all duration-700
                group-hover:scale-105
                ${imgLoaded ? "opacity-100" : "opacity-0"}
              `}
            />
          </>
        ) : (
          /* Fallback gradient */
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
            <MapPinIcon className="w-16 h-16 text-slate-700" />
          </div>
        )}

        {/* Multi-layer gradient overlays for high-contrast text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-transparent" />
      </div>

      {/* ── TOP ROW — Action Buttons ────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-4">
        {/* Left: Category Tag floating badge */}
        {category && (
          <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            {category}
          </span>
        )}

        {/* Right: Wishlist + Share buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center
              backdrop-blur-md border transition-all duration-300
              ${wishlisted
                ? "bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/40"
                : "bg-white/10 border-white/20 hover:bg-white/20"}
            `}
          >
            <HeartIcon
              className={`w-4 h-4 transition-colors duration-300
                ${wishlisted ? "text-white fill-white" : "text-white"}`}
            />
          </button>

          <button
            onClick={handleShare}
            onMouseEnter={() => setShareHover(true)}
            onMouseLeave={() => setShareHover(false)}
            aria-label="Share destination"
            className="w-9 h-9 rounded-full flex items-center justify-center
              bg-white/10 border border-white/20 backdrop-blur-md
              hover:bg-white/20 transition-all duration-300 relative"
          >
            <ShareIcon className="w-4 h-4 text-white" />
          </button>

          {shareHover && (
            <span className="absolute top-14 right-4 bg-slate-950/95 border border-slate-800 text-white
              text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap z-30">
              Copy Link
            </span>
          )}
        </div>
      </div>

      {/* ── BOTTOM — Content panel ───────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 space-y-3.5">
        
        {/* Country Label with map marker */}
        {countryName && (
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-white/85 text-xs font-semibold uppercase tracking-wider">
              {countryName}
            </span>
          </div>
        )}

        {/* Title Name of Destination */}
        <h3 className="text-white font-extrabold text-2xl leading-tight line-clamp-2 drop-shadow-md">
          {name || "Untitled Destination"}
        </h3>

        {/* Activities Tag List */}
        {activities.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Activities available</span>
            </div>
            
            <div className="flex gap-1.5 flex-wrap">
              {activities.slice(0, 3).map((act, index) => (
                <span
                  key={index}
                  className="text-white/90 text-[10px] font-medium
                    bg-white/10 backdrop-blur-sm
                    border border-white/15 rounded-full px-2.5 py-1"
                >
                  {act}
                </span>
              ))}
              {activities.length > 3 && (
                <span className="text-white/60 text-[10px] font-semibold bg-white/5 border border-white/10 rounded-full px-2 py-1">
                  +{activities.length - 3} more
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-400/60 text-[11px] italic">No activities registered yet</p>
        )}

        {/* Action Button Strip */}
        <div className="flex gap-2.5 pt-2">
          {/* Learn More button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLearnMore?.(destination);
            }}
            className="
              flex-1 flex items-center justify-center gap-1.5
              bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/20
              text-white font-semibold text-xs
              rounded-xl px-3 py-2.5
              transition-all duration-300
              group/btn
            "
          >
            View Details
            <ArrowRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </button>

          {/* Book Now primary CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookNow?.(destination);
            }}
            className="
              flex-[1.2] flex items-center justify-center gap-1.5
              bg-gradient-to-r from-teal-400 to-emerald-400
              hover:from-teal-300 hover:to-emerald-300
              text-slate-950 font-extrabold text-xs
              rounded-xl px-4 py-2.5
              shadow-lg shadow-emerald-500/20
              transition-all duration-300
              hover:shadow-emerald-400/30
              active:scale-[0.98]
            "
          >
            Book Spot
          </button>
        </div>
      </div>
    </article>
  );
}