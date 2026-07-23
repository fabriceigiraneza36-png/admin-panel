// admin/src/pages/Settings.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS v2.2 — Admin Profile, Password & Site Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// Fixes in v2.2:
//  ✓ Removed [toast] from all useEffect / useCallback dependency arrays
//  ✓ Uses toastRef pattern to avoid infinite request loops
//  ✓ Stable effect deps → no more ERR_HTTP2_PROTOCOL_ERROR flooding
//  ✓ All functionality preserved
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react'
import {
  Settings as SettingsIcon, Save, TestTubes, RefreshCw, Lock,
  Globe, Mail, Phone, User as UserIcon, Eye, EyeOff, Check,
  MapPin, AlertCircle, Database, Trash2,
} from 'lucide-react'

import { settingsAPI }     from '@api/settings'
import { authAPI }         from '@api/auth'
import { maintenanceAPI }  from '@api/maintenance'
import { useAuth }         from '@hooks/useAuth'
import { useToast }        from '@hooks/useToast'
import { getErrorMessage } from '@api/client'
import ConfirmDialog       from '@components/common/ConfirmDialog'

/* ─── Inline brand icons (safe from lucide-react changes) ────────────────── */

const FacebookIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
       className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0
             5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43
             c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235
             v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532
             3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const XIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
       className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231
             -5.401 6.231H2.742l7.736-8.857L1.254 2.25H8.08l4.261 5.636
             5.903-5.636Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

/* ─── Constants ────────────────────────────────────────────────────────────── */

const SETTING_FIELDS = [
  {
    key: 'site_name', label: 'Site Name', icon: Globe,
    placeholder: 'Altuvera Travel',
  },
  {
    key: 'support_email', label: 'Support Email', icon: Mail,
    placeholder: 'support@altuvera.com', type: 'email',
  },
  {
    key: 'whatsapp_number', label: 'WhatsApp Number', icon: Phone,
    placeholder: '+250 …', type: 'tel',
  },
  {
    key: 'company_address', label: 'Company Address', icon: MapPin,
    placeholder: 'Kigali, Rwanda',
  },
  {
    key: 'social_facebook', label: 'Facebook URL', icon: FacebookIcon,
    placeholder: 'https://facebook.com/…', type: 'url',
  },
  {
    key: 'social_twitter', label: 'Twitter / X URL', icon: XIcon,
    placeholder: 'https://x.com/…', type: 'url',
  },
  {
    key: 'social_instagram', label: 'Instagram URL', icon: InstagramIcon,
    placeholder: 'https://instagram.com/…', type: 'url',
  },
]

const INIT_PROFILE = { full_name: '', email: '', username: '' }
const INIT_PW      = { currentPassword: '', newPassword: '', confirmPassword: '' }

/* ─── Password strength ────────────────────────────────────────────────────── */

const scorePassword = (pw) => {
  if (!pw) return { score: 0, label: '', color: 'bg-slate-200' }
  let score = 0
  if (pw.length >= 6)           score++
  if (pw.length >= 10)          score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  const bar = [
    { label: 'Too weak', color: 'bg-red-500'     },
    { label: 'Weak',     color: 'bg-orange-500'  },
    { label: 'Fair',     color: 'bg-amber-500'   },
    { label: 'Good',     color: 'bg-lime-500'    },
    { label: 'Strong',   color: 'bg-emerald-500' },
  ]
  return { score, ...(bar[Math.min(score - 1, 4)] || bar[0]) }
}

/* ─── Reusable primitives ──────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <div className="card p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm sm:text-base font-bold text-slate-800
                       flex items-center gap-2">
          <Icon size={18} className="text-primary-600" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, icon: Icon, hint, children }) {
  return (
    <div className="input-group">
      <label className="input-label flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-slate-500" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        className="input pr-10"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                   text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function StrengthMeter({ password }) {
  const { score, label, color } = useMemo(() => scorePassword(password), [password])
  if (!password) return null
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors
              ${n <= score ? color : 'bg-slate-200'}`}
          />
        ))}
      </div>
      {label && (
        <p className="text-[11px] text-slate-500 mt-1">
          Strength: <strong>{label}</strong>
        </p>
      )}
    </div>
  )
}

function SkeletonGrid({ cols = 2, rows = 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function UnsavedBadge() {
  return (
    <span className="text-[11px] text-amber-600 font-semibold
                     inline-flex items-center gap-1">
      <AlertCircle size={11} /> Unsaved changes
    </span>
  )
}

function SaveButton({ saving, disabled, onClick, label = 'Save', icon: Icon = Save }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? (
        <>
          <span className="w-4 h-4 border-2 border-white/40 border-t-white
                           rounded-full animate-spin" />
          Saving…
        </>
      ) : (
        <><Icon size={14} /> {label}</>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const { admin } = useAuth()
  const toast     = useToast()

  // ─── Stable toast ref — prevents useEffect / useCallback re-runs ──────────
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  /* ── Site settings ─────────────────────────────────────────────────────── */
  const [settings,         setSettings]         = useState({})
  const [originalSettings, setOriginalSettings] = useState({})
  const [loading,          setLoading]          = useState(true)
  const [saving,           setSaving]           = useState(false)

  /* ── Profile ───────────────────────────────────────────────────────────── */
  const [profileForm,     setProfileForm]     = useState(INIT_PROFILE)
  const [originalProfile, setOriginalProfile] = useState(INIT_PROFILE)
  const [profileSaving,   setProfileSaving]   = useState(false)

  /* ── Password ──────────────────────────────────────────────────────────── */
  const [pwForm,   setPwForm]   = useState(INIT_PW)
  const [pwSaving, setPwSaving] = useState(false)

  /* ── Email test ────────────────────────────────────────────────────────── */
  const [testingEmail, setTestingEmail] = useState(false)

  /* ── Maintenance ───────────────────────────────────────────────────────── */
  const [categories,   setCategories]   = useState([])
  const [catsLoading,  setCatsLoading]  = useState(false)
  const [purging,      setPurging]      = useState(false)
  const [purgeTarget,  setPurgeTarget]  = useState(null)
  const [purgeConfirm, setPurgeConfirm] = useState('')

  /* ══════════════════════════════════════════════════════════════════════════
     LOAD — empty deps, toastRef used inside to avoid infinite loops
  ══════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await settingsAPI.getAll()

        const normalizeSettings = (payload) => {
          const raw = payload?.data || payload?.settings || {}
          if (Array.isArray(raw)) return raw
          return Object.entries(raw).map(([key, value]) => ({ key, value }))
        }

        const rows = normalizeSettings(data)
        const s    = {}
        rows.forEach((r) => { s[r.key] = r.value })
        setSettings(s)
        setOriginalSettings(s)
      } catch (e) {
        toastRef.current.error(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // ← intentionally empty — toast accessed via ref

  useEffect(() => {
    const loadCats = async () => {
      setCatsLoading(true)
      try {
        const { data } = await maintenanceAPI.listCategories()
        setCategories(data.data || [])
      } catch (e) {
        toastRef.current.error(getErrorMessage(e))
      } finally {
        setCatsLoading(false)
      }
    }
    loadCats()
  }, []) // ← intentionally empty

  /* ── Hydrate profile from auth context ─────────────────────────────────── */

  useEffect(() => {
    if (!admin) return
    const p = {
      full_name: admin.fullName || admin.full_name || '',
      email:     admin.email    || '',
      username:  admin.username || '',
    }
    setProfileForm(p)
    setOriginalProfile(p)
  }, [admin])

  /* ══════════════════════════════════════════════════════════════════════════
     DERIVED STATE
  ══════════════════════════════════════════════════════════════════════════ */

  const settingsDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  )

  const profileDirty = useMemo(
    () => JSON.stringify(profileForm) !== JSON.stringify(originalProfile),
    [profileForm, originalProfile],
  )

  const pwMatch =
    pwForm.newPassword.length > 0 &&
    pwForm.newPassword === pwForm.confirmPassword

  const pwValid =
    !!pwForm.currentPassword &&
    pwForm.newPassword.length >= 6 &&
    pwMatch

  /* ══════════════════════════════════════════════════════════════════════════
     HANDLERS
  ══════════════════════════════════════════════════════════════════════════ */

  const updateSetting = useCallback(
    (k, v) => setSettings((p) => ({ ...p, [k]: v })),
    [],
  )

  const updateProfile = useCallback(
    (k, v) => setProfileForm((p) => ({ ...p, [k]: v })),
    [],
  )

  const updatePw = useCallback(
    (k, v) => setPwForm((p) => ({ ...p, [k]: v })),
    [],
  )

  /* ── Save site settings ─────────────────────────────────────────────────── */

  const handleSaveSettings = useCallback(async () => {
    setSaving(true)
    try {
      await settingsAPI.update(settings)
      setOriginalSettings(settings)
      toastRef.current.success('Settings saved successfully')
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [settings])

  /* ── Update profile ─────────────────────────────────────────────────────── */

  const handleUpdateProfile = useCallback(async () => {
    if (!profileForm.full_name.trim()) {
      return toastRef.current.error('Full name is required')
    }
    if (!profileForm.email.trim()) {
      return toastRef.current.error('Email is required')
    }

    setProfileSaving(true)
    try {
      await authAPI.updateProfile(profileForm)
      setOriginalProfile(profileForm)
      toastRef.current.success('Profile updated successfully')
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setProfileSaving(false)
    }
  }, [profileForm])

  /* ── Change password ────────────────────────────────────────────────────── */

  const handleChangePassword = useCallback(async () => {
    if (!pwForm.currentPassword) {
      return toastRef.current.error('Current password is required')
    }
    if (pwForm.newPassword.length < 6) {
      return toastRef.current.error('New password must be at least 6 characters')
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toastRef.current.error('New passwords do not match')
    }

    setPwSaving(true)
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      })
      toastRef.current.success('Password changed successfully')
      setPwForm(INIT_PW)
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setPwSaving(false)
    }
  }, [pwForm])

  /* ── Test email ─────────────────────────────────────────────────────────── */

  const handleTestEmail = useCallback(async () => {
    setTestingEmail(true)
    try {
      await settingsAPI.testEmail()
      toastRef.current.success('Test email sent — check your inbox')
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setTestingEmail(false)
    }
  }, [])

  /* ── Maintenance ────────────────────────────────────────────────────────── */

  const refreshCategories = useCallback(async () => {
    setCatsLoading(true)
    try {
      const { data } = await maintenanceAPI.listCategories()
      setCategories(data.data || [])
      toastRef.current.success('Counts refreshed')
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setCatsLoading(false)
    }
  }, [])

  const openPurge = useCallback((cat) => {
    setPurgeTarget(cat)
    setPurgeConfirm('')
  }, [])

  const closePurge = useCallback(() => {
    setPurgeTarget(null)
    setPurgeConfirm('')
  }, [])

  const handlePurge = useCallback(async () => {
    if (!purgeTarget || purgeConfirm !== 'DELETE_ALL') return
    setPurging(true)
    try {
      const { data } = await maintenanceAPI.purgeCategory(purgeTarget, 'DELETE_ALL')
      toastRef.current.success(data.message || 'Category purged')
      closePurge()
      await refreshCategories()
    } catch (e) {
      toastRef.current.error(getErrorMessage(e))
    } finally {
      setPurging(false)
    }
  }, [purgeTarget, purgeConfirm, closePurge, refreshCategories])

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-5 sm:space-y-6 page-enter max-w-4xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <SettingsIcon size={28} className="text-primary-600" />
            Settings
          </h1>
          <p className="page-subtitle">
            Manage your admin account and site-wide configuration.
          </p>
        </div>
      </div>

      {/* ══ PROFILE ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={UserIcon}
        title="Admin Profile"
        action={profileDirty && <UnsavedBadge />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" icon={UserIcon}>
            <input
              className="input"
              value={profileForm.full_name}
              onChange={(e) => updateProfile('full_name', e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </Field>

          <Field label="Username">
            <input
              className="input"
              value={profileForm.username}
              onChange={(e) => updateProfile('username', e.target.value)}
              placeholder="jane"
              autoComplete="username"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Email" icon={Mail}>
              <input
                className="input"
                type="email"
                value={profileForm.email}
                onChange={(e) => updateProfile('email', e.target.value)}
                placeholder="jane@altuvera.com"
                autoComplete="email"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <SaveButton
            saving={profileSaving}
            disabled={!profileDirty}
            onClick={handleUpdateProfile}
            label="Save Profile"
          />
        </div>
      </SectionCard>

      {/* ══ CHANGE PASSWORD ════════════════════════════════════════════════ */}
      <SectionCard icon={Lock} title="Change Password">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Current Password">
            <PasswordInput
              value={pwForm.currentPassword}
              onChange={(e) => updatePw('currentPassword', e.target.value)}
              placeholder="Enter current"
              autoComplete="current-password"
            />
          </Field>

          <Field label="New Password" hint="Min. 6 characters">
            <PasswordInput
              value={pwForm.newPassword}
              onChange={(e) => updatePw('newPassword', e.target.value)}
              placeholder="Enter new"
              autoComplete="new-password"
            />
            <StrengthMeter password={pwForm.newPassword} />
          </Field>

          <Field label="Confirm Password">
            <PasswordInput
              value={pwForm.confirmPassword}
              onChange={(e) => updatePw('confirmPassword', e.target.value)}
              placeholder="Repeat new"
              autoComplete="new-password"
            />
            {pwForm.confirmPassword && (
              <p className={`text-[11px] mt-1 inline-flex items-center gap-1
                ${pwMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                {pwMatch
                  ? <><Check size={11} /> Passwords match</>
                  : 'Passwords do not match'}
              </p>
            )}
          </Field>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <SaveButton
            saving={pwSaving}
            disabled={!pwValid}
            onClick={handleChangePassword}
            label="Change Password"
            icon={Lock}
          />
        </div>
      </SectionCard>

      {/* ══ SITE SETTINGS ══════════════════════════════════════════════════ */}
      <SectionCard
        icon={Globe}
        title="Site Settings"
        action={
          <div className="flex items-center gap-2">
            {settingsDirty && <UnsavedBadge />}
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="btn-ghost btn-sm"
            >
              <TestTubes
                size={14}
                className={testingEmail ? 'animate-pulse' : ''}
              />
              <span className="hidden sm:inline">
                {testingEmail ? 'Sending…' : 'Test Email'}
              </span>
            </button>
          </div>
        }
      >
        {loading ? (
          <SkeletonGrid cols={2} rows={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SETTING_FIELDS.map(({ key, label, icon: Icon, placeholder, type }) => (
              <Field key={key} label={label} icon={Icon}>
                <input
                  className="input"
                  type={type || 'text'}
                  value={settings[key] || ''}
                  onChange={(e) => updateSetting(key, e.target.value)}
                  placeholder={placeholder}
                />
              </Field>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <SaveButton
            saving={saving}
            disabled={!settingsDirty || loading}
            onClick={handleSaveSettings}
            label="Save Settings"
          />
        </div>
      </SectionCard>

      {/* ══ DATA MANAGEMENT ════════════════════════════════════════════════ */}
      <SectionCard
        icon={Database}
        title="Data Management"
        action={
          <button
            onClick={refreshCategories}
            disabled={catsLoading}
            className="btn-ghost btn-sm"
          >
            <RefreshCw
              size={14}
              className={catsLoading ? 'animate-spin' : ''}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      >
        <p className="text-xs text-slate-500 mb-4">
          Purging a category permanently deletes{' '}
          <strong>all records</strong> in every associated table.{' '}
          This action is <strong>irreversible</strong>.
        </p>

        {catsLoading ? (
          <SkeletonGrid cols={3} rows={2} />
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No categories found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="border border-slate-200 rounded-xl p-4 space-y-3
                           hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 capitalize">
                    {cat.category}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500
                                   bg-slate-100 px-2 py-0.5 rounded-full">
                    {cat.totalRecords} records
                  </span>
                </div>

                <div className="space-y-1">
                  {cat.tables.map((t) => (
                    <div
                      key={t.table}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600 font-mono">{t.table}</span>
                      <span className="text-slate-400">{t.count}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => openPurge(cat.category)}
                  disabled={cat.totalRecords === 0}
                  className="w-full btn-danger disabled:opacity-40
                             disabled:cursor-not-allowed text-xs py-2"
                >
                  <Trash2 size={12} />
                  Delete All
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Purge confirm dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!purgeTarget}
        onClose={closePurge}
        onConfirm={handlePurge}
        type="delete"
        title={`Purge "${purgeTarget || ''}"?`}
        description={
          purgeTarget
            ? `This will permanently delete ALL records in every table under
               "${purgeTarget}". This cannot be undone.`
            : ''
        }
        confirmLabel="Purge All"
        loading={purging}
      />
    </div>
  )
}