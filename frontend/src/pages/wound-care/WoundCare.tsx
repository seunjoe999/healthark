import React, { useState, useEffect } from 'react'
import { Activity, Plus, ChevronRight, TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Constants ───────────────────────────────────────────────────────

const WOUND_TYPES = [
  { value: 'pressure_ulcer', label: 'Pressure Ulcer' },
  { value: 'surgical', label: 'Surgical Wound' },
  { value: 'leg_ulcer', label: 'Leg Ulcer' },
  { value: 'diabetic', label: 'Diabetic Wound' },
  { value: 'traumatic', label: 'Traumatic Wound' },
  { value: 'other', label: 'Other' },
]

const STAGES = [
  { value: 'none', label: 'None / N/A' },
  { value: '1', label: 'Stage 1 – Non-blanchable redness' },
  { value: '2', label: 'Stage 2 – Partial thickness skin loss' },
  { value: '3', label: 'Stage 3 – Full thickness skin loss' },
  { value: '4', label: 'Stage 4 – Full thickness tissue loss' },
  { value: 'unstageable', label: 'Unstageable – Obscured depth' },
  { value: 'deep_tissue', label: 'Deep Tissue Injury' },
]

const LOCATIONS = [
  { value: 'sacrum', label: 'Sacrum / Coccyx' },
  { value: 'heel-left', label: 'Heel (Left)' },
  { value: 'heel-right', label: 'Heel (Right)' },
  { value: 'ankle-left', label: 'Ankle (Left)' },
  { value: 'ankle-right', label: 'Ankle (Right)' },
  { value: 'elbow-left', label: 'Elbow (Left)' },
  { value: 'elbow-right', label: 'Elbow (Right)' },
  { value: 'hip-left', label: 'Hip (Left)' },
  { value: 'hip-right', label: 'Hip (Right)' },
  { value: 'knee-left', label: 'Knee (Left)' },
  { value: 'knee-right', label: 'Knee (Right)' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'back', label: 'Back' },
  { value: 'buttock-left', label: 'Buttock (Left)' },
  { value: 'buttock-right', label: 'Buttock (Right)' },
  { value: 'leg-left', label: 'Lower Leg (Left)' },
  { value: 'leg-right', label: 'Lower Leg (Right)' },
  { value: 'foot-left', label: 'Foot (Left)' },
  { value: 'foot-right', label: 'Foot (Right)' },
  { value: 'other', label: 'Other (see notes)' },
]

const EXUDATE_AMOUNTS = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
]

const HEALING_STATUSES = [
  { value: 'improving', label: 'Improving' },
  { value: 'static', label: 'Static / No change' },
  { value: 'deteriorating', label: 'Deteriorating' },
  { value: 'healed', label: 'Healed' },
]

const WOUND_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'healed', label: 'Healed' },
  { value: 'closed', label: 'Closed' },
]

// ── Helpers ─────────────────────────────────────────────────────────

function healingBadgeClass(status: string) {
  if (status === 'improving')    return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
  if (status === 'static')       return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
  if (status === 'deteriorating') return 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
  if (status === 'healed')       return 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30'
  return 'bg-slate-500/15 text-slate-400'
}

function HealingIcon({ status }: { status: string }) {
  if (status === 'improving') return <TrendingDown className="w-3 h-3" />
  if (status === 'deteriorating') return <TrendingUp className="w-3 h-3" />
  return <Minus className="w-3 h-3" />
}

function sizeStr(a: any) {
  if (!a?.size_length_cm && !a?.size_width_cm) return null
  const parts = [a.size_length_cm, a.size_width_cm].filter(Boolean).map((v: any) => `${v}cm`)
  if (a.size_depth_cm) parts.push(`${a.size_depth_cm}cm deep`)
  return parts.join(' × ')
}

function sizeTrend(prev: any, cur: any) {
  if (!prev || !cur) return null
  const prevSize = (parseFloat(prev.size_length_cm) || 0) * (parseFloat(prev.size_width_cm) || 0)
  const curSize  = (parseFloat(cur.size_length_cm) || 0) * (parseFloat(cur.size_width_cm) || 0)
  const prevStr = sizeStr(prev)
  const curStr  = sizeStr(cur)
  if (!prevStr && !curStr) return null
  const arrow = curSize < prevSize ? '↓' : curSize > prevSize ? '↑' : '→'
  const label = curSize < prevSize ? 'smaller' : curSize > prevSize ? 'larger' : 'unchanged'
  return `${prevStr} → ${curStr} (${arrow} ${label})`
}

// Group assessments by su_id + wound_location to form wound "threads"
function groupIntoWounds(assessments: any[]) {
  const map = new Map<string, any[]>()
  for (const a of assessments) {
    const key = `${a.su_id}|${a.wound_location}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  // Each group sorted newest-first; first item is the latest assessment
  const wounds: any[] = []
  map.forEach((entries) => {
    entries.sort((a, b) => new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime())
    wounds.push({ latest: entries[0], history: entries })
  })
  return wounds.sort((a, b) => new Date(b.latest.assessment_date).getTime() - new Date(a.latest.assessment_date).getTime())
}

// ── Empty form ───────────────────────────────────────────────────────

function emptyForm(suId = '') {
  return {
    suId,
    assessmentDate: new Date().toISOString().slice(0, 10),
    woundLocation: '',
    woundType: 'pressure_ulcer',
    stage: 'none',
    sizeLengthCm: '',
    sizeWidthCm: '',
    sizeDepthCm: '',
    woundBed: '',
    exudateAmount: 'none',
    exudateType: '',
    surroundingSkin: '',
    dressingUsed: '',
    dressingFrequency: '',
    painScore: '',
    healingStatus: 'static',
    notes: '',
    nextReviewDate: '',
    status: 'active',
  }
}

// ── Assessment form ──────────────────────────────────────────────────

function AssessmentForm({
  open, onClose, onSaved, serviceUsers, editingId, defaultSuId, prefillLocation,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  serviceUsers: any[]
  editingId?: string | null
  defaultSuId?: string
  prefillLocation?: string
}) {
  const [form, setForm] = useState(emptyForm(defaultSuId))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingId) {
        api.get(`/wound-care/${editingId}`).then(r => {
          const d = r.data.data
          setForm({
            suId: d.su_id,
            assessmentDate: d.assessment_date?.slice(0, 10) || '',
            woundLocation: d.wound_location || '',
            woundType: d.wound_type || 'pressure_ulcer',
            stage: d.stage || 'none',
            sizeLengthCm: d.size_length_cm ?? '',
            sizeWidthCm: d.size_width_cm ?? '',
            sizeDepthCm: d.size_depth_cm ?? '',
            woundBed: d.wound_bed || '',
            exudateAmount: d.exudate_amount || 'none',
            exudateType: d.exudate_type || '',
            surroundingSkin: d.surrounding_skin || '',
            dressingUsed: d.dressing_used || '',
            dressingFrequency: d.dressing_frequency || '',
            painScore: d.pain_score ?? '',
            healingStatus: d.healing_status || 'static',
            notes: d.notes || '',
            nextReviewDate: d.next_review_date?.slice(0, 10) || '',
            status: d.status || 'active',
          })
        }).catch(() => {})
      } else {
        setForm(emptyForm(defaultSuId))
        if (prefillLocation) setForm(f => ({ ...f, woundLocation: prefillLocation }))
      }
    }
  }, [open, editingId, defaultSuId, prefillLocation])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a resident'); return }
    if (!form.woundLocation) { toast.error('Please enter wound location'); return }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        sizeLengthCm: form.sizeLengthCm !== '' ? parseFloat(form.sizeLengthCm) : null,
        sizeWidthCm:  form.sizeWidthCm  !== '' ? parseFloat(form.sizeWidthCm)  : null,
        sizeDepthCm:  form.sizeDepthCm  !== '' ? parseFloat(form.sizeDepthCm)  : null,
        painScore:    form.painScore    !== '' ? parseInt(form.painScore)       : null,
      }
      if (editingId) {
        await api.put(`/wound-care/${editingId}`, payload)
        toast.success('Assessment updated')
      } else {
        await api.post('/wound-care', payload)
        toast.success('Assessment recorded')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save assessment')
    }
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const locOptions = LOCATIONS.map(l => ({ value: l.value, label: l.label }))

  return (
    <Modal open={open} onClose={onClose} title={editingId ? 'Edit Assessment' : 'New Wound Assessment'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Resident *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => set('suId', e.target.value)} required />
          <Input label="Assessment date" type="date" value={form.assessmentDate} onChange={e => set('assessmentDate', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Wound location *" options={locOptions} placeholder="Select location..." value={form.woundLocation} onChange={e => set('woundLocation', e.target.value)} required />
          <Select label="Wound type *" options={WOUND_TYPES} value={form.woundType} onChange={e => set('woundType', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Stage" options={STAGES} value={form.stage} onChange={e => set('stage', e.target.value)} />
          <Select label="Healing status" options={HEALING_STATUSES} value={form.healingStatus} onChange={e => set('healingStatus', e.target.value)} />
        </div>

        {/* Wound size */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">Wound size (cm)</label>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Length" type="number" step="0.1" min="0" value={form.sizeLengthCm} onChange={e => set('sizeLengthCm', e.target.value)} hint="Length" />
            <Input placeholder="Width"  type="number" step="0.1" min="0" value={form.sizeWidthCm}  onChange={e => set('sizeWidthCm', e.target.value)}  hint="Width" />
            <Input placeholder="Depth"  type="number" step="0.1" min="0" value={form.sizeDepthCm}  onChange={e => set('sizeDepthCm', e.target.value)}  hint="Depth (opt.)" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Exudate amount" options={EXUDATE_AMOUNTS} value={form.exudateAmount} onChange={e => set('exudateAmount', e.target.value)} />
          <Input label="Exudate type" placeholder="e.g. serous, purulent, haemoserous..." value={form.exudateType} onChange={e => set('exudateType', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Wound bed description</label>
            <textarea className="input" rows={2} value={form.woundBed} onChange={e => set('woundBed', e.target.value)} placeholder="e.g. granulating, sloughy, necrotic, epithelialising..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Surrounding skin</label>
            <textarea className="input" rows={2} value={form.surroundingSkin} onChange={e => set('surroundingSkin', e.target.value)} placeholder="e.g. macerated, erythematous, intact..." />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Dressing used" placeholder="e.g. Aquacel Ag, Mepilex Border..." value={form.dressingUsed} onChange={e => set('dressingUsed', e.target.value)} />
          <Input label="Dressing frequency" placeholder="e.g. daily, every 3 days..." value={form.dressingFrequency} onChange={e => set('dressingFrequency', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Pain score (0–10)" type="number" min="0" max="10" value={form.painScore} onChange={e => set('painScore', e.target.value)} />
          <Input label="Next review date" type="date" value={form.nextReviewDate} onChange={e => set('nextReviewDate', e.target.value)} />
          <Select label="Wound status" options={WOUND_STATUS} value={form.status} onChange={e => set('status', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Clinical notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional observations, actions taken, referrals made..." />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/8">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={submitting}>{editingId ? 'Update' : 'Save Assessment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Wound detail / history timeline ─────────────────────────────────

function WoundDetail({ wound, onClose, onAddFollowUp }: {
  wound: { latest: any; history: any[] }
  onClose: () => void
  onAddFollowUp: (location: string, suId: string) => void
}) {
  const { latest, history } = wound
  const label = (v: string, opts: { value: string; label: string }[]) => opts.find(o => o.value === v)?.label || v

  return (
    <Modal open={true} onClose={onClose} title={`Wound: ${label(latest.wound_location, LOCATIONS)}`} size="xl">
      <div className="space-y-5">

        {/* Latest summary */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-white font-semibold">{latest.su_name}</p>
              <p className="text-slate-400 text-xs">{label(latest.wound_type, WOUND_TYPES)} · Stage: {label(latest.stage, STAGES)}</p>
            </div>
            <span className={clsx('badge rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1', healingBadgeClass(latest.healing_status))}>
              <HealingIcon status={latest.healing_status} />
              {label(latest.healing_status, HEALING_STATUSES)}
            </span>
          </div>
          {history.length >= 2 && (() => {
            const trend = sizeTrend(history[1], history[0])
            return trend ? (
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2">
                <Activity className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="font-medium text-amber-400">Size trend:</span> {trend}
              </div>
            ) : null
          })()}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {sizeStr(latest) && <div className="card p-2 text-center"><div className="font-bold text-white">{sizeStr(latest)}</div><div className="text-slate-500">Size</div></div>}
            {latest.pain_score != null && <div className="card p-2 text-center"><div className="font-bold text-white">{latest.pain_score}/10</div><div className="text-slate-500">Pain</div></div>}
            {latest.exudate_amount && <div className="card p-2 text-center"><div className="font-bold text-white capitalize">{latest.exudate_amount}</div><div className="text-slate-500">Exudate</div></div>}
            {latest.next_review_date && <div className="card p-2 text-center"><div className="font-bold text-white">{format(parseISO(latest.next_review_date), 'dd MMM yy')}</div><div className="text-slate-500">Next review</div></div>}
          </div>
          {latest.dressing_used && <p className="text-xs text-slate-300"><span className="text-slate-500">Dressing:</span> {latest.dressing_used} {latest.dressing_frequency ? `· ${latest.dressing_frequency}` : ''}</p>}
          {latest.wound_bed && <p className="text-xs text-slate-300"><span className="text-slate-500">Wound bed:</span> {latest.wound_bed}</p>}
          {latest.surrounding_skin && <p className="text-xs text-slate-300"><span className="text-slate-500">Surrounding skin:</span> {latest.surrounding_skin}</p>}
          {latest.notes && <p className="text-xs text-slate-300"><span className="text-slate-500">Notes:</span> {latest.notes}</p>}
        </div>

        {/* Assessment history timeline */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assessment history ({history.length})</p>
          <div className="space-y-3">
            {history.map((a, i) => (
              <div key={a.id} className={clsx('rounded-xl p-3', i === 0 ? 'border-l-2 border-amber-500/60' : 'border-l-2 border-white/10')}
                style={{ background: 'rgba(255,255,255,0.03)', border: i === 0 ? undefined : '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-xs text-amber-400 font-semibold">Latest</span>}
                    <span className="text-xs text-white font-medium">{format(parseISO(a.assessment_date), 'dd MMM yyyy')}</span>
                  </div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', healingBadgeClass(a.healing_status))}>
                    <HealingIcon status={a.healing_status} />
                    {label(a.healing_status, HEALING_STATUSES)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  {sizeStr(a) && <span>{sizeStr(a)}</span>}
                  {a.pain_score != null && <span>Pain: {a.pain_score}/10</span>}
                  {a.stage && a.stage !== 'none' && <span>Stage {label(a.stage, STAGES)}</span>}
                  {a.dressing_used && <span>Dressing: {a.dressing_used}</span>}
                </div>
                {a.notes && <p className="text-xs text-slate-500 mt-1">{a.notes}</p>}
                <p className="text-xs text-slate-600 mt-1">By {a.assessed_by_name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t border-white/8">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="gold" icon={<Plus className="w-4 h-4" />}
            onClick={() => { onClose(); onAddFollowUp(latest.wound_location, latest.su_id) }}>
            Add follow-up
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ───────────────────────────────────────────────────

export default function WoundCare() {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSU, setSelectedSU] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedWound, setSelectedWound] = useState<{ latest: any; history: any[] } | null>(null)
  const [prefillLocation, setPrefillLocation] = useState('')
  const [prefillSuId, setPrefillSuId] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [assessRes, suRes] = await Promise.all([
        api.get('/wound-care', { params: { homeId: user?.homeId, suId: selectedSU || undefined, status: statusFilter || undefined } }),
        api.get('/service-users', { params: { homeId: user?.homeId } }),
      ])
      setAssessments(assessRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU, statusFilter])

  const wounds = groupIntoWounds(assessments)

  function openFollowUp(location: string, suId: string) {
    setPrefillLocation(location)
    setPrefillSuId(suId)
    setEditingId(null)
    setShowForm(true)
  }

  const statusFilterOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'healed', label: 'Healed' },
    { value: 'closed', label: 'Closed' },
  ]

  const suOptions = serviceUsers.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-6 h-6 text-rose-400" /> Wound Care
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track and monitor wound assessments and healing progress</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingId(null); setPrefillLocation(''); setPrefillSuId(selectedSU); setShowForm(true) }}>
          New Assessment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select className="input w-52" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
          <option value="">All residents</option>
          {serviceUsers.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {statusFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Wound cards */}
      {loading ? <Spinner /> : wounds.length === 0 ? (
        <EmptyState title="No wound assessments" description="Click 'New Assessment' to record a wound" />
      ) : (
        <div className="space-y-3">
          {wounds.map((w, i) => {
            const a = w.latest
            const label = (v: string, opts: { value: string; label: string }[]) => opts.find(o => o.value === v)?.label || v
            const trend = w.history.length >= 2 ? sizeTrend(w.history[1], w.history[0]) : null
            return (
              <div key={i}
                className="rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-all group"
                style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => setSelectedWound(w)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-white text-sm">{a.su_name}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-300">{label(a.wound_location, LOCATIONS)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded">{label(a.wound_type, WOUND_TYPES)}</span>
                      {a.stage && a.stage !== 'none' && (
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded">Stage: {a.stage}</span>
                      )}
                      {sizeStr(a) && <span className="text-xs text-slate-400">{sizeStr(a)}</span>}
                    </div>
                    {trend && (
                      <p className="text-xs text-amber-400/80 mt-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {trend}
                      </p>
                    )}
                    {a.dressing_used && <p className="text-xs text-slate-500 mt-1">Dressing: {a.dressing_used}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={clsx('text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1', healingBadgeClass(a.healing_status))}>
                      <HealingIcon status={a.healing_status} />
                      {label(a.healing_status, HEALING_STATUSES)}
                    </span>
                    <span className="text-xs text-slate-500">{format(parseISO(a.assessment_date), 'dd MMM yyyy')}</span>
                    {w.history.length > 1 && <span className="text-xs text-slate-600">{w.history.length} assessments</span>}
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assessment form modal */}
      <AssessmentForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        serviceUsers={serviceUsers}
        editingId={editingId}
        defaultSuId={prefillSuId}
        prefillLocation={prefillLocation}
      />

      {/* Wound detail modal */}
      {selectedWound && (
        <WoundDetail
          wound={selectedWound}
          onClose={() => setSelectedWound(null)}
          onAddFollowUp={openFollowUp}
        />
      )}
    </div>
  )
}
