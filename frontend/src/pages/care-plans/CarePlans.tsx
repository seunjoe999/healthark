import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, SectionHeading, PrintButton } from '../../components/ui'
import { Plus, AlertTriangle, CheckCircle, Clock, FileText, Edit, ChevronDown, ChevronUp, Printer, Trash2, History } from 'lucide-react'
import toast from 'react-hot-toast'

const PLAN_TYPES = [
  { value: 'physical_health', label: 'Physical Health Support Plan' },
  { value: 'physical', label: 'Physical Support Plan' },
  { value: 'communication', label: 'Communication Support Plan' },
  { value: 'oral_care', label: 'Oral Care Support Plan' },
  { value: 'medical', label: 'Medical Support Plan' },
  { value: 'food_and_fluids', label: 'Food & Fluids Support Plan' },
  { value: 'one_page_profile', label: 'One Page Profile' },
  { value: 'finance', label: 'Finance Support Plan' },
  { value: 'visitation', label: 'Visitation Support Plan' },
  { value: 'vulnerability', label: 'Vulnerability Support Plan' },
  { value: 'personal_hygiene', label: 'Personal Hygiene Support Plan' },
  { value: 'hydration_skin', label: 'Hydration & Skin Care Support Plan' },
  { value: 'social_activities', label: 'Social Activities Support Plan' },
  { value: 'community_access', label: 'Community Access Support Plan' },
  { value: 'distress_behaviour', label: 'Distress Behaviour Support Plan' },
  { value: 'crisis', label: 'Crisis Support Plan' },
  { value: 'alcohol_use', label: 'Alcohol Use Support Plan' },
  { value: 'home_safety', label: 'Home Safety Support Plan' },
  { value: 'emotional_breakdown', label: 'Emotional Breakdown Support Plan' },
  { value: 'positive_behaviour', label: 'Positive Behaviour Support Plan' },
  { value: 'oral_care_assessment', label: 'Oral Care Assessment' },
  { value: 'autism', label: 'Autism Support Plan' },
  { value: 'pen_assessment', label: 'PEN Assessment' },
  { value: 'personal_evacuation', label: 'Personal Evacuation Support Plan' },
  { value: 'end_of_life', label: 'End Of Life Support Plan' },
  { value: 'adhd', label: 'ADHD Support Plan' },
  { value: 'personal_care', label: 'Personal Care Support Plan' },
  { value: 'mobility', label: 'Mobility Support Plan' },
  { value: 'nutrition', label: 'Nutrition Support Plan' },
  { value: 'continence', label: 'Continence Support Plan' },
  { value: 'falls_prevention', label: 'Falls Prevention Support Plan' },
  { value: 'dementia', label: 'Dementia Support Plan' },
  { value: 'mental_health', label: 'Mental Health Support Plan' },
  { value: 'custom', label: 'Custom Support Plan' },
]

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly (recommended)' },
  { value: 'eight_weekly', label: 'Every 8 weeks' },
  { value: 'yearly', label: 'Yearly' },
]

const OUTCOME_OPTIONS = [
  { value: 'yes', label: 'Yes — achieved' },
  { value: 'partially', label: 'Partially achieved' },
  { value: 'no', label: 'Not yet achieved' },
  { value: 'ongoing', label: 'Ongoing' },
]

function ReviewStatus({ nextReviewDate }: { nextReviewDate: string }) {
  if (!nextReviewDate) return null
  const days = differenceInDays(new Date(nextReviewDate), new Date())
  if (days < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Overdue by {Math.abs(days)} days</span>
  if (days <= 7) return <span className="flex items-center gap-1 text-xs text-orange-600 font-medium"><Clock className="w-3 h-3" />Due in {days} days</span>
  return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />Due {format(new Date(nextReviewDate), 'd MMM yyyy')}</span>
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[level] || 'bg-slate-100 text-slate-700'}`}>{level}</span>
}

export default function CarePlans() {
  const { user, isRole } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'plans' | 'risks'>('plans')
  const [addPlanOpen, setAddPlanOpen] = useState(false)
  const [addRiskOpen, setAddRiskOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [editingRisk, setEditingRisk] = useState<any>(null)
  const [riskDetails, setRiskDetails] = useState<Record<string, any>>({})

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

  const deletePlan = async (id: string) => {
    if (!window.confirm('Delete this support plan?')) return
    try {
      await api.delete(`/care-plans/${id}`)
      setPlans(prev => prev.filter(p => p.id !== id))
      setSelectedPlan(null)
      toast.success('Support plan deleted')
    } catch { toast.error('Failed to delete') }
  }

  const loadRiskDetail = async (id: string) => {
    try {
      const res = await api.get(`/risk-assessments/${id}`)
      setRiskDetails(prev => ({ ...prev, [id]: res.data.data }))
    } catch {}
  }

  const deleteRisk = async (id: string) => {
    if (!window.confirm('Delete this risk assessment?')) return
    try {
      await api.delete(`/risk-assessments/${id}`)
      setRisks(prev => prev.filter(r => r.id !== id))
      setSelectedPlan(null)
      toast.success('Risk assessment deleted')
    } catch { toast.error('Failed to delete') }
  }

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setSelectedPlan(null)
    setMobileSidebarOpen(false)
    setLoading(true)
    try {
      const [planRes, riskRes] = await Promise.allSettled([
        api.get('/care-plans', { params: { suId: su.id } }),
        api.get('/risk-assessments', { params: { suId: su.id } }),
      ])
      if (planRes.status === 'fulfilled') setPlans(planRes.value.data.data || [])
      if (riskRes.status === 'fulfilled') setRisks(riskRes.value.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  const printAll = () => {
    if (!selectedSu) return
    const name = getName(selectedSu)
    const rows: string[] = []

    plans.forEach(plan => {
      const planLabel = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
      rows.push(`
        <div class="doc">
          <h2>${planLabel}</h2>
          <p class="meta">Review: ${plan.review_frequency?.replace('_', ' ') || '—'} &nbsp;|&nbsp; Next review: ${plan.next_review_date ? new Date(plan.next_review_date).toLocaleDateString('en-GB') : '—'}</p>
          <div class="section"><strong>Aims & Outcomes</strong><p>${(plan.aims_outcomes || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>Background</strong><p>${(plan.background || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>Content / Instructions</strong><p>${(plan.content || '—').replace(/\n/g, '<br/>')}</p></div>
          ${plan.attachments_notes ? `<div class="section"><strong>Notes</strong><p>${plan.attachments_notes.replace(/\n/g, '<br/>')}</p></div>` : ''}
        </div>`)
    })

    risks.forEach(risk => {
      rows.push(`
        <div class="doc">
          <h2>Risk Assessment: ${risk.assessment_name}</h2>
          <p class="meta">Risk level: <strong>${(risk.current_risk_level || risk.risk_level || '—').toUpperCase()}</strong> &nbsp;|&nbsp; Next review: ${risk.next_review_date ? new Date(risk.next_review_date).toLocaleDateString('en-GB') : '—'}</p>
          <div class="section"><strong>What is the risk</strong><p>${(risk.description || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>Who is at risk</strong><p>${(risk.who_is_at_risk || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>What could happen</strong><p>${(risk.what_could_happen || '—').replace(/\n/g, '<br/>')}</p></div>
          ${risk.triggers ? `<div class="section"><strong>Triggers</strong><p>${risk.triggers.replace(/\n/g, '<br/>')}</p></div>` : ''}
          ${risk.protective_factors ? `<div class="section"><strong>Protective Factors</strong><p>${risk.protective_factors.replace(/\n/g, '<br/>')}</p></div>` : ''}
          <div class="section"><strong>Risk Management Plan</strong><p>${(risk.management_plan || '—').replace(/\n/g, '<br/>')}</p></div>
        </div>`)
    })

    const html = `<!DOCTYPE html><html><head><title>${name} — Care Plans & Risk Assessments</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .doc { border: 1px solid #ccc; border-radius: 6px; padding: 16px; margin-bottom: 24px; page-break-inside: avoid; }
        .doc h2 { font-size: 15px; margin: 0 0 6px; }
        .meta { font-size: 12px; color: #555; margin: 0 0 12px; }
        .section { margin-bottom: 10px; }
        .section strong { font-size: 11px; text-transform: uppercase; color: #666; display: block; margin-bottom: 3px; }
        .section p { font-size: 13px; margin: 0; line-height: 1.5; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>${name} — Care Plans & Risk Assessments</h1>
        <p style="font-size:12px;color:#555;">Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;|&nbsp; ${plans.length} support plan(s), ${risks.length} risk assessment(s)</p>
      </div>
      ${rows.join('')}
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print() }
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left — SU selector */}
      <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-72 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-100`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3">Support Plans & Risks</h2>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <input className="input text-sm" placeholder="Search service users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSus.map(su => {
            const name = getName(su)
            const isSelected = selectedSu?.id === su.id
            return (
              <button key={su.id} onClick={() => selectSu(su)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-50 border-l-2 border-l-slate-900' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {(su.first_name || su.firstName || '?')[0]}{(su.last_name || su.lastName || '?')[0]}
                  </div>
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{name}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — plans and risks */}
      <div className={`${!mobileSidebarOpen || !selectedSu ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-y-auto bg-slate-50`}>
        {selectedSu && (
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: '#111' }}>
            <button onClick={() => setMobileSidebarOpen(true)} className="text-amber-400 text-sm font-medium flex items-center gap-1">← Back</button>
            <span className="text-white text-sm font-semibold">{getName(selectedSu)}</span>
          </div>
        )}
        <div className="p-6 flex-1">
        {!selectedSu ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a service user" description="Choose a service user to view their support plans and risk assessments" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{getName(selectedSu)}</h2>
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={printAll}>Print all</Button>
                <Button size="sm" variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddRiskOpen(true)}>Add risk</Button>
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddPlanOpen(true)}>Add support plan</Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 mb-4">
              <button onClick={() => setTab('plans')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'plans' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Support Plans ({plans.length})
              </button>
              <button onClick={() => setTab('risks')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'risks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Risk Assessments ({risks.length})
              </button>
            </div>

            {loading ? <Spinner /> : tab === 'plans' ? (
              plans.length === 0 ? (
                <EmptyState title="No support plans yet" description="Add the first support plan for this service user"
                  action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddPlanOpen(true)}>Add support plan</Button>} />
              ) : (
                <div className="space-y-3">
                  {plans.map((plan: any) => (
                    <div key={plan.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <button onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <h3 className="font-semibold text-slate-900">
                              {plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <ReviewStatus nextReviewDate={plan.next_review_date} />
                            <span className="text-xs text-slate-400 capitalize">{plan.review_frequency?.replace('_', ' ')}</span>
                            {plan.outcome_achieved && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">{plan.outcome_achieved}</span>
                            )}
                          </div>
                        </div>
                        {selectedPlan?.id === plan.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {selectedPlan?.id === plan.id && (
                        <div className="px-5 pb-5 border-t border-slate-50">
                          <div className="grid md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">My aims & outcomes</p>
                              <p className="text-sm text-slate-700 whitespace-pre-line">{plan.aims_outcomes || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What I can do</p>
                              <p className="text-sm text-slate-700 whitespace-pre-line">{plan.what_i_can_do || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How to support me</p>
                              <p className="text-sm text-slate-700 whitespace-pre-line">{plan.how_to_support || '—'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <a href={`/care-plans/${plan.id}/print`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />}>Print</Button>
                            </a>
                            <EditPlanModal plan={plan} suId={selectedSu.id} onSaved={async () => {
                              const res = await api.get('/care-plans', { params: { suId: selectedSu.id } })
                              setPlans(res.data.data || [])
                              toast.success('Support plan updated')
                            }} />
                            {isRole('home_manager', 'group_admin') && (
                              <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => deletePlan(plan.id)}>Delete</Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              risks.length === 0 ? (
                <EmptyState title="No risk assessments yet" description="Add the first risk assessment for this resident"
                  action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddRiskOpen(true)}>Add risk assessment</Button>} />
              ) : (
                <div className="space-y-3">
                  {risks.map((risk: any) => (
                    <div key={risk.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <button onClick={() => {
                          const next = selectedPlan?.id === risk.id ? null : risk
                          setSelectedPlan(next)
                          if (next && !riskDetails[risk.id]) loadRiskDetail(risk.id)
                        }}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <h3 className="font-semibold text-slate-900">{risk.assessment_name}</h3>
                            <RiskBadge level={risk.current_risk_level || risk.risk_level} />
                            {risk.is_historical && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Historical</span>}
                          </div>
                          <ReviewStatus nextReviewDate={risk.next_review_date} />
                        </div>
                        {selectedPlan?.id === risk.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {selectedPlan?.id === risk.id && (
                        <div className="px-5 pb-5 border-t border-slate-50">
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                              <p className="text-sm text-slate-700">{risk.description || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Who is at risk</p>
                              <p className="text-sm text-slate-700">{risk.who_is_at_risk || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">What could happen</p>
                              <p className="text-sm text-slate-700">{risk.what_could_happen || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Triggers</p>
                              <p className="text-sm text-slate-700">{risk.triggers || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Protective factors</p>
                              <p className="text-sm text-slate-700">{risk.protective_factors || '—'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk management plan</p>
                              <p className="text-sm text-slate-700 whitespace-pre-line">{risk.management_plan || '—'}</p>
                            </div>
                          </div>
                          {/* Update history */}
                          {riskDetails[risk.id]?.updates?.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" />Review history</p>
                              <div className="space-y-2">
                                {riskDetails[risk.id].updates.map((u: any) => (
                                  <div key={u.id} className="bg-slate-50 rounded-lg p-3 text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-slate-700">{u.updated_by_name}</span>
                                      <div className="flex items-center gap-2">
                                        {u.new_risk_level && <RiskBadge level={u.new_risk_level} />}
                                        <span className="text-slate-400">{format(new Date(u.created_at), 'd MMM yyyy')}</span>
                                      </div>
                                    </div>
                                    {u.update_notes && <p className="text-slate-600">{u.update_notes}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="secondary" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => setEditingRisk(risk)}>Review & update</Button>
                            {isRole('home_manager', 'group_admin') && (
                              <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => deleteRisk(risk.id)}>Delete</Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
        </div>
      </div>

      {/* Add support plan modal */}
      <AddPlanModal open={addPlanOpen} onClose={() => setAddPlanOpen(false)}
        suId={selectedSu?.id} homeId={selectedHome}
        onSaved={async () => {
          setAddPlanOpen(false)
          if (selectedSu) {
            const res = await api.get('/care-plans', { params: { suId: selectedSu.id } })
            setPlans(res.data.data || [])
          }
          toast.success('Support plan created')
        }} />

      {/* Add risk modal */}
      <AddRiskModal open={addRiskOpen} onClose={() => setAddRiskOpen(false)} suId={selectedSu?.id}
        onSaved={async () => {
          setAddRiskOpen(false)
          if (selectedSu) {
            const res = await api.get('/risk-assessments', { params: { suId: selectedSu.id } })
            setRisks(res.data.data || [])
          }
          toast.success('Risk assessment created')
        }} />

      {/* Edit risk modal */}
      {editingRisk && (
        <UpdateRiskModal risk={editingRisk} onClose={() => setEditingRisk(null)}
          onSaved={async () => {
            setEditingRisk(null)
            if (selectedSu) {
              const res = await api.get('/risk-assessments', { params: { suId: selectedSu.id } })
              setRisks(res.data.data || [])
            }
            setRiskDetails({})
          }} />
      )}
    </div>
  )
}

function AddPlanModal({ open, onClose, suId, homeId, onSaved }: { open: boolean; onClose: () => void; suId?: string; homeId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({ planType: '', customName: '', aimsOutcomes: '', whatICanDo: '', howToSupport: '', reviewFrequency: 'monthly' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suId) { toast.error('Please select a service user first'); return }
    if (!form.planType) { toast.error('Please select a support plan type'); return }
    setLoading(true)
    try {
      await api.post('/care-plans', { suId, homeId, ...form })
      onSaved()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to create support plan'
      toast.error(msg)
    }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add support plan" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Select label="Support plan type *" required value={form.planType} onChange={e => set('planType', e.target.value)} options={PLAN_TYPES} placeholder="Select type" />
        {form.planType === 'custom' && <Input label="Custom name" required value={form.customName} onChange={e => set('customName', e.target.value)} />}
        <div><label className="label">My aims & outcomes</label><textarea className="input" rows={3} value={form.aimsOutcomes} onChange={e => set('aimsOutcomes', e.target.value)} placeholder="What are we working towards for this person..." /></div>
        <div><label className="label">What I can do independently</label><textarea className="input" rows={3} value={form.whatICanDo} onChange={e => set('whatICanDo', e.target.value)} placeholder="The person's strengths and capabilities..." /></div>
        <div><label className="label">How you can support me</label><textarea className="input" rows={3} value={form.howToSupport} onChange={e => set('howToSupport', e.target.value)} placeholder="Specific guidance for staff supporting this person..." /></div>
        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create support plan</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditPlanModal({ plan, suId, onSaved }: { plan: any; suId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ aimsOutcomes: plan.aims_outcomes || '', whatICanDo: plan.what_i_can_do || '', howToSupport: plan.how_to_support || '', outcomeAchieved: plan.outcome_achieved || '', reviewFrequency: plan.review_frequency || 'monthly', updateNotes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.put(`/care-plans/${plan.id}`, form); setOpen(false); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Button size="sm" variant="secondary" icon={<Edit className="w-4 h-4" />} onClick={() => setOpen(true)}>Review & update</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Review support plan" size="lg">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">My aims & outcomes</label><textarea className="input" rows={3} value={form.aimsOutcomes} onChange={e => set('aimsOutcomes', e.target.value)} /></div>
          <div><label className="label">What I can do</label><textarea className="input" rows={3} value={form.whatICanDo} onChange={e => set('whatICanDo', e.target.value)} /></div>
          <div><label className="label">How to support me</label><textarea className="input" rows={3} value={form.howToSupport} onChange={e => set('howToSupport', e.target.value)} /></div>
          <Select label="Outcome achieved" value={form.outcomeAchieved} onChange={e => set('outcomeAchieved', e.target.value)} options={OUTCOME_OPTIONS} placeholder="Select outcome" />
          <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
          <div><label className="label">Update notes (what changed and why)</label><textarea className="input" rows={3} value={form.updateNotes} onChange={e => set('updateNotes', e.target.value)} placeholder="Document what was reviewed and any changes made..." /></div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save review</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function AddRiskModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({ assessmentName: '', description: '', riskLevel: 'low', currentRiskLevel: 'low', whoIsAtRisk: '', isHistorical: false, whatCouldHappen: '', triggers: '', protectiveFactors: '', managementPlan: '', reviewFrequency: 'monthly' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const RISK_LEVELS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suId) { toast.error('Please select a service user first'); return }
    setLoading(true)
    try { await api.post('/risk-assessments', { suId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add risk assessment" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Input label="Name of risk *" required value={form.assessmentName} onChange={e => set('assessmentName', e.target.value)} placeholder="e.g. Risk of falls, Risk of choking..." />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Risk level" value={form.riskLevel} onChange={e => set('riskLevel', e.target.value)} options={RISK_LEVELS} />
          <Select label="Current risk level" value={form.currentRiskLevel} onChange={e => set('currentRiskLevel', e.target.value)} options={RISK_LEVELS} />
        </div>
        <div><label className="label">Description of risk</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <Input label="Who is at risk" value={form.whoIsAtRisk} onChange={e => set('whoIsAtRisk', e.target.value)} placeholder="Service user / Staff / Both" />
        <div><label className="label">What could happen</label><textarea className="input" rows={2} value={form.whatCouldHappen} onChange={e => set('whatCouldHappen', e.target.value)} /></div>
        <div><label className="label">Triggers</label><textarea className="input" rows={2} value={form.triggers} onChange={e => set('triggers', e.target.value)} /></div>
        <div><label className="label">Protective factors</label><textarea className="input" rows={2} value={form.protectiveFactors} onChange={e => set('protectiveFactors', e.target.value)} /></div>
        <div><label className="label">Risk management plan *</label><textarea required className="input" rows={3} value={form.managementPlan} onChange={e => set('managementPlan', e.target.value)} /></div>
        <div className="flex items-center gap-2"><input type="checkbox" id="hist" checked={form.isHistorical} onChange={e => set('isHistorical', e.target.checked)} className="rounded" /><label htmlFor="hist" className="text-sm">This is a historical risk</label></div>
        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create assessment</Button>
        </div>
      </form>
    </Modal>
  )
}

function UpdateRiskModal({ risk, onClose, onSaved }: { risk: any; onClose: () => void; onSaved: () => void }) {
  const RISK_LEVELS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]
  const [form, setForm] = useState({
    description: risk.description || '',
    currentRiskLevel: risk.current_risk_level || risk.risk_level || 'low',
    managementPlan: risk.management_plan || '',
    triggers: risk.triggers || '',
    protectiveFactors: risk.protective_factors || '',
    reviewFrequency: risk.review_frequency || 'monthly',
    updateNotes: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/risk-assessments/${risk.id}`, form)
      toast.success('Risk assessment updated')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Review: ${risk.assessment_name}`} size="lg">
      <form onSubmit={save} className="space-y-4">
        <Select label="Current risk level" value={form.currentRiskLevel} onChange={e => set('currentRiskLevel', e.target.value)} options={RISK_LEVELS} />
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div><label className="label">Triggers</label><textarea className="input" rows={2} value={form.triggers} onChange={e => set('triggers', e.target.value)} /></div>
        <div><label className="label">Protective factors</label><textarea className="input" rows={2} value={form.protectiveFactors} onChange={e => set('protectiveFactors', e.target.value)} /></div>
        <div><label className="label">Risk management plan *</label><textarea required className="input" rows={3} value={form.managementPlan} onChange={e => set('managementPlan', e.target.value)} /></div>
        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
        <div><label className="label">Review notes (what was changed and why)</label><textarea className="input" rows={3} value={form.updateNotes} onChange={e => set('updateNotes', e.target.value)} placeholder="Summarise what was reviewed and any changes made..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save review</Button>
        </div>
      </form>
    </Modal>
  )
}
