import React, { useState, useEffect } from 'react'
import { ShieldAlert, Plus, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'

const SWALLOWING_RISK = [
  { value: 'none',   label: 'None' },
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

const ADMIN_ROUTES = [
  { value: 'oral',        label: 'Oral (tablet/liquid)' },
  { value: 'patch',       label: 'Patch (transdermal)' },
  { value: 'topical',     label: 'Topical (cream/gel)' },
  { value: 'inhaler',     label: 'Inhaler' },
  { value: 'injection',   label: 'Injection' },
  { value: 'suppository', label: 'Suppository' },
  { value: 'other',       label: 'Other' },
]

const RISK_LEVELS = [
  { value: 'low',    label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high',   label: 'High Risk' },
]

function riskBadge(level: string) {
  if (level === 'high') return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  if (level === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
}

function riskBorder(level: string) {
  if (level === 'high') return 'rgba(239,68,68,0.35)'
  if (level === 'medium') return 'rgba(245,158,11,0.35)'
  return 'rgba(232,177,48,0.15)'
}

function swallowColor(level: string) {
  if (level === 'high') return 'text-rose-400'
  if (level === 'medium') return 'text-amber-400'
  if (level === 'low') return 'text-yellow-400'
  return 'text-slate-500'
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      active
        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25'
        : 'text-slate-600 bg-white/3 border border-white/8'
    )}>
      {active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  )
}

export default function MedicineRisk() {
  const [latest, setLatest] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [form, setForm] = useState({
    suId: '',
    selfMedicate: false, selfMedicateNotes: '',
    swallowingRisk: 'none', swallowingNotes: '',
    covertMeds: false, covertNotes: '',
    prnProtocol: false, prnNotes: '',
    crushingRequired: false, crushingNotes: '',
    administrationRoute: 'oral',
    knownAllergies: '', storageLocation: '',
    riskLevel: 'low', riskNotes: '',
    triggers: '', protectiveFactors: '',
    reviewDate: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [latestRes, suRes] = await Promise.all([
        api.get('/medicine-risk/latest'),
        api.get('/service-users'),
      ])
      setLatest(latestRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/medicine-risk', form)
      setShowAdd(false)
      setForm(f => ({ ...f, suId: '' }))
      load()
    } catch {}
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const highRisk = latest.filter(r => r.risk_level === 'high').length
  const withAssessment = latest.filter(r => r.id)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400" /> Medication Risk Assessment
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Medication administration risk for each resident</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            New Assessment
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-white">{latest.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Residents</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{withAssessment.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Assessed</div>
        </div>
        <div className="card p-3 text-center col-span-2 sm:col-span-1">
          <div className={clsx('text-2xl font-bold', highRisk > 0 ? 'text-rose-400' : 'text-slate-500')}>{highRisk}</div>
          <div className="text-xs text-slate-500 mt-0.5">High Risk</div>
        </div>
      </div>

      {highRisk > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5 border border-rose-500/30 bg-rose-500/8">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-rose-300 text-sm font-medium">{highRisk} resident{highRisk > 1 ? 's' : ''} flagged as <strong>high risk</strong></p>
        </div>
      )}

      {loading ? <Spinner /> : latest.length === 0 ? (
        <EmptyState title="No assessments yet" description="Use 'New Assessment' to add a medicine risk assessment" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latest.map(r => {
            const isExpanded = expanded === r.su_id
            const borderColor = r.risk_level ? riskBorder(r.risk_level) : 'rgba(232,177,48,0.15)'
            return (
              <div key={r.su_id}
                className="rounded-2xl flex flex-col gap-3 p-4 transition-all duration-200"
                style={{ background: '#111111', border: `1px solid ${borderColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{r.su_name}</p>
                    {r.room_number && <p className="text-xs text-slate-500">Room {r.room_number}</p>}
                  </div>
                  {r.risk_level ? (
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border capitalize flex-shrink-0', riskBadge(r.risk_level))}>
                      {r.risk_level} risk
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No assessment</span>
                  )}
                </div>

                {/* Flags row - only show applicable items */}
                {r.id && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.covert_meds && <Flag active={true} label="Covert" />}
                    {r.prn_protocol && <Flag active={true} label="PRN" />}
                    {r.crushing_required && <Flag active={true} label="Crushed" />}
                    {r.swallowing_risk && r.swallowing_risk !== 'none' && (
                      <span className={clsx('text-xs font-medium', swallowColor(r.swallowing_risk))}>
                        Swallow: {r.swallowing_risk}
                      </span>
                    )}
                  </div>
                )}

                {/* Last assessed */}
                {r.assessed_at && (
                  <p className="text-xs text-slate-600">
                    Assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}
                    {r.review_date && <span className="text-slate-500"> · Review {format(new Date(r.review_date), 'dd MMM yyyy')}</span>}
                  </p>
                )}

                {/* Expand toggle */}
                {r.id && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : r.su_id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors self-start"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Less detail' : 'More detail'}
                  </button>
                )}

                {/* Expanded detail */}
                {isExpanded && r.id && (
                  <div className="pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Self-medicate</p>
                      <p className="text-white text-sm">{r.self_medicate ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Route</p>
                      <p className="text-white text-sm capitalize">{r.administration_route}</p>
                    </div>
                    {r.known_allergies && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Allergies</p>
                        <p className="text-rose-300 text-sm">{r.known_allergies}</p>
                      </div>
                    )}
                    {r.storage_location && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Storage</p>
                        <p className="text-white text-sm">{r.storage_location}</p>
                      </div>
                    )}
                    {r.risk_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Risk Management Plan</p>
                        <p className="text-slate-300 text-sm">{r.risk_notes}</p>
                      </div>
                    )}
                    {r.triggers && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Triggers</p>
                        <p className="text-slate-300 text-sm">{r.triggers}</p>
                      </div>
                    )}
                    {r.protective_factors && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Protective Factors</p>
                        <p className="text-slate-300 text-sm">{r.protective_factors}</p>
                      </div>
                    )}
                  </div>
                )}

                {!r.id && (
                  <p className="text-xs text-slate-600 italic">No assessment recorded yet</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Medication Risk Assessment" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service User *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Swallowing risk" options={SWALLOWING_RISK} value={form.swallowingRisk} onChange={e => setForm(f => ({ ...f, swallowingRisk: e.target.value }))} />
            <Select label="Administration route" options={ADMIN_ROUTES} value={form.administrationRoute} onChange={e => setForm(f => ({ ...f, administrationRoute: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Known allergies</label>
            <textarea className="input" rows={2} value={form.knownAllergies} onChange={e => setForm(f => ({ ...f, knownAllergies: e.target.value }))} placeholder="List any known allergies or drug reactions..." />
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'selfMedicate',    label: 'Can self-medicate' },
              { key: 'covertMeds',      label: 'Covert medication in use' },
              { key: 'prnProtocol',     label: 'PRN protocol in place' },
              { key: 'crushingRequired',label: 'Crushing required' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {form.covertMeds && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Covert medication notes (MCA authorisation)</label>
              <textarea className="input" rows={2} value={form.covertNotes} onChange={e => setForm(f => ({ ...f, covertNotes: e.target.value }))} placeholder="Detail the MCA decision and authorisation..." />
            </div>
          )}
          {form.prnProtocol && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">PRN protocol details</label>
              <textarea className="input" rows={2} value={form.prnNotes} onChange={e => setForm(f => ({ ...f, prnNotes: e.target.value }))} placeholder="When to administer, dosage, triggers..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Storage location</label>
              <input className="input w-full" value={form.storageLocation} onChange={e => setForm(f => ({ ...f, storageLocation: e.target.value }))} placeholder="e.g. Locked cabinet Room 4" />
            </div>
            <Select label="Overall risk level" options={RISK_LEVELS} value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Risk Management Plan</label>
            <textarea className="input" rows={2} value={form.riskNotes} onChange={e => setForm(f => ({ ...f, riskNotes: e.target.value }))} placeholder="Any other risk factors or notes..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Triggers</label>
            <textarea className="input" rows={2} value={form.triggers} onChange={e => setForm(f => ({ ...f, triggers: e.target.value }))} placeholder="What situations or factors may trigger a risk incident..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Protective Factors</label>
            <textarea className="input" rows={2} value={form.protectiveFactors} onChange={e => setForm(f => ({ ...f, protectiveFactors: e.target.value }))} placeholder="What measures or approaches help mitigate the risk..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Review date</label>
            <input type="date" className="input w-48" value={form.reviewDate} onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Assessment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
