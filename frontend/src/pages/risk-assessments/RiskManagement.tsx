import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, SpeechTextarea } from '../../components/ui'
import { Shield, Plus, ChevronDown, ChevronUp, Edit2, X, Check, History, Printer, BookOpen, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const RISK_LEVELS = [
  { value: 'low',      label: 'Low',      color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium',   label: 'Medium',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'high',     label: 'High',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
]

const LIKELIHOOD_OPTIONS = [
  { value: '1', label: '1 — Rare',        riskLevel: 'low' },
  { value: '2', label: '2 — Possible',    riskLevel: 'medium' },
  { value: '3', label: '3 — Likely',      riskLevel: 'high' },
  { value: '4', label: '4 — Very Likely', riskLevel: 'critical' },
]

function likelihoodToRiskLevel(v: string): string {
  return LIKELIHOOD_OPTIONS.find(o => o.value === v)?.riskLevel || 'low'
}

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_LEVELS.find(r => r.value === level) || RISK_LEVELS[0]
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.color} capitalize`}>
      {cfg.label}
    </span>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  )
}

const BLANK_FORM = {
  assessmentName: '', description: '', riskRating: 'low', currentRiskLevel: 'low',
  whoIsAtRisk: '', whatCouldHappen: '', triggers: '', protectiveFactors: '',
  managementPlan: '', historicalContext: '', reviewFrequency: 'monthly',
  riskBeforeIntervention: '', riskRatingOption: '', riskAfterControls: '',
  riskUpdateTracking: '', lastAssessedDate: '',
}

export default function RiskManagement() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'senior_carer')

  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [updateNotesItem, setUpdateNotesItem] = useState<any>(null)

  const [form, setForm] = useState({ ...BLANK_FORM, suId: '' })
  const [saving, setSaving] = useState(false)

  const [updateNotes, setUpdateNotes] = useState('')
  const [updateRiskLevel, setUpdateRiskLevel] = useState('medium')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [signOffItem, setSignOffItem] = useState<any>(null)
  const [signOffForm, setSignOffForm] = useState({ signedOffBy: '', signedOffDate: '' })

  const markRead = (id: string) => setReadIds(prev => new Set([...prev, id]))

  const RA_PRINT_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11.5px;line-height:1.5;background:#fff}
    .page{max-width:190mm;margin:0 auto;padding:16mm 14mm 20mm;page-break-after:always}
    .page:last-child{page-break-after:avoid}

    /* Letterhead */
    .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:10px;margin-bottom:4px}
    .org-name{font-size:15px;font-weight:700;letter-spacing:.01em;color:#132a4f}
    .org-addr{font-size:9.5px;color:#444;margin-top:3px;font-family:Arial,sans-serif}
    .doc-meta{text-align:right;font-size:9.5px;color:#444;font-family:Arial,sans-serif;line-height:1.6}
    .doc-meta strong{color:#132a4f}

    .doc-title{text-align:center;margin:20px 0 4px;font-size:19px;font-weight:700;letter-spacing:.02em;color:#132a4f;border-top:3px solid #e8b130;padding-top:14px}
    .doc-subtitle{text-align:center;font-size:10px;color:#555;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.09em;margin-bottom:18px}

    /* Resident identity block */
    table.idtable{width:100%;border-collapse:collapse;margin-bottom:20px;font-family:Arial,sans-serif;font-size:10.5px}
    table.idtable td{border:1px solid #999;padding:6px 10px;vertical-align:top}
    table.idtable td.lbl{width:19%;background:#f2f2f0;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.05em;color:#333}
    table.idtable td.val{width:31%;font-size:11px}

    /* Section headings */
    h2.sec{font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#132a4f;border-bottom:1px solid #132a4f;padding-bottom:4px;margin:22px 0 10px;page-break-after:avoid}
    h2.sec .num{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:#e8b130;color:#132a4f;border-radius:3px;font-size:10px;margin-right:2px}
    h3.sub{font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;color:#132a4f;margin:12px 0 4px;page-break-after:avoid}
    .body-text{font-size:11px;line-height:1.7;color:#222;white-space:pre-line;margin-bottom:8px}

    /* Data / field tables */
    table.fields{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10.5px;page-break-inside:avoid}
    table.fields th{width:38%;text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#333}
    table.fields td{border:1px solid #999;padding:6px 10px;font-size:11px}

    /* Risk summary */
    .risk-box{border:1.5px solid #132a4f;border-left:6px solid #e8b130;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif;page-break-inside:avoid}
    .risk-box .rb-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#444}
    .risk-box .rb-value{font-size:14px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:#fdf3d9;color:#8a6400;padding:3px 10px;border-radius:3px}
    .risk-box.high{border-width:2.5px}
    .risk-box.high .rb-value{background:#e8b130;color:#132a4f}
    .risk-box.critical{border-width:2.5px;border-style:double}
    .risk-box.critical .rb-value{background:#132a4f;color:#e8b130}

    .footer{margin-top:28px;padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8.5px;color:#555}
    .footer .confid{font-weight:700;letter-spacing:.05em}

    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{margin:0;size:A4}
      .page{padding:14mm 14mm 16mm}
    }
  `

  const buildRaBody = (ra: any) => {
    const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
    const esc = (v: any) => v === null || v === undefined || v === '' ? '—' : String(v)
    const nl = (v: string) => esc(v).replace(/\n/g, '<br/>')

    const riskLevel = ra.risk_rating || ra.current_risk_level || 'low'
    const rl = RISK_LEVELS.find(r => r.value === riskLevel)
    const likelihood = LIKELIHOOD_OPTIONS.find(o => o.value === ra.risk_rating_option)

    // Build sections as an ordered list, then number them in a single final
    // pass so the printed numbering always matches render order — regardless
    // of which optional sections are present for this assessment.
    const sections: { title: string; inner: string }[] = []

    sections.push({
      title: 'Risk Summary',
      inner: `
        <div class="risk-box${riskLevel === 'high' ? ' high' : ''}${riskLevel === 'critical' ? ' critical' : ''}">
          <span class="rb-label">Overall Risk Level</span>
          <span class="rb-value">${esc(rl?.label || 'Unknown')}</span>
        </div>
        <table class="fields">
          <tr><th>Last Assessed</th><td>${fmtDate(ra.last_assessed_date)}</td></tr>
          <tr><th>Next Review Due</th><td>${fmtDate(ra.next_review_date)}</td></tr>
        </table>
      `,
    })

    if (ra.description) {
      sections.push({ title: 'What is the Risk', inner: `<p class="body-text">${nl(ra.description)}</p>` })
    }

    if (ra.risk_before_intervention) {
      sections.push({ title: 'Risk Before Intervention', inner: `<p class="body-text">${nl(ra.risk_before_intervention)}</p>` })
    }

    if (ra.who_is_at_risk) {
      sections.push({ title: 'Who is at Risk', inner: `<p class="body-text">${nl(ra.who_is_at_risk)}</p>` })
    }

    if (ra.what_could_happen) {
      sections.push({ title: 'What Could Happen', inner: `<p class="body-text">${nl(ra.what_could_happen)}</p>` })
    }

    if (ra.triggers) {
      sections.push({ title: 'Triggers', inner: `<p class="body-text">${nl(ra.triggers)}</p>` })
    }

    if (ra.protective_factors) {
      sections.push({ title: 'Protective Factors', inner: `<p class="body-text">${nl(ra.protective_factors)}</p>` })
    }

    if (ra.management_plan) {
      sections.push({ title: 'Risk Management Plan', inner: `<p class="body-text">${nl(ra.management_plan)}</p>` })
    }

    if (likelihood) {
      sections.push({ title: 'Risk Likelihood', inner: `<p class="body-text">${esc(likelihood.label)}</p>` })
    }

    if (ra.risk_after_controls) {
      sections.push({ title: 'Risk Occurring Following Control Measures', inner: `<p class="body-text">${nl(ra.risk_after_controls)}</p>` })
    }

    if (ra.risk_update_tracking) {
      sections.push({ title: 'Risk Update Tracking', inner: `<p class="body-text">${nl(ra.risk_update_tracking)}</p>` })
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
          <div>Document ref: RA-${ra.id || '—'}</div>
          <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
        </div>
      </div>

      <div class="doc-title">Risk Assessment</div>
      <div class="doc-subtitle">${esc(ra.assessment_name)}</div>

      <table class="idtable">
        <tr>
          <td class="lbl">Resident</td><td class="val">${esc(ra.su_name)}</td>
          <td class="lbl">Assessment</td><td class="val">${esc(ra.assessment_name)}</td>
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

  const printAssessment = (ra: any) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${ra.assessment_name} — Risk Assessment</title><style>${RA_PRINT_CSS}</style></head><body>${buildRaBody(ra)}</body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  const printAll = () => {
    if (!assessments.length) return
    const suName = selectedSu ? sus.find(s => s.id === selectedSu) : null
    const title = suName ? `${suName.first_name} ${suName.last_name} — All Risk Assessments` : 'All Risk Assessments'
    const pages = assessments.map(ra => buildRaBody(ra)).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title><style>${RA_PRINT_CSS}</style></head><body>${pages}</body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

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
  }, [selectedHome])

  useEffect(() => {
    if (!selectedHome) return
    load()
  }, [selectedHome, selectedSu])

  const load = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (selectedSu) params.suId = selectedSu
      else params.homeId = selectedHome
      const res = await api.get('/risk-assessments', { params })
      setAssessments(res.data.data || [])
    } catch { toast.error('Failed to load risk management plans') }
    finally { setLoading(false) }
  }

  const getName = (su: any) =>
    `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.suId || !form.assessmentName) { toast.error('Service user and plan name are required'); return }
    setSaving(true)
    try {
      const riskLevel = form.riskRatingOption ? likelihoodToRiskLevel(form.riskRatingOption) : form.riskRating
      await api.post('/risk-assessments', {
        suId: form.suId, homeId: selectedHome,
        assessmentName: form.assessmentName, description: form.description,
        riskLevel, currentRiskLevel: riskLevel, riskRating: riskLevel,
        whoIsAtRisk: form.whoIsAtRisk, whatCouldHappen: form.whatCouldHappen,
        triggers: form.triggers, protectiveFactors: form.protectiveFactors,
        managementPlan: form.managementPlan, historicalContext: form.historicalContext,
        reviewFrequency: form.reviewFrequency,
        riskBeforeIntervention: form.riskBeforeIntervention,
        riskRatingOption: form.riskRatingOption,
        riskAfterControls: form.riskAfterControls,
        riskUpdateTracking: form.riskUpdateTracking,
        lastAssessedDate: form.lastAssessedDate || undefined,
      })
      toast.success('Risk management plan created')
      setCreateOpen(false)
      setForm({ ...BLANK_FORM, suId: '' })
      load()
    } catch { toast.error('Failed to create plan') }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      const riskLevel = form.riskRatingOption ? likelihoodToRiskLevel(form.riskRatingOption) : form.riskRating
      await api.put(`/risk-assessments/${editItem.id}`, {
        description: form.description, currentRiskLevel: riskLevel,
        riskRating: riskLevel, managementPlan: form.managementPlan,
        triggers: form.triggers, protectiveFactors: form.protectiveFactors,
        historicalContext: form.historicalContext, reviewFrequency: form.reviewFrequency,
        riskBeforeIntervention: form.riskBeforeIntervention,
        riskRatingOption: form.riskRatingOption,
        riskAfterControls: form.riskAfterControls,
        riskUpdateTracking: form.riskUpdateTracking,
        lastAssessedDate: form.lastAssessedDate || undefined,
      })
      toast.success('Risk management plan updated')
      setEditItem(null)
      load()
    } catch { toast.error('Failed to update plan') }
    finally { setSaving(false) }
  }

  const handleAddUpdate = async () => {
    if (!updateNotesItem || !updateNotes.trim()) { toast.error('Enter update notes'); return }
    setSaving(true)
    try {
      await api.put(`/risk-assessments/${updateNotesItem.id}`, {
        currentRiskLevel: updateRiskLevel, riskRating: updateRiskLevel,
        updateNotes: updateNotes,
      })
      toast.success('Update recorded')
      setUpdateNotesItem(null)
      setUpdateNotes('')
      load()
    } catch { toast.error('Failed to save update') }
    finally { setSaving(false) }
  }

  const handleSignOff = async () => {
    if (!signOffItem) return
    if (!signOffForm.signedOffBy.trim()) { toast.error('Enter the name of the person signing off'); return }
    setSaving(true)
    try {
      await api.put(`/risk-assessments/${signOffItem.id}`, {
        signedOff: true,
        signedOffBy: signOffForm.signedOffBy,
        signedOffDate: signOffForm.signedOffDate || new Date().toISOString().split('T')[0],
      })
      toast.success('Assessment signed off')
      setSignOffItem(null)
      setSignOffForm({ signedOffBy: '', signedOffDate: '' })
      load()
    } catch { toast.error('Failed to save sign-off') }
    finally { setSaving(false) }
  }

  const openEdit = (ra: any) => {
    setForm({
      assessmentName: ra.assessment_name || '',
      description: ra.description || '',
      riskRating: ra.risk_rating || ra.current_risk_level || 'low',
      currentRiskLevel: ra.current_risk_level || 'low',
      whoIsAtRisk: ra.who_is_at_risk || '',
      whatCouldHappen: ra.what_could_happen || '',
      triggers: ra.triggers || '',
      protectiveFactors: ra.protective_factors || '',
      managementPlan: ra.management_plan || '',
      historicalContext: ra.historical_context || '',
      reviewFrequency: ra.review_frequency || 'monthly',
      suId: ra.su_id || '',
      riskBeforeIntervention: ra.risk_before_intervention || '',
      riskRatingOption: ra.risk_rating_option || '',
      riskAfterControls: ra.risk_after_controls || '',
      riskUpdateTracking: ra.risk_update_tracking || '',
      lastAssessedDate: ra.last_assessed_date ? ra.last_assessed_date.split('T')[0] : '',
    })
    setEditItem(ra)
  }

  const archive = async (id: string) => {
    if (!window.confirm('Archive this risk management plan?')) return
    try {
      await api.delete(`/risk-assessments/${id}`)
      toast.success('Archived')
      load()
    } catch { toast.error('Failed to archive') }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Print-only header — hidden on screen, visible when printing */}
      <div className="print-only">
        <div className="print-logo">CompCare Hub</div>
        <div className="print-title">Risk Management Plans</div>
        <div className="print-meta">
          {selectedSu
            ? `Resident: ${getName(sus.find(s => s.id === selectedSu) || {})}  · `
            : 'All residents  · '
          }
          Printed: {format(new Date(), 'd MMMM yyyy, HH:mm')}
        </div>
      </div>

      <div className="flex items-start justify-between mb-6 no-print p-4 rounded-2xl" style={{ background: 'rgba(232,177,48,0.12)', border: '1px solid rgba(232,177,48,0.3)' }}>
        <div>
          <h1 className="text-2xl font-bold uppercase flex items-center gap-2" style={{ color: '#e8b130' }}>
            <Shield className="w-6 h-6" style={{ color: '#e8b130' }} /> RISK MANAGEMENT
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Risk management plans for service users</p>
        </div>
        <div className="flex items-center gap-2">
          {assessments.length > 0 && (
            <Button size="sm" variant="outline" icon={<Printer className="w-4 h-4" />} onClick={printAll}>
              Print all
            </Button>
          )}
          {homes.length > 1 && (
            <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          {canManage && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setForm({ ...BLANK_FORM, suId: '' }); setCreateOpen(true) }}>
              New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter by resident */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6 no-print">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Filter by resident</label>
            <select className="input w-auto" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
              <option value="">All residents</option>
              {sus.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {RISK_LEVELS.map(rl => (
          <div key={rl.value} className={`bg-white rounded-xl border shadow-sm p-4 border-l-4 ${rl.color.replace('bg-', 'border-l-').split(' ')[0]}`}>
            <p className="text-2xl font-bold text-slate-900">
              {assessments.filter(a => (a.risk_rating || a.current_risk_level) === rl.value).length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{rl.label} Risk</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? <Spinner /> : assessments.length === 0 ? (
        <EmptyState title="No risk management plans" description="Create a risk management plan to get started."
          action={canManage ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New Plan</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {assessments.map((ra: any) => {
            const isExpanded = expandedId === ra.id
            const likelihood = LIKELIHOOD_OPTIONS.find(o => o.value === ra.risk_rating_option)
            return (
              <div key={ra.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedId(p => p === ra.id ? null : ra.id)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-slate-900 text-sm">{ra.assessment_name}</h3>
                        <RiskBadge level={ra.risk_rating || ra.current_risk_level || 'low'} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                        <span>{ra.su_name}</span>
                        {ra.next_review_date && (
                          <span>Review: {format(new Date(ra.next_review_date), 'd MMM yyyy')}</span>
                        )}
                        {ra.last_assessed_date && (
                          <span>Last assessed: {format(new Date(ra.last_assessed_date), 'd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {/* Action bar */}
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                      <button
                        onClick={() => { markRead(ra.id); toast.success('Marked as read') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${readIds.has(ra.id) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        {readIds.has(ra.id) ? 'Read' : 'Mark read'}
                      </button>
                      <button
                        onClick={() => printAssessment(ra)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => { setUpdateNotesItem(ra); setUpdateRiskLevel(ra.risk_rating || ra.current_risk_level || 'medium') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                            <History className="w-3.5 h-3.5" /> Record Update
                          </button>
                          <button
                            onClick={() => openEdit(ra)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => archive(ra.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition-colors ml-auto">
                            <X className="w-3.5 h-3.5" /> Archive
                          </button>
                        </>
                      )}
                    </div>

                    <div className="px-5 pb-5 pt-4 space-y-0">
                      {/* Two-column overview */}
                      <div className="grid sm:grid-cols-2 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100 mb-4">
                        {[
                          { label: 'What is the risk', value: ra.description },
                          { label: 'Who is at risk', value: ra.who_is_at_risk },
                          { label: 'What could happen', value: ra.what_could_happen },
                          { label: 'Risk before intervention', value: ra.risk_before_intervention },
                          { label: 'Triggers', value: ra.triggers },
                          { label: 'Protective factors', value: ra.protective_factors },
                        ].filter(f => f.value).map(f => (
                          <div key={f.label} className="bg-white p-4">
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#c99518' }}>{f.label}</p>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{f.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Management plan — full width highlight */}
                      {ra.management_plan && (
                        <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 mb-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">Risk Management Plan</p>
                          <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{ra.management_plan}</p>
                        </div>
                      )}

                      {/* Risk rating row */}
                      <div className="flex flex-wrap gap-3 items-center mb-4">
                        {likelihood && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-xs text-slate-500">Likelihood</span>
                            <span className="text-xs font-semibold text-slate-800">{likelihood.label}</span>
                          </div>
                        )}
                        {ra.risk_after_controls && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex-1 min-w-0">
                            <span className="text-xs text-slate-500 shrink-0">After controls</span>
                            <span className="text-xs text-slate-700 truncate">{ra.risk_after_controls}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Overall level</span>
                          <RiskBadge level={ra.risk_rating || ra.current_risk_level || 'low'} />
                        </div>
                      </div>

                      {ra.risk_update_tracking && (
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 mb-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Update tracking</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{ra.risk_update_tracking}</p>
                        </div>
                      )}

                      {/* Sign-off */}
                      {ra.signed_off ? (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">Signed off</span>
                            {ra.signed_off_by && <span> by {ra.signed_off_by}</span>}
                            {ra.signed_off_date && <span> on {format(new Date(ra.signed_off_date), 'd MMM yyyy')}</span>}
                          </p>
                        </div>
                      ) : canManage ? (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 mb-4">
                          <p className="text-xs text-slate-500">Not yet signed off</p>
                          <button
                            onClick={() => { setSignOffItem(ra); setSignOffForm({ signedOffBy: '', signedOffDate: new Date().toISOString().split('T')[0] }) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5" /> Sign Off
                          </button>
                        </div>
                      ) : null}

                      {/* Update history */}
                      <UpdateHistory raId={ra.id} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Risk Management Plan">
        <PlanForm form={form} setF={setF} sus={sus} getName={getName} saving={saving}
          onCancel={() => setCreateOpen(false)} onSave={handleCreate} isEdit={false} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit: ${editItem?.assessment_name}`}>
        <PlanForm form={form} setF={setF} sus={sus} getName={getName} saving={saving}
          onCancel={() => setEditItem(null)} onSave={handleEdit} isEdit />
      </Modal>

      {/* Sign-off modal */}
      <Modal open={!!signOffItem} onClose={() => setSignOffItem(null)} title={`Sign Off: ${signOffItem?.assessment_name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Confirm that this risk assessment has been reviewed and approved.</p>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Signed off by *</label>
            <input className="input w-full" placeholder="Full name of approver"
              value={signOffForm.signedOffBy} onChange={e => setSignOffForm(p => ({ ...p, signedOffBy: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
            <input type="date" className="input w-full"
              value={signOffForm.signedOffDate} onChange={e => setSignOffForm(p => ({ ...p, signedOffDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSignOffItem(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleSignOff} icon={<ShieldCheck className="w-4 h-4" />}>Confirm Sign Off</Button>
          </div>
        </div>
      </Modal>

      {/* Record update modal */}
      <Modal open={!!updateNotesItem} onClose={() => setUpdateNotesItem(null)} title="Record Update">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Current Risk Rating</label>
            <select className="input w-full" value={updateRiskLevel} onChange={e => setUpdateRiskLevel(e.target.value)}>
              {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <SpeechTextarea label="Update Notes *" required className="w-full" rows={4}
            placeholder="Describe what has changed, any new information, actions taken, review outcome..."
            value={updateNotes} onChange={v => setUpdateNotes(v)} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setUpdateNotesItem(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleAddUpdate} icon={<Check className="w-4 h-4" />}>Save Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PlanForm({ form, setF, sus, getName, saving, onSave, onCancel, isEdit }: {
  form: any; setF: (k: string, v: string) => void; sus: any[]; getName: (s: any) => string;
  saving: boolean; onSave: () => void; onCancel: () => void; isEdit?: boolean
}) {
  const derivedRiskLevel = form.riskRatingOption
    ? LIKELIHOOD_OPTIONS.find(o => o.value === form.riskRatingOption)?.riskLevel
    : null

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {!isEdit && (
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Service User *</label>
          <select className="input w-full" value={form.suId} onChange={e => setF('suId', e.target.value)}>
            <option value="">Select service user...</option>
            {sus.map((s: any) => <option key={s.id} value={s.id}>{getName(s)}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Risk (Plan Name) *</label>
        <input className="input w-full" placeholder="e.g. Falls Risk, Pressure Sores" value={form.assessmentName}
          onChange={e => setF('assessmentName', e.target.value)} disabled={isEdit} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Last Assessed</label>
        <input type="date" className="input w-full" value={form.lastAssessedDate}
          onChange={e => setF('lastAssessedDate', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Review Frequency</label>
        <select className="input w-full" value={form.reviewFrequency} onChange={e => setF('reviewFrequency', e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="eight_weekly">Every 8 weeks</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <SpeechTextarea label="What is the risk?" className="w-full" rows={2} placeholder="Brief overview of the risk..."
        value={form.description} onChange={v => setF('description', v)} />
      <SpeechTextarea label="Risk before intervention?" className="w-full" rows={2} placeholder="Describe the risk before any intervention..."
        value={form.riskBeforeIntervention} onChange={v => setF('riskBeforeIntervention', v)} />
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Who is at risk?</label>
        <input className="input w-full" placeholder="e.g. Service user, staff, visitors"
          value={form.whoIsAtRisk} onChange={e => setF('whoIsAtRisk', e.target.value)} />
      </div>
      <SpeechTextarea label="What could happen?" className="w-full" rows={2} placeholder="Describe the potential harm or consequence..."
        value={form.whatCouldHappen} onChange={v => setF('whatCouldHappen', v)} />
      <SpeechTextarea label="Triggers" className="w-full" rows={2} placeholder="What situations or behaviours trigger this risk..."
        value={form.triggers} onChange={v => setF('triggers', v)} />
      <SpeechTextarea label="Protective Factors" className="w-full" rows={2} placeholder="What reduces or protects against this risk..."
        value={form.protectiveFactors} onChange={v => setF('protectiveFactors', v)} />
      <SpeechTextarea label="Risk Management Plan" className="w-full" rows={3} placeholder="Step-by-step actions staff must take to manage this risk..."
        value={form.managementPlan} onChange={v => setF('managementPlan', v)} />

      {/* Risk Rating — Likelihood */}
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#e8b130' }}>
          Risk Rating = Likelihood
        </p>
        {LIKELIHOOD_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-amber-100 transition-colors">
            <input type="radio" name="likelihoodOption" value={opt.value}
              checked={form.riskRatingOption === opt.value}
              onChange={() => {
                setF('riskRatingOption', opt.value)
                setF('riskRating', opt.riskLevel)
                setF('currentRiskLevel', opt.riskLevel)
              }}
              className="flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>

      <SpeechTextarea label="Risk occurring following control measures" className="w-full" rows={2} placeholder="Describe the residual risk after controls are applied..."
        value={form.riskAfterControls} onChange={v => setF('riskAfterControls', v)} />
      <SpeechTextarea label="Risk Update Tracking" className="w-full" rows={2} placeholder="Log any ongoing updates or changes to this risk..."
        value={form.riskUpdateTracking} onChange={v => setF('riskUpdateTracking', v)} />

      {/* Summary */}
      {derivedRiskLevel && (
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#e8b130' }}>Summary — Risk Level</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${RISK_LEVELS.find(r => r.value === derivedRiskLevel)?.color}`}>
            {RISK_LEVELS.find(r => r.value === derivedRiskLevel)?.label}
          </span>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={onSave} icon={<Check className="w-4 h-4" />}>
          {isEdit ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </div>
  )
}

function UpdateHistory({ raId }: { raId: string }) {
  const [updates, setUpdates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoading(true)
    api.get(`/risk-assessments/${raId}`).then(res => {
      setUpdates((res.data.data?.updates || []))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [raId, expanded])

  return (
    <div>
      <button onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
        <History className="w-3.5 h-3.5" />
        {expanded ? 'Hide' : 'Show'} update history
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? <p className="text-xs text-slate-400">Loading...</p> : updates.length === 0 ? (
            <p className="text-xs text-slate-400">No updates recorded yet.</p>
          ) : updates.map((u: any) => (
            <div key={u.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <RiskBadgeInline level={u.new_risk_level || 'low'} />
                <span className="text-xs text-slate-400">{format(new Date(u.created_at), 'd MMM yyyy HH:mm')}</span>
                <span className="text-xs text-slate-500">· {u.updated_by_name}</span>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-line">{u.update_notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RiskBadgeInline({ level }: { level: string }) {
  const cfg = RISK_LEVELS.find(r => r.value === level) || RISK_LEVELS[0]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.color} capitalize`}>
      {cfg.label}
    </span>
  )
}
