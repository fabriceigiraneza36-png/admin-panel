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