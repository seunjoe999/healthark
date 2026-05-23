import React, { useState, useEffect } from 'react'
import { ShieldAlert, Plus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState } from '../../components/ui'
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
  { value: 'oral',       label: 'Oral (tablet/liquid)' },
  { value: 'patch',      label: 'Patch (transdermal)' },
  { value: 'topical',    label: 'Topical (cream/gel)' },
  { value: 'inhaler',    label: 'Inhaler' },
  { value: 'injection',  label: 'Injection' },
  { value: 'suppository',label: 'Suppository' },
  { value: 'other',      label: 'Other' },
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

function swallowBadge(level: string) {
  if (level === 'high') return 'text-rose-400'
  if (level === 'medium') return 'text-amber-400'
  if (level === 'low') return 'text-yellow-400'
  return 'text-slate-400'
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={clsx('flex items-center gap-1 text-xs', active ? 'text-amber-400' : 'text-slate-600')}>
      {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {label}
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400" /> Medicine Risk Assessments
          </h1>
          <p className="text-slate-400 text-sm mt-1">Medication administration risk for each resident</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          New Assessment
        </Button>
      </div>

      {highRisk > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-5 border border-rose-500/30 bg-rose-500/10">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-rose-300 text-sm font-medium">{highRisk} resident{highRisk > 1 ? 's' : ''} flagged as <strong>high risk</strong> for medication administration</p>
        </div>
      )}

      {loading ? <Spinner /> : (
        latest.length === 0 ? <EmptyState title="No assessments yet" description="Use 'New Assessment' to add a medicine risk assessment for a resident" /> : (
          <div className="space-y-2">
            {latest.map(r => (
              <div key={r.su_id} className="card overflow-hidden">
                <button className="w-full p-4 text-left flex items-center justify-between gap-3"
                  onClick={() => setExpanded(expanded === r.su_id ? null : r.su_id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{r.su_name}</p>
                      {r.room_number && <span className="text-xs text-slate-500">Room {r.room_number}</span>}
                      {r.risk_level ? (
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border capitalize', riskBadge(r.risk_level))}>
                          {r.risk_level} risk
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No assessment</span>
                      )}
                    </div>
                    {r.assessed_at && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Last assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}
                        {r.review_date && ` · Review due ${format(new Date(r.review_date), 'dd MMM yyyy')}`}
                      </p>
                    )}
                  </div>
                  {r.id && (
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Flag active={r.covert_meds} label="Covert" />
                      <Flag active={r.prn_protocol} label="PRN" />
                      <Flag active={r.crushing_required} label="Crushed" />
                      <span className={clsx('text-xs font-medium capitalize', swallowBadge(r.swallowing_risk))}>
                        Swallow: {r.swallowing_risk || 'none'}
                      </span>
                    </div>
                  )}
                </button>

                {expanded === r.su_id && r.id && (
                  <div className="px-4 pb-4 border-t border-white/5 mt-1 pt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Self-medicate</p>
                      <p className="text-white">{r.self_medicate ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Administration route</p>
                      <p className="text-white capitalize">{r.administration_route}</p>
                    </div>
                    {r.known_allergies && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Known allergies</p>
                        <p className="text-rose-300">{r.known_allergies}</p>
                      </div>
                    )}
                    {r.storage_location && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Storage location</p>
                        <p className="text-white">{r.storage_location}</p>
                      </div>
                    )}
                    {r.risk_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Risk notes</p>
                        <p className="text-slate-300">{r.risk_notes}</p>
                      </div>
                    )}
                    {r.covert_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Covert medication notes</p>
                        <p className="text-slate-300">{r.covert_notes}</p>
                      </div>
                    )}
                    {r.prn_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">PRN protocol notes</p>
                        <p className="text-slate-300">{r.prn_notes}</p>
                      </div>
                    )}
                    {r.swallowing_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-0.5">Swallowing notes</p>
                        <p className="text-slate-300">{r.swallowing_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Medicine Risk Assessment" size="lg">
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
              { key: 'selfMedicate', label: 'Can self-medicate' },
              { key: 'covertMeds',   label: 'Covert medication in use' },
              { key: 'prnProtocol',  label: 'PRN protocol in place' },
              { key: 'crushingRequired', label: 'Crushing required' },
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
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Risk notes / additional information</label>
            <textarea className="input" rows={2} value={form.riskNotes} onChange={e => setForm(f => ({ ...f, riskNotes: e.target.value }))} placeholder="Any other risk factors or notes..." />
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
