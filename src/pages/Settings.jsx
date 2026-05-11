import React, { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, TestTubes, RefreshCw, Lock, Globe, Mail, Phone } from 'lucide-react'
import { settingsAPI }       from '@api/settings'
import { authAPI }           from '@api/auth'
import { useAuth }           from '@hooks/useAuth'
import { useToast }          from '@hooks/useToast'
import { getErrorMessage }   from '@api/client'

export default function SettingsPage() {
  const { admin } = useAuth()
  const toast = useToast()
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', username: '' })
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try { const { data } = await settingsAPI.getAll()
        const s = {}; (data.data || data.settings || []).forEach((r) => { s[r.key] = r.value })
        setSettings(s) }
      catch {} finally { setLoading(false) }
    }
    loadSettings()
    if (admin) setProfileForm({ full_name: admin.fullName || admin.full_name || '', email: admin.email || '', username: admin.username || '' })
  }, [admin])

  const updateSetting = (k, v) => setSettings((p) => ({ ...p, [k]: v }))

  const handleSaveSettings = async () => {
    setSaving(true)
    try { await settingsAPI.update(settings); toast.success('Settings saved') }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill all fields')
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 6) return toast.error('Password must be 6+ characters')
    setPwSaving(true)
    try { await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password changed'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setPwSaving(false) }
  }

  const handleUpdateProfile = async () => {
    setProfileSaving(true)
    try { await authAPI.updateProfile(profileForm); toast.success('Profile updated') }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setProfileSaving(false) }
  }

  const handleTestEmail = async () => {
    try { await settingsAPI.testEmail(); toast.success('Test email sent') }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const settingFields = [
    { key: 'site_name', label: 'Site Name', icon: Globe, placeholder: 'Altuvera Travel' },
    { key: 'support_email', label: 'Support Email', icon: Mail, placeholder: 'support@altuvera.com' },
    { key: 'whatsapp_number', label: 'WhatsApp Number', icon: Phone, placeholder: '+250...' },
    { key: 'company_address', label: 'Company Address', icon: Globe, placeholder: 'Address...' },
    { key: 'social_facebook', label: 'Facebook URL', icon: Globe },
    { key: 'social_twitter', label: 'Twitter URL', icon: Globe },
    { key: 'social_instagram', label: 'Instagram URL', icon: Globe },
  ]

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><SettingsIcon size={28} className="text-primary-600" /> Settings</h1><p className="page-subtitle">Manage your admin account and site settings</p></div></div>

      {/* Profile */}
      <div className="card p-6 space-y-5">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><SettingsIcon size={18} className="text-primary-600" /> Admin Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="input-group"><label className="input-label">Full Name</label><input className="input" value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} /></div>
          <div className="input-group"><label className="input-label">Username</label><input className="input" value={profileForm.username} onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))} /></div>
          <div className="input-group sm:col-span-2"><label className="input-label">Email</label><input className="input" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end"><button onClick={handleUpdateProfile} disabled={profileSaving} className="btn-primary">{profileSaving ? 'Saving…' : <><Save size={14} /> Save Profile</>}</button></div>
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-5">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Lock size={18} className="text-primary-600" /> Change Password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="input-group"><label className="input-label">Current Password</label><input className="input" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} /></div>
          <div className="input-group"><label className="input-label">New Password</label><input className="input" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} /></div>
          <div className="input-group"><label className="input-label">Confirm</label><input className="input" type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end"><button onClick={handleChangePassword} disabled={pwSaving} className="btn-primary">{pwSaving ? 'Changing…' : <><Lock size={14} /> Change Password</>}</button></div>
      </div>

      {/* Site settings */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Globe size={18} className="text-primary-600" /> Site Settings</h3>
          <button onClick={handleTestEmail} className="btn-ghost btn-sm"><TestTubes size={14} /> Test Email</button>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-10 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {settingFields.map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="input-group">
                <label className="input-label flex items-center gap-1.5"><Icon size={12} /> {label}</label>
                <input className="input" value={settings[key] || ''} onChange={(e) => updateSetting(key, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end"><button onClick={handleSaveSettings} disabled={saving} className="btn-primary">{saving ? 'Saving…' : <><Save size={14} /> Save Settings</>}</button></div>
      </div>
    </div>
  )
}