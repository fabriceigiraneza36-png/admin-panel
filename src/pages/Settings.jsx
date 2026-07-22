// admin/src/pages/Settings.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS v2.0 — Admin Profile, Password & Site Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Expanded from cramped one-liners to readable, maintainable code
//  ✓ Extracted SectionCard + Field primitives
//  ✓ Real-time password strength meter
//  ✓ Password confirmation validation on-the-fly
//  ✓ Show/hide password toggles
//  ✓ Dirty-state tracking (Save button disabled if nothing changed)
//  ✓ Fully responsive (mobile-first)
//  ✓ Better error handling with fallback chains
//  ✓ Accessibility (aria-*, autocomplete hints)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Settings as SettingsIcon, Save, TestTubes, RefreshCw, Lock,
  Globe, Mail, Phone, User as UserIcon, Eye, EyeOff, Check,
  Facebook, Twitter, Instagram, MapPin, AlertCircle,
} from 'lucide-react'

import { settingsAPI }     from '@api/settings'
import { authAPI }         from '@api/auth'
import { useAuth }         from '@hooks/useAuth'
import { useToast }        from '@hooks/useToast'
import { getErrorMessage } from '@api/client'

/* ─── Constants ────────────────────────────────────────────────────────────── */

const SETTING_FIELDS = [
  { key: 'site_name',        label: 'Site Name',        icon: Globe,     placeholder: 'Altuvera Travel'    },
  { key: 'support_email',    label: 'Support Email',    icon: Mail,      placeholder: 'support@altuvera.com', type: 'email' },
  { key: 'whatsapp_number',  label: 'WhatsApp Number',  icon: Phone,     placeholder: '+250 …',            type: 'tel'   },
  { key: 'company_address',  label: 'Company Address',  icon: MapPin,    placeholder: 'Kigali, Rwanda'     },
  { key: 'social_facebook',  label: 'Facebook URL',     icon: Facebook,  placeholder: 'https://facebook.com/…', type: 'url'   },
  { key: 'social_twitter',   label: 'Twitter / X URL',  icon: Twitter,   placeholder: 'https://x.com/…',       type: 'url'   },
  { key: 'social_instagram', label: 'Instagram URL',    icon: Instagram, placeholder: 'https://instagram.com/…', type: 'url' },
]

/* ─── Password strength ────────────────────────────────────────────────────── */

const scorePassword = (pw) => {
  if (!pw) return { score: 0, label: '', color: 'bg-slate-200' }
  let score = 0
  if (pw.length >= 6)             score++
  if (pw.length >= 10)            score++
  if (/[A-Z]/.test(pw))           score++
  if (/[0-9]/.test(pw))           score++
  if (/[^A-Za-z0-9]/.test(pw))    score++
  const bar = [
    { label: 'Too weak', color: 'bg-red-500' },
    { label: 'Weak',     color: 'bg-orange-500' },
    { label: 'Fair',     color: 'bg-amber-500' },
    { label: 'Good',     color: 'bg-lime-500' },
    { label: 'Strong',   color: 'bg-emerald-500' },
  ]
  return { score, ...bar[Math.min(score - 1, 4)] || bar[0] }
}

/* ─── Reusable primitives ──────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <div className="card p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
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
        <p className="text-[11px] text-slate-500 mt-1">Strength: <strong>{label}</strong></p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

const INIT_PROFILE = { full_name: '', email: '', username: '' }
const INIT_PW      = { currentPassword: '', newPassword: '', confirmPassword: '' }

export default function SettingsPage() {
  const { admin } = useAuth()
  const toast     = useToast()

  const [settings,        setSettings]        = useState({})
  const [originalSettings, setOriginalSettings] = useState({})
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)

  const [profileForm,     setProfileForm]     = useState(INIT_PROFILE)
  const [originalProfile, setOriginalProfile] = useState(INIT_PROFILE)
  const [profileSaving,   setProfileSaving]   = useState(false)

  const [pwForm,          setPwForm]          = useState(INIT_PW)
  const [pwSaving,        setPwSaving]        = useState(false)

  const [testingEmail,    setTestingEmail]    = useState(false)

  /* ── Load ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await settingsAPI.getAll()
        const s = {}
        ;(data.data || data.settings || []).forEach((r) => { s[r.key] = r.value })
        setSettings(s)
        setOriginalSettings(s)
      } catch (e) {
        toast.error(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  useEffect(() => {
    if (admin) {
      const p = {
        full_name: admin.fullName || admin.full_name || '',
        email:     admin.email    || '',
        username:  admin.username || '',
      }
      setProfileForm(p)
      setOriginalProfile(p)
    }
  }, [admin])

  /* ── Dirty tracking ────────────────────────────────────────────────────── */

  const settingsDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings]
  )

  const profileDirty = useMemo(
    () => JSON.stringify(profileForm) !== JSON.stringify(originalProfile),
    [profileForm, originalProfile]
  )

  const pwStrength = useMemo(() => scorePassword(pwForm.newPassword), [pwForm.newPassword])
  const pwMatch = pwForm.newPassword && pwForm.newPassword === pwForm.confirmPassword
  const pwValid =
    !!pwForm.currentPassword &&
    !!pwForm.newPassword &&
    pwForm.newPassword.length >= 6 &&
    pwMatch

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const updateSetting = useCallback(
    (k, v) => setSettings((p) => ({ ...p, [k]: v })),
    []
  )

  const updateProfile = useCallback(
    (k, v) => setProfileForm((p) => ({ ...p, [k]: v })),
    []
  )

  const updatePw = useCallback(
    (k, v) => setPwForm((p) => ({ ...p, [k]: v })),
    []
  )

  const handleSaveSettings = useCallback(async () => {
    setSaving(true)
    try {
      await settingsAPI.update(settings)
      setOriginalSettings(settings)
      toast.success('Settings saved successfully')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [settings, toast])

  const handleUpdateProfile = useCallback(async () => {
    if (!profileForm.full_name.trim()) return toast.error('Full name is required')
    if (!profileForm.email.trim())     return toast.error('Email is required')
    setProfileSaving(true)
    try {
      await authAPI.updateProfile(profileForm)
      setOriginalProfile(profileForm)
      toast.success('Profile updated successfully')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setProfileSaving(false)
    }
  }, [profileForm, toast])

  const handleChangePassword = useCallback(async () => {
    if (!pwForm.currentPassword) return toast.error('Current password is required')
    if (pwForm.newPassword.length < 6) return toast.error('New password must be at least 6 characters')
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('New passwords do not match')

    setPwSaving(true)
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      })
      toast.success('Password changed successfully')
      setPwForm(INIT_PW)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setPwSaving(false)
    }
  }, [pwForm, toast])

  const handleTestEmail = useCallback(async () => {
    setTestingEmail(true)
    try {
      await settingsAPI.testEmail()
      toast.success('Test email sent — check your inbox')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setTestingEmail(false)
    }
  }, [toast])

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 sm:space-y-6 page-enter max-w-4xl mx-auto">
      {/* Header */}
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

      {/* ══════════ PROFILE ══════════ */}
      <SectionCard
        icon={UserIcon}
        title="Admin Profile"
        action={profileDirty && (
          <span className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1">
            <AlertCircle size={11} /> Unsaved changes
          </span>
        )}
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
          <button
            onClick={handleUpdateProfile}
            disabled={profileSaving || !profileDirty}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                 rounded-full animate-spin" /> Saving…
              </>
            ) : (
              <><Save size={14} /> Save Profile</>
            )}
          </button>
        </div>
      </SectionCard>

      {/* ══════════ CHANGE PASSWORD ══════════ */}
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
                {pwMatch ? <><Check size={11} /> Passwords match</> : 'Passwords do not match'}
              </p>
            )}
          </Field>
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !pwValid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                 rounded-full animate-spin" /> Changing…
              </>
            ) : (
              <><Lock size={14} /> Change Password</>
            )}
          </button>
        </div>
      </SectionCard>

      {/* ══════════ SITE SETTINGS ══════════ */}
      <SectionCard
        icon={Globe}
        title="Site Settings"
        action={
          <div className="flex items-center gap-2">
            {settingsDirty && (
              <span className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1">
                <AlertCircle size={11} /> Unsaved
              </span>
            )}
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="btn-ghost btn-sm"
            >
              <TestTubes size={14} className={testingEmail ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">
                {testingEmail ? 'Sending…' : 'Test Email'}
              </span>
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
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
          <button
            onClick={handleSaveSettings}
            disabled={saving || !settingsDirty || loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                 rounded-full animate-spin" /> Saving…
              </>
            ) : (
              <><Save size={14} /> Save Settings</>
            )}
          </button>
        </div>
      </SectionCard>
    </div>
  )
}