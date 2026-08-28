import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { MessageSquare, Plus, X, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { SpeechTextarea } from '../../components/ui/SpeechButton'

const TYPE_OPTIONS = [
  { value: 'compliment', label: 'Compliment' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'concern', label: 'Concern' },
]

const FROM_OPTIONS = [
  { value: 'Family / Relative', label: 'Family / Relative' },
  { value: 'Service User', label: 'Service User' },
  { value: 'Staff Member', label: 'Staff Member' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Anonymous', label: 'Anonymous' },
  { value: 'Other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  compliment: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
  complaint: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
  concern: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
}

const BLANK: Record<string, any> = {
  recordType: 'compliment', fromType: '', fromName: '', aboutStaff: '',
  summary: '', actionTaken: '', lessonsLearnt: '', updatesText: '',
  status: 'open', entryDate: new Date().toISOString().split('T')[0], suId: '',
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] || 'bg-slate-500/10 border-slate-500/25 text-slate-400'
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${cls}`}>
      {type}
    </span>
  )
}

export default function Complaints() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const load = useCallback(async (homeId: string) => {
    if (!homeId) return
    setLoading(true)
    try {
      const params: any = { homeId }
      if (filterType) params.type = filterType
      const res = await api.get('/quality', { params })
      let data: any[] = res.data.data || []
      if (filterStatus) data = data.filter((r: any) => r.status === filterStatus)
      setRecords(data)
    } catch { toast.error('Failed to load records') }
    finally { setLoading(false) }
  }, [filterType, filterStatus])

  useEffect(() => { if (selectedHome) load(selectedHome) }, [selectedHome, load])

  const patch = async (id: string, updates: any) => {
    try {
      await api.patch(`/quality/${id}`, updates)
      toast.success('Updated')
      load(selectedHome)
    } catch { toast.error('Failed to update') }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this record?')) return
    try {
      await api.delete(`/quality/${id}`)
      toast.success('Deleted')
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch { toast.error('Failed to delete') }
  }

  const counts = {
    total: records.length,
    open: records.filter(r => r.status === 'open').length,
    compliments: records.filter(r => r.record_type === 'compliment').length,
    complaints: records.filter(r => r.record_type === 'complaint').length,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-400" /> Complaints & Compliments
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Record and manage complaints, compliments and concerns</p>
        </div>
        <div className="flex gap-2 items-center">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New Record</Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'text-white' },
          { label: 'Open', value: counts.open, color: 'text-amber-400' },
          { label: 'Compliments', value: counts.compliments, color: 'text-emerald-400' },
          { label: 'Complaints', value: counts.complaints, color: 'text-rose-400' },
        ].map(t => (
          <div key={t.label} className="card p-4 text-center">
            <p className={`text-3xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-xs text-slate-400 mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Records list */}
      {loading ? <Spinner /> : records.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No records found. Create the first record.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => {
            const expanded = expandedId === r.id
            return (
              <div key={r.id} className="card overflow-hidden">
                <button onClick={() => setExpandedId(p => p === r.id ? null : r.id)}
                  className="w-full p-4 text-left hover:bg-white/3 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <TypeBadge type={r.record_type} />
                        {r.status === 'closed'
                          ? <span className="flex items-center gap-1 text-xs text-slate-500"><CheckCircle className="w-3 h-3" />Closed</span>
                          : <span className="flex items-center gap-1 text-xs text-amber-400"><Clock className="w-3 h-3" />Open</span>
                        }
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                        <span><span className="font-semibold text-slate-300">Date:</span> {r.entry_date ? format(new Date(r.entry_date), 'd MMM yyyy') : format(new Date(r.created_at), 'd MMM yyyy')}</span>
                        {r.from_type && <span><span className="font-semibold text-slate-300">From:</span> {r.from_type}</span>}
                        {r.from_name && <span><span className="font-semibold text-slate-300">Name:</span> {r.from_name}</span>}
                      </div>
                      {r.summary && <p className="text-sm text-slate-300 mt-2 line-clamp-2">{r.summary}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4">
                    <RecordView record={r} />
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {r.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => patch(r.id, { status: 'closed' })}>
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Closed
                        </Button>
                      )}
                      <Button size="sm" variant="danger" icon={<X className="w-3.5 h-3.5" />} onClick={() => remove(r.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CreateModal open={createOpen} homeId={selectedHome} onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); load(selectedHome) }} />
    </div>
  )
}

function RecordView({ record: r }: { record: any }) {
  const fields = [
    { label: 'Type', value: r.record_type },
    { label: 'From', value: r.from_type },
    { label: 'Name', value: r.from_name },
    { label: 'About Staff', value: r.reported_by },
    { label: 'You said', value: r.summary },
    { label: 'We did', value: r.action_taken },
    { label: 'Lessons Learnt', value: r.lessons_learnt },
    { label: 'Updates', value: r.updates_text },
    { label: 'Status', value: r.status },
  ]
  return (
    <div className="space-y-3">
      {fields.map(f => f.value ? (
        <div key={f.label}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{f.label}</p>
          <p className="text-sm text-slate-200 whitespace-pre-line">{f.value}</p>
        </div>
      ) : null)}
    </div>
  )
}

function CreateModal({ open, homeId, onClose, onSaved }: {
  open: boolean; homeId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({ ...BLANK })
  const [loading, setLoading] = useState(false)
  const [sus, setSus] = useState<any[]>([])
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setForm({ ...BLANK, entryDate: new Date().toISOString().split('T')[0] }) }, [open])

  useEffect(() => {
    if (!open || !homeId) return
    suApi.list(homeId, { status: 'live' }).then(res => setSus(res.data.data || [])).catch(() => {})
  }, [open, homeId])

  const suOptions = sus.map(su => ({ value: su.id, label: `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim() }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.recordType) { toast.error('Type is required'); return }
    setLoading(true)
    try {
      await api.post('/quality', {
        homeId,
        recordType: form.recordType,
        fromType: form.fromType,
        fromName: form.fromName,
        reportedBy: form.aboutStaff,
        summary: form.summary,
        actionTaken: form.actionTaken,
        lessonsLearnt: form.lessonsLearnt,
        updatesText: form.updatesText,
        status: form.status,
        entryDate: form.entryDate,
        suId: form.suId || null,
      })
      toast.success('Record saved')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Complaint / Compliment" size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input w-full" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Type *</label>
            <select className="input w-full" value={form.recordType} onChange={e => set('recordType', e.target.value)}>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">From</label>
            <select className="input w-full" value={form.fromType} onChange={e => set('fromType', e.target.value)}>
              <option value="">Select...</option>
              {FROM_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input w-full" placeholder="Full name of person..." value={form.fromName} onChange={e => set('fromName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">About Staff</label>
          <input className="input w-full" placeholder="Name of staff member this relates to..." value={form.aboutStaff} onChange={e => set('aboutStaff', e.target.value)} />
        </div>
        <div>
          <label className="label">Linked resident (optional)</label>
          <select className="input w-full" value={form.suId} onChange={e => set('suId', e.target.value)}>
            <option value="">None</option>
            {suOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <SpeechTextarea label="You said" rows={4} value={form.summary} onChange={v => set('summary', v)}
          placeholder="What the person said / the details of the complaint or compliment..." />
        <SpeechTextarea label="We did" rows={4} value={form.actionTaken} onChange={v => set('actionTaken', v)}
          placeholder="What action was taken in response..." />
        <SpeechTextarea label="Lessons Learnt" rows={3} value={form.lessonsLearnt} onChange={v => set('lessonsLearnt', v)}
          placeholder="Any lessons learnt from this..." />
        <div>
          <label className="label">Updates</label>
          <textarea className="input w-full" rows={2} value={form.updatesText} onChange={e => set('updatesText', e.target.value)} placeholder="Any ongoing updates..." />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input w-full" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Record</Button>
        </div>
      </form>
    </Modal>
  )
}
