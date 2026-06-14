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
    body{font-family:Arial,sans-serif;color:#111;padding:24px;max-width:780px;margin:0 auto}
    h1{font-size:1.3rem;margin-bottom:4px}
    .meta{font-size:.8rem;color:#555;margin-bottom:20px}
    .badge{display:inline-block;padding:3px 12px;border-radius:50px;font-size:.75rem;font-weight:700;text-transform:uppercase;margin-left:10px}
    .badge-low{background:#dcfce7;color:#166534}
    .badge-medium{background:#fef9c3;color:#854d0e}
    .badge-high{background:#ffedd5;color:#9a3412}
    .badge-critical{background:#fee2e2;color:#991b1b}
    section{margin-bottom:18px}
    section h3{font-size:.75rem;text-transform:uppercase;color:#888;letter-spacing:.06em;margin-bottom:5px}
    section p{font-size:.9rem;line-height:1.6;margin:0}
    .mgmt{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:18px}
    .mgmt h3{color:#1d4ed8}
    .page{page-break-after:always}
    .page:last-child{page-break-after:avoid}
    @media print{body{padding:0}}
  `

  const buildRaBody = (ra: any) => {
    const riskLevel = ra.risk_rating || ra.current_risk_level
    const rl = RISK_LEVELS.find(r => r.value === riskLevel)
    const likelihood = LIKELIHOOD_OPTIONS.find(o => o.value === ra.risk_rating_option)
    return `
      <h1>${ra.assessment_name}
        <span class="badge badge-${riskLevel}">${rl?.label || 'Unknown'} Risk</span>
      </h1>
      <p class="meta">Resident: <strong>${ra.su_name || '—'}</strong> &nbsp;|&nbsp; Next review: <strong>${ra.next_review_date ? new Date(ra.next_review_date).toLocaleDateString('en-GB') : '—'}</strong>${ra.last_assessed_date ? ` &nbsp;|&nbsp; Last assessed: <strong>${new Date(ra.last_assessed_date).toLocaleDateString('en-GB')}</strong>` : ''} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
      ${ra.description ? `<section><h3>What is the risk</h3><p>${ra.description.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.risk_before_intervention ? `<section><h3>Risk before intervention</h3><p>${ra.risk_before_intervention.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.who_is_at_risk ? `<section><h3>Who is at risk</h3><p>${ra.who_is_at_risk}</p></section>` : ''}
      ${ra.what_could_happen ? `<section><h3>What could happen</h3><p>${ra.what_could_happen.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.triggers ? `<section><h3>Triggers</h3><p>${ra.triggers.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.protective_factors ? `<section><h3>Protective factors</h3><p>${ra.protective_factors.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.management_plan ? `<div class="mgmt"><h3>Risk management plan</h3><p>${ra.management_plan.replace(/\n/g,'<br/>')}</p></div>` : ''}
      ${likelihood ? `<section><h3>Risk likelihood</h3><p>${likelihood.label}</p></section>` : ''}
      ${ra.risk_after_controls ? `<section><h3>Risk occurring following control measures</h3><p>${ra.risk_after_controls.replace(/\n/g,'<br/>')}</p></section>` : ''}
      ${ra.risk_update_tracking ? `<section><h3>Risk update tracking</h3><p>${ra.risk_update_tracking.replace(/\n/g,'<br/>')}</p></section>` : ''}
      <section><h3>Summary — Risk Level</h3><p><strong>${rl?.label || 'Unknown'}</strong></p></section>
    `
  }

  const printAssessment = (ra: any) => {
    const html = `<!DOCTYPE html><html><head><title>${ra.assessment_name} — Risk Assessment</title><style>${RA_PRINT_CSS}</style></head><body>${buildRaBody(ra)}</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print() }
  }

  const printAll = () => {
    if (!assessments.length) return
    const suName = selectedSu ? sus.find(s => s.id === selectedSu) : null
    const title = suName ? `${suName.first_name} ${suName.last_name} — All Risk Assessments` : 'All Risk Assessments'
    const pages = assessments.map(ra => `<div class="page">${buildRaBody(ra)}</div>`).join('')
    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>${RA_PRINT_CSS}</style></head><body>${pages}</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print() }
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
      <div className="flex items-start justify-between mb-6">
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
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6">
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
                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 space-y-4">
                    {/* Read & Print bar */}
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                      <button
                        onClick={() => { markRead(ra.id); toast.success('Marked as read') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${readIds.has(ra.id) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        {readIds.has(ra.id) ? '✓ Read' : 'Mark as read'}
                      </button>
                      <button
                        onClick={() => printAssessment(ra)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                        Print assessment
                      </button>
                    </div>

                    {/* Single-column detail view */}
                    <div className="space-y-4">
                      <Field label="What is the risk" value={ra.description} />
                      <Field label="Risk before intervention" value={ra.risk_before_intervention} />
                      <Field label="Who is at risk" value={ra.who_is_at_risk} />
                      <Field label="What could happen" value={ra.what_could_happen} />
                      <Field label="Triggers" value={ra.triggers} />
                      <Field label="Protective Factors" value={ra.protective_factors} />
                    </div>

                    {ra.management_plan && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Risk Management Plan</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{ra.management_plan}</p>
                      </div>
                    )}

                    {/* Risk Rating */}
                    {likelihood && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Risk Rating — Likelihood</p>
                        <p className="text-sm font-semibold text-slate-800">{likelihood.label}</p>
                      </div>
                    )}

                    <Field label="Risk occurring following control measures" value={ra.risk_after_controls} />
                    <Field label="Risk Update Tracking" value={ra.risk_update_tracking} />

                    {/* Summary */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary — Risk Level</span>
                      <RiskBadge level={ra.risk_rating || ra.current_risk_level || 'low'} />
                    </div>

                    {/* Sign-off status */}
                    {ra.signed_off ? (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div className="text-xs text-emerald-800">
                          <span className="font-semibold">Signed off</span>
                          {ra.signed_off_by && <span> by {ra.signed_off_by}</span>}
                          {ra.signed_off_date && <span> on {format(new Date(ra.signed_off_date), 'd MMM yyyy')}</span>}
                        </div>
                      </div>
                    ) : (
                      canManage && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                          <span>This assessment has not been signed off yet.</span>
                          <button
                            onClick={() => { setSignOffItem(ra); setSignOffForm({ signedOffBy: '', signedOffDate: new Date().toISOString().split('T')[0] }) }}
                            className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs">
                            <ShieldCheck className="w-3.5 h-3.5" /> Sign Off
                          </button>
                        </div>
                      )
                    )}

                    {/* Update history */}
                    <UpdateHistory raId={ra.id} />

                    {canManage && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                        <Button size="sm" variant="outline" icon={<History className="w-3.5 h-3.5" />}
                          onClick={() => { setUpdateNotesItem(ra); setUpdateRiskLevel(ra.risk_rating || ra.current_risk_level || 'medium') }}>
                          Record Update
                        </Button>
                        <Button size="sm" variant="outline" icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => openEdit(ra)}>
                          Edit Plan
                        </Button>
                        <Button size="sm" variant="danger" icon={<X className="w-3.5 h-3.5" />}
                          onClick={() => archive(ra.id)}>
                          Archive
                        </Button>
                      </div>
                    )}
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
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
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
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary — Risk Level</span>
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
