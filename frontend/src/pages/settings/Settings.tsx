import { Link } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Card, SectionHeading, Spinner } from '../../components/ui'
import { Settings as SettingsIcon, Save, Key, MapPin, Copy, Check, Search, CheckCircle, AlertTriangle, Shield } from 'lucide-react'
import toast from 'react-hot-toast'


function GeofencePostcodeLookup({ currentPostcode, currentRadius, hasCoords, onSave }: {
  currentPostcode: string
  currentRadius: number
  hasCoords: boolean
  onSave: (lat: number, lng: number, radius: number) => void
}) {
  const [postcode, setPostcode] = React.useState(currentPostcode)
  const [radius, setRadius] = React.useState(String(currentRadius || 200))
  const [looking, setLooking] = React.useState(false)
  const [found, setFound] = React.useState(hasCoords)
  const [error, setError] = React.useState('')

  const lookup = async () => {
    const clean = postcode.replace(/\s/g, '').toUpperCase()
    if (!clean) { setError('Please enter a postcode'); return }
    setLooking(true)
    setError('')
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
      const data = await res.json()
      if (data.status !== 200 || !data.result) {
        setError('Postcode not found. Check it and try again.')
        setLooking(false)
        return
      }
      const { latitude, longitude } = data.result
      onSave(latitude, longitude, parseInt(radius) || 200)
      setFound(true)
      toast.success(`Geofence set for ${clean} — staff must be within ${radius}m`)
    } catch {
      setError('Could not look up postcode. Check your connection.')
    } finally { setLooking(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="label">Care home postcode</label>
          <input className="input" placeholder="e.g. SW1A 1AA" value={postcode}
            onChange={e => { setPostcode(e.target.value); setFound(false) }}
            onKeyDown={e => e.key === 'Enter' && lookup()} />
        </div>
        <div className="w-36">
          <label className="label">Radius (metres)</label>
          <input className="input" type="number" value={radius} onChange={e => setRadius(e.target.value)} />
        </div>
        <Button type="button" icon={looking ? undefined : <Search className="w-4 h-4" />} loading={looking} onClick={lookup}>
          Set geofence
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {found && !error && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Geofence active — staff must be within <strong className="mx-1">{radius}m</strong> of <strong>{postcode.toUpperCase()}</strong> to clock in
        </div>
      )}

      {!found && !error && (
        <p className="text-xs text-slate-400">Enter your care home postcode and click Set geofence. We look up the GPS coordinates automatically.</p>
      )}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [home, setHome] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' })
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState<any>({})
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get('/reviews/settings/home').then(res => {
      const h = res.data.data || {}
      setHome(h)
      setForm({
        name: h.name || '',
        address1: h.address1 || '',
        postcode: h.postcode || '',
        phone: h.phone || '',
        email: h.email || '',
        managerName: h.manager_name || h.managerName || '',
        latitude: h.latitude || '',
        longitude: h.longitude || '',
        geofenceRadius: h.geofence_radius || 200,
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const saveHome = async () => {
    setSaving(true)
    try {
      await api.put('/reviews/settings/home', form)
      toast.success('Settings saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.new !== pw.confirm) { toast.error('Passwords do not match'); return }
    if (pw.new.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPw(true)
    try {
      await api.put('/reviews/change-password', { currentPassword: pw.current, newPassword: pw.new })
      toast.success('Password changed successfully')
      setPw({ current: '', new: '', confirm: '' })
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setChangingPw(false) }
  }

  const copyRegCode = () => {
    if (home?.qr_token) {
      navigator.clipboard.writeText(home.qr_token).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Registration code copied')
      })
    }
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <h1 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-purple-600" /> Settings
      </h1>
      <p className="text-slate-400 text-sm mb-7">Manage your care home settings and account</p>

      <div className="space-y-6">
        {/* Resident assignments shortcut */}
        <Link to="/settings/resident-assignments"
          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-slate-800">Resident Assignments</p>
              <p className="text-sm text-slate-500">Assign care staff to residents — staff only see their assigned residents</p>
            </div>
          </div>
          <span className="text-blue-500 text-sm font-medium group-hover:underline">Manage →</span>
        </Link>

        {/* Access rights shortcut */}
        <Link to="/settings/access-rights"
          className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors group">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-800">Access Rights</p>
              <p className="text-sm text-slate-500">Control which sections each role can access in the navigation</p>
            </div>
          </div>
          <span className="text-emerald-500 text-sm font-medium group-hover:underline">Manage →</span>
        </Link>

        {/* Role permissions shortcut */}
        <Link to="/settings/role-permissions"
          className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-semibold text-slate-800">Role Permissions</p>
              <p className="text-sm text-slate-500">Configure what Care Staff, Team Leaders, Managers etc. can do</p>
            </div>
          </div>
          <span className="text-purple-500 text-sm font-medium group-hover:underline">Manage →</span>
        </Link>

        {/* Registration code */}
        <Card>
          <SectionHeading title="Staff registration code" description="Share this code with new staff so they can self-register. Each home has a unique code." />
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <code className="flex-1 text-sm font-mono text-slate-700 break-all">{home?.qr_token || 'Loading...'}</code>
            <Button size="sm" variant="outline" icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyRegCode}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Staff enter this code when creating their account on the login page. Their account will be pending until you activate it.</p>
        </Card>

        {/* Home settings */}
        <Card>
          <SectionHeading title="Care home details" />
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Input label="Home name" value={form.name || ''} onChange={e => set('name', e.target.value)} />
            <Input label="Manager name" value={form.managerName || ''} onChange={e => set('managerName', e.target.value)} />
            <Input label="Address" value={form.address1 || ''} onChange={e => set('address1', e.target.value)} className="md:col-span-2" />
            <Input label="Postcode" value={form.postcode || ''} onChange={e => set('postcode', e.target.value)} />
            <Input label="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="md:col-span-2" />
          </div>

          {/* Geo-lock settings */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-purple-500" />
              <h4 className="font-semibold text-slate-800 text-sm">Clock-in geofence (postcode lock)</h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">Staff can only clock in when they are physically close to the care home. Just enter your postcode and we'll set up the geofence automatically.</p>
            <GeofencePostcodeLookup
              currentPostcode={form.postcode || ''}
              currentRadius={form.geofenceRadius || 200}
              hasCoords={!!(form.latitude && form.longitude)}
              onSave={(lat, lng, radius) => {
                setForm((p: any) => ({ ...p, latitude: lat, longitude: lng, geofenceRadius: radius }))
              }}
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={saveHome}>Save home settings</Button>
          </div>
        </Card>

        {/* Password change */}
        <Card>
          <SectionHeading title="Change password" description="Update your account password" />
          <form onSubmit={changePassword} className="space-y-4">
            <Input label="Current password" type="password" required value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
            <Input label="New password" type="password" required value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} hint="Min. 8 characters" />
            <Input label="Confirm new password" type="password" required value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
            <div className="flex justify-end">
              <Button type="submit" loading={changingPw} icon={<Key className="w-4 h-4" />}>Change password</Button>
            </div>
          </form>
        </Card>

        {/* Account info */}
        <Card>
          <SectionHeading title="Your account" />
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Name</p><p className="text-slate-800 mt-0.5">{user?.firstName} {user?.lastName}</p></div>
            <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email</p><p className="text-slate-800 mt-0.5">{user?.email}</p></div>
            <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Role</p><p className="text-slate-800 mt-0.5 capitalize">{user?.role?.replace(/_/g, ' ')}</p></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
