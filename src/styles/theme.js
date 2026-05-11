export const theme = {
  colors: {
    primary: {
      50:  '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    white: '#ffffff',
    sidebar: {
      bg:       '#052e16',
      hover:    'rgba(255,255,255,0.10)',
      active:   'rgba(255,255,255,0.15)',
      text:     '#bbf7d0',
      textHover:'#ffffff',
    },
  },

  status: {
    pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'  },
    confirmed: { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'   },
    completed: { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500'  },
    cancelled: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'    },
    published: { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500'},
    draft:     { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'  },
    active:    { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500'},
    inactive:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'    },
    new:       { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'   },
    read:      { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'  },
    replied:   { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500'},
    archived:  { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'  },
    approved:  { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500'},
    rejected:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'    },
  },

  priority: {
    low:    { bg: 'bg-slate-100',  text: 'text-slate-600'  },
    normal: { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    high:   { bg: 'bg-orange-100', text: 'text-orange-700' },
    urgent: { bg: 'bg-red-100',    text: 'text-red-700'    },
  },

  shadows: {
    card:   '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
    green:  '0 4px 14px 0 rgba(22,163,74,0.25)',
    modal:  '0 25px 50px -12px rgba(0,0,0,0.25)',
  },

  transitions: {
    default: 'all 0.2s ease',
    slow:    'all 0.3s ease',
    fast:    'all 0.15s ease',
  },
}

export const getStatusStyle = (status) =>
  theme.status[status?.toLowerCase()] || theme.status.draft

export const getPriorityStyle = (priority) =>
  theme.priority[priority?.toLowerCase()] || theme.priority.normal