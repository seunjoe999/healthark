import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, PrintButton } from '../../components/ui'
import { Shield, Plus, ChevronDown, ChevronUp, Edit2, X, Check, History } from 'lucide-react'
import toast from 'react-hot-toast'

const RISK_LEVELS = [
  { value: 'low',    label: 'Low',    color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'high',   label: 'High',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
]

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
  assessmentName: '', description: '', riskRating: 'medium', currentRiskLevel: 'medium',
  whoIsAtRisk: '', whatCouldHappen: '', triggers: '', protectiveFactors: '',
  managementPlan: '', historicalContext: '', reviewFrequency: 'monthly',
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
      await api.post('/risk-assessments', {
        suId: form.suId, homeId: selectedHome,
        assessmentName: form.assessmentName, description: form.description,
        riskLevel: form.riskRating, currentRiskLevel: form.currentRiskLevel,
        riskRating: form.riskRating,
        whoIsAtRisk: form.whoIsAtRisk, whatCouldHappen: form.whatCouldHappen,
        triggers: form.triggers, protectiveFactors: form.protectiveFactors,
        managementPlan: form.managementPlan, historicalContext: form.historicalContext,
        reviewFrequency: form.reviewFrequency,
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
      await api.put(`/risk-assessments/${editItem.id}`, {
        description: form.description, currentRiskLevel: form.currentRiskLevel,
        riskRating: form.riskRating, managementPlan: form.managementPlan,
        triggers: form.triggers, protectiveFactors: form.protectiveFactors,
        historicalContext: form.historicalContext, reviewFrequency: form.reviewFrequency,
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

  const openEdit = (ra: any) => {
    setForm({
      assessmentName: ra.assessment_name || '',
      description: ra.description || '',
      riskRating: ra.risk_rating || ra.current_risk_level || 'medium',
      currentRiskLevel: ra.current_risk_level || 'medium',
      whoIsAtRisk: ra.who_is_at_risk || '',
      whatCouldHappen: ra.what_could_happen || '',
      triggers: ra.triggers || '',
      protectiveFactors: ra.protective_factors || '',
      managementPlan: ra.management_plan || '',
      historicalContext: ra.historical_context || '',
      reviewFrequency: ra.review_frequency || 'monthly',
      suId: ra.su_id || '',
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

  const PlanForm = ({ onSave, isEdit }: { onSave: () => void; isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {!isEdit && (
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Service User *</label>
          <select className="input w-full" value={form.suId} onChange={e => setF('suId', e.target.value)}>
            <option value="">Select service user...</option>
            {sus.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Plan Name *</label>
        <input className="input w-full" placeholder="e.g. Falls Risk, Pressure Sores" value={form.assessmentName}
          onChange={e => setF('assessmentName', e.target.value)} disabled={isEdit} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
        <textarea className="input w-full" rows={2} placeholder="Brief overview of the risk..."
          value={form.description} onChange={e => setF('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Risk Rating</label>
          <select className="input w-full" value={form.riskRating} onChange={e => { setF('riskRating', e.target.value); setF('currentRiskLevel', e.target.value) }}>
            {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
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
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Who is at risk</label>
        <input className="input w-full" placeholder="e.g. Service user, staff, visitors"
          value={form.whoIsAtRisk} onChange={e => setF('whoIsAtRisk', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">What could happen</label>
        <textarea className="input w-full" rows={2} placeholder="Describe the potential harm or consequence..."
          value={form.whatCouldHappen} onChange={e => setF('whatCouldHappen', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Triggers</label>
        <textarea className="input w-full" rows={2} placeholder="What situations or behaviours trigger this risk..."
          value={form.triggers} onChange={e => setF('triggers', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Protective Factors</label>
        <textarea className="input w-full" rows={2} placeholder="What reduces or protects against this risk..."
          value={form.protectiveFactors} onChange={e => setF('protectiveFactors', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">How to Manage It (Management Plan)</label>
        <textarea className="input w-full" rows={3} placeholder="Step-by-step actions staff must take to manage this risk..."
          value={form.managementPlan} onChange={e => setF('managementPlan', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Historical Context</label>
        <textarea className="input w-full" rows={2} placeholder="Any relevant background history, previous incidents, or context..."
          value={form.historicalContext} onChange={e => setF('historicalContext', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={() => isEdit ? setEditItem(null) : setCreateOpen(false)}>Cancel</Button>
        <Button loading={saving} onClick={onSave} icon={<Check className="w-4 h-4" />}>
          {isEdit ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" /> Risk Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Risk management plans for service users</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
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
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Description" value={ra.description} />
                      <Field label="Who is at risk" value={ra.who_is_at_risk} />
                      <Field label="What could happen" value={ra.what_could_happen} />
                      <Field label="Triggers" value={ra.triggers} />
                      <Field label="Protective Factors" value={ra.protective_factors} />
                      <Field label="Historical Context" value={ra.historical_context} />
                    </div>
                    {ra.management_plan && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">How to Manage It</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{ra.management_plan}</p>
                      </div>
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
        <PlanForm onSave={handleCreate} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit: ${editItem?.assessment_name}`}>
        <PlanForm onSave={handleEdit} isEdit />
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
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Update Notes *</label>
            <textarea className="input w-full" rows={4}
              placeholder="Describe what has changed, any new information, actions taken, review outcome..."
              value={updateNotes} onChange={e => setUpdateNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setUpdateNotesItem(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleAddUpdate} icon={<Check className="w-4 h-4" />}>Save Update</Button>
          </div>
        </div>
      </Modal>
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
