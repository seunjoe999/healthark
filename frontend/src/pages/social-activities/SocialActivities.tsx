import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO } from 'date-fns'
import { Spinner, Button, Modal, Input, Select } from '../../components/ui'
import { Music, Plus, Trash2, Edit2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const ENJOYED_OPTIONS = [
  { value: 'very_much', label: 'Very much enjoyed' },
  { value: 'enjoyed', label: 'Enjoyed' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'not_enjoyed', label: 'Did not enjoy' },
  { value: 'refused', label: 'Refused / declined' },
]

const ENJOYED_COLOR: Record<string, string> = {
  very_much: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  enjoyed: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  not_enjoyed: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  refused: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
}

export default function SocialActivities() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || []))
    load()
  }, [selectedHome, selectedSu])

  const load = async () => {
    if (!selectedHome) return
    setLoading(true)
    try {
      const res = await api.get('/social-activities', {
        params: { homeId: selectedHome, ...(selectedSu ? { suId: selectedSu } : {}) }
      })
      setActivities(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deleteActivity = async (id: string) => {
    if (!window.confirm('Delete this activity record?')) return
    try {
      await api.delete(`/social-activities/${id}`)
      setActivities(prev => prev.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  const suOptions = [{ value: '', label: 'All service users' }, ...sus.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Music className="w-6 h-6 text-amber-400" /> Social Activities
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track activities, outings and social engagement for service users</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setAddOpen(true) }}>
          Log activity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
        <select className="input w-auto text-sm" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
          {suOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : activities.length === 0 ? (
        <div className="text-center py-16">
          <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No activities recorded yet</p>
          <p className="text-slate-600 text-sm mt-1">Start logging social activities and outings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a: any) => (
            <div key={a.id} className="rounded-xl p-4 flex items-start justify-between gap-4"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white">{a.title}</p>
                  {a.enjoyed && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ENJOYED_COLOR[a.enjoyed] || 'text-slate-400'}`}>
                      {ENJOYED_OPTIONS.find(o => o.value === a.enjoyed)?.label || a.enjoyed}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {a.su_name && <span className="font-medium text-slate-300">{a.su_name} · </span>}
                  {a.activity_date ? format(parseISO(a.activity_date), 'd MMM yyyy') : ''}
                  {a.duration_mins ? ` · ${a.duration_mins} min` : ''}
                  {a.location ? ` · ${a.location}` : ''}
                </p>
                {a.participants && <p className="text-xs text-slate-500 mt-0.5">With: {a.participants}</p>}
                {a.notes && <p className="text-xs text-slate-500 mt-1 italic">{a.notes}</p>}
                <p className="text-xs text-slate-600 mt-1">Logged by {a.staff_name}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(a); setAddOpen(true) }}
                  className="p-2 rounded-lg text-slate-500 hover:text-amber-400 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteActivity(a.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ActivityModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null) }}
        sus={sus}
        homeId={selectedHome}
        editing={editing}
        onSaved={async () => { setAddOpen(false); setEditing(null); await load(); toast.success(editing ? 'Updated' : 'Activity logged') }}
      />
    </div>
  )
}

function ActivityModal({ open, onClose, sus, homeId, editing, onSaved }: {
  open: boolean; onClose: () => void; sus: any[]; homeId: string; editing: any; onSaved: () => void
}) {
  const [form, setForm] = useState({
    suId: '', title: '', activityDate: format(new Date(), 'yyyy-MM-dd'),
    durationMins: '', location: '', participants: '', enjoyed: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          suId: editing.su_id || '',
          title: editing.title || '',
          activityDate: editing.activity_date || format(new Date(), 'yyyy-MM-dd'),
          durationMins: editing.duration_mins ? String(editing.duration_mins) : '',
          location: editing.location || '',
          participants: editing.participants || '',
          enjoyed: editing.enjoyed || '',
          notes: editing.notes || '',
        })
      } else {
        setForm({ suId: '', title: '', activityDate: format(new Date(), 'yyyy-MM-dd'), durationMins: '', location: '', participants: '', enjoyed: '', notes: '' })
      }
    }
  }, [open, editing])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.suId) { toast.error('Select a service user'); return }
    setLoading(true)
    try {
      const payload = { ...form, homeId, durationMins: form.durationMins ? parseInt(form.durationMins) : null }
      if (editing) {
        await api.put(`/social-activities/${editing.id}`, payload)
      } else {
        await api.post('/social-activities', payload)
      }
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setLoading(false) }
  }

  const suOptions = sus.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit activity' : 'Log social activity'}>
      <form onSubmit={save} className="space-y-4">
        <Select label="Service user *" required value={form.suId} onChange={e => set('suId', e.target.value)} options={suOptions} placeholder="Select service user..." />
        <Input label="Activity / outing *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Trip to the park, Bingo, Movie night" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.activityDate} onChange={e => set('activityDate', e.target.value)} />
          <Input label="Duration (minutes)" type="number" value={form.durationMins} onChange={e => set('durationMins', e.target.value)} placeholder="e.g. 60" />
        </div>
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Community centre, lounge" />
        <Input label="Participants / who was present" value={form.participants} onChange={e => set('participants', e.target.value)} placeholder="e.g. 3 residents, 2 staff" />
        <Select label="How did they enjoy it?" value={form.enjoyed} onChange={e => set('enjoyed', e.target.value)} options={ENJOYED_OPTIONS} placeholder="Select..." />
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any observations, behaviours, or comments..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{editing ? 'Save changes' : 'Log activity'}</Button>
        </div>
      </form>
    </Modal>
  )
}
