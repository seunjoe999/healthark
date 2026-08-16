import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Select, Modal } from '../../components/ui'
import { Shield, UserPlus, Copy, Trash2, RefreshCw, Eye, EyeOff, Sliders, Briefcase, Check, X, Edit2, Plus, ChevronDown, ChevronUp, Mail, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const RECRUIT_STATUSES = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-amber-100 text-amber-700' },
  { value: 'interviewed', label: 'Interviewed', color: 'bg-purple-100 text-purple-700' },
  { value: 'offer_made', label: 'Offer Made', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'hired', label: 'Hired', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-rose-100 text-rose-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-slate-100 text-slate-600' },
]

function RecruitmentSection({ homes }: { homes: any[] }) {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHome, setSelectedHome] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [emailTarget, setEmailTarget] = useState<any>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setSelectedHome(user?.homeId || homes[0]?.id || '')
  }, [homes, user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    api.get('/recruitment', { params: { homeId: selectedHome } })
      .then(res => setCandidates(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedHome])

  const reload = () => {
    if (!selectedHome) return
    api.get('/recruitment', { params: { homeId: selectedHome } })
      .then(res => setCandidates(res.data.data || []))
      .catch(() => {})
  }

  const deleteCand = async (id: string) => {
    if (!window.confirm('Remove this candidate?')) return
    try {
      await api.delete(`/recruitment/${id}`)
      setCandidates(prev => prev.filter(c => c.id !== id))
      toast.success('Removed')
    } catch { toast.error('Failed') }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/recruitment/${id}`, { ...candidates.find(c => c.id === id), status })
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    } catch { toast.error('Failed') }
  }

  const active = candidates.filter(c => !['hired', 'rejected', 'withdrawn'].includes(c.status))
  const archived = candidates.filter(c => ['hired', 'rejected', 'withdrawn'].includes(c.status))

  return (
    <div className="mb-8 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-900">Recruitment Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">{active.length} active · {archived.length} archived</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditing(null); setAddOpen(true) }}>Add candidate</Button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading...</div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No candidates yet — add your first applicant above</p>
            </div>
          ) : (
            <>
              {active.map((c: any) => {
                const statusInfo = RECRUIT_STATUSES.find(s => s.value === c.status) || RECRUIT_STATUSES[0]
                return (
                  <div key={c.id} className="flex items-start gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{c.first_name} {c.last_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        {c.dbs_check && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">DBS: {c.dbs_check}</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {c.position}
                        {c.applied_date && ` · Applied ${format(parseISO(c.applied_date), 'd MMM yyyy')}`}
                        {c.interview_date && ` · Interview ${format(parseISO(c.interview_date), 'd MMM yyyy')}`}
                      </p>
                      {c.email && <p className="text-xs text-slate-400">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>}
                      {c.notes && <p className="text-xs text-slate-400 italic mt-0.5 truncate">{c.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
                        {RECRUIT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      {c.email && (
                        <button onClick={() => setEmailTarget(c)} title="Send email" className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setEditing(c); setAddOpen(true) }} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCand(c.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {archived.length > 0 && (
                <div className="px-5 py-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Archived</p>
                  {archived.map((c: any) => {
                    const statusInfo = RECRUIT_STATUSES.find(s => s.value === c.status) || RECRUIT_STATUSES[0]
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-1.5">
                        <p className="text-sm text-slate-500 flex-1">{c.first_name} {c.last_name} — {c.position}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        <button onClick={() => deleteCand(c.id)} className="p-1 text-slate-300 hover:text-rose-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <RecruitModal open={addOpen} onClose={() => { setAddOpen(false); setEditing(null) }} homeId={selectedHome}
        editing={editing}
        onSaved={() => { setAddOpen(false); setEditing(null); reload(); toast.success(editing ? 'Updated' : 'Candidate added') }} />
      <EmailModal candidate={emailTarget} onClose={() => setEmailTarget(null)} />
    </div>
  )
}

const EMAIL_TYPES = [
  { value: 'application_received', label: 'Application Received', desc: 'Acknowledge that you received their application' },
  { value: 'interview_invite', label: 'Interview Invitation', desc: 'Invite them for an interview with date/time/location' },
  { value: 'offer_letter', label: 'Job Offer', desc: 'Send a formal offer letter' },
  { value: 'rejection', label: 'Rejection', desc: 'Let them know they were unsuccessful' },
  { value: 'reference_request', label: 'Reference Request', desc: 'Email a referee on their behalf' },
  { value: 'custom', label: 'Custom Message', desc: 'Write your own message' },
]

function EmailModal({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const [type, setType] = useState('application_received')
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    toEmail: '', interviewDate: '', interviewTime: '', location: '',
    startDate: '', salary: '', refereeName: '', refereeEmail: '',
    contactName: '', contactEmail: '', subject: '', message: '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (candidate) {
      setType('application_received')
      setForm(p => ({ ...p, toEmail: candidate.email || '' }))
    }
  }, [candidate])

  const send = async () => {
    if (!form.toEmail && type !== 'reference_request') { toast.error('Email address required'); return }
    setSending(true)
    try {
      const payload: any = { type, ...form }
      const res = await api.post(`/recruitment/${candidate.id}/email`, payload)
      if (res.data.success) { toast.success(res.data.message || 'Email sent'); onClose() }
      else toast.error(res.data.error || 'Failed to send')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send email')
    } finally { setSending(false) }
  }

  if (!candidate) return null

  return (
    <Modal open={!!candidate} onClose={onClose} title={`Email ${candidate.first_name} ${candidate.last_name}`}>
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center gap-2">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>Emails are sent from your configured SMTP account. Make sure SMTP is set up in environment variables.</span>
        </div>

        <div>
          <label className="label">Email type</label>
          <div className="grid grid-cols-1 gap-2">
            {EMAIL_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${type === t.value ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <p className={`font-medium text-sm ${type === t.value ? 'text-purple-700' : 'text-slate-800'}`}>{t.label}</p>
                <p className="text-xs text-slate-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {type !== 'reference_request' && (
          <Input label="Send to (email)" type="email" value={form.toEmail} onChange={e => set('toEmail', e.target.value)} />
        )}

        {type === 'interview_invite' && <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Interview date" type="date" value={form.interviewDate} onChange={e => set('interviewDate', e.target.value)} />
            <Input label="Interview time" placeholder="e.g. 10:00 AM" value={form.interviewTime} onChange={e => set('interviewTime', e.target.value)} />
          </div>
          <Input label="Location / address" value={form.location} onChange={e => set('location', e.target.value)} placeholder="123 Care Home Road, London" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Your name" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
            <Input label="Your email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
          </div>
        </>}

        {type === 'offer_letter' && <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            <Input label="Salary (optional)" placeholder="e.g. £24,000 p/a" value={form.salary} onChange={e => set('salary', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Your name" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
            <Input label="Your email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
          </div>
        </>}

        {type === 'reference_request' && <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Referee name" value={form.refereeName} onChange={e => set('refereeName', e.target.value)} placeholder="Mr John Smith" />
            <Input label="Referee email *" type="email" value={form.refereeEmail} onChange={e => set('refereeEmail', e.target.value)} />
          </div>
        </>}

        {type === 'custom' && <>
          <Input label="Subject" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Message from our recruitment team" />
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={5} value={form.message} onChange={e => set('message', e.target.value)}
              placeholder="Type your message here..." />
          </div>
        </>}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button icon={<Send className="w-4 h-4" />} loading={sending} onClick={send}>Send Email</Button>
        </div>
      </div>
    </Modal>
  )
}

function RecruitModal({ open, onClose, homeId, editing, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; editing: any; onSaved: () => void
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '', appliedDate: format(new Date(), 'yyyy-MM-dd'), status: 'applied', interviewDate: '', notes: '', dbsCheck: '', referenceCheck: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          firstName: editing.first_name || '',
          lastName: editing.last_name || '',
          email: editing.email || '',
          phone: editing.phone || '',
          position: editing.position || '',
          appliedDate: editing.applied_date || format(new Date(), 'yyyy-MM-dd'),
          status: editing.status || 'applied',
          interviewDate: editing.interview_date || '',
          notes: editing.notes || '',
          dbsCheck: editing.dbs_check || '',
          referenceCheck: editing.reference_check || '',
        })
      } else {
        setForm({ firstName: '', lastName: '', email: '', phone: '', position: '', appliedDate: format(new Date(), 'yyyy-MM-dd'), status: 'applied', interviewDate: '', notes: '', dbsCheck: '', referenceCheck: '' })
      }
    }
  }, [open, editing])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        await api.put(`/recruitment/${editing.id}`, { ...form, homeId })
      } else {
        await api.post('/recruitment', { ...form, homeId })
      }
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit candidate' : 'Add candidate'}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
        </div>
        <Input label="Position applied for *" required value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. Care Staff, Senior Carer" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Applied date" type="date" value={form.appliedDate} onChange={e => set('appliedDate', e.target.value)} />
          <Input label="Interview date" type="date" value={form.interviewDate} onChange={e => set('interviewDate', e.target.value)} />
        </div>
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={RECRUIT_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">DBS Check</label>
            <select className="input" value={form.dbsCheck} onChange={e => set('dbsCheck', e.target.value)}>
              <option value="">Not checked</option>
              <option value="pending">Pending</option>
              <option value="clear">Clear</option>
              <option value="disclosed">Disclosed</option>
            </select>
          </div>
          <div>
            <label className="label">References</label>
            <select className="input" value={form.referenceCheck} onChange={e => set('referenceCheck', e.target.value)}>
              <option value="">Not requested</option>
              <option value="requested">Requested</option>
              <option value="received">Received</option>
              <option value="satisfactory">Satisfactory</option>
              <option value="unsatisfactory">Unsatisfactory</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interview notes, observations..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{editing ? 'Save changes' : 'Add candidate'}</Button>
        </div>
      </form>
    </Modal>
  )
}

const ALL_ROLES = [
  { value: 'group_admin', label: 'Group Admin — full access to all homes' },
  { value: 'admin', label: 'Admin' },
  { value: 'home_manager', label: 'Home Manager — manage a single home' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'senior_carer', label: 'Senior Carer / Supervisor' },
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
  feature_flags?: Record<string, boolean>
  has_pin?: boolean
}

const ALL_FEATURES = [
  { key: 'dashboard',           label: 'Dashboard' },
  { key: 'messages',            label: 'Inbox / Messages' },
  { key: 'noticeboard',         label: 'Noticeboard' },
  { key: 'service_users',       label: 'Service Users' },
  { key: 'daily_records',       label: 'Daily Records' },
  { key: 'diary',               label: 'Resident Diary' },
  { key: 'professional_visits', label: 'Professional Visits' },
  { key: 'mar',                 label: 'Medication Administration Record' },
  { key: 'medication_stock',    label: 'Medication Stock' },
  { key: 'care_plans',          label: 'Support Plans' },
  { key: 'safeguarding',        label: 'Safeguarding' },
  { key: 'incidents',           label: 'Incidents' },
  { key: 'tasks',               label: 'Tasks' },
  { key: 'rota',                label: 'Rota' },
  { key: 'timesheets',          label: 'Timesheets' },
  { key: 'holidays',            label: 'Holidays' },
  { key: 'training',            label: 'Training' },
  { key: 'staff',               label: 'Staff' },
  { key: 'dbs',                 label: 'DBS & Compliance' },
  { key: 'maintenance',         label: 'Maintenance' },
  { key: 'clockin',             label: 'Clock-In' },
  { key: 'calendar',            label: 'Calendar' },
  { key: 'alerts',              label: 'Alerts' },
  { key: 'compliance',          label: 'Compliance' },
  { key: 'bath_chart',          label: 'Bath Chart' },
  { key: 'observations',        label: 'Observations' },
  { key: 'seizures',            label: 'Seizure Log' },
  { key: 'bowel_chart',         label: 'Bowel Chart' },
  { key: 'medicine_risk',       label: 'Medication Risk' },
  { key: 'performance',         label: 'Performance' },
  { key: 'outcomes',            label: 'Care Outcomes' },
  { key: 'reviews',             label: 'Reviews' },
  { key: 'assessments',         label: 'Audit' },
  { key: 'quality',             label: 'Quality & QA' },
  { key: 'handover',            label: 'Handover' },
  { key: 'audits',              label: 'Audit Reports' },
  { key: 'audit_trail',         label: 'Audit Trail' },
  { key: 'reports',             label: 'Reports' },
  { key: 'policies',            label: 'Policies' },
  { key: 'ppe',                 label: 'PPE Stock' },
  { key: 'family_portal',       label: 'Family Portal' },
]

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Group Admin',
  admin: 'Admin',
  home_manager: 'Home Manager',
  deputy_manager: 'Deputy Manager',
  team_leader: 'Team Leader',
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
  const [pinOpen, setPinOpen] = useState<AdminUser | null>(null)
  const [newPin, setNewPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null)
  const [accessModal, setAccessModal] = useState<AdminUser | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [staffRes, homesRes] = await Promise.allSettled([
        api.get('/staff'),
        homesApi.list(),
      ])
      if (staffRes.status === 'fulfilled') setAdmins(staffRes.value.data.data || [])
      else toast.error('Failed to load staff accounts')
      if (homesRes.status === 'fulfilled') setHomes(homesRes.value.data.data || [])
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

  const savePin = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^[0-9]+$/.test(newPin)) { toast.error('PIN must be 4-8 digits'); return }
    if (!pinOpen) return
    setSavingPin(true)
    try {
      await api.put(`/staff/${pinOpen.id}/pin`, { pin: newPin })
      toast.success('PIN set successfully')
      setPinOpen(null)
      setNewPin('')
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to set PIN') }
    finally { setSavingPin(false) }
  }

  const removePin = async (admin: AdminUser) => {
    if (!window.confirm(`Remove ${admin.first_name} ${admin.last_name}'s PIN?`)) return
    try {
      await api.delete(`/staff/${admin.id}/pin`)
      toast.success('PIN removed')
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to remove PIN') }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <RecruitmentSection homes={homes} />

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
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <Button size="sm" variant="outline" icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => { setResetOpen(admin); setNewPassword(''); setShowPwd(false) }}>
                  Reset pwd
                </Button>
                <Button size="sm" variant="outline" icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => { setPinOpen(admin); setNewPin('') }}>
                  {admin.has_pin ? 'Reset PIN' : 'Create PIN'}
                </Button>
                {admin.has_pin && (
                  <Button size="sm" variant="outline" icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => removePin(admin)}>
                    Remove PIN
                  </Button>
                )}
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

      {/* Access levels modal */}
      {accessModal && (
        <AccessLevelsModal
          admin={accessModal}
          onClose={() => setAccessModal(null)}
          onSaved={() => { setAccessModal(null); load() }}
        />
      )}

      {/* Reset password modal */}
      {resetOpen && (
        <Modal open={true} onClose={() => setResetOpen(null)} title={`Reset password: ${resetOpen.first_name} ${resetOpen.last_name}`}>
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

      {/* Reset / create PIN modal */}
      {pinOpen && (
        <Modal open={true} onClose={() => setPinOpen(null)} title={`${pinOpen.has_pin ? 'Reset' : 'Create'} PIN: ${pinOpen.first_name} ${pinOpen.last_name}`}>
          <div className="space-y-4">
            <Input label="New PIN (4-8 digits)" type="password" inputMode="numeric"
              value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={8} />
            <p className="text-xs text-slate-400">They can use this PIN to sign in quickly from the login page instead of typing their password.</p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setPinOpen(null)}>Cancel</Button>
              <Button loading={savingPin} onClick={savePin}>{pinOpen.has_pin ? 'Reset PIN' : 'Create PIN'}</Button>
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

function AccessLevelsModal({ admin, onClose, onSaved }: {
  admin: AdminUser; onClose: () => void; onSaved: () => void
}) {
  const existing = admin.feature_flags || {}
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const f of ALL_FEATURES) { init[f.key] = existing[f.key] !== false }
    return init
  })
  const [saving, setSaving] = useState(false)

  const toggleAll = (val: boolean) => {
    const next: Record<string, boolean> = {}
    for (const f of ALL_FEATURES) next[f.key] = val
    setEnabled(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      const featureFlags: Record<string, boolean> = {}
      for (const f of ALL_FEATURES) { if (!enabled[f.key]) featureFlags[f.key] = false }
      await api.put(`/staff/${admin.id}/feature-flags`, { featureFlags })
      toast.success('Access levels saved')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const allOn = ALL_FEATURES.every(f => enabled[f.key])
  const allOff = ALL_FEATURES.every(f => !enabled[f.key])

  return (
    <Modal open={true} onClose={onClose} title={`Access levels — ${admin.first_name} ${admin.last_name}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Choose which features this account can access. Unchecked items will be hidden from their navigation.
        </p>
        <div className="flex gap-3 text-sm">
          <button onClick={() => toggleAll(true)} className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${allOn ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Enable all</button>
          <button onClick={() => toggleAll(false)} className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${allOff ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Disable all</button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-h-96 overflow-y-auto border border-slate-100 rounded-xl p-4">
          {ALL_FEATURES.map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none group">
              <input type="checkbox" checked={!!enabled[f.key]} onChange={e => setEnabled(prev => ({ ...prev, [f.key]: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 w-4 h-4 flex-shrink-0" />
              <span className={`text-sm transition-colors ${enabled[f.key] ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{f.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<Sliders className="w-4 h-4" />} onClick={save}>Save access levels</Button>
        </div>
      </div>
    </Modal>
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
    if (['home_manager', 'deputy_manager', 'team_leader', 'senior_carer', 'care_staff', 'admin'].includes(form.role) && !form.homeId) { toast.error('Select a home for this account'); return }
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
