import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ukDateStr } from '../../utils/ukDate'
import clsx from 'clsx'

const MEETING_TYPES = [
  { value: 'team', label: 'Team Meeting' },
  { value: 'management', label: 'Management Meeting' },
  { value: 'staff', label: 'Staff Meeting' },
  { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'clinical', label: 'Clinical / MDT' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

const statusColor: Record<string, string> = {
  open: 'badge-warning', in_progress: 'badge-info', closed: 'badge-success',
}

const BLANK = {
  meetingDate: ukDateStr(), meetingType: 'team', minutesTaker: '',
  followUp: '', actionPlan: '', status: 'open', notes: '',
}

export default function MeetingTracker() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager')
  const [entries, setEntries] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/meeting-tracker', { params: { homeId: selectedHome } })
      setEntries(res.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.meetingDate) { toast.error('Meeting date is required'); return }
    setSaving(true)
    try {
      await api.post('/meeting-tracker', { ...form, homeId: selectedHome })
      toast.success('Meeting logged')
      setShowForm(false)
      setForm(BLANK)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/meeting-tracker/${id}`, { status })
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    } catch { toast.error('Failed to update status') }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this meeting record?')) return
    try {
      await api.delete(`/meeting-tracker/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (!canManage) return <div className="p-8"><EmptyState title="Not available" description="This page is only available to management." /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6" style={{ color: '#e8b130' }} /> Meeting Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Log meetings, minutes, follow-up and action plans</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(BLANK); setShowForm(true) }}>
          New Meeting
        </Button>
      </div>

      {homes.length > 1 && (
        <select className="input max-w-xs mb-4" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
          {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      )}

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState title="No meetings logged yet"
          description="Track meeting minutes, follow-up items, and action plans here."
          action={<Button variant="gold" onClick={() => setShowForm(true)}>New Meeting</Button>} />
      ) : (
        <div className="space-y-2">
          {entries.map(en => (
            <div key={en.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800 capitalize">
                    {(MEETING_TYPES.find(t => t.value === en.meeting_type)?.label) || en.meeting_type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(en.meeting_date), 'd MMM yyyy')}
                    {en.minutes_taker ? ` · Minutes: ${en.minutes_taker}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select className={clsx('badge border-0', statusColor[en.status] || 'badge-info')}
                    value={en.status} onChange={e => updateStatus(en.id, e.target.value)}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button onClick={() => remove(en.id)} className="text-slate-300 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {en.follow_up && <p className="text-xs text-slate-600 mt-2"><strong>Follow-up:</strong> {en.follow_up}</p>}
              {en.action_plan && <p className="text-xs text-slate-600 mt-1"><strong>Action plan:</strong> {en.action_plan}</p>}
              {en.notes && <p className="text-xs text-slate-500 mt-1">{en.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Meeting" size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Meeting Date *</label>
              <input type="date" required className="input" value={form.meetingDate} onChange={e => set('meetingDate', e.target.value)} />
            </div>
            <Select label="Meeting Type" options={MEETING_TYPES} value={form.meetingType} onChange={e => set('meetingType', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Minutes Taker</label>
            <input className="input" value={form.minutesTaker} onChange={e => set('minutesTaker', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Follow-Up</label>
            <textarea className="input" rows={2} value={form.followUp} onChange={e => set('followUp', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Action Plan</label>
            <textarea className="input" rows={2} value={form.actionPlan} onChange={e => set('actionPlan', e.target.value)} />
          </div>
          <Select label="Status" options={STATUSES} value={form.status} onChange={e => set('status', e.target.value)} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
