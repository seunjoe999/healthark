import React, { useState, useEffect } from 'react'
import {
  ShieldAlert, Plus, AlertTriangle, CheckCircle, Clock, Printer,
  Users, Accessibility, ChevronRight, Edit,
} from 'lucide-react'
import { Button, Modal, Input, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO, isPast, isToday } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { buildLetterheadPage, openLetterheadPrint, fmtDate, esc, nl } from '../../utils/letterheadPrint'

// ── Constants ────────────────────────────────────────────────────────

const MOBILITY_LEVELS = [
  { value: 'independent',  label: 'Independent',       icon: '🚶', desc: 'Can evacuate without assistance' },
  { value: 'assisted_1',  label: '1 Staff assist',    icon: '🤝', desc: 'Requires 1 member of staff' },
  { value: 'assisted_2',  label: '2 Staff assist',    icon: '👥', desc: 'Requires 2 members of staff' },
  { value: 'hoist',       label: 'Hoist required',    icon: '🏗️', desc: 'Requires hoist for evacuation' },
  { value: 'bedbound',    label: 'Bedbound',           icon: '🛏️', desc: 'Requires evacuation bed/sheet' },
  { value: 'wheelchair',  label: 'Wheelchair user',   icon: '♿', desc: 'Uses wheelchair — may need staff' },
]

// ── Helpers ──────────────────────────────────────────────────────────

function mobilityLabel(v: string) { return MOBILITY_LEVELS.find(m => m.value === v)?.label || v }
function mobilityIcon(v: string)  { return MOBILITY_LEVELS.find(m => m.value === v)?.icon || '?' }

function peepStatus(row: any): 'none' | 'review_due' | 'current' {
  if (!row.peep_id) return 'none'
  if (row.review_date && (isPast(parseISO(row.review_date)) || isToday(parseISO(row.review_date)))) return 'review_due'
  return 'current'
}

function StatusBadge({ status }: { status: 'none' | 'review_due' | 'current' }) {
  if (status === 'none')       return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"><AlertTriangle className="w-3 h-3" />No PEEP</span>
  if (status === 'review_due') return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"><Clock className="w-3 h-3" />Review due</span>
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"><CheckCircle className="w-3 h-3" />Current</span>
}

// ── PEEP form ────────────────────────────────────────────────────────

function emptyForm(suId = '') {
  return {
    suId,
    mobilityLevel: 'independent',
    canSelfEvacuate: false,
    evacuationMethod: '',
    equipmentNeeded: '',
    numberOfStaffRequired: 1,
    assemblyPoint: '',
    specialConsiderations: '',
    knownToFireService: false,
    reviewDate: '',
  }
}

function PEEPForm({
  open, onClose, onSaved, serviceUsers, editingId, defaultSuId,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  serviceUsers: any[]
  editingId?: string | null
  defaultSuId?: string
}) {
  const [form, setForm] = useState(emptyForm(defaultSuId))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingId) {
        api.get(`/peep/${editingId}`).then(r => {
          const d = r.data.data
          setForm({
            suId: d.su_id,
            mobilityLevel: d.mobility_level || 'independent',
            canSelfEvacuate: d.can_self_evacuate || false,
            evacuationMethod: d.evacuation_method || '',
            equipmentNeeded: d.equipment_needed || '',
            numberOfStaffRequired: d.number_of_staff_required ?? 1,
            assemblyPoint: d.assembly_point || '',
            specialConsiderations: d.special_considerations || '',
            knownToFireService: d.known_to_fire_service || false,
            reviewDate: d.review_date?.slice(0, 10) || '',
          })
        }).catch(() => {})
      } else {
        setForm(emptyForm(defaultSuId))
      }
    }
  }, [open, editingId, defaultSuId])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a resident'); return }
    if (!form.evacuationMethod.trim()) { toast.error('Please describe the evacuation method'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/peep/${editingId}`, form)
        toast.success('PEEP plan updated')
      } else {
        await api.post('/peep', form)
        toast.success('PEEP plan created')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save PEEP plan')
    }
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <Modal open={open} onClose={onClose} title={editingId ? 'Edit PEEP Plan' : 'Create PEEP Plan'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Resident *</label>
          <select className="input" value={form.suId} onChange={e => set('suId', e.target.value)} required disabled={!!editingId}>
            <option value="">Select resident...</option>
            {suOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Mobility level */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">Mobility level *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MOBILITY_LEVELS.map(m => (
              <button key={m.value} type="button"
                onClick={() => { set('mobilityLevel', m.value); if (m.value === 'independent') set('numberOfStaffRequired', 0) }}
                className={clsx('text-left p-3 rounded-xl border transition-all', form.mobilityLevel === m.value
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/8 bg-white/3 hover:border-white/15')}>
                <div className="text-lg mb-1">{m.icon}</div>
                <div className="text-xs font-semibold text-white leading-tight">{m.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Can self-evacuate toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <button type="button"
            onClick={() => set('canSelfEvacuate', !form.canSelfEvacuate)}
            className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors', form.canSelfEvacuate ? 'bg-emerald-500' : 'bg-slate-600')}>
            <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform m-0.5', form.canSelfEvacuate ? 'translate-x-4' : 'translate-x-0')} />
          </button>
          <div>
            <p className="text-sm font-medium text-white">Can self-evacuate</p>
            <p className="text-xs text-slate-400">Resident is able to evacuate themselves with verbal prompting only</p>
          </div>
        </div>

        {/* Evacuation method */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Evacuation method *</label>
          <textarea className="input" rows={3} required value={form.evacuationMethod}
            onChange={e => set('evacuationMethod', e.target.value)}
            placeholder="Describe step-by-step how this resident should be evacuated. Include specific instructions for staff..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Equipment needed</label>
            <Input placeholder="e.g. Evacuation chair, ski pad, hoist sling..." value={form.equipmentNeeded} onChange={e => set('equipmentNeeded', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Assembly point</label>
            <Input placeholder="e.g. Car park A, front garden..." value={form.assemblyPoint} onChange={e => set('assemblyPoint', e.target.value)} />
          </div>
        </div>

        {/* Number of staff stepper */}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">Staff required for evacuation</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('numberOfStaffRequired', Math.max(0, form.numberOfStaffRequired - 1))}
                className="w-9 h-9 rounded-xl border border-white/10 text-white hover:bg-white/8 transition-colors flex items-center justify-center text-lg font-bold">−</button>
              <span className="text-2xl font-bold text-white w-8 text-center">{form.numberOfStaffRequired}</span>
              <button type="button" onClick={() => set('numberOfStaffRequired', Math.min(5, form.numberOfStaffRequired + 1))}
                className="w-9 h-9 rounded-xl border border-white/10 text-white hover:bg-white/8 transition-colors flex items-center justify-center text-lg font-bold">+</button>
              <span className="text-xs text-slate-400">staff member{form.numberOfStaffRequired !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Special considerations</label>
          <textarea className="input" rows={3} value={form.specialConsiderations}
            onChange={e => set('specialConsiderations', e.target.value)}
            placeholder="Medical conditions that affect evacuation, medication requirements, behavioural needs, communication needs..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Next review date" type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
          <div />
        </div>

        {/* Known to fire service toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <button type="button"
            onClick={() => set('knownToFireService', !form.knownToFireService)}
            className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors', form.knownToFireService ? 'bg-amber-500' : 'bg-slate-600')}>
            <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform m-0.5', form.knownToFireService ? 'translate-x-4' : 'translate-x-0')} />
          </button>
          <div>
            <p className="text-sm font-medium text-white">Known to fire service</p>
            <p className="text-xs text-slate-400">The local fire service has been notified of this resident's evacuation needs</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/8">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={submitting}>{editingId ? 'Update Plan' : 'Create Plan'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Print ─────────────────────────────────────────────────────────────

function printPeepPlan(plan: any) {
  const sections = [
    {
      title: 'Mobility &amp; Evacuation Requirements',
      inner: `
        <table class="fields">
          <tr><th>Mobility Level</th><td>${esc(mobilityLabel(plan.mobility_level))}</td></tr>
          <tr><th>Can Self-Evacuate</th><td>${plan.can_self_evacuate ? 'Yes' : 'No — requires staff assistance'}</td></tr>
          <tr><th>Staff Required</th><td>${esc(plan.number_of_staff_required)} staff member${plan.number_of_staff_required !== 1 ? 's' : ''}</td></tr>
          <tr><th>Equipment Needed</th><td>${esc(plan.equipment_needed || 'None')}</td></tr>
          <tr><th>Assembly Point</th><td>${esc(plan.assembly_point)}</td></tr>
          <tr><th>Known to Fire Service</th><td>${plan.known_to_fire_service ? 'Yes' : 'No'}</td></tr>
        </table>
      `,
    },
    {
      title: 'Evacuation Method',
      inner: `<p class="body-text">${nl(plan.evacuation_method)}</p>`,
    },
    ...(plan.special_considerations ? [{
      title: 'Special Considerations',
      inner: `<div class="risk-box high"><span class="rb-label">Special Considerations</span></div><p class="body-text">${nl(plan.special_considerations)}</p>`,
    }] : []),
    {
      title: 'Sign-Off',
      inner: `
        <table class="fields">
          <tr><th>Completed By</th><td>${esc(plan.created_by_name)}</td></tr>
          <tr><th>Date Completed</th><td>${fmtDate(plan.created_at)}</td></tr>
          <tr><th>Next Review Due</th><td>${fmtDate(plan.review_date)}</td></tr>
        </table>
      `,
    },
  ]

  const body = buildLetterheadPage({
    docTitle: 'Personal Emergency Evacuation Plan',
    docSubtitle: 'PEEP',
    docRefPrefix: 'PEEP',
    docRefId: plan.id || plan.su_id,
    residentName: plan.su_name,
    sections,
  })

  openLetterheadPrint(`${plan.su_name} — PEEP`, body)
}

// ── Detail modal ──────────────────────────────────────────────────────

function PEEPDetail({ plan, onClose, onEdit }: { plan: any; onClose: () => void; onEdit: () => void }) {
  function handlePrint() {
    printPeepPlan(plan)
  }

  return (
    <Modal open={true} onClose={onClose} title={`PEEP – ${plan.su_name}`} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 text-center">
            <div className="text-2xl mb-1">{mobilityIcon(plan.mobility_level)}</div>
            <div className="text-xs font-bold text-white">{mobilityLabel(plan.mobility_level)}</div>
            <div className="text-xs text-slate-500">Mobility</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-white mb-1">{plan.number_of_staff_required}</div>
            <div className="text-xs font-bold text-white">Staff needed</div>
            <div className="text-xs text-slate-500">For evacuation</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="card p-3">
            <p className="text-slate-400 mb-0.5">Can self-evacuate</p>
            <p className={clsx('font-bold', plan.can_self_evacuate ? 'text-emerald-400' : 'text-rose-400')}>
              {plan.can_self_evacuate ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="card p-3">
            <p className="text-slate-400 mb-0.5">Known to fire service</p>
            <p className={clsx('font-bold', plan.known_to_fire_service ? 'text-amber-400' : 'text-slate-400')}>
              {plan.known_to_fire_service ? 'Yes' : 'No'}
            </p>
          </div>
          {plan.assembly_point && (
            <div className="card p-3">
              <p className="text-slate-400 mb-0.5">Assembly point</p>
              <p className="font-bold text-white">{plan.assembly_point}</p>
            </div>
          )}
          {plan.equipment_needed && (
            <div className="card p-3">
              <p className="text-slate-400 mb-0.5">Equipment needed</p>
              <p className="font-bold text-white">{plan.equipment_needed}</p>
            </div>
          )}
        </div>

        <div className="card p-3">
          <p className="text-xs text-slate-400 mb-1">Evacuation method</p>
          <p className="text-sm text-white whitespace-pre-wrap">{plan.evacuation_method}</p>
        </div>

        {plan.special_considerations && (
          <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-500/5">
            <p className="text-xs text-amber-400 font-semibold mb-1">Special considerations</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{plan.special_considerations}</p>
          </div>
        )}

        {plan.review_date && (
          <p className="text-xs text-slate-500">Next review: {format(parseISO(plan.review_date), 'dd MMMM yyyy')}</p>
        )}

        <div className="flex justify-between pt-2 border-t border-white/8">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <div className="flex gap-2">
            <Button variant="outline" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>Print</Button>
            <Button variant="gold" icon={<Edit className="w-4 h-4" />} onClick={onEdit}>Edit plan</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────

export default function PEEP() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [defaultSuId, setDefaultSuId] = useState('')
  const [detailPlan, setDetailPlan] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [sumRes, suRes] = await Promise.all([
        api.get('/peep/summary', { params: { homeId: user?.homeId } }),
        api.get('/service-users', { params: { homeId: user?.homeId } }),
      ])
      setSummary(sumRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openDetail(suId: string, peepId: string) {
    setDetailLoading(true)
    try {
      const r = await api.get(`/peep/${peepId}`)
      setDetailPlan(r.data.data)
    } catch {}
    setDetailLoading(false)
  }

  function openCreate(suId = '') {
    setDefaultSuId(suId)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(peepId: string) {
    setDetailPlan(null)
    setEditingId(peepId)
    setShowForm(true)
  }

  const noPeepCount = summary.filter(r => peepStatus(r) === 'none').length
  const reviewDueCount = summary.filter(r => peepStatus(r) === 'review_due').length

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-orange-400" /> PEEP
          </h1>
          <p className="text-slate-400 text-sm mt-1">Personal Emergency Evacuation Plans — {summary.length} resident{summary.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => openCreate()}>
          Create PEEP
        </Button>
      </div>

      {/* Alert banners */}
      {noPeepCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-4 border border-rose-500/30 bg-rose-500/8">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300 font-medium">
            {noPeepCount} resident{noPeepCount !== 1 ? 's have' : ' has'} no evacuation plan — action required
          </p>
        </div>
      )}
      {reviewDueCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-4 border border-amber-500/30 bg-amber-500/8">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            {reviewDueCount} PEEP plan{reviewDueCount !== 1 ? 's are' : ' is'} due for review
          </p>
        </div>
      )}

      {/* Summary grid */}
      {loading ? <Spinner /> : summary.length === 0 ? (
        <EmptyState title="No residents found" description="Residents will appear here once added to the system" />
      ) : (
        <div className="space-y-2">
          {summary.map(row => {
            const status = peepStatus(row)
            return (
              <div key={row.su_id}
                className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:border-white/15 transition-all group"
                style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => {
                  if (row.peep_id) openDetail(row.su_id, row.peep_id)
                  else openCreate(row.su_id)
                }}>

                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {row.su_name?.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{row.su_name}</p>
                  {row.peep_id ? (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-400">
                      <span>{mobilityIcon(row.mobility_level)} {mobilityLabel(row.mobility_level)}</span>
                      {row.number_of_staff_required > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{row.number_of_staff_required} staff</span>
                      )}
                      {row.evacuation_method && (
                        <span className="truncate max-w-48">{row.evacuation_method.slice(0, 60)}{row.evacuation_method.length > 60 ? '…' : ''}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">No PEEP plan — click to create</p>
                  )}
                </div>

                {/* Status badge + action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={status} />
                  {status === 'none' ? (
                    <button
                      className="text-xs text-amber-400 font-semibold hover:text-amber-300 transition-colors px-2 py-1 rounded-lg border border-amber-500/30 hover:border-amber-500/50"
                      onClick={e => { e.stopPropagation(); openCreate(row.su_id) }}>
                      + Create
                    </button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      <PEEPForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        serviceUsers={serviceUsers}
        editingId={editingId}
        defaultSuId={defaultSuId}
      />

      {/* Detail modal */}
      {detailPlan && (
        <PEEPDetail
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onEdit={() => { const id = detailPlan.id; setDetailPlan(null); openEdit(id) }}
        />
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Spinner />
        </div>
      )}
    </div>
  )
}
