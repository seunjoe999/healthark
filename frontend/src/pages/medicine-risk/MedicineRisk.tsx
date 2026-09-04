import React, { useState, useEffect, useRef } from 'react'
import { ShieldAlert, Plus, CheckCircle2, XCircle, AlertTriangle, Paperclip, Eye, Edit2, Upload, X, Check, Lock, Printer } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState } from '../../components/ui'
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
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11.5px;line-height:1.5;background:#fff}
  .page{max-width:190mm;margin:0 auto;padding:16mm 14mm 20mm}

  /* Letterhead */
  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;background:#132a4f;padding:12px 16px;margin:-16mm -14mm 4px;border-bottom:3px solid #e8b130}
  .org-name{font-size:15px;font-weight:700;letter-spacing:.01em;color:#fff}
  .org-addr{font-size:9.5px;color:#c9d3e3;margin-top:3px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9.5px;color:#c9d3e3;font-family:Arial,sans-serif;line-height:1.6}
  .doc-meta strong{color:#fff}

  .doc-title{text-align:center;margin:20px 0 4px;font-size:19px;font-weight:700;letter-spacing:.02em}
  .doc-subtitle{text-align:center;font-size:10px;color:#555;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.09em;margin-bottom:18px}

  /* Resident identity block */
  table.idtable{width:100%;border-collapse:collapse;margin-bottom:20px;font-family:Arial,sans-serif;font-size:10.5px}
  table.idtable td{border:1px solid #999;padding:6px 10px;vertical-align:top}
  table.idtable td.lbl{width:19%;background:#f2f2f0;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.05em;color:#333}
  table.idtable td.val{width:31%;font-size:11px}

  /* Section headings */
  h2.sec{font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#1a1a1a;border-bottom:1px solid #1a1a1a;padding-bottom:4px;margin:22px 0 10px;page-break-after:avoid}
  h2.sec .num{display:inline-block;width:18px}
  h3.sub{font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;color:#1a1a1a;margin:12px 0 4px;page-break-after:avoid}
  .body-text{font-size:11px;line-height:1.7;color:#222;white-space:pre-line;margin-bottom:8px}

  /* Data / field tables */
  table.fields{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10.5px;page-break-inside:avoid}
  table.fields th{width:38%;text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  table.fields td{border:1px solid #999;padding:6px 10px;font-size:11px}
  table.fields tr.on td{font-weight:700}

  /* Risk summary */
  .risk-box{border:1.5px solid #1a1a1a;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif}
  .risk-box .rb-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#444}
  .risk-box .rb-value{font-size:14px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}
  .risk-box.high{border-width:2.5px}

  .allergy-block{border:1px solid #1a1a1a;border-left:5px solid #1a1a1a;padding:9px 14px;margin-bottom:16px;font-family:Arial,sans-serif}
  .allergy-block .al-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .allergy-block .al-val{font-size:12.5px;font-weight:700}

  /* Sign-off */
  .signoff{margin-top:26px;page-break-inside:avoid}
  table.sigtable{width:100%;border-collapse:collapse;margin-bottom:16px;font-family:Arial,sans-serif;font-size:10.5px}
  table.sigtable th{width:30%;text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  table.sigtable td{border:1px solid #999;padding:6px 10px}
  .sig-panel{display:flex;gap:24px;margin-top:6px}
  .sig-cell{flex:1}
  .sig-img-slot{height:52px;border-bottom:1px solid #1a1a1a;display:flex;align-items:flex-end;padding-bottom:2px}
  .sig-img-slot img{max-height:48px;max-width:200px}
  .sig-caption{font-family:Arial,sans-serif;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-top:4px}

  .footer{margin-top:28px;padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8.5px;color:#555}
  .footer .confid{font-weight:700;letter-spacing:.05em}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4}
    .page{padding:14mm 14mm 16mm}
  }
`

function buildMedRiskPrintBody(r: any): string {
  const rl = r.risk_level || 'low'
  const rlLabel = rl.charAt(0).toUpperCase() + rl.slice(1)
  const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const yn = (v: boolean) => v ? 'Yes' : 'No'
  const esc = (v: any) => v === null || v === undefined || v === '' ? '—' : String(v)

  const routeLabel = (ADMIN_ROUTES.find(a => a.value === r.administration_route)?.label) || esc(r.administration_route)

  // Build sections as an ordered list, then number them in a single final
  // pass so the printed numbering always matches render order — regardless
  // of which optional sections are present for this assessment.
  const sections: { title: string; inner: string }[] = []

  sections.push({
    title: 'Risk Summary',
    inner: `
      <div class="risk-box${rl === 'high' ? ' high' : ''}">
        <span class="rb-label">Overall Risk Level</span>
        <span class="rb-value">${rlLabel}</span>
      </div>
      <table class="fields">
        <tr><th>Date Assessed</th><td>${fmtDate(r.assessed_at)}</td></tr>
        <tr><th>Next Review Due</th><td>${fmtDate(r.review_date)}</td></tr>
      </table>
    `,
  })

  const flagRow = (label: string, active: boolean) =>
    `<tr class="${active ? 'on' : ''}"><th>${label}</th><td>${yn(!!active)}</td></tr>`
  sections.push({
    title: 'Medication Management Flags',
    inner: `
      <table class="fields">
        ${flagRow('Controlled Medication', !!r.controlled_meds)}
        ${flagRow('Self-Medicates', !!r.self_medicate)}
        ${flagRow('Covert Medication (MCA authorised)', !!r.covert_meds)}
        ${flagRow('PRN Protocol in Place', !!r.prn_protocol)}
        ${flagRow('Crushing Required', !!r.crushing_required)}
      </table>
    `,
  })

  if (r.known_allergies) {
    sections.push({
      title: 'Known Allergies',
      inner: `
        <div class="allergy-block">
          <div class="al-label">Known Allergies</div>
          <div class="al-val">${esc(r.known_allergies)}</div>
        </div>
      `,
    })
  }

  sections.push({
    title: 'Administration &amp; Storage',
    inner: `
      <table class="fields">
        <tr><th>Administration Route</th><td>${routeLabel}</td></tr>
        <tr><th>Storage Location</th><td>${esc(r.storage_location)}</td></tr>
      </table>
    `,
  })

  const clinicalParts: string[] = []
  if (r.controlled_meds) clinicalParts.push(`<h3 class="sub">Controlled Medication</h3><p class="body-text">${esc(r.controlled_notes || 'No additional notes recorded.')}</p>`)
  if (r.self_medicate && r.self_medicate_notes) clinicalParts.push(`<h3 class="sub">Self-Medication Arrangements</h3><p class="body-text">${esc(r.self_medicate_notes)}</p>`)
  if (r.prn_protocol && r.prn_notes) clinicalParts.push(`<h3 class="sub">PRN Protocol</h3><p class="body-text">${esc(r.prn_notes)}</p>`)
  if (r.crushing_required && r.crushing_notes) clinicalParts.push(`<h3 class="sub">Crushing / Modified Administration</h3><p class="body-text">${esc(r.crushing_notes)}</p>`)
  if (r.covert_meds && r.covert_notes) clinicalParts.push(`<h3 class="sub">Covert Medication — Mental Capacity Act Details</h3><p class="body-text">${esc(r.covert_notes)}</p>`)
  if (clinicalParts.length) sections.push({ title: 'Clinical Notes', inner: clinicalParts.join('') })

  const riskParts: string[] = []
  if (r.risk_notes) riskParts.push(`<h3 class="sub">Management Plan</h3><p class="body-text">${esc(r.risk_notes)}</p>`)
  if (r.triggers) riskParts.push(`<h3 class="sub">Known Triggers</h3><p class="body-text">${esc(r.triggers)}</p>`)
  if (r.protective_factors) riskParts.push(`<h3 class="sub">Protective Factors</h3><p class="body-text">${esc(r.protective_factors)}</p>`)
  if (riskParts.length) sections.push({ title: 'Risk Management Plan', inner: riskParts.join('') })

  if (r.signed_off_by) {
    sections.push({
      title: 'Assessment Sign-Off',
      inner: `
        <div class="signoff">
          <table class="sigtable">
            <tr><th>Assessed / Signed Off By</th><td>${esc(r.signed_off_by)}</td></tr>
            <tr><th>Date</th><td>${fmtDate(r.signed_off_date)}</td></tr>
          </table>
          <div class="sig-panel">
            <div class="sig-cell">
              <div class="sig-img-slot">${r.staff_signature ? `<img src="${r.staff_signature}" alt="Signature" />` : ''}</div>
              <div class="sig-caption">Signature</div>
            </div>
            <div class="sig-cell">
              <div class="sig-img-slot"></div>
              <div class="sig-caption">Countersigned by (if applicable)</div>
            </div>
          </div>
        </div>
      `,
    })
  }

  const sectionsHtml = sections.map((s, i) =>
    `<h2 class="sec"><span class="num">${i + 1}.</span>${s.title}</h2>${s.inner}`
  ).join('')

  return `
  <div class="page">
    <div class="letterhead">
      <div>
        <div class="org-name">Comprehensive Care Ltd</div>
        <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
      </div>
      <div class="doc-meta">
        <div>Document ref: MRA-${r.id || '—'}</div>
        <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
      </div>
    </div>

    <div class="doc-title">Medication Risk Assessment</div>
    <div class="doc-subtitle">Individual resident record</div>

    <table class="idtable">
      <tr>
        <td class="lbl">Resident</td><td class="val">${esc(r.su_name)}</td>
        <td class="lbl">Room</td><td class="val">${esc(r.room_number)}</td>
      </tr>
    </table>

    ${sectionsHtml}

    <div class="footer">
      <span class="confid">CONFIDENTIAL — Resident health record</span>
      <span>Printed ${fmtDate(new Date().toISOString())}</span>
    </div>
  </div>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400" /> Medication Risk Assessment
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Medication administration risk for each resident</p>
        </div>
        <div className="flex items-center gap-2">
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
