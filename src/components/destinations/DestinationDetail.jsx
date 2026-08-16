import { useState } from "react";
import { 
  MapPinIcon, 
  StarIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FireIcon,
  LeafIcon,
} from "@heroicons/react/24/solid";
import { HeartIcon, ShareIcon } from "@heroicons/react/24/outline";

// ── Badge config ────────────────────────────────────────────────
const FLAG_BADGES = [
  { key: "is_featured",      label: "Featured",    color: "bg-amber-500",   icon: StarIcon },
  { key: "is_popular",       label: "Popular",     color: "bg-rose-500",    icon: FireIcon },
  { key: "is_new",           label: "New",         color: "bg-violet-500",  icon: SparklesIcon },
  { key: "is_eco_friendly",  label: "Eco",         color: "bg-emerald-500", icon: LeafIcon },
];

const DIFFICULTY_STYLES = {
  easy:        { dot: "bg-emerald-400", text: "text-emerald-300" },
  moderate:    { dot: "bg-amber-400",   text: "text-amber-300"   },
  challenging: { dot: "bg-orange-400",  text: "text-orange-300"  },
  strenuous:   { dot: "bg-red-400",     text: "text-red-300"     },
  expert:      { dot: "bg-red-600",     text: "text-red-400"     },
};

// ── Skeleton loader ─────────────────────────────────────────────
export function DestinationCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-gray-200 animate-pulse h-[420px]">
      <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300" />
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

  const {
    name,
    tagline,
    category,
    difficulty      = "moderate",
    duration_days,
    duration_nights,
    min_group_size,
    max_group_size,
    image_url,
    hero_image,
    thumbnail_url,
    entrance_fee,
    best_time_to_visit,
    nearest_city,
    country,
    highlights      = [],
    activities      = [],
    is_featured,
    is_popular,
    is_new,
    is_eco_friendly,
    is_sold_out,
    is_family_friendly,
    rating,
    review_count,
  } = destination;

  // ── Derived values ─────────────────────────────────────────
  const imageSrc   = !imgError && (hero_image || image_url || thumbnail_url);
  const diff       = DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES.moderate;
  const activeBadges = FLAG_BADGES.filter(({ key }) => destination[key]);
  const location   = [nearest_city, country?.name].filter(Boolean).join(", ");
  const groupRange = max_group_size
    ? `${min_group_size ?? 1}–${max_group_size}`
    : `${min_group_size ?? 1}+`;

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
      navigator.share({ title: name, text: tagline, url: window.location.href });
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
      <div className="absolute inset-0">
        {imageSrc ? (
          <>
            {/* blur-up placeholder */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse" />
            )}
            <img
              src={imageSrc}
              alt={name}
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
          <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
            <MapPinIcon className="w-16 h-16 text-slate-600" />
          </div>
        )}

        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t
          from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br
          from-black/20 via-transparent to-transparent" />
      </div>

      {/* ── Sold-out ribbon ──────────────────────────────────── */}
      {is_sold_out && (
        <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20
            rounded-2xl px-8 py-4 rotate-[-8deg]">
            <span className="text-white font-black text-2xl tracking-widest uppercase">
              Sold Out
            </span>
          </div>
        </div>
      )}

      {/* ── TOP ROW — badges + action buttons ────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10
        flex items-start justify-between p-4">
        {/* Left: flag badges */}
        <div className="flex flex-col gap-1.5">
          {activeBadges.slice(0, 2).map(({ key, label, color, icon: Icon }) => (
            <span
              key={key}
              className={`
                inline-flex items-center gap-1 ${color}
                text-white text-[10px] font-bold tracking-wide uppercase
                px-2.5 py-1 rounded-full shadow-lg
                backdrop-blur-sm
              `}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
          {is_family_friendly && (
            <span className="inline-flex items-center gap-1 bg-sky-500/90
              text-white text-[10px] font-bold tracking-wide uppercase
              px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
              👨‍👩‍👧 Family
            </span>
          )}
        </div>

        {/* Right: wishlist + share */}
        <div className="flex flex-col gap-2">
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
              hover:bg-white/20 transition-all duration-300"
          >
            <ShareIcon className="w-4 h-4 text-white" />
          </button>

          {shareHover && (
            <span className="absolute top-20 right-14 bg-black/80 text-white
              text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-30">
              Copy link
            </span>
          )}
        </div>
      </div>

      {/* ── CATEGORY pill — center top ────────────────────────── */}
      {category && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/10 backdrop-blur-md border border-white/20
            text-white text-[10px] font-semibold tracking-widest uppercase
            px-3 py-1 rounded-full shadow">
            {category}
          </span>
        </div>
      )}

      {/* ── MIDDLE — rating (if available) ───────────────────── */}
      {rating && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 z-10
          flex flex-col items-center
          bg-white/10 backdrop-blur-md border border-white/20
          rounded-2xl px-3 py-2 shadow-lg">
          <StarIcon className="w-4 h-4 text-amber-400" />
          <span className="text-white font-bold text-sm leading-tight">
            {Number(rating).toFixed(1)}
          </span>
          {review_count && (
            <span className="text-white/60 text-[9px]">
              {review_count > 999
                ? `${(review_count / 1000).toFixed(1)}k`
                : review_count}
            </span>
          )}
        </div>
      )}

      {/* ── BOTTOM — main content ─────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 space-y-3">

        {/* Location + difficulty */}
        <div className="flex items-center justify-between">
          {location && (
            <div className="flex items-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
              <span className="text-white/70 text-[11px] font-medium truncate max-w-[140px]">
                {location}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${diff.dot} flex-shrink-0`} />
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${diff.text}`}>
              {difficulty}
            </span>
          </div>
        </div>

        {/* Name + tagline */}
        <div>
          <h3 className="text-white font-black text-xl leading-tight line-clamp-2
            drop-shadow-lg tracking-tight">
            {name}
          </h3>
          {tagline && (
            <p className="text-white/60 text-[11px] mt-0.5 line-clamp-1 font-medium">
              {tagline}
            </p>
          )}
        </div>

        {/* Icon chips row */}
        <div className="flex items-center gap-2 flex-wrap">
          {duration_days && (
            <Chip icon={ClockIcon}>
              {duration_days}d{duration_nights ? ` / ${duration_nights}n` : ""}
            </Chip>
          )}
          {(min_group_size || max_group_size) && (
            <Chip icon={UsersIcon}>{groupRange} pax</Chip>
          )}
          {best_time_to_visit && (
            <Chip icon={CalendarDaysIcon}>
              {best_time_to_visit.length > 12
                ? best_time_to_visit.slice(0, 12) + "…"
                : best_time_to_visit}
            </Chip>
          )}
          {entrance_fee && (
            <Chip>
              {String(entrance_fee).length > 10
                ? String(entrance_fee).slice(0, 10) + "…"
                : entrance_fee}
            </Chip>
          )}
        </div>

        {/* Highlights pills */}
        {highlights.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {highlights.slice(0, 3).map((h, i) => (
              <span
                key={i}
                className="text-white/80 text-[9px] font-semibold uppercase
                  tracking-wide bg-white/10 backdrop-blur-sm
                  border border-white/10 rounded-full px-2 py-0.5"
              >
                {h.length > 18 ? h.slice(0, 18) + "…" : h}
              </span>
            ))}
            {highlights.length > 3 && (
              <span className="text-white/50 text-[9px] font-semibold
                uppercase tracking-wide px-1 py-0.5">
                +{highlights.length - 3}
              </span>
            )}
          </div>
        )}

        {/* ── CTA BUTTONS ─────────────────────────────────────── */}
        <div className="flex gap-2 pt-1">
          {/* Learn More */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLearnMore?.(destination);
            }}
            disabled={is_sold_out}
            className="
              flex-1 flex items-center justify-center gap-1.5
              bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/25
              text-white font-semibold text-xs
              rounded-xl px-3 py-2.5
              transition-all duration-300
              disabled:opacity-40 disabled:cursor-not-allowed
              group/btn
            "
          >
            View Details
            <ArrowRightIcon className="w-3.5 h-3.5
              transition-transform duration-300
              group-hover/btn:translate-x-0.5" />
          </button>

          {/* Book Now */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookNow?.(destination);
            }}
            disabled={is_sold_out}
            className="
              flex-[1.4] flex items-center justify-center gap-1.5
              bg-white hover:bg-white/90
              text-gray-900 font-bold text-xs
              rounded-xl px-4 py-2.5
              shadow-lg shadow-black/20
              transition-all duration-300
              hover:shadow-xl hover:shadow-black/30
              active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {is_sold_out ? "Sold Out" : "Book Now"}
            {!is_sold_out && (
              <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Tiny reusable icon chip ─────────────────────────────────────
function Chip({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1
      bg-white/10 backdrop-blur-sm border border-white/15
      rounded-full px-2 py-0.5">
      {Icon && <Icon className="w-3 h-3 text-white/60 flex-shrink-0" />}
      <span className="text-white/80 text-[10px] font-medium whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}