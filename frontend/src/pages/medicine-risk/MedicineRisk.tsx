import React, { useState, useEffect } from 'react'
import { ShieldAlert, Plus, CheckCircle2, XCircle, AlertTriangle, Paperclip, Eye, Edit2 } from 'lucide-react'
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

function InfoRow({ label, value, className }: { label: string; value: any; className?: string }) {
  if (!value && value !== false) return null
  return (
    <div className={className}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-white text-sm">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</p>
    </div>
  )
}

const EMPTY_FORM = {
  id: '', suId: '',
  selfMedicate: false, selfMedicateNotes: '',
  swallowingRisk: 'none', swallowingNotes: '',
  covertMeds: false, covertNotes: '',
  mcaCompleted: false, mcaDate: '', mcaAssessor: '', mcaReason: '', mcaAuthorisedBy: '',
  prnProtocol: false, prnNotes: '',
  crushingRequired: false, crushingNotes: '',
  administrationRoute: 'oral',
  knownAllergies: '', storageLocation: '',
  riskLevel: 'low', riskNotes: '',
  triggers: '', protectiveFactors: '',
  reviewDate: '', attachmentNotes: '',
}

export default function MedicineRisk() {
  const [latest, setLatest] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewRecord, setViewRecord] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

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

  function openView(r: any) {
    setViewRecord(r)
  }

  function openNewForm() {
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  function openEditForm(r: any) {
    setForm({
      id: r.id || '', suId: r.su_id || '',
      selfMedicate: r.self_medicate || false,
      selfMedicateNotes: r.self_medicate_notes || '',
      swallowingRisk: r.swallowing_risk || 'none',
      swallowingNotes: r.swallowing_notes || '',
      covertMeds: r.covert_meds || false,
      covertNotes: r.covert_notes || '',
      mcaCompleted: false, mcaDate: '', mcaAssessor: '', mcaReason: '', mcaAuthorisedBy: '',
      prnProtocol: r.prn_protocol || false,
      prnNotes: r.prn_notes || '',
      crushingRequired: r.crushing_required || false,
      crushingNotes: r.crushing_notes || '',
      administrationRoute: r.administration_route || 'oral',
      knownAllergies: r.known_allergies || '',
      storageLocation: r.storage_location || '',
      riskLevel: r.risk_level || 'low',
      riskNotes: r.risk_notes || '',
      triggers: r.triggers || '',
      protectiveFactors: r.protective_factors || '',
      reviewDate: r.review_date ? r.review_date.substring(0, 10) : '',
      attachmentNotes: r.attachment_notes || '',
    })
    setViewRecord(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const covertNotesCombined = form.covertMeds
        ? [
            form.covertNotes,
            form.mcaCompleted ? `MCA Completed: Yes` : '',
            form.mcaDate ? `MCA Date: ${form.mcaDate}` : '',
            form.mcaAssessor ? `Assessor: ${form.mcaAssessor}` : '',
            form.mcaReason ? `Reason for covert administration: ${form.mcaReason}` : '',
            form.mcaAuthorisedBy ? `Authorised by: ${form.mcaAuthorisedBy}` : '',
          ].filter(Boolean).join('\n')
        : form.covertNotes

      await api.post('/medicine-risk', {
        ...form,
        covertNotes: covertNotesCombined,
      })
      setShowForm(false)
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
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={openNewForm}>
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
            const borderColor = r.risk_level ? riskBorder(r.risk_level) : 'rgba(232,177,48,0.15)'
            return (
              <button
                key={r.su_id}
                onClick={() => openView(r)}
                className="rounded-2xl flex flex-col gap-3 p-4 text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                style={{ background: '#111111', border: `1px solid ${borderColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
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

                {r.id && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.covert_meds && <Flag active={true} label="Covert" />}
                    {r.prn_protocol && <Flag active={true} label="PRN" />}
                    {r.crushing_required && <Flag active={true} label="Crushed" />}
                    {r.swallowing_risk && r.swallowing_risk !== 'none' && (
                      <span className="text-xs font-medium text-amber-400">
                        Swallow: {r.swallowing_risk}
                      </span>
                    )}
                  </div>
                )}

                {r.assessed_at && (
                  <p className="text-xs text-slate-600">
                    Assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}
                    {r.review_date && <span className="text-slate-500"> · Review {format(new Date(r.review_date), 'dd MMM yyyy')}</span>}
                  </p>
                )}

                {!r.id && (
                  <p className="text-xs text-slate-500 italic">No assessment recorded yet — click to add one</p>
                )}

                <div className="flex items-center gap-1 text-xs text-slate-500 mt-auto">
                  <Eye className="w-3 h-3" />
                  <span>{r.id ? 'Click to view full assessment' : 'Click to add assessment'}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* View assessment modal */}
      {viewRecord && (
        <ViewAssessmentModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onEdit={() => openEditForm(viewRecord)}
          onNewAssessment={() => {
            setForm({ ...EMPTY_FORM, suId: viewRecord.su_id })
            setViewRecord(null)
            setShowForm(true)
          }}
        />
      )}

      {/* Add/Edit assessment modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={form.id ? 'Edit Assessment' : 'New Medication Risk Assessment'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <Select label="Service User *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => setF('suId', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Swallowing risk" options={SWALLOWING_RISK} value={form.swallowingRisk} onChange={e => setF('swallowingRisk', e.target.value)} />
            <Select label="Administration route" options={ADMIN_ROUTES} value={form.administrationRoute} onChange={e => setF('administrationRoute', e.target.value)} />
          </div>

          {form.swallowingRisk !== 'none' && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Swallowing notes</label>
              <textarea className="input" rows={2} value={form.swallowingNotes} onChange={e => setF('swallowingNotes', e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Known allergies</label>
            <textarea className="input" rows={2} value={form.knownAllergies} onChange={e => setF('knownAllergies', e.target.value)} placeholder="List any known allergies or drug reactions..." />
          </div>

          {/* Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'selfMedicate',     label: 'Can self-medicate' },
              { key: 'covertMeds',       label: 'Covert medication in use' },
              { key: 'crushingRequired', label: 'Crushing required' },
              { key: 'prnProtocol',      label: 'PRN protocol in place' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg col-span-1" style={{ background: '#1a1a1a' }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setF(key, e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {form.selfMedicate && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Self-medicate notes</label>
              <textarea className="input" rows={2} value={form.selfMedicateNotes} onChange={e => setF('selfMedicateNotes', e.target.value)} />
            </div>
          )}

          {form.prnProtocol && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">PRN protocol notes</label>
              <textarea className="input" rows={2} value={form.prnNotes} onChange={e => setF('prnNotes', e.target.value)} />
            </div>
          )}

          {form.crushingRequired && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Crushing notes</label>
              <textarea className="input" rows={2} value={form.crushingNotes} onChange={e => setF('crushingNotes', e.target.value)} />
            </div>
          )}

          {/* Covert medication authorization */}
          {form.covertMeds && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Covert Medication — MCA Authorization</p>
              <p className="text-xs text-slate-400">Covert medication must be authorised under the Mental Capacity Act. Complete the details below.</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.mcaCompleted} onChange={e => setF('mcaCompleted', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">MCA assessment has been completed</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Date of MCA assessment</label>
                  <input type="date" className="input w-full" value={form.mcaDate} onChange={e => setF('mcaDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Name of MCA assessor</label>
                  <input className="input w-full" value={form.mcaAssessor} onChange={e => setF('mcaAssessor', e.target.value)} placeholder="Full name..." />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Reason for covert administration</label>
                <textarea className="input" rows={2} value={form.mcaReason} onChange={e => setF('mcaReason', e.target.value)} placeholder="Explain why covert medication is necessary..." />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Authorised by (name & role)</label>
                <input className="input w-full" value={form.mcaAuthorisedBy} onChange={e => setF('mcaAuthorisedBy', e.target.value)} placeholder="e.g. Jane Smith, Registered Manager" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Additional covert medication notes</label>
                <textarea className="input" rows={2} value={form.covertNotes} onChange={e => setF('covertNotes', e.target.value)} placeholder="Any other relevant information..." />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Storage location</label>
              <input className="input w-full" value={form.storageLocation} onChange={e => setF('storageLocation', e.target.value)} placeholder="e.g. Locked cabinet Room 4" />
            </div>
            <Select label="Overall risk level" options={RISK_LEVELS} value={form.riskLevel} onChange={e => setF('riskLevel', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Risk Management Plan</label>
            <textarea className="input" rows={3} value={form.riskNotes} onChange={e => setF('riskNotes', e.target.value)} placeholder="Describe the risk management plan..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Triggers</label>
            <textarea className="input" rows={2} value={form.triggers} onChange={e => setF('triggers', e.target.value)} placeholder="What situations or factors may trigger a risk incident..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Protective Factors</label>
            <textarea className="input" rows={2} value={form.protectiveFactors} onChange={e => setF('protectiveFactors', e.target.value)} placeholder="What measures or approaches help mitigate the risk..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Review date</label>
            <input type="date" className="input w-48" value={form.reviewDate} onChange={e => setF('reviewDate', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attachment links / document references
            </label>
            <textarea className="input" rows={2} value={form.attachmentNotes} onChange={e => setF('attachmentNotes', e.target.value)} placeholder="Paste document links or note attachment references (e.g. Google Drive, SharePoint)..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Assessment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ViewAssessmentModal({ record: r, onClose, onEdit, onNewAssessment }: {
  record: any; onClose: () => void; onEdit: () => void; onNewAssessment: () => void
}) {
  return (
    <Modal open={true} onClose={onClose} title={r.su_name} size="lg">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {!r.id ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No assessment has been recorded for this resident yet.</p>
            <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={onNewAssessment}>Add Assessment</Button>
          </div>
        ) : (
          <>
            {/* Risk level + dates */}
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {r.risk_level && (
                <span className={clsx('px-3 py-1 rounded-full text-xs font-bold border capitalize', riskBadge(r.risk_level))}>
                  {r.risk_level} risk
                </span>
              )}
              {r.assessed_at && <span className="text-xs text-slate-500">Assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}</span>}
              {r.review_date && <span className="text-xs text-slate-500">Review due {format(new Date(r.review_date), 'dd MMM yyyy')}</span>}
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              <Flag active={!!r.self_medicate} label="Self-medicate" />
              <Flag active={!!r.covert_meds} label="Covert meds" />
              <Flag active={!!r.prn_protocol} label="PRN protocol" />
              <Flag active={!!r.crushing_required} label="Crushing required" />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <InfoRow label="Administration route" value={r.administration_route} />
              <InfoRow label="Swallowing risk" value={r.swallowing_risk !== 'none' ? r.swallowing_risk : null} />
              {r.swallowing_notes && <InfoRow label="Swallowing notes" value={r.swallowing_notes} className="col-span-2" />}
              {r.self_medicate_notes && <InfoRow label="Self-medicate notes" value={r.self_medicate_notes} className="col-span-2" />}
              {r.known_allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-0.5">Known allergies</p>
                  <p className="text-rose-300 text-sm">{r.known_allergies}</p>
                </div>
              )}
              <InfoRow label="Storage location" value={r.storage_location} />
            </div>

            {r.risk_notes && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <p className="text-xs text-slate-500 mb-1">Risk Management Plan</p>
                <p className="text-slate-300 text-sm whitespace-pre-line">{r.risk_notes}</p>
              </div>
            )}

            {(r.triggers || r.protective_factors) && (
              <div className="grid grid-cols-2 gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                {r.triggers && <InfoRow label="Triggers" value={r.triggers} className="col-span-2 sm:col-span-1" />}
                {r.protective_factors && <InfoRow label="Protective factors" value={r.protective_factors} className="col-span-2 sm:col-span-1" />}
              </div>
            )}

            {r.prn_protocol && r.prn_notes && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <p className="text-xs text-amber-400 mb-1 font-semibold uppercase tracking-wider">PRN Protocol</p>
                <p className="text-slate-300 text-sm whitespace-pre-line">{r.prn_notes}</p>
              </div>
            )}

            {r.crushing_required && r.crushing_notes && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <p className="text-xs text-slate-500 mb-1">Crushing notes</p>
                <p className="text-slate-300 text-sm whitespace-pre-line">{r.crushing_notes}</p>
              </div>
            )}

            {/* Covert medication authorization */}
            {r.covert_meds && r.covert_notes && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderTop: 'none' }}>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Covert Medication — Authorization Details</p>
                <p className="text-slate-300 text-sm whitespace-pre-line">{r.covert_notes}</p>
              </div>
            )}

            {r.attachment_notes && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(232,177,48,0.06)', border: '1px solid rgba(232,177,48,0.2)' }}>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Attachments / Document References
                </p>
                <p className="text-slate-300 text-sm whitespace-pre-line">{r.attachment_notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Button variant="gold" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={onEdit}>Edit Assessment</Button>
              <Button variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={onNewAssessment}>New Assessment</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
