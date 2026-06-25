/**
 * ChatEmojiPicker.jsx
 * 1000+ emojis, categorized, searchable — green/white theme
 */

import React, { useState, useMemo, useRef, useEffect, memo } from 'react'
import { Search, X } from 'lucide-react'

// ── Full emoji dataset ────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    id: 'recent',
    label: 'Recently Used',
    icon: '🕐',
    emojis: [],   // populated from localStorage
  },
  {
    id: 'smileys',
    label: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑',
      '🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
      '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵',
      '🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕','😟','🙁','😮',
      '😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖',
      '😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀',
      '☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻',
      '😼','😽','🙀','😿','😾','👶','🧒','👦','👧','🧑','👱','👨','🧔',
      '👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦',
      '🤷','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👳','👲','🧕','🤵',
      '👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝',
      '🧞','🧟','🧌','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','🕴️','👯',
      '🧖','🧗','🤺','🏇','⛷️','🏂','🏋️','🤼','🤸','🤽','🤾','🏌️',
      '🏄','🚣','🧘','🛀','🛌','👭','👫','👬','💏','💑','👪',
    ],
  },
  {
    id: 'gestures',
    label: 'Hand Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️',
      '🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️',
      '💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠',
      '🦷','🦴','👀','👁️','👅','👄','🫦','💋','🩸',
    ],
  },
  {
    id: 'animals',
    label: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻','🐨','🐯','🦁','🐮',
      '🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅',
      '🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜',
      '🦟','🦗','🪳','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑',
      '🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅',
      '🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬',
      '🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮',
      '🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️',
      '🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🎄',
      '🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂',
      '🍁','🍄','🐚','🪸','🌾','💐','🌷','🌹','🥀','🪷','🌺','🌸','🌼',
      '🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓',
      '🌔','🌙','🌟','⭐','🌠','🌌','☀️','⛅','☁️','⛈️','🌤️','🌥️','🌦️',
      '🌧️','🌨️','🌩️','🌪️','🌫️','🌬️','🌀','🌈','🌂','☂️','⛱️','⚡',
      '❄️','☃️','⛄','☄️','🔥','💧','🌊','🌋','🌁',
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: '🍎',
    emojis: [
      '🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍',
      '🥥','🥝','🍅','🫒','🥑','🍆','🥦','🥬','🥒','🌶️','🫑','🧄','🧅',
      '🥔','🍠','🫚','🫛','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈',
      '🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙',
      '🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣',
      '🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂',
      '🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋',
      '☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊',
      '🥄','🍴','🍽️','🥢','🧂',
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛',
      '🚜','🛵','🏍️','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🛞',
      '🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢',
      '✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸',
      '🪐','🌍','🌎','🌏','🗺️','🗾','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️',
      '🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🛖','🏘️','🏚️','🏠','🏡',
      '🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰',
      '💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃',
      '🏙️','🌄','🌅','🌆','🌇','🌉','🌌','🎠','🎡','🎢','💈','🎪',
    ],
  },
  {
    id: 'activities',
    label: 'Activities & Sports',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🏐','🏉','🎾','🥏','🎱','🏓','🏸','🏒',
      '🏑','🏏','🪃','🥅','⛳','🪁','🎣','🤿','🎽','🎿','🛷','🥌','🎯',
      '🪀','🪆','🎮','🎲','🎰','🧩','🎭','🎨','🖼️','🎪','🎤','🎧','🎼',
      '🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎬','🎥','📽️','🎞️',
      '📺','📷','📸','📹','📼','🔭','🔬','🕯️','💡','🔦','🏮','🪔','📔',
      '📕','📖','📗','📘','📙','📚','📓','📃','📄','📑','🗒️','🗓️','📆',
      '📅','📇','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️',
      '🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️',
      '🛠️','🗡️','⚔️','🛡️','🪚','🔧','🪛','🔩','⚙️','🗜️','⚖️','🪝','🔗',
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💡',
    emojis: [
      '💌','🧸','🪆','🖼️','🧵','🪡','🧶','👓','🕶️','🥽','🌂','☂️','🧵',
      '👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','🩲','🩳',
      '👙','👚','👛','👜','👝','🎒','🧳','👒','🎩','🧢','⛑️','👑','💍',
      '💎','🔮','🪬','🧿','💈','⚗️','🔭','🔬','🩻','🩹','🩺','💊','💉',
      '🩸','🧬','🦠','🧫','🧪','🌡️','🧲','🪜','🧰','🪤','🧲','💣','🪝',
      '🔑','🗝️','🔐','🔏','🔓','🔒','🚪','🪞','🪟','🛋️','🪑','🚽','🪠',
      '🚿','🛁','🪤','🪒','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥',
      '🧽','🧯','🛒','🚪','🛗','🪞','🪟','🛏️','🛋️','🪑','🚽','🚿','🛁',
      '📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','📞','☎️',
      '📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌚',
      '📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧱','🔮','🪄','🧸','🪅',
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️',
      '✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍',
      '♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳',
      '🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴',
      '🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑',
      '⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕',
      '🔇','🔈','🔉','🔊','📣','📢','💬','💭','🗯️','♟️','🔔','🔕','🎵',
      '🎶','⚠️','🚸','🔅','🔆','📶','🛜','📳','📴','♻️','🔱','📛','⚜️',
      '🔰','✅','❎','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣',
      '4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤',
      '🅰️','🅱️','🆎','🆑','🅾️','🆘','#️⃣','*️⃣','⏏️','▶️','⏸️','⏹️',
      '⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️',
      '⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁',
      '🔂','🔃','🎦','🔅','🔆','📶','📳','📴','〽️','⚙️','🛞','🔩','🔧',
      '🪛','🔨','🪚','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🔫','🪃','🏹',
      '🪤','🪝','🔗','⛓️','🪜','🧲','🔮','🧿','🪬','🗺️','🧭','💈',
      '⚗️','🔭','🔬','🩻','🧬','💊','💉','🩹','🩺','🌡️','🧯','🛒',
    ],
  },
  {
    id: 'flags',
    label: 'Flags',
    icon: '🏳️',
    emojis: [
      '🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🇦🇫','🇦🇱','🇩🇿',
      '🇦🇩','🇦🇴','🇦🇮','🇦🇶','🇦🇬','🇦🇷','🇦🇲','🇦🇼','🇦🇺','🇦🇹',
      '🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇲',
      '🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇮🇴','🇻🇬','🇧🇳','🇧🇬','🇧🇫',
      '🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇮🇨','🇨🇻','🇧🇶','🇰🇾','🇨🇫','🇹🇩',
      '🇨🇱','🇨🇳','🇨🇽','🇨🇨','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇰','🇨🇷',
      '🇭🇷','🇨🇺','🇨🇼','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇲','🇩🇴','🇪🇨',
      '🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇸🇿','🇪🇹','🇪🇺','🇫🇰','🇫🇴',
      '🇫🇯','🇫🇮','🇫🇷','🇬🇫','🇵🇫','🇬🇦','🇬🇲','🇬🇪','🇩🇪','🇬🇭',
      '🇬🇮','🇬🇷','🇬🇱','🇬🇩','🇬🇵','🇬🇺','🇬🇹','🇬🇬','🇬🇳','🇬🇼',
      '🇬🇾','🇭🇹','🇭🇳','🇭🇰','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶',
      '🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇯🇲','🇯🇵','🇯🇪','🇯🇴','🇰🇿','🇰🇪',
      '🇰🇮','🇽🇰','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾',
      '🇱🇮','🇱🇹','🇱🇺','🇲🇴','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹',
      '🇲🇭','🇲🇶','🇲🇷','🇲🇺','🇾🇹','🇲🇽','🇫🇲','🇲🇩','🇲🇨','🇲🇳',
      '🇲🇪','🇲🇸','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇷','🇳🇵','🇳🇱','🇳🇨',
      '🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇳🇺','🇳🇫','🇰🇵','🇲🇰','🇳🇴','🇴🇲',
      '🇵🇰','🇵🇼','🇵🇸','🇵🇦','🇵🇬','🇵🇾','🇵🇪','🇵🇭','🇵🇳','🇵🇱',
      '🇵🇹','🇵🇷','🇶🇦','🇷🇪','🇷🇴','🇷🇺','🇷🇼','🇼🇸','🇸🇲','🇸🇹',
      '🇸🇦','🇸🇳','🇷🇸','🇸🇨','🇸🇱','🇸🇬','🇸🇽','🇸🇰','🇸🇮','🇸🇧',
      '🇸🇴','🇿🇦','🇬🇸','🇰🇷','🇸🇸','🇪🇸','🇱🇰','🇧🇱','🇸🇭','🇰🇳',
      '🇱🇨','🇵🇲','🇻🇨','🇸🇩','🇸🇷','🇸🇪','🇨🇭','🇸🇾','🇹🇼','🇹🇯',
      '🇹🇿','🇹🇭','🇹🇱','🇹🇬','🇹🇰','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲',
      '🇹🇨','🇹🇻','🇻🇮','🇺🇬','🇺🇦','🇦🇪','🇬🇧','🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      '🏴󠁧󠁢󠁳󠁣󠁴󠁿','🏴󠁧󠁢󠁷󠁬󠁳󠁿','🇺🇸','🇺🇾','🇺🇿','🇻🇺','🇻🇦',
      '🇻🇪','🇻🇳','🇼🇫','🇪🇭','🇾🇪','🇿🇲','🇿🇼',
    ],
  },
]

const RECENT_KEY = 'altuvera_chat_recent_emojis'
const RECENT_MAX = 32

const loadRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

const saveRecent = (emoji, existing) => {
  const updated = [emoji, ...existing.filter((e) => e !== emoji)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {}
  return updated
}

// ── Single emoji button ───────────────────────────────────────────────────────
const EmojiBtn = memo(({ emoji, onSelect }) => (
  <button
    onClick={() => onSelect(emoji)}
    type="button"
    title={emoji}
    className="flex items-center justify-center rounded-lg p-1 text-xl leading-none transition-all duration-100 hover:scale-125 hover:bg-green-50 active:scale-110"
  >
    {emoji}
  </button>
))
EmojiBtn.displayName = 'EmojiBtn'

// ── Main picker ───────────────────────────────────────────────────────────────
export default function ChatEmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('smileys')
  const [recentEmojis, setRecentEmojis] = useState(() => loadRecent())
  const searchRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const categories = useMemo(() => {
    return EMOJI_CATEGORIES.map((cat) =>
      cat.id === 'recent' ? { ...cat, emojis: recentEmojis } : cat,
    ).filter((cat) => cat.id !== 'recent' || cat.emojis.length > 0)
  }, [recentEmojis])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) =>
      e.toLowerCase().includes(q),
    ).slice(0, 80)
  }, [search])

  const handleSelect = useCallback((emoji) => {
    setRecentEmojis((prev) => saveRecent(emoji, prev))
    onSelect(emoji)
  }, [onSelect])

  const scrollToCategory = useCallback((catId) => {
    setActiveTab(catId)
    const el = bodyRef.current?.querySelector(`[data-cat="${catId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleBodyScroll = useCallback(() => {
    if (!bodyRef.current || search) return
    const container = bodyRef.current
    for (const cat of categories) {
      const el = container.querySelector(`[data-cat="${cat.id}"]`)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      if (rect.top >= containerRect.top - 20) {
        setActiveTab(cat.id)
        break
      }
    }
  }, [categories, search])

  const displayedCats = search ? [] : categories

  return (
    <div className="flex h-80 w-72 flex-col overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl sm:w-80">
      {/* Search row */}
      <div className="flex shrink-0 items-center gap-2 border-b border-green-100 px-3 py-2.5">
        <div className="relative flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-green-300"
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji…"
            className="w-full rounded-xl border border-green-200 bg-green-50 py-1.5 pl-8 pr-3 text-xs text-green-900 placeholder:text-green-300 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={onClose}
          type="button"
          className="rounded-lg p-1 text-green-300 transition-colors hover:bg-green-50 hover:text-green-600"
        >
          <X size={15} />
        </button>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-green-100 bg-green-50/50 px-2 py-1.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              type="button"
              title={cat.label}
              className={`flex shrink-0 items-center justify-center rounded-lg px-2 py-1 text-base transition-all duration-150 ${
                activeTab === cat.id
                  ? 'bg-green-600 text-white shadow-sm shadow-green-200'
                  : 'text-gray-500 hover:bg-green-100'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji body */}
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bbf7d0 transparent' }}
      >
        {search ? (
          searchResults.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">🔍</span>
              <p className="text-xs text-green-400">No emoji found</p>
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {searchResults.map((emoji) => (
                <EmojiBtn key={emoji} emoji={emoji} onSelect={handleSelect} />
              ))}
            </div>
          )
        ) : (
          displayedCats.map((cat) => (
            <div key={cat.id} data-cat={cat.id} className="mb-3">
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-green-400">
                {cat.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji) => (
                  <EmojiBtn key={emoji} emoji={emoji} onSelect={handleSelect} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}