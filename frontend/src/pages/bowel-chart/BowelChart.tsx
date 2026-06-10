import React, { useState, useEffect } from 'react'
import { Droplets, Plus, Clock } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const BRISTOL_TYPES = [
  { value: '1', label: 'Type 1 – Separate hard lumps (severe constipation)' },
  { value: '2', label: 'Type 2 – Sausage-shaped, lumpy (mild constipation)' },
  { value: '3', label: 'Type 3 – Sausage with cracks on surface (normal)' },
  { value: '4', label: 'Type 4 – Smooth, soft sausage (ideal)' },
  { value: '5', label: 'Type 5 – Soft blobs with clear edges (lacking fibre)' },
  { value: '6', label: 'Type 6 – Mushy, fluffy pieces (mild diarrhoea)' },
  { value: '7', label: 'Type 7 – Watery, no solid pieces (severe diarrhoea)' },
  { value: '8', label: 'Type 8 – No bowel opened' },
]

const AMOUNTS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const COLOURS = [
  { value: 'brown', label: 'Brown' },
  { value: 'dark_brown', label: 'Dark Brown' },
  { value: 'light_brown', label: 'Light Brown' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
  { value: 'other', label: 'Other' },
]

function bristolColor(type: number) {
  if (type === 8) return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  if (type <= 2) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (type <= 4) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (type === 5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
}

export default function BowelChart() {
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [view, setView] = useState<'log' | 'summary'>('summary')
  const [preview, setPreview] = useState<any>(null)

  const [form, setForm] = useState({
    suId: '',
    bristolType: '4',
    recordedAt: new Date().toISOString().slice(0, 16),
    amount: '',
    colour: 'brown',
    consistency: '',
    blood: false,
    mucus: false,
    notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [logsRes, suRes, summaryRes] = await Promise.all([
        api.get('/bowel-chart', { params: selectedSU ? { suId: selectedSU } : {} }),
        api.get('/service-users'),
        api.get('/bowel-chart/summary'),
      ])
      setRecords(logsRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
      setSummary(summaryRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/bowel-chart', {
        ...form,
        bristolType: parseInt(form.bristolType),
      })
      setShowAdd(false)
      setForm(f => ({ ...f, suId: '', bristolType: '4', amount: '', colour: 'brown', consistency: '', blood: false, mucus: false, notes: '' }))
      load()
      toast.success('Bowel movement recorded')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save record') }
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  function daysSince(dateStr: string | null) {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Droplets className="w-6 h-6 text-amber-400" /> Bowel Chart
          </h1>
          <p className="text-slate-400 text-sm mt-1">Bristol stool chart monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Record
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['summary', 'log'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'summary' ? 'Summary' : 'Full Log'}
          </button>
        ))}
      </div>

      {view === 'log' && (
        <div className="mb-4">
          <select className="input w-60" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
            <option value="">All Service Users</option>
            {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {view === 'summary' && (
            summary.length === 0 ? <EmptyState title="No residents found" /> : (
              <div className="space-y-2">
                {summary.map((s: any) => {
                  const days = daysSince(s.last_recorded_at)
                  const overdue = days === null || days > 3
                  const bristolNum = s.last_bristol_type ? parseInt(s.last_bristol_type) : null
                  return (
                    <div key={s.su_id} className={clsx('card p-4 flex items-center justify-between gap-4', overdue && 'border-l-4 border-l-rose-500/50')}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{s.su_name}</p>
                          {s.room_number && <span className="text-xs text-slate-500">Room {s.room_number}</span>}
                          {overdue && <span className="text-xs text-rose-400 font-medium">No record &gt;3 days</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.total_in_period} records in last 7 days
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {bristolNum && (
                          <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-bold border', bristolColor(bristolNum))}>
                            Type {bristolNum}
                          </span>
                        )}
                        {s.last_recorded_at ? (
                          <div className="text-right">
                            <p className="text-xs text-white">{format(new Date(s.last_recorded_at), 'dd MMM')}</p>
                            <p className="text-xs text-slate-500">{days === 0 ? 'today' : `${days}d ago`}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No records</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {view === 'log' && (
            records.length === 0 ? <EmptyState title="No records" description="Use 'Record' to log a bowel movement" /> : (
              <div className="space-y-3">
                {records.map(r => {
                  const bristolNum = parseInt(r.bristol_type)
                  return (
                    <div key={r.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setPreview(r)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={clsx('px-2.5 py-0.5 rounded-lg text-xs font-bold border', bristolColor(bristolNum))}>
                              Bristol Type {r.bristol_type}
                            </span>
                            {r.amount && <span className="text-xs text-slate-400 capitalize">{r.amount}</span>}
                            {r.colour && <span className="text-xs text-slate-400 capitalize">{r.colour.replace(/_/g, ' ')}</span>}
                            {r.blood_present && <span className="text-xs text-rose-400 font-semibold">Blood present</span>}
                            {r.mucus_present && <span className="text-xs text-amber-400 font-semibold">Mucus present</span>}
                          </div>
                          <p className="font-semibold text-white">{r.su_name}</p>
                          {r.consistency && <p className="text-sm text-slate-300 mt-1">{r.consistency}</p>}
                          {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                        </div>
                        <div className="text-right text-xs text-slate-400 flex-shrink-0">
                          <div className="text-white font-medium">{format(new Date(r.recorded_at), 'dd MMM yyyy')}</div>
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />{format(new Date(r.recorded_at), 'HH:mm')}
                          </div>
                          <div className="mt-1">{r.recorded_by_name}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Bowel Chart Record">
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-lg">{preview.su_name}</p>
              <span className={clsx('px-2.5 py-0.5 rounded-lg text-xs font-bold border', bristolColor(parseInt(preview.bristol_type)))}>Bristol Type {preview.bristol_type}</span>
            </div>
            <p className="text-sm text-slate-400">{format(new Date(preview.recorded_at), 'dd MMM yyyy HH:mm')}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {preview.amount && <div><span className="text-slate-500">Amount:</span> <span className="text-white capitalize">{preview.amount}</span></div>}
              {preview.colour && <div><span className="text-slate-500">Colour:</span> <span className="text-white capitalize">{preview.colour.replace(/_/g, ' ')}</span></div>}
              {preview.blood_present && <div className="col-span-2 text-rose-400 font-semibold">⚠ Blood present</div>}
              {preview.mucus_present && <div className="col-span-2 text-amber-400 font-semibold">⚠ Mucus present</div>}
            </div>
            {preview.consistency && <div><p className="text-xs text-slate-500 mb-1">Consistency notes</p><p className="text-sm text-slate-300">{preview.consistency}</p></div>}
            {preview.notes && <div><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-300">{preview.notes}</p></div>}
            <p className="text-xs text-slate-600">Recorded by {preview.recorded_by_name}</p>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Bowel Movement" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service User *" options={suOptions} placeholder="Select service user..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Bristol Type *" options={BRISTOL_TYPES} value={form.bristolType} onChange={e => setForm(f => ({ ...f, bristolType: e.target.value }))} />
            <Input label="Date & Time" type="datetime-local" value={form.recordedAt} onChange={e => setForm(f => ({ ...f, recordedAt: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Amount" options={AMOUNTS} placeholder="Select amount..." value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <Select label="Colour" options={COLOURS} value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Consistency notes</label>
            <textarea className="input" rows={2} value={form.consistency}
              onChange={e => setForm(f => ({ ...f, consistency: e.target.value }))}
              placeholder="Any additional observations..." />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.blood} onChange={e => setForm(f => ({ ...f, blood: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">Blood present</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.mucus} onChange={e => setForm(f => ({ ...f, mucus: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">Mucus present</span>
            </label>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Notes</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
