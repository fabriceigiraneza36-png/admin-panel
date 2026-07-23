// admin/src/pages/Messages.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES v3.0 — Professional Admin Chat Interface
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
//  ✓ Smart auto-hide composer bar (hides on scroll down, shows on scroll up)
//  ✓ Admin-configurable chat background (solid color or linear gradient)
//  ✓ Fully responsive design with mobile-first approach
//  ✓ Redesigned new-chat modal with step-by-step flow
//  ✓ Professional message bubbles with reactions, replies, timestamps
//  ✓ Desktop notifications for new messages
//  ✓ Socket.io real-time + REST fallback
//  ✓ Optimistic message sending with rollback
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useState, useEffect, useRef, useCallback, useMemo, Fragment,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, ChevronDown,
  Settings2, Palette, ChevronRight, ArrowDown,
  Hash, Mail, Phone, Clock, Sparkles, Trash2,
} from 'lucide-react'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'

/* ═══════════════════════════════════════════════════════════════════════════
   TOKEN / FETCH HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const TOKEN_KEYS = ['altuvera_admin_token', 'auth_token', 'token']

const getToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k)
      if (v) return v
    }
  } catch { /* ignore */ }
  return null
}

const authFetch = (url, opts = {}) => {
  const token = getToken()
  return fetch(url, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & PRESETS
═══════════════════════════════════════════════════════════════════════════ */

const CHAT_BG_STORAGE_KEY = 'altuvera_chat_bg'

const BG_PRESETS = [
  { label: 'Default',     value: '#f8fafc',                                     type: 'solid'    },
  { label: 'Warm Sand',   value: '#fef7ee',                                     type: 'solid'    },
  { label: 'Soft Sage',   value: '#f0fdf4',                                     type: 'solid'    },
  { label: 'Mist',        value: '#f0f4f8',                                     type: 'solid'    },
  { label: 'Lavender',    value: '#faf5ff',                                     type: 'solid'    },
  { label: 'Rose Mist',   value: '#fff1f2',                                     type: 'solid'    },
  { label: 'Ocean',       value: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',  type: 'gradient' },
  { label: 'Sunset',      value: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%)',  type: 'gradient' },
  { label: 'Forest',      value: 'linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 100%)',  type: 'gradient' },
  { label: 'Aurora',      value: 'linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #fef3c7 100%)', type: 'gradient' },
  { label: 'Twilight',    value: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)', type: 'gradient' },
  { label: 'Mint Fresh',  value: 'linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%)', type: 'gradient' },
]

const QUICK_EMOJIS = [
'😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️',
'😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑',
'😶','🫥','😶‍🌫️','😏','😒','🙄','😬','😮‍💨','🤥','🫨','🙂‍↔️','🙂‍↕️','😌','😔','😪','🤤','😴','😷','🤒','🤕',
'🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️',
'😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
'🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹',
'😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','💋','💌','💘','💝','💖','💗','💓','💞','💕','💟','❣️',
'❤️','🩷','🧡','💛','💚','🩵','💙','💜','🤎','🖤','🩶','🤍','💯','💢','💥','💫','💦','💨','🕳️','💬',
'👁️‍🗨️','🗨️','🗯️','💭','💤','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫷','🫸','👌','🤌','🤏','✌️',
'🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌',
'🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷',
'🦴','👀','👁️','👅','👄','🫦','👶','🧒','👦','👧','🧑','👱','👨','🧔','🧔‍♂️','🧔‍♀️','👩','🧓','👴','👵',
'🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👳','👲',
'🧕','🤵','👰','🤰','🫃','🫄','🤱','👼','🎅','🤶','🧑‍🎄','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟',
'🧌','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','🕴️','👯','🧖','🧗','🤺','🏇','⛷️','🏂','🏌️','🏄','🚣',
'🏊','⛹️','🏋️','🚴','🚵','🤸','🤼','🤽','🤾','🤹','🧘','🛀','🛌','👭','👫','👬','💏','💑','👪','🗣️',
'👤','👥','🫂','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵',
'🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪲','🦋',
'🐌','🐞','🐜','🪰','🪱','🦟','🪳','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀',
'🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🫏','🦍','🦧','🐘','🦛','🦏','🐪','🐫',
'🦒','🦘','🦬','🐃','🐂','🐄','🫎','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛',
'🪶','🐓','🦃','🦤','🦚','🦜','🪽','🦢','🪿','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀',
'🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂',
'🍁','🍄','🐚','🪸','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🪻','🌞','🌝','🌛','🌜','🌚','🌕',
'🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎','🌍','🌏','🪐','⭐','🌟','✨','⚡','☄️','💥','🔥','🌈',
'☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌊','💧','💦',
'🍏','🍎','🍐','🍊','🍋','🍋‍🟩','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆',
'🥑','🫛','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🥯','🍞','🥖','🥨',
'🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮',
'🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠',
'🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯',
'🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄',
'🍴','🍽️','🥣','🥡','🥢','🧂','⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
'🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️',
'🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🚴','🚵','🎯','🪄','🎮',
'🕹️','🎰','🎲','🧩','♟️','🎭','🎨','🧵','🪡','🧶','🎼','🎵','🎶','🎤','🎧','📯','🎷','🎸','🎹','🥁',
'🪘','🎺','🪇','🪈','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️',
'🚲','🛴','🚨','🚔','🚍','🚘','🚖','✈️','🛫','🛬','🚀','🛸','🚁','⛵','🚤','🛥️','🛳️','⛴️','🚢','🚆',
'🚄','🚅','🚈','🚝','🚞','🚋','🚃','🚂','🚇','🚉','🚊','🚦','🚥','🗺️','🧭','🏔️','🗻','🌋','🏕️','🏖️'
];

// 10 distinct inline reaction emojis
const INLINE_REACTION_EMOJIS = [
'👍','❤️','😂','🎉','🔥','✨','👏','😍','🤯','🥳'
];

const STATUS_CONFIG = {
  open:    { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Open'    },
  closed:  { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200',   label: 'Closed'  },
  pending: { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   label: 'Pending' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTING HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const diff = now - date

  if (diff < 60_000)     return 'Just now'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604_800_000) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtTimeShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

const fmtDateSeparator = (d) => {
  if (!d) return ''
  const date  = new Date(d)
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgD  = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff  = today - msgD

  if (diff === 0) return 'Today'
  if (diff <= 86_400_000) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/* ── Avatar ─────────────────────────────────────────────────────────────── */

function Avatar({ name = '', src, size = 'md', className = '' }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-14 h-14 text-base',
  }
  const s = sizes[size] || sizes.md

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={e => { e.target.onerror = null; e.target.style.display = 'none' }}
        className={`${s} rounded-full object-cover border-2 border-white shadow-sm
                    flex-shrink-0 ${className}`}
      />
    )
  }
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
                    text-white font-bold flex items-center justify-center flex-shrink-0
                    shadow-sm ${className}`}>
      {initials}
    </div>
  )
}

/* ── Online indicator dot ──────────────────────────────────────────────── */

function OnlineDot({ online = false }) {
  if (!online) return null
  return (
    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500
                     rounded-full border-2 border-white animate-pulse" />
  )
}

/* ── Status Badge ──────────────────────────────────────────────────────── */

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const cls = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full
                      ${cfg.text} ${cfg.bg} border ${cfg.border} ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ── Typing Indicator ──────────────────────────────────────────────────── */

function TypingIndicator({ name }) {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md
                      px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {name || 'Someone'} is typing…
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Scroll-to-bottom FAB ──────────────────────────────────────────────── */

function ScrollToBottomFab({ show, onClick, unread = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`absolute bottom-24 right-4 z-20 w-10 h-10 rounded-full
                  bg-white border border-slate-200 shadow-lg
                  flex items-center justify-center
                  hover:bg-slate-50 transition-all duration-300
                  ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <ArrowDown size={18} className="text-slate-600" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white
                         text-[9px] font-bold rounded-full min-w-[18px] h-[18px]
                         flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVERSATION ROW
═══════════════════════════════════════════════════════════════════════════ */

const ConversationRow = React.memo(function ConversationRow({ conv, active, onSelect }) {
  const title    = conv.subject || conv.guestName || conv.guestEmail || 'Conversation'
  const subtitle = conv.lastMessage || 'No messages yet'

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={`
        w-full text-left px-4 py-3.5 transition-all duration-200 relative
        hover:bg-slate-50/80 group
        ${active
          ? 'bg-emerald-50/80 hover:bg-emerald-50'
          : ''
        }
      `}
    >
      {/* Active indicator bar */}
      {active && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-600" />
      )}

      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Avatar name={conv.guestName || conv.guestEmail || '?'} src={conv.guestAvatar} size="md" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`font-semibold text-sm truncate flex-1
              ${active ? 'text-emerald-900' : 'text-slate-800'}`}>
              {title}
            </span>
            <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
              {fmtTime(conv.lastMessageAt)}
            </span>
          </div>

          <p className="text-xs text-slate-400 truncate leading-relaxed">{subtitle}</p>

          <div className="flex items-center justify-between mt-1.5">
            <StatusBadge status={conv.status} size="sm" />
            {conv.unreadAdmin > 0 && (
              <span className="bg-red-500 text-white rounded-full text-[10px] font-bold
                               min-w-[20px] h-[20px] px-1.5 flex items-center justify-center
                               shadow-sm shadow-red-200">
                {conv.unreadAdmin > 99 ? '99+' : conv.unreadAdmin}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute bottom-0 left-16 right-4 h-px bg-slate-100
                      group-last:hidden" />
    </button>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   EMOJI PICKER
═══════════════════════════════════════════════════════════════════════════ */

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200
                 rounded-2xl shadow-2xl p-3 z-50 w-64
                 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Quick reactions
      </p>
      <div className="grid grid-cols-8 gap-0.5">
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            className="text-xl p-1.5 rounded-lg hover:bg-slate-100
                       active:scale-90 transition-all duration-150"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAT BACKGROUND PICKER
═══════════════════════════════════════════════════════════════════════════ */

function ChatBgPicker({ currentBg, onChange, onClose }) {
  const ref = useRef(null)
  const [customColor, setCustomColor] = useState('#f8fafc')
  const [customGradient1, setCustomGradient1] = useState('#e0f2fe')
  const [customGradient2, setCustomGradient2] = useState('#f0fdf4')
  const [customAngle, setCustomAngle] = useState(135)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const applyCustomGradient = () => {
    onChange(`linear-gradient(${customAngle}deg, ${customGradient1} 0%, ${customGradient2} 100%)`)
  }

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 bg-white border border-slate-200
                 rounded-2xl shadow-2xl p-4 z-50 w-80
                 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Palette size={14} className="text-emerald-600" />
          Chat Background
        </h4>
        <button onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center
                     hover:bg-slate-100 text-slate-400 transition">
          <X size={12} />
        </button>
      </div>

      {/* Presets */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Presets
      </p>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {BG_PRESETS.map((preset) => {
          const isActive = currentBg === preset.value
          const style    = preset.type === 'gradient'
            ? { background: preset.value }
            : { backgroundColor: preset.value }

          return (
            <button
              key={preset.label}
              onClick={() => onChange(preset.value)}
              title={preset.label}
              className={`w-10 h-10 rounded-xl border-2 transition-all duration-200
                hover:scale-110 active:scale-95
                ${isActive
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              style={style}
            />
          )
        })}
      </div>

      {/* Custom solid */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Custom Solid
      </p>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="color"
          value={customColor}
          onChange={e => setCustomColor(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer
                     p-0.5 bg-white"
        />
        <input
          type="text"
          value={customColor}
          onChange={e => setCustomColor(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl
                     font-mono outline-none focus:border-emerald-500"
          placeholder="#hex"
        />
        <button
          onClick={() => onChange(customColor)}
          className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white
                     rounded-xl hover:bg-emerald-700 transition"
        >
          Apply
        </button>
      </div>

      {/* Custom gradient */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Custom Gradient
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customGradient1}
            onChange={e => setCustomGradient1(e.target.value)}
            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
          />
          <ChevronRight size={14} className="text-slate-300" />
          <input
            type="color"
            value={customGradient2}
            onChange={e => setCustomGradient2(e.target.value)}
            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
          />
          <input
            type="number"
            value={customAngle}
            onChange={e => setCustomAngle(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg
                       outline-none focus:border-emerald-500 text-center"
            min="0"
            max="360"
            placeholder="deg"
          />
          <span className="text-[10px] text-slate-400">deg</span>
        </div>

        {/* Preview */}
        <div
          className="w-full h-12 rounded-xl border border-slate-200"
          style={{
            background: `linear-gradient(${customAngle}deg, ${customGradient1} 0%, ${customGradient2} 100%)`,
          }}
        />

        <button
          onClick={applyCustomGradient}
          className="w-full py-2 text-xs font-bold bg-emerald-600 text-white
                     rounded-xl hover:bg-emerald-700 transition"
        >
          Apply Gradient
        </button>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange('#f8fafc')}
        className="w-full mt-3 py-2 text-xs font-medium text-slate-500
                   border border-slate-200 rounded-xl hover:bg-slate-50 transition
                   flex items-center justify-center gap-1.5"
      >
        <Trash2 size={11} /> Reset to Default
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
═══════════════════════════════════════════════════════════════════════════ */

const MessageBubble = React.memo(function MessageBubble({
  message, mine, replyTo, onReact, onReply, isFirst, isLast,
}) {
  const reactions = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])

  const isTemp = String(message.id).startsWith('tmp-')

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}
                    ${isLast ? 'mb-3' : 'mb-0.5'}
                    group/bubble animate-in fade-in slide-in-from-bottom-1 duration-200`}>
      <div className={`max-w-[85%] sm:max-w-[72%] lg:max-w-[65%]
                       ${mine ? 'items-end' : 'items-start'} flex flex-col`}>

        {/* Reply reference */}
        {replyTo && (
          <div className={`flex items-center gap-1.5 mb-1 px-1
            ${mine ? 'self-end' : 'self-start'}`}>
            <CornerUpLeft size={10} className="text-slate-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">
              {replyTo.senderName}: {(replyTo.body || '').slice(0, 50)}
            </span>
          </div>
        )}

        {/* Bubble body */}
        <div className={`
          relative inline-block px-4 py-2.5 text-[14px] leading-relaxed
          whitespace-pre-wrap break-words max-w-full
          ${mine
            ? `bg-emerald-600 text-white shadow-sm shadow-emerald-200/50
               ${isLast ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
            : `bg-white text-slate-800 border border-slate-200/80 shadow-sm
               ${isLast ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
          }
          ${isTemp ? 'opacity-70' : ''}
        `}>
          {/* Sender name (non-admin) */}
          {!mine && isFirst && (
            <p className="text-[10px] font-bold text-emerald-600 mb-1 tracking-wide">
              {message.senderName || 'User'}
            </p>
          )}

          {message.body}

          {/* Inline time + read status */}
          <span className={`inline-flex items-center gap-1 ml-3 -mb-1 float-right
                           translate-y-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>
            <span className="text-[9px] whitespace-nowrap">
              {fmtTimeShort(message.createdAt)}
            </span>
            {mine && (
              message.isRead
                ? <CheckCheck size={12} className={mine ? 'text-emerald-200' : 'text-emerald-500'} />
                : !isTemp
                  ? <Check size={12} />
                  : <Clock size={10} className="animate-pulse" />
            )}
          </span>
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5
                           text-[11px] hover:bg-slate-50 transition shadow-sm
                           hover:scale-105 active:scale-95"
              >
                {emoji} <span className="text-slate-500 font-semibold">{ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover action bar */}
        <div className={`flex items-center gap-0.5 mt-0.5
                        opacity-0 group-hover/bubble:opacity-100
                        transition-opacity duration-150
                        ${mine ? 'self-end' : 'self-start'}`}>
          {INLINE_REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onMouseDown={e => { e.preventDefault(); onReact(message.id, emoji) }}
              className="text-sm p-1 rounded-lg hover:bg-white hover:shadow-sm
                         active:scale-90 transition-all duration-150"
            >
              {emoji}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onReply(message.id) }}
            className="text-[10px] text-slate-400 hover:text-slate-700 px-1.5 py-1
                       rounded-lg hover:bg-white hover:shadow-sm transition-all
                       inline-flex items-center gap-0.5 font-medium"
          >
            <CornerUpLeft size={10} /> Reply
          </button>
        </div>
      </div>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   DATE SEPARATOR
═══════════════════════════════════════════════════════════════════════════ */

function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-white/90 backdrop-blur-sm border border-slate-200/60
                       text-[11px] font-semibold text-slate-500
                       px-4 py-1.5 rounded-full shadow-sm">
        {fmtDateSeparator(date)}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEW CHAT MODAL
═══════════════════════════════════════════════════════════════════════════ */

function NewChatModal({ onClose, onCreated }) {
  const [step,         setStep]         = useState(1) // 1: pick user, 2: compose
  const [search,       setSearch]       = useState('')
  const [users,        setUsers]        = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [subject,      setSubject]      = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [creating,     setCreating]     = useState(false)
  const [error,        setError]        = useState('')
  const searchRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [step])

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true)
      try {
        const res  = await authFetch(
          `${API_BASE}/messages/users-list?search=${encodeURIComponent(search)}&limit=30`,
        )
        const data = await res.json()
        setUsers(data.data || [])
      } catch { setUsers([]) }
      finally  { setLoadingUsers(false) }
    }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const selectUser = (u) => {
    setSelected(u)
    setStep(2)
    setSubject(`Chat with ${u.fullName || u.email}`)
  }

  const handleCreate = async () => {
    if (!selected)            { setError('Please select a user.'); return }
    if (!firstMessage.trim()) { setError('Please enter a message.'); return }
    setError('')
    setCreating(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        body:   JSON.stringify({
          targetUserId: selected.id,
          subject:      subject.trim() || `Chat with ${selected.fullName || selected.email}`,
          body:         firstMessage.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create conversation')
      onCreated(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm
                   animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl
                      overflow-hidden flex flex-col max-h-[85vh]
                      animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r
                        from-emerald-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  onClick={() => { setStep(1); setSelected(null) }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center
                             hover:bg-white/80 text-slate-500 transition"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center
                                  justify-center shadow-sm shadow-emerald-200">
                    <Plus size={16} className="text-white" />
                  </div>
                  New Conversation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {step === 1 ? 'Select a traveller to message' : 'Compose your first message'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center
                         hover:bg-slate-100 text-slate-400 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all duration-300
                  ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            /* ── Step 1: Pick user ─────────────────────────────────────── */
            <div className="p-5">
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2
                                             text-slate-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200
                             rounded-2xl outline-none focus:border-emerald-500 focus:bg-white
                             focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {loadingUsers ? (
                  <div className="text-center py-10">
                    <RefreshCw size={20} className="mx-auto mb-2 text-slate-300 animate-spin" />
                    <p className="text-sm text-slate-400">Searching…</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-10">
                    <User size={32} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl
                                 hover:bg-emerald-50 transition-all duration-200
                                 text-left group border border-transparent
                                 hover:border-emerald-200"
                    >
                      <Avatar name={u.fullName || u.email} src={u.avatar} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {u.fullName || '(no name)'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Mail size={10} className="text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <ChevronRight size={16}
                        className="text-slate-300 group-hover:text-emerald-500
                                   group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ── Step 2: Compose ───────────────────────────────────────── */
            <div className="p-5 space-y-5">
              {/* Selected user card */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50
                              to-emerald-50/30 rounded-2xl border border-emerald-200/60">
                <Avatar
                  name={selected.fullName || selected.email}
                  src={selected.avatar}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">
                    {selected.fullName || '(no name)'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail size={10} /> {selected.email}
                  </p>
                  {selected.phone && (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Phone size={10} /> {selected.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5
                                  mb-2">
                  <Hash size={11} /> Subject
                </label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl
                             outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 transition bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5
                                  mb-2">
                  <Sparkles size={11} /> First Message
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  ref={searchRef}
                  value={firstMessage}
                  onChange={e => setFirstMessage(e.target.value)}
                  rows={5}
                  placeholder="Hi! I'm reaching out about your upcoming trip…"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl
                             outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 resize-none transition
                             bg-slate-50 focus:bg-white"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200
                                rounded-2xl px-4 py-3">
                  <X size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50
                          flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600
                         border border-slate-200 rounded-xl hover:bg-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !firstMessage.trim()}
              className="px-5 py-2.5 text-sm font-bold bg-emerald-600 text-white
                         rounded-xl hover:bg-emerald-700 disabled:opacity-40
                         disabled:cursor-not-allowed transition-all
                         flex items-center gap-2 shadow-sm shadow-emerald-200
                         hover:shadow-md hover:shadow-emerald-200"
            >
              {creating ? (
                <><RefreshCw size={14} className="animate-spin" /> Creating…</>
              ) : (
                <><Send size={14} /> Start Conversation</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMART COMPOSER BAR
   - Fixed at bottom of chat area
   - Hides on scroll down, shows on scroll up or when at bottom
   - Always visible when user is actively typing
═══════════════════════════════════════════════════════════════════════════ */

function ComposerBar({
  draft, onDraftChange, onSend, sending, disabled,
  replyToId, replyMap, onClearReply,
  showEmoji, onToggleEmoji, onPickEmoji, onCloseEmoji,
}) {
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [draft])

  const replyMsg = replyToId ? replyMap.get(String(replyToId)) : null

  return (
    <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-lg
                    transition-all duration-300 flex-shrink-0">
      {/* Reply preview */}
      {replyMsg && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
                          rounded-xl px-3 py-2">
            <CornerUpLeft size={13} className="text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700">
                {replyMsg.senderName}
              </p>
              <p className="text-xs text-emerald-600 truncate">
                {(replyMsg.body || '').slice(0, 80)}
              </p>
            </div>
            <button
              onClick={onClearReply}
              className="text-emerald-400 hover:text-emerald-600 p-1 rounded-lg
                         hover:bg-emerald-100 transition"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-end gap-2 relative">
          {/* Emoji button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={onToggleEmoji}
              disabled={disabled}
              className={`w-10 h-10 rounded-xl border transition-all
                flex items-center justify-center
                ${showEmoji
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                }
                disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="Emoji"
            >
              <Smile size={18} />
            </button>
            {showEmoji && (
              <EmojiPicker
                onPick={onPickEmoji}
                onClose={onCloseEmoji}
              />
            )}
          </div>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => onDraftChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onSend()
                }
              }}
              disabled={disabled}
              rows={1}
              placeholder={disabled
                ? 'This conversation is closed'
                : 'Type a reply… (Enter to send)'
              }
              className="w-full resize-none text-sm px-4 py-2.5 rounded-2xl border
                         border-slate-200 outline-none max-h-36
                         focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                         transition-all bg-slate-50 focus:bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed
                         placeholder:text-slate-400"
            />
          </div>

          {/* Send */}
          <button
            onClick={onSend}
            disabled={!draft.trim() || sending || disabled}
            className="h-10 w-10 sm:w-auto sm:px-5 rounded-xl bg-emerald-600 text-white
                       font-bold text-sm flex items-center justify-center gap-1.5
                       flex-shrink-0 hover:bg-emerald-700 transition-all
                       shadow-sm shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                       active:scale-95"
          >
            <Send size={16} />
            <span className="hidden sm:inline">{sending ? '…' : 'Send'}</span>
          </button>
        </div>

        {/* Helper text (mobile) */}
        <p className="hidden sm:block text-[10px] text-slate-400 mt-1.5 pl-12">
          <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">Enter</kbd> to send
          · <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function Messages() {
  const { user }                     = useAuth()
  const { connected, on, off, emit } = useSocket()

  /* ── State ──────────────────────────────────────────────────────────── */

  const [conversations,  setConversations]  = useState([])
  const [activeId,       setActiveId]       = useState(null)
  const [activeConv,     setActiveConv]     = useState(null)
  const [messages,       setMessages]       = useState([])
  const [loadingList,    setLoadingList]    = useState(false)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [sending,        setSending]        = useState(false)
  const [draft,          setDraft]          = useState('')
  const [filter,         setFilter]         = useState('open')
  const [search,         setSearch]         = useState('')
  const [replyToId,      setReplyToId]      = useState(null)
  const [showEmoji,      setShowEmoji]      = useState(false)
  const [showNewChat,    setShowNewChat]    = useState(false)
  const [showBgPicker,   setShowBgPicker]   = useState(false)
  const [typingUser,     setTypingUser]     = useState(null)

  // Chat background
  const [chatBg, setChatBg] = useState(() => {
    try { return localStorage.getItem(CHAT_BG_STORAGE_KEY) || '#f8fafc' }
    catch { return '#f8fafc' }
  })

  // Scroll state for composer visibility
  const [composerVisible, setComposerVisible] = useState(true)
  const [showScrollBtn,   setShowScrollBtn]   = useState(false)

  const scrollRef       = useRef(null)
  const lastScrollY     = useRef(0)
  const scrollTimeout   = useRef(null)
  const notifShownRef   = useRef(new Set())
  const typingTimeout   = useRef(null)

  /* ── Chat background persistence ─────────────────────────────────── */

  const updateChatBg = useCallback((bg) => {
    setChatBg(bg)
    try { localStorage.setItem(CHAT_BG_STORAGE_KEY, bg) } catch { /* ignore */ }
  }, [])

  const chatBgStyle = useMemo(() => {
    if (!chatBg) return { backgroundColor: '#f8fafc' }
    return chatBg.includes('gradient')
      ? { background: chatBg }
      : { backgroundColor: chatBg }
  }, [chatBg])

  /* ── Desktop notifications ────────────────────────────────────────── */

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission().catch(() => {})
  }, [])

  const showDesktopNotif = useCallback((title, body, convId) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!document.hidden) return
    const key = `${convId}-${Math.floor(Date.now() / 5000)}`
    if (notifShownRef.current.has(key)) return
    notifShownRef.current.add(key)
    try {
      const n = new Notification(`Altuvera — ${title}`, {
        body, icon: '/favicon.ico', tag: `conv-${convId}`,
      })
      n.onclick = () => { window.focus(); n.close() }
      setTimeout(() => notifShownRef.current.delete(key), 30_000)
    } catch { /* non-fatal */ }
  }, [])

  /* ── Smart scroll handling ───────────────────────────────────────── */

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const currentY   = el.scrollTop
    const isAtBottom  = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    const scrollingUp = currentY < lastScrollY.current

    // Show composer when scrolling up or at bottom
    if (scrollingUp || isAtBottom) {
      setComposerVisible(true)
    } else if (currentY > lastScrollY.current + 5) {
      // Hide when scrolling down significantly
      setComposerVisible(false)
    }

    // Show scroll-to-bottom button
    setShowScrollBtn(!isAtBottom && el.scrollHeight - el.scrollTop > el.clientHeight + 200)

    lastScrollY.current = currentY

    // Auto-show composer after scroll stops
    clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      setComposerVisible(true)
    }, 2000)
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }, [])

  /* ── Load conversations ──────────────────────────────────────────── */

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filter !== 'all') params.set('status', filter)
      if (search.trim()) params.set('search', search.trim())

      const res = await authFetch(`${API_BASE}/messages/conversations?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('[Messages] load conversations:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* ── Open conversation ───────────────────────────────────────────── */

  const openConversation = useCallback(async (id) => {
    setActiveId(id)
    setReplyToId(null)
    setDraft('')
    setLoadingMsgs(true)
    setComposerVisible(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: 'PATCH' })
        .catch(() => {})
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c),
      )
      // Scroll to bottom on open
      setTimeout(() => scrollToBottom(false), 100)
    } catch (err) {
      console.error('[Messages] open conversation:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [scrollToBottom])

  const closeMobile = useCallback(() => {
    setActiveId(null)
    setActiveConv(null)
    setMessages([])
    setReplyToId(null)
  }, [])

  /* ── Reactions ───────────────────────────────────────────────────── */

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!activeId) return
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages/${messageId}/react`,
        { method: 'PATCH', body: JSON.stringify({ emoji }) },
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(prev =>
          prev.map(m =>
            String(m.id) === String(messageId)
              ? { ...m, reactions: data.data?.reactions || {} }
              : m,
          ),
        )
      }
    } catch { /* silent */ }
  }, [activeId])

  /* ── Send message ────────────────────────────────────────────────── */

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!activeId || !text || sending) return

    setSending(true)
    setComposerVisible(true)

    const optimistic = {
      id:             `tmp-${Date.now()}`,
      conversationId: activeId,
      senderType:     'admin',
      senderName:     user?.full_name || 'Admin',
      body:           text,
      isRead:         false,
      reactions:      {},
      createdAt:      new Date().toISOString(),
      replyToId:      replyToId || undefined,
    }

    setMessages(prev => [...prev, optimistic])
    const outDraft = draft
    const outReply = replyToId
    setDraft('')
    setReplyToId(null)
    setTimeout(() => scrollToBottom(), 50)

    // Socket first
    if (connected && emit) {
      emit(
        'msg:admin-send',
        { conversationId: activeId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages(prev =>
              prev.map(m => m.id === optimistic.id ? ack.message : m),
            )
          } else if (ack?.error) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          }
        },
      )
      setSending(false)
      loadConversations()
      return
    }

    // REST fallback
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages`,
        {
          method: 'POST',
          body:   JSON.stringify({
            body: outDraft,
            ...(outReply ? { replyToId: outReply } : {}),
          }),
        },
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.data) {
          setMessages(prev =>
            prev.map(m => m.id === optimistic.id ? data.data : m),
          )
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
      loadConversations()
    }
  }, [activeId, draft, sending, connected, emit, user, loadConversations, replyToId, scrollToBottom])

  /* ── Status change ───────────────────────────────────────────────── */

  const changeStatus = useCallback(async (status) => {
    if (!activeId) return
    try {
      await authFetch(`${API_BASE}/messages/conversations/${activeId}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      })
      setActiveConv(p => p ? { ...p, status } : p)
      setConversations(prev =>
        prev.map(c => c.id === activeId ? { ...c, status } : c),
      )
    } catch { /* silent */ }
  }, [activeId])

  /* ── New chat created ────────────────────────────────────────────── */

  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) openConversation(conv.id)
  }, [loadConversations, openConversation])

  /* ── Socket listeners ────────────────────────────────────────────── */

  useEffect(() => {
    if (!on || !off) return

    const onMsg = (payload) => {
      setMessages(prev => {
        if (payload.conversationId !== activeId) return prev
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })
      setConversations(prev =>
        prev.map(c =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessage:   payload.body,
                lastMessageAt: payload.createdAt,
                unreadAdmin: payload.senderType !== 'admin'
                  ? (c.id !== activeId ? (c.unreadAdmin || 0) + 1 : 0)
                  : c.unreadAdmin,
              }
            : c,
        ),
      )
      if (payload.conversationId === activeId) {
        setTimeout(() => scrollToBottom(), 100)
      }
      if (document.hidden) {
        showDesktopNotif('New message', payload.body?.slice(0, 120) || '', payload.conversationId)
      }
    }

    const onNewUser = (payload) => {
      loadConversations()
      if (document.hidden) {
        showDesktopNotif(
          'New message from traveller',
          payload.message?.body?.slice(0, 120) || '',
          payload.conversationId,
        )
      }
    }

    const onUpdated = (conv) => {
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ...conv } : c))
    }

    const onReaction = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m =>
          String(m.id) === String(messageId) ? { ...m, reactions: reactions || {} } : m,
        ),
      )
    }

    const onTyping = (payload) => {
      if (payload.conversationId === activeId && payload.senderType !== 'admin') {
        setTypingUser(payload.isTyping ? (payload.senderName || 'Someone') : null)
        clearTimeout(typingTimeout.current)
        if (payload.isTyping) {
          typingTimeout.current = setTimeout(() => setTypingUser(null), 10_000)
        }
      }
    }

    on('msg:message',              onMsg)
    on('msg:new-from-user',        onNewUser)
    on('msg:conversation-updated', onUpdated)
    on('msg:reaction',             onReaction)
    on('msg:typing',               onTyping)

    return () => {
      off('msg:message',              onMsg)
      off('msg:new-from-user',        onNewUser)
      off('msg:conversation-updated', onUpdated)
      off('msg:reaction',             onReaction)
      off('msg:typing',               onTyping)
    }
  }, [on, off, activeId, loadConversations, showDesktopNotif, scrollToBottom])

  /* ── Auto-scroll on new messages ─────────────────────────────────── */

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (isNearBottom) scrollToBottom()
  }, [messages, scrollToBottom])

  /* ── Keyboard: Escape closes emoji ───────────────────────────────── */

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setShowEmoji(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* ── Derived ─────────────────────────────────────────────────────── */

  const replyMap = useMemo(
    () => new Map(messages.map(m => [String(m.id), m])),
    [messages],
  )

  const convTitle = activeConv?.subject ||
    (activeConv?.bookingNumber ? `Booking ${activeConv.bookingNumber}` : activeConv?.guestName) ||
    'Conversation'

  const showMobileChat  = !!activeId
  const isClosed        = activeConv?.status === 'closed'

  // Group messages with date separators
  const messagesWithDates = useMemo(() => {
    const result = []
    let lastDate = ''
    messages.forEach((m, i) => {
      const d = m.createdAt ? new Date(m.createdAt).toDateString() : ''
      if (d && d !== lastDate) {
        result.push({ type: 'date', date: m.createdAt, key: `date-${d}` })
        lastDate = d
      }
      // Determine if first/last in a run by same sender
      const prev = messages[i - 1]
      const next = messages[i + 1]
      const isFirst = !prev || prev.senderType !== m.senderType
      const isLast  = !next || next.senderType !== m.senderType
      result.push({ type: 'msg', data: m, key: m.id, isFirst, isLast })
    })
    return result
  }, [messages])

  const unreadConvCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadAdmin || 0), 0),
    [conversations],
  )

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */

  return (
    <>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewConvCreated}
        />
      )}

      <div className="h-full flex flex-col overflow-hidden p-2 sm:p-4 lg:p-5 gap-2 sm:gap-3">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between flex-shrink-0
                        ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-900
                          flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500
                              to-emerald-700 flex items-center justify-center shadow-sm
                              shadow-emerald-200">
                <MessageSquare size={18} className="text-white" />
              </div>
              Messages
              {unreadConvCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full
                                 px-2 py-0.5 ml-1">
                  {unreadConvCount}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 ml-11">
              Live conversations with travellers
              {!connected && (
                <span className="ml-2 text-amber-600 font-semibold animate-pulse">
                  · Reconnecting…
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600
                       text-white text-sm font-bold rounded-xl hover:bg-emerald-700
                       transition-all shadow-sm shadow-emerald-200
                       hover:shadow-md hover:shadow-emerald-200 active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>

        {/* ── Two-panel layout ────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 grid md:grid-cols-[340px_1fr] lg:grid-cols-[360px_1fr]
                        gap-2 sm:gap-3">

          {/* ═══ CONVERSATION LIST ═══ */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                          flex flex-col overflow-hidden
                          ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>

            {/* Filters */}
            <div className="p-3 border-b border-slate-100 space-y-2.5 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2
                                             text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200
                             rounded-xl outline-none focus:border-emerald-500 focus:bg-white
                             focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { key: 'open',   label: 'Open'   },
                  { key: 'closed', label: 'Closed' },
                  { key: 'all',    label: 'All'    },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
                      ${filter === f.key
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh bar */}
            <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={loadConversations}
                disabled={loadingList}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400
                           active:scale-90"
              >
                <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingList && conversations.length === 0 ? (
                <div className="py-16 text-center">
                  <RefreshCw size={20} className="mx-auto mb-2 text-slate-300 animate-spin" />
                  <p className="text-sm text-slate-400">Loading conversations…</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <MessageSquare size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">
                    No {filter !== 'all' ? filter : ''} conversations
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Start a new conversation with a traveller
                  </p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-600
                               font-bold hover:underline"
                  >
                    <Plus size={12} /> New Conversation
                  </button>
                </div>
              ) : (
                conversations.map(c => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onSelect={openConversation}
                  />
                ))
              )}
            </div>
          </div>

          {/* ═══ CHAT PANEL ═══ */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                          flex flex-col overflow-hidden
                          ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>

            {!activeConv ? (
              /* ── Empty state ─────────────────────────────────────────── */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center
                                justify-center mb-5">
                  <MessageSquare size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">
                  Select a conversation
                </h3>
                <p className="text-sm text-slate-400 text-center max-w-xs mb-6">
                  Choose a conversation from the list or start a new one with any traveller
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600
                             text-white text-sm font-bold rounded-xl hover:bg-emerald-700
                             transition shadow-sm shadow-emerald-200 active:scale-95"
                >
                  <Plus size={16} /> New Conversation
                </button>
              </div>
            ) : (
              <>
                {/* ── Chat header ──────────────────────────────────────── */}
                <div className="px-3 sm:px-4 py-3 border-b border-slate-100 flex items-center
                                gap-2 sm:gap-3 flex-shrink-0 bg-white z-10">
                  <button
                    onClick={closeMobile}
                    className="md:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 transition"
                    aria-label="Back"
                  >
                    <ArrowLeft size={18} className="text-slate-600" />
                  </button>

                  <Avatar
                    name={activeConv.guestName || activeConv.guestEmail || '?'}
                    src={activeConv.guestAvatar}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{convTitle}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeConv.guestEmail || activeConv.guestName || 'Guest'}
                      {activeConv.bookingNumber && ` · #${activeConv.bookingNumber}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusBadge status={activeConv.status} size="md" />

                    {/* Background picker toggle */}
                    <div className="relative">
                      <button
                        onClick={() => setShowBgPicker(p => !p)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center
                                   transition ${showBgPicker
                                     ? 'bg-emerald-50 text-emerald-600'
                                     : 'hover:bg-slate-100 text-slate-400'}`}
                        title="Chat background"
                      >
                        <Palette size={15} />
                      </button>
                      {showBgPicker && (
                        <ChatBgPicker
                          currentBg={chatBg}
                          onChange={updateChatBg}
                          onClose={() => setShowBgPicker(false)}
                        />
                      )}
                    </div>

                    {/* Status toggle */}
                    {isClosed ? (
                      <button
                        onClick={() => changeStatus('open')}
                        className="text-xs border border-emerald-300 rounded-xl px-3 py-1.5
                                   text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                                   transition font-bold hidden sm:inline-flex items-center gap-1"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus('closed')}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-1.5
                                   text-slate-600 hover:bg-slate-50 transition font-medium
                                   hidden sm:inline-flex items-center gap-1"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Messages area ────────────────────────────────────── */}
                <div className="flex-1 relative overflow-hidden">
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 overflow-y-auto px-3 sm:px-4 py-4"
                    style={chatBgStyle}
                  >
                    {loadingMsgs && messages.length === 0 ? (
                      <div className="text-center py-16">
                        <RefreshCw size={20} className="mx-auto mb-2 text-slate-300 animate-spin" />
                        <p className="text-sm text-slate-400">Loading messages…</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-16">
                        <Sparkles size={28} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          No messages yet
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Send the first message to get started!
                        </p>
                      </div>
                    ) : (
                      messagesWithDates.map(item => {
                        if (item.type === 'date') {
                          return <DateSeparator key={item.key} date={item.date} />
                        }
                        return (
                          <MessageBubble
                            key={item.key}
                            message={item.data}
                            mine={item.data.senderType === 'admin'}
                            replyTo={item.data.replyToId
                              ? replyMap.get(String(item.data.replyToId))
                              : null}
                            onReact={toggleReaction}
                            onReply={setReplyToId}
                            isFirst={item.isFirst}
                            isLast={item.isLast}
                          />
                        )
                      })
                    )}

                    {/* Typing indicator */}
                    {typingUser && <TypingIndicator name={typingUser} />}

                    {/* Bottom spacer for composer overlap */}
                    <div className="h-2" />
                  </div>

                  {/* Scroll to bottom FAB */}
                  <ScrollToBottomFab
                    show={showScrollBtn}
                    onClick={() => scrollToBottom()}
                  />
                </div>

                {/* ── Composer bar ──────────────────────────────────────── */}
                <div className={`transition-all duration-300 ease-out
                  ${composerVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-full opacity-0 pointer-events-none'
                  }`}>
                  <ComposerBar
                    draft={draft}
                    onDraftChange={v => { setDraft(v); setComposerVisible(true) }}
                    onSend={sendMessage}
                    sending={sending}
                    disabled={isClosed}
                    replyToId={replyToId}
                    replyMap={replyMap}
                    onClearReply={() => setReplyToId(null)}
                    showEmoji={showEmoji}
                    onToggleEmoji={() => setShowEmoji(p => !p)}
                    onPickEmoji={emoji => { setDraft(p => p + emoji); setShowEmoji(false) }}
                    onCloseEmoji={() => setShowEmoji(false)}
                  />
                </div>

                {/* Mobile status bar */}
                {isClosed && (
                  <div className="sm:hidden border-t border-slate-100 px-3 py-2 bg-slate-50">
                    <button
                      onClick={() => changeStatus('open')}
                      className="w-full text-xs border border-emerald-300 rounded-xl py-2.5
                                 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                                 transition font-bold"
                    >
                      Reopen Conversation
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}