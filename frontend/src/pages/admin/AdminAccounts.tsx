import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Select, Modal } from '../../components/ui'
import { Shield, UserPlus, Copy, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ALL_ROLES = [
  { value: 'group_admin', label: 'Group Admin — full access to all homes' },
  { value: 'home_manager', label: 'Home Manager — manage a single home' },
  { value: 'senior_carer', label: 'Senior Carer' },
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'auditor', label: 'Auditor — read-only access' },
]

interface AdminUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  home_id: string | null
  status: string
  last_login: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Group Admin',
  home_manager: 'Home Manager',
  senior_carer: 'Senior Carer',
  care_staff: 'Care Staff',
  auditor: 'Auditor',
}

export default function AdminAccounts() {
  const { isRole } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [staffRes, homesRes] = await Promise.all([
        api.get('/staff'),
        homesApi.list(),
      ])
      setAdmins(staffRes.data.data || [])
      setHomes(homesRes.data.data || [])
    } catch { toast.error('Failed to load accounts') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (!isRole('group_admin')) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Group admin access required to manage accounts.</p>
      </div>
    )
  }

  const deactivate = async (admin: AdminUser) => {
    if (!window.confirm(`Deactivate ${admin.first_name} ${admin.last_name}? They will lose access immediately.`)) return
    try {
      await api.put(`/staff/${admin.id}`, { status: 'inactive', isActive: false })
      toast.success('Account deactivated')
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to deactivate') }
  }

  const deleteAccount = async (admin: AdminUser) => {
    if (!window.confirm(`Permanently delete ${admin.first_name} ${admin.last_name}'s account? This cannot be undone.`)) return
    try {
      await api.delete(`/staff/${admin.id}`)
      setAdmins(prev => prev.filter(a => a.id !== admin.id))
      toast.success('Account deleted')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to delete account') }
  }

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!resetOpen) return
    setSaving(true)
    try {
      await api.put(`/staff/${resetOpen.id}/password`, { newPassword })
      toast.success('Password reset successfully')
      setResetOpen(null)
      setNewPassword('')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to reset password') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-600" /> Accounts
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage all staff accounts — create, view, and delete</p>
        </div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
          Create account
        </Button>
      </div>

      {/* Accounts list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading accounts...</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No admin accounts found.</div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${admin.role === 'group_admin' ? 'bg-slate-900 text-white' : admin.role === 'home_manager' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {admin.first_name?.[0]}{admin.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 text-sm">{admin.first_name} {admin.last_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${admin.role === 'group_admin' ? 'bg-slate-900 text-white' : admin.role === 'home_manager' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                    {ROLE_LABELS[admin.role] || admin.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${admin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {admin.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{admin.email}</p>
                {admin.home_id && (
                  <p className="text-xs text-slate-400">{homes.find(h => h.id === admin.home_id)?.name || 'Unknown home'}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  Last login: {admin.last_login ? format(new Date(admin.last_login), 'd MMM yyyy HH:mm') : 'Never'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => { setResetOpen(admin); setNewPassword(''); setShowPwd(false) }}>
                  Reset pwd
                </Button>
                {admin.status === 'active' && (
                  <Button size="sm" variant="outline" icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => deactivate(admin)}>
                    Deactivate
                  </Button>
                )}
                <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => deleteAccount(admin)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create account modal */}
      <AddAdminModal open={addOpen} onClose={() => setAddOpen(false)} homes={homes}
        onCreated={(creds) => { setAddOpen(false); setCreated(creds); load() }} />

      {/* Show credentials */}
      {created && (
        <Modal open={true} onClose={() => setCreated(null)} title="Account created">
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              Share these login credentials with the new account holder securely.
            </div>
            <CredRow label="Email" value={created.email} />
            <CredRow label="Temporary password" value={created.temporaryPassword} bold />
            <p className="text-xs text-slate-400">They should change their password after first login.</p>
            <div className="flex justify-end"><Button onClick={() => setCreated(null)}>Done</Button></div>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetOpen && (
        <Modal open={true} onClose={() => setResetOpen(null)} title={`Reset password — ${resetOpen.first_name} ${resetOpen.last_name}`}>
          <div className="space-y-4">
            <div className="relative">
              <Input label="New password (min. 8 chars)" type={showPwd ? 'text' : 'password'}
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-700">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setResetOpen(null)}>Cancel</Button>
              <Button loading={saving} onClick={resetPassword}>Reset password</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CredRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <span className={`flex-1 text-sm font-mono text-slate-900 ${bold ? 'font-bold' : ''}`}>{value}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied') }}
          className="text-slate-400 hover:text-slate-700"><Copy className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

function AddAdminModal({ open, onClose, homes, onCreated }: {
  open: boolean; onClose: () => void; homes: any[]
  onCreated: (creds: { email: string; temporaryPassword: string }) => void
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'care_staff', homeId: '', password: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) { toast.error('First name, last name and email are required'); return }
    if (['home_manager', 'senior_carer', 'care_staff'].includes(form.role) && !form.homeId) { toast.error('Select a home for this account'); return }
    setLoading(true)
    try {
      const payload: any = { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role }
      if (form.homeId) payload.homeId = form.homeId
      if (form.password) payload.password = form.password
      const res = await api.post('/staff', payload)
      const data = res.data.data
      onCreated({ email: data.email, temporaryPassword: data.temporaryPassword || form.password || '(password set)' })
      setForm({ firstName: '', lastName: '', email: '', role: 'home_manager', homeId: '', password: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create account')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create staff account" size="md">
      <form onSubmit={save} className="space-y-4">
        <Select label="Account type *" value={form.role} onChange={e => set('role', e.target.value)} options={ALL_ROLES} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
        </div>
        <Input label="Email address *" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
        {form.role !== 'group_admin' && form.role !== 'auditor' && (
          <Select label="Assigned home *" value={form.homeId} onChange={e => set('homeId', e.target.value)}
            options={homes.map(h => ({ value: h.id, label: h.name }))} placeholder="Select home..." />
        )}
        <Input label="Password (optional — auto-generated if blank)" type="password" value={form.password}
          onChange={e => set('password', e.target.value)} hint="Leave blank to auto-generate a temporary password" />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<UserPlus className="w-4 h-4" />}>Create account</Button>
        </div>
      </form>
    </Modal>
  )
}
