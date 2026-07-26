import React, { useState, useEffect, useRef } from 'react'
import { ShieldAlert, Plus, CheckCircle2, XCircle, AlertTriangle, Paperclip, Eye, Edit2, Upload, X, Check, Lock, Printer } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api, { getToken } from '../../api'
import { useAuth } from '../../context/AuthContext'
import SignaturePad from '../../components/SignaturePad'
import clsx from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

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
      active ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25' : 'text-slate-600 bg-white/3 border border-white/8'
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
  controlledMeds: false, controlledNotes: '',
  crushingRequired: false, crushingNotes: '',
  administrationRoute: 'oral',
  knownAllergies: '', storageLocation: '',
  riskLevel: 'low', riskNotes: '',
  triggers: '', protectiveFactors: '',
  reviewDate: '',
  documentUrl: '', documentName: '', attachmentNotes: '',
  signedOffBy: '', signedOffDate: '', staffSignature: '',
}

const MED_RISK_PRINT_CSS = `
  body{font-family:Arial,sans-serif;color:#111;padding:24px;max-width:780px;margin:0 auto}
  h1{font-size:1.3rem;margin-bottom:4px}
  .meta{font-size:.8rem;color:#555;margin-bottom:20px}
  .badge{display:inline-block;padding:3px 12px;border-radius:50px;font-size:.75rem;font-weight:700;text-transform:uppercase;margin-left:10px}
  .badge-low{background:#dcfce7;color:#166534}
  .badge-medium{background:#fef9c3;color:#854d0e}
  .badge-high{background:#fee2e2;color:#991b1b}
  .flags{margin-bottom:16px}
  .flag{display:inline-block;padding:3px 10px;border-radius:50px;font-size:.7rem;font-weight:600;margin:0 6px 6px 0;border:1px solid #cbd5e1;color:#334155}
  .flag-on{background:#fffbeb;border-color:#fbbf24;color:#92400e}
  section{margin-bottom:16px;page-break-inside:avoid}
  section h3{font-size:.75rem;text-transform:uppercase;color:#888;letter-spacing:.06em;margin-bottom:5px}
  section p{font-size:.9rem;line-height:1.6;margin:0;white-space:pre-line}
  .allergy{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:16px}
  .allergy h3{color:#991b1b}
  .allergy p{color:#991b1b;font-weight:600}
  .signoff{border-top:1px solid #ccc;margin-top:20px;padding-top:14px}
  .signoff img{height:44px;max-width:180px;display:block;margin-top:6px}
  @media print{body{padding:0}}
`

function buildMedRiskPrintBody(r: any): string {
  const rl = r.risk_level || 'low'
  const flag = (active: boolean, label: string) => `<span class="flag${active ? ' flag-on' : ''}">${label}</span>`
  return `
    <h1>${r.su_name || 'Resident'} — Medication Risk Assessment
      <span class="badge badge-${rl}">${rl} Risk</span>
    </h1>
    <p class="meta">${r.assessed_at ? `Assessed: <strong>${new Date(r.assessed_at).toLocaleDateString('en-GB')}</strong> &nbsp;|&nbsp; ` : ''}${r.review_date ? `Review due: <strong>${new Date(r.review_date).toLocaleDateString('en-GB')}</strong> &nbsp;|&nbsp; ` : ''}Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="flags">
      ${flag(!!r.controlled_meds, 'Controlled')}
      ${flag(!!r.self_medicate, 'Self-medicate')}
      ${flag(!!r.covert_meds, 'Covert')}
      ${flag(!!r.prn_protocol, 'PRN')}
      ${flag(!!r.crushing_required, 'Crushing required')}
    </div>
    ${r.known_allergies ? `<div class="allergy"><h3>Known allergies</h3><p>${r.known_allergies}</p></div>` : ''}
    <section><h3>Administration route</h3><p>${r.administration_route || '—'}</p></section>
    ${r.swallowing_risk && r.swallowing_risk !== 'none' ? `<section><h3>Swallowing risk</h3><p>${r.swallowing_risk}</p>${r.swallowing_notes ? `<p>${r.swallowing_notes}</p>` : ''}</section>` : ''}
    ${r.storage_location ? `<section><h3>Storage location</h3><p>${r.storage_location}</p></section>` : ''}
    ${r.controlled_meds && r.controlled_notes ? `<section><h3>Controlled medication notes</h3><p>${r.controlled_notes}</p></section>` : ''}
    ${r.self_medicate_notes ? `<section><h3>Self-medicate notes</h3><p>${r.self_medicate_notes}</p></section>` : ''}
    ${r.prn_protocol && r.prn_notes ? `<section><h3>PRN protocol notes</h3><p>${r.prn_notes}</p></section>` : ''}
    ${r.crushing_required && r.crushing_notes ? `<section><h3>Crushing notes</h3><p>${r.crushing_notes}</p></section>` : ''}
    ${r.covert_meds && r.covert_notes ? `<section><h3>Covert medication — MCA details</h3><p>${r.covert_notes}</p></section>` : ''}
    ${r.risk_notes ? `<section><h3>Risk management plan</h3><p>${r.risk_notes}</p></section>` : ''}
    ${r.triggers ? `<section><h3>Triggers</h3><p>${r.triggers}</p></section>` : ''}
    ${r.protective_factors ? `<section><h3>Protective factors</h3><p>${r.protective_factors}</p></section>` : ''}
    ${r.signed_off_by ? `
    <div class="signoff">
      <h3 style="font-size:.75rem;text-transform:uppercase;color:#888;letter-spacing:.06em;margin-bottom:5px">Signed off</h3>
      <p style="font-size:.9rem;margin:0">${r.signed_off_by}${r.signed_off_date ? ` on ${new Date(r.signed_off_date).toLocaleDateString('en-GB')}` : ''}</p>
      ${r.staff_signature ? `<img src="${r.staff_signature}" alt="Signature" />` : ''}
    </div>` : ''}
  `
}

function printMedRiskAssessment(r: any) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${r.su_name || 'Resident'} — Medication Risk Assessment</title><style>${MED_RISK_PRINT_CSS}</style></head><body>${buildMedRiskPrintBody(r)}</body></html>`
  const w = window.open('', '_blank')
  if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export default function MedicineRisk() {
  const { user } = useAuth()
  const homeId = user?.homeId || ''

  const [latest, setLatest] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewRecord, setViewRecord] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const [latestRes, suRes] = await Promise.all([
        api.get('/medicine-risk/latest'),
        api.get('/service-users', { params: { homeId } }),
      ])
      setLatest(latestRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [homeId])

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const res = await fetch('/api/upload/document', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json()
      setF('documentUrl', json.fileUrl || '')
      setF('documentName', json.fileName || file.name)
      toast.success('Document attached')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
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
      controlledMeds: r.controlled_meds || false,
      controlledNotes: r.controlled_notes || '',
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
      documentUrl: r.document_url || '',
      documentName: r.document_name || '',
      attachmentNotes: r.attachment_notes || '',
      signedOffBy: r.signed_off_by || '',
      signedOffDate: r.signed_off_date ? r.signed_off_date.substring(0, 10) : '',
      staffSignature: r.staff_signature || '',
    })
    setViewRecord(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a service user'); return }
    setSubmitting(true)
    try {
      const covertNotesCombined = form.covertMeds
        ? [form.covertNotes, form.mcaCompleted ? 'MCA Completed: Yes' : '', form.mcaDate ? `MCA Date: ${form.mcaDate}` : '', form.mcaAssessor ? `Assessor: ${form.mcaAssessor}` : '', form.mcaReason ? `Reason: ${form.mcaReason}` : '', form.mcaAuthorisedBy ? `Authorised by: ${form.mcaAuthorisedBy}` : ''].filter(Boolean).join('\n')
        : form.covertNotes

      const payload = {
        suId: form.suId,
        selfMedicate: form.selfMedicate, selfMedicateNotes: form.selfMedicateNotes,
        swallowingRisk: form.swallowingRisk, swallowingNotes: form.swallowingNotes,
        covertMeds: form.covertMeds, covertNotes: covertNotesCombined,
        prnProtocol: form.prnProtocol, prnNotes: form.prnNotes,
        controlledMeds: form.controlledMeds, controlledNotes: form.controlledNotes,
        crushingRequired: form.crushingRequired, crushingNotes: form.crushingNotes,
        administrationRoute: form.administrationRoute,
        knownAllergies: form.knownAllergies, storageLocation: form.storageLocation,
        riskLevel: form.riskLevel, riskNotes: form.riskNotes,
        triggers: form.triggers, protectiveFactors: form.protectiveFactors,
        reviewDate: form.reviewDate || null,
        documentUrl: form.documentUrl, documentName: form.documentName,
        attachmentNotes: form.attachmentNotes,
        signedOffBy: form.signedOffBy, signedOffDate: form.signedOffDate || null,
        staffSignature: form.staffSignature,
      }

      if (form.id) {
        await api.put(`/medicine-risk/${form.id}`, payload)
      } else {
        await api.post('/medicine-risk', payload)
      }
      setShowForm(false)
      load()
      toast.success('Assessment saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save assessment')
    }
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
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={openNewForm}>New Assessment</Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center"><div className="text-2xl font-bold text-white">{latest.length}</div><div className="text-xs text-slate-500 mt-0.5">Residents</div></div>
        <div className="card p-3 text-center"><div className="text-2xl font-bold text-emerald-400">{withAssessment.length}</div><div className="text-xs text-slate-500 mt-0.5">Assessed</div></div>
        <div className="card p-3 text-center col-span-2 sm:col-span-1"><div className={clsx('text-2xl font-bold', highRisk > 0 ? 'text-rose-400' : 'text-slate-500')}>{highRisk}</div><div className="text-xs text-slate-500 mt-0.5">High Risk</div></div>
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
              <button key={r.su_id}
                onClick={() => { if (!r.id) { setForm({ ...EMPTY_FORM, suId: r.su_id }); setShowForm(true) } else { setViewRecord(r) } }}
                className="rounded-2xl flex flex-col gap-3 p-4 text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                style={{ background: '#111111', border: `1px solid ${borderColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{r.su_name}</p>
                    {r.room_number && <p className="text-xs text-slate-500">Room {r.room_number}</p>}
                  </div>
                  {r.risk_level ? (
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border capitalize flex-shrink-0', riskBadge(r.risk_level))}>{r.risk_level} risk</span>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No assessment</span>
                  )}
                </div>
                {r.id && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.controlled_meds && <Flag active={true} label="Controlled" />}
                    {r.covert_meds && <Flag active={true} label="Covert" />}
                    {r.prn_protocol && <Flag active={true} label="PRN" />}
                    {r.crushing_required && <Flag active={true} label="Crushed" />}
                    {r.signed_off_by && <Flag active={true} label="Signed off" />}
                  </div>
                )}
                {r.assessed_at && (
                  <p className="text-xs text-slate-600">Assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}{r.review_date && <span> · Review {format(new Date(r.review_date), 'dd MMM yyyy')}</span>}</p>
                )}
                {!r.id && <p className="text-xs text-slate-500 italic">No assessment recorded yet — click to add one</p>}
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-auto"><Eye className="w-3 h-3" /><span>{r.id ? 'Click to view full assessment' : 'Click to add assessment'}</span></div>
              </button>
            )
          })}
        </div>
      )}

      {viewRecord && (
        <ViewAssessmentModal record={viewRecord} onClose={() => setViewRecord(null)}
          onEdit={() => openEditForm(viewRecord)}
          onNewAssessment={() => { setForm({ ...EMPTY_FORM, suId: viewRecord.su_id }); setViewRecord(null); setShowForm(true) }} />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={form.id ? 'Edit Assessment' : 'New Medication Risk Assessment'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <Select label="Service User *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => setF('suId', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Swallowing risk" options={SWALLOWING_RISK} value={form.swallowingRisk} onChange={e => setF('swallowingRisk', e.target.value)} />
            <Select label="Administration route" options={ADMIN_ROUTES} value={form.administrationRoute} onChange={e => setF('administrationRoute', e.target.value)} />
          </div>

          {form.swallowingRisk !== 'none' && (
            <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Swallowing notes</label>
              <textarea className="input" rows={2} value={form.swallowingNotes} onChange={e => setF('swallowingNotes', e.target.value)} /></div>
          )}

          <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Known allergies</label>
            <textarea className="input" rows={2} value={form.knownAllergies} onChange={e => setF('knownAllergies', e.target.value)} placeholder="List any known allergies or drug reactions..." /></div>

          {/* Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'selfMedicate',     label: 'Can self-medicate' },
              { key: 'covertMeds',       label: 'Covert medication in use' },
              { key: 'crushingRequired', label: 'Crushing required' },
              { key: 'prnProtocol',      label: 'PRN protocol in place' },
              { key: 'controlledMeds',   label: 'Controlled medication' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setF(key, e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {form.selfMedicate && (
            <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Self-medicate notes</label>
              <textarea className="input" rows={2} value={form.selfMedicateNotes} onChange={e => setF('selfMedicateNotes', e.target.value)} /></div>
          )}

          {form.prnProtocol && (
            <div><label className="text-xs font-medium text-slate-400 block mb-1.5">PRN protocol notes</label>
              <textarea className="input" rows={2} value={form.prnNotes} onChange={e => setF('prnNotes', e.target.value)} /></div>
          )}

          {form.crushingRequired && (
            <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Crushing notes</label>
              <textarea className="input" rows={2} value={form.crushingNotes} onChange={e => setF('crushingNotes', e.target.value)} /></div>
          )}

          {/* Controlled medication — risk notes only; witness sign-off happens at administration in MAR */}
          {form.controlledMeds && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Controlled Medication
              </p>
              <p className="text-xs text-slate-400">Witness sign-off for controlled drugs is recorded at the point of administration in the MAR chart, not here.</p>
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Controlled medication notes</label>
                <textarea className="input" rows={2} value={form.controlledNotes} onChange={e => setF('controlledNotes', e.target.value)} placeholder="Details about the controlled medication..." /></div>
            </div>
          )}

          {/* Covert medication authorization */}
          {form.covertMeds && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Covert Medication — MCA Authorization</p>
              <p className="text-xs text-slate-400">Covert medication must be authorised under the Mental Capacity Act.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.mcaCompleted} onChange={e => setF('mcaCompleted', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">MCA assessment has been completed</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Date of MCA assessment</label>
                  <input type="date" className="input w-full" value={form.mcaDate} onChange={e => setF('mcaDate', e.target.value)} /></div>
                <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Name of MCA assessor</label>
                  <input className="input w-full" value={form.mcaAssessor} onChange={e => setF('mcaAssessor', e.target.value)} placeholder="Full name..." /></div>
              </div>
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Reason for covert administration</label>
                <textarea className="input" rows={2} value={form.mcaReason} onChange={e => setF('mcaReason', e.target.value)} placeholder="Explain why covert medication is necessary..." /></div>
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Authorised by (name & role)</label>
                <input className="input w-full" value={form.mcaAuthorisedBy} onChange={e => setF('mcaAuthorisedBy', e.target.value)} placeholder="e.g. Jane Smith, Registered Manager" /></div>
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Additional notes</label>
                <textarea className="input" rows={2} value={form.covertNotes} onChange={e => setF('covertNotes', e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Storage location</label>
              <input className="input w-full" value={form.storageLocation} onChange={e => setF('storageLocation', e.target.value)} placeholder="e.g. Locked cabinet Room 4" /></div>
            <Select label="Overall risk level" options={RISK_LEVELS} value={form.riskLevel} onChange={e => setF('riskLevel', e.target.value)} />
          </div>

          <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Risk Management Plan</label>
            <textarea className="input" rows={3} value={form.riskNotes} onChange={e => setF('riskNotes', e.target.value)} placeholder="Describe the risk management plan..." /></div>

          <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Triggers</label>
            <textarea className="input" rows={2} value={form.triggers} onChange={e => setF('triggers', e.target.value)} placeholder="What situations may trigger a risk incident..." /></div>

          <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Protective Factors</label>
            <textarea className="input" rows={2} value={form.protectiveFactors} onChange={e => setF('protectiveFactors', e.target.value)} placeholder="What measures help mitigate the risk..." /></div>

          <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Review date</label>
            <input type="date" className="input w-48" value={form.reviewDate} onChange={e => setF('reviewDate', e.target.value)} /></div>

          {/* Attachment — real file upload */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attach Document
            </label>
            {form.documentUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href={form.documentUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-emerald-400 underline truncate flex-1">{form.documentName || 'Attached document'}</a>
                <button type="button" onClick={() => { setF('documentUrl', ''); setF('documentName', ''); if (fileRef.current) fileRef.current.value = '' }}
                  className="p-1 rounded hover:bg-white/10"><X className="w-3.5 h-3.5 text-slate-400" /></button>
              </div>
            ) : (
              <label className={clsx('flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors', uploading ? 'border-amber-400/30 bg-amber-400/5' : 'border-white/12 hover:border-amber-400/30 hover:bg-amber-400/5')}>
                {uploading ? <Spinner /> : <Upload className="w-4 h-4 text-slate-500" />}
                <span className="text-sm text-slate-500">{uploading ? 'Uploading…' : 'Click to attach document (PDF, Word, image)'}</span>
                <input ref={fileRef} type="file" className="hidden" disabled={uploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </label>
            )}
            <textarea className="input mt-2" rows={1} value={form.attachmentNotes} onChange={e => setF('attachmentNotes', e.target.value)} placeholder="Additional attachment notes or references..." />
          </div>

          {/* Staff sign-off */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(232,177,48,0.05)', border: '1px solid rgba(232,177,48,0.2)' }}>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Assessment Sign-Off
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Signed off by</label>
                <input className="input w-full" value={form.signedOffBy} onChange={e => setF('signedOffBy', e.target.value)}
                  placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`} /></div>
              <div><label className="text-xs font-medium text-slate-400 block mb-1.5">Date</label>
                <input type="date" className="input w-full" value={form.signedOffDate} onChange={e => setF('signedOffDate', e.target.value)} /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Assessor signature</label>
              <SignaturePad label="" onSave={d => setF('staffSignature', d)} savedSignature={form.staffSignature || null} />
            </div>
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
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {r.risk_level && <span className={clsx('px-3 py-1 rounded-full text-xs font-bold border capitalize', riskBadge(r.risk_level))}>{r.risk_level} risk</span>}
              {r.assessed_at && <span className="text-xs text-slate-500">Assessed {format(new Date(r.assessed_at), 'dd MMM yyyy')}</span>}
              {r.review_date && <span className="text-xs text-slate-500">Review due {format(new Date(r.review_date), 'dd MMM yyyy')}</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Flag active={!!r.controlled_meds} label="Controlled meds" />
              <Flag active={!!r.self_medicate} label="Self-medicate" />
              <Flag active={!!r.covert_meds} label="Covert meds" />
              <Flag active={!!r.prn_protocol} label="PRN protocol" />
              <Flag active={!!r.crushing_required} label="Crushing required" />
            </div>

            <div className="space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <InfoRow label="Administration route" value={r.administration_route} />
              <InfoRow label="Swallowing risk" value={r.swallowing_risk !== 'none' ? r.swallowing_risk : null} />
              {r.swallowing_notes && <InfoRow label="Swallowing notes" value={r.swallowing_notes} />}
              {r.self_medicate_notes && <InfoRow label="Self-medicate notes" value={r.self_medicate_notes} />}
              {r.known_allergies && <div><p className="text-xs text-slate-500 mb-0.5">Known allergies</p><p className="text-rose-300 text-sm">{r.known_allergies}</p></div>}
              <InfoRow label="Storage location" value={r.storage_location} />
            </div>

            {r.controlled_meds && (
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5"><Lock className="w-3 h-3" /> Controlled Medication</p>
                {r.controlled_notes && <p className="text-slate-300 text-sm whitespace-pre-line">{r.controlled_notes}</p>}
                <p className="text-xs text-slate-500 italic">Witness sign-off is recorded per administration in the MAR chart.</p>
              </div>
            )}

            {r.risk_notes && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <p className="text-xs text-slate-500 mb-1">Risk Management Plan</p>
              <p className="text-slate-300 text-sm whitespace-pre-line">{r.risk_notes}</p>
            </div>}

            {(r.triggers || r.protective_factors) && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }} className="space-y-2">
              {r.triggers && <InfoRow label="Triggers" value={r.triggers} />}
              {r.protective_factors && <InfoRow label="Protective factors" value={r.protective_factors} />}
            </div>}

            {r.prn_protocol && r.prn_notes && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <p className="text-xs text-amber-400 mb-1 font-semibold uppercase tracking-wider">PRN Protocol</p>
              <p className="text-slate-300 text-sm whitespace-pre-line">{r.prn_notes}</p>
            </div>}

            {r.covert_meds && r.covert_notes && <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Covert Medication — MCA Details</p>
              <p className="text-slate-300 text-sm whitespace-pre-line">{r.covert_notes}</p>
            </div>}

            {r.document_url && <div className="p-3 rounded-xl" style={{ background: 'rgba(232,177,48,0.06)', border: '1px solid rgba(232,177,48,0.2)' }}>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attached Document</p>
              <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 underline">{r.document_name || 'View document'}</a>
              {r.attachment_notes && <p className="text-slate-400 text-xs mt-1">{r.attachment_notes}</p>}
            </div>}

            {r.signed_off_by && <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Check className="w-3 h-3" /> Signed Off</p>
              <p className="text-xs text-slate-400">Signed by: <span className="text-white">{r.signed_off_by}</span>{r.signed_off_date && <span> on {format(new Date(r.signed_off_date), 'dd MMM yyyy')}</span>}</p>
              {r.staff_signature && <div className="mt-2 border border-emerald-500/30 rounded-xl overflow-hidden bg-white w-64">
                <img src={r.staff_signature} alt="Assessor signature" className="w-full h-16 object-contain" />
              </div>}
            </div>}

            <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Button variant="gold" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={onEdit}>Edit Assessment</Button>
              <Button variant="ghost" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => printMedRiskAssessment(r)}>Print</Button>
              <Button variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={onNewAssessment}>New Assessment</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
