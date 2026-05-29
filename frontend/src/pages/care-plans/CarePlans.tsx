import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, AlertTriangle, CheckCircle, Clock, FileText, Edit, Printer, Trash2, History, ChevronDown, Paperclip } from 'lucide-react'
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
  { value: 'medication_support', label: 'Medication Support Plan' },
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

export default function CarePlans() {
  const { user, isRole } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(false)
  const [addPlanOpen, setAddPlanOpen] = useState(false)
  const [viewPlan, setViewPlan] = useState<any>(null)
  const [editPlan, setEditPlan] = useState<any>(null)
  const [planReads, setPlanReads] = useState<Record<string, any[]>>({})

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

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setViewPlan(null)
    setLoading(true)
    try {
      const res = await api.get('/care-plans', { params: { suId: su.id } })
      setPlans(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openPlan = async (plan: any) => {
    setViewPlan(plan)
    if (!planReads[plan.id]) {
      api.post(`/care-plans/${plan.id}/read`).catch(() => {})
      api.get(`/care-plans/${plan.id}/reads`).then(r => {
        setPlanReads(prev => ({ ...prev, [plan.id]: r.data.data || [] }))
      }).catch(() => {})
    }
  }

  const deletePlan = async (id: string) => {
    if (!window.confirm('Delete this support plan?')) return
    try {
      await api.delete(`/care-plans/${id}`)
      setPlans(prev => prev.filter(p => p.id !== id))
      if (viewPlan?.id === id) setViewPlan(null)
      toast.success('Support plan deleted')
    } catch { toast.error('Failed to delete') }
  }

  const refreshPlans = async () => {
    if (!selectedSu) return
    const res = await api.get('/care-plans', { params: { suId: selectedSu.id } })
    setPlans(res.data.data || [])
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()

  const printAll = () => {
    if (!selectedSu) return
    const name = getName(selectedSu)
    const rows = plans.map(plan => {
      const planLabel = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
      return `
        <div class="doc">
          <h2>${planLabel}</h2>
          <p class="meta">Review: ${plan.review_frequency?.replace('_', ' ') || '—'} &nbsp;|&nbsp; Next review: ${plan.next_review_date ? new Date(plan.next_review_date).toLocaleDateString('en-GB') : '—'}</p>
          <div class="section"><strong>Aims & Outcomes</strong><p>${(plan.aims_outcomes || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>What I Can Do</strong><p>${(plan.what_i_can_do || '—').replace(/\n/g, '<br/>')}</p></div>
          <div class="section"><strong>How To Support Me</strong><p>${(plan.how_to_support || '—').replace(/\n/g, '<br/>')}</p></div>
          ${plan.attachments_notes ? `<div class="section"><strong>Attachments / Notes</strong><p>${plan.attachments_notes.replace(/\n/g, '<br/>')}</p></div>` : ''}
        </div>`
    })
    const html = `<!DOCTYPE html><html><head><title>${name} — Support Plans</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:20px} h1{font-size:20px;margin-bottom:4px} .header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px} .doc{border:1px solid #ccc;border-radius:6px;padding:16px;margin-bottom:24px;page-break-inside:avoid} .doc h2{font-size:15px;margin:0 0 6px} .meta{font-size:12px;color:#555;margin:0 0 12px} .section{margin-bottom:10px} .section strong{font-size:11px;text-transform:uppercase;color:#666;display:block;margin-bottom:3px} .section p{font-size:13px;margin:0;line-height:1.5} @media print{body{padding:0}}</style>
      </head><body>
      <div class="header"><h1>${name} — Support Plans</h1><p style="font-size:12px;color:#555;">Printed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;|&nbsp; ${plans.length} support plan(s)</p></div>
      ${rows.join('')}
    </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print() }
  }

  const suOptions = sus.map(su => ({ value: su.id, label: getName(su) }))

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" /> Support Plans
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage individual support plans</p>
        </div>
      </div>

      {/* SU + Home selectors */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        {homes.length > 1 && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Care Home</label>
            <select className="input text-sm w-full" value={selectedHome} onChange={e => { setSelectedHome(e.target.value); setSelectedSu(null); setPlans([]) }}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Service User</label>
          <div className="relative">
            <select
              className="input text-sm w-full appearance-none pr-8"
              value={selectedSu?.id || ''}
              onChange={e => {
                const su = sus.find(s => s.id === e.target.value)
                if (su) selectSu(su)
              }}
            >
              <option value="">— Select a service user —</option>
              {sus.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {selectedSu && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={printAll}>Print all</Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddPlanOpen(true)}>Add support plan</Button>
          </div>
        )}
      </div>

      {/* Plans grid */}
      {!selectedSu ? (
        <div className="flex items-center justify-center py-24">
          <EmptyState title="Select a service user" description="Use the dropdown above to select a service user and view their support plans" />
        </div>
      ) : loading ? (
        <Spinner />
      ) : plans.length === 0 ? (
        <EmptyState title="No support plans yet" description="Add the first support plan for this service user"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddPlanOpen(true)}>Add support plan</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: any) => {
            const label = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
            return (
              <button key={plan.id} onClick={() => openPlan(plan)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md hover:border-slate-200 transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{plan.review_frequency?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <ReviewStatus nextReviewDate={plan.next_review_date} />
                  {plan.outcome_achieved && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">{plan.outcome_achieved}</span>
                  )}
                </div>
                {plan.attachments_notes && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <Paperclip className="w-3 h-3" /> Has attachments
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Add support plan modal */}
      <AddPlanModal open={addPlanOpen} onClose={() => setAddPlanOpen(false)}
        suId={selectedSu?.id} homeId={selectedHome}
        onSaved={async () => {
          setAddPlanOpen(false)
          await refreshPlans()
          toast.success('Support plan created')
        }} />

      {/* View plan modal */}
      {viewPlan && (
        <PlanDetailModal
          plan={viewPlan}
          reads={planReads[viewPlan.id] || []}
          canDelete={isRole('home_manager', 'group_admin')}
          onClose={() => setViewPlan(null)}
          onEdit={() => { setEditPlan(viewPlan); setViewPlan(null) }}
          onDelete={async () => { await deletePlan(viewPlan.id) }}
        />
      )}

      {/* Edit plan modal */}
      {editPlan && (
        <EditPlanModal plan={editPlan} suId={selectedSu?.id || ''} onClose={() => setEditPlan(null)} onSaved={async () => {
          setEditPlan(null)
          await refreshPlans()
          toast.success('Support plan updated')
        }} />
      )}
    </div>
  )
}

function PlanDetailModal({ plan, reads, canDelete, onClose, onEdit, onDelete }: {
  plan: any; reads: any[]; canDelete: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const label = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
  const isMed = plan.plan_type === 'medication_support'

  return (
    <Modal open={true} onClose={onClose} title={label} size="lg">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100">
          <ReviewStatus nextReviewDate={plan.next_review_date} />
          <span className="text-xs text-slate-400 capitalize">{plan.review_frequency?.replace('_', ' ')}</span>
          {plan.outcome_achieved && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">{plan.outcome_achieved}</span>
          )}
          {reads.length > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
              <History className="w-3 h-3" />
              Last read by {reads[0].staff_name} · {reads.length} read{reads.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isMed ? (
          <>
            {plan.medication_support_level && <Field label="Medication Support Level" value={plan.medication_support_level} />}
            {plan.level_of_support && <Field label="Level of Support" value={plan.level_of_support} />}
            {plan.support_types && <Field label="Type of Support" value={plan.support_types} />}
            <div className="grid md:grid-cols-3 gap-4">
              {plan.aims_outcomes && <Field label="My Aims / Outcomes" value={plan.aims_outcomes} />}
              {plan.what_i_can_do && <Field label="What I Can Do" value={plan.what_i_can_do} />}
              {plan.how_to_support && <Field label="What You Can Do" value={plan.how_to_support} />}
            </div>
            {plan.regular_medications && <Field label="Regular Medications" value={plan.regular_medications} />}
            {plan.prn_medications && <Field label="PRN Medications" value={plan.prn_medications} />}
            {plan.otc_medications && <Field label="Over-The-Counter Medications" value={plan.otc_medications} />}
            {plan.prn_protocol && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1">PRN Protocol</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{plan.prn_protocol}</p>
              </div>
            )}
            {plan.prn_list && <Field label="PRN List & Use" value={plan.prn_list} />}
            {plan.indication_for_use && <Field label="Indication for Use" value={plan.indication_for_use} />}
          </>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="My aims & outcomes" value={plan.aims_outcomes || '—'} />
            <Field label="What I can do" value={plan.what_i_can_do || '—'} />
            <Field label="How to support me" value={plan.how_to_support || '—'} />
          </div>
        )}

        {plan.attachments_notes && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> Attachments / Document Links
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{plan.attachments_notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <a href={`/care-plans/${plan.id}/print`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />}>Print</Button>
          </a>
          <Button size="sm" variant="secondary" icon={<Edit className="w-3.5 h-3.5" />} onClick={onEdit}>Edit & review</Button>
          {canDelete && (
            <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete}>Delete</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}

const SUPPORT_TYPE_OPTIONS = [
  'Reminders',
  'Opening / Assisting With Medication',
  'Application of Creams / Eye Drops',
  'Full Administration By Staff',
  'Not Applicable',
]

function AddPlanModal({ open, onClose, suId, homeId, onSaved }: {
  open: boolean; onClose: () => void; suId?: string; homeId?: string; onSaved: () => void
}) {
  const [form, setForm] = useState<any>({
    planType: '', customName: '', aimsOutcomes: '', whatICanDo: '', howToSupport: '',
    reviewFrequency: 'monthly', attachmentsNotes: '',
    medicationSupportLevel: '', managesOwnMeds: false, levelOfSupport: '',
    supportTypes: [] as string[], dateMedicationReview: '',
    regularMedications: '', prnMedications: '', otcMedications: '',
    prnProtocol: '', prnList: '', indicationForUse: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))
  const toggleSupport = (s: string) => setForm((p: any) => ({
    ...p, supportTypes: p.supportTypes.includes(s) ? p.supportTypes.filter((x: string) => x !== s) : [...p.supportTypes, s]
  }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suId) { toast.error('Please select a service user first'); return }
    if (!form.planType) { toast.error('Please select a support plan type'); return }
    setLoading(true)
    try {
      await api.post('/care-plans', {
        suId, homeId,
        planType: form.planType, customName: form.customName,
        aimsOutcomes: form.aimsOutcomes, whatICanDo: form.whatICanDo,
        howToSupport: form.howToSupport, reviewFrequency: form.reviewFrequency,
        attachmentsNotes: form.attachmentsNotes,
        medicationSupportLevel: form.medicationSupportLevel,
        managesOwnMeds: form.managesOwnMeds,
        levelOfSupport: form.levelOfSupport,
        supportTypes: form.supportTypes.join(', '),
        dateMedicationReview: form.dateMedicationReview || null,
        regularMedications: form.regularMedications,
        prnMedications: form.prnMedications,
        otcMedications: form.otcMedications,
        prnProtocol: form.prnProtocol,
        prnList: form.prnList,
        indicationForUse: form.indicationForUse,
      })
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create support plan')
    } finally { setLoading(false) }
  }

  const isMedPlan = form.planType === 'medication_support'

  return (
    <Modal open={open} onClose={onClose} title="Add support plan" size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <Select label="Support plan type *" required value={form.planType} onChange={e => set('planType', e.target.value)} options={PLAN_TYPES} placeholder="Select type" />
        {form.planType === 'custom' && <Input label="Custom name" required value={form.customName} onChange={e => set('customName', e.target.value)} />}

        {isMedPlan ? (
          <>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">MEDICATION</p>
              <div className="space-y-3">
                <div>
                  <label className="label">Medication Support Level</label>
                  <input className="input w-full" value={form.medicationSupportLevel} onChange={e => set('medicationSupportLevel', e.target.value)} placeholder="e.g. Level 2 — Prompt and assist" />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="managesOwn" checked={!form.managesOwnMeds} onChange={() => set('managesOwnMeds', false)} />
                    <span className="text-sm text-slate-700">I Require My Medication To Be Administered</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="managesOwn" checked={form.managesOwnMeds} onChange={() => set('managesOwnMeds', true)} />
                    <span className="text-sm text-slate-700">I Manage My Own Medication</span>
                  </label>
                </div>
                <div>
                  <label className="label">Level of Support Required</label>
                  <textarea className="input w-full" rows={2} value={form.levelOfSupport} onChange={e => set('levelOfSupport', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">SUPPORT</p>
              <p className="text-xs text-slate-500 mb-2">Type of Support Required:</p>
              {SUPPORT_TYPE_OPTIONS.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input type="checkbox" checked={form.supportTypes.includes(s)} onChange={() => toggleSupport(s)} className="rounded" />
                  <span className="text-sm text-slate-700">{s}</span>
                </label>
              ))}
              <div className="mt-3">
                <label className="label">Date Medication Review</label>
                <input type="date" className="input w-full" value={form.dateMedicationReview} onChange={e => set('dateMedicationReview', e.target.value)} />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">OTHER INFORMATION</p>
              <div className="space-y-3">
                <div><label className="label">My Aims / Outcomes</label><textarea className="input w-full" rows={2} value={form.aimsOutcomes} onChange={e => set('aimsOutcomes', e.target.value)} /></div>
                <div><label className="label">What I Can Do</label><textarea className="input w-full" rows={2} value={form.whatICanDo} onChange={e => set('whatICanDo', e.target.value)} /></div>
                <div><label className="label">What You Can Do To Support Me</label><textarea className="input w-full" rows={2} value={form.howToSupport} onChange={e => set('howToSupport', e.target.value)} /></div>
                <div><label className="label">My Regular Medications</label><textarea className="input w-full" rows={3} value={form.regularMedications} onChange={e => set('regularMedications', e.target.value)} placeholder="List each medication, dose, frequency and purpose..." /></div>
                <div><label className="label">My PRN Medications</label><textarea className="input w-full" rows={2} value={form.prnMedications} onChange={e => set('prnMedications', e.target.value)} /></div>
                <div><label className="label">Over-The-Counter Medications (OTC)</label><textarea className="input w-full" rows={2} value={form.otcMedications} onChange={e => set('otcMedications', e.target.value)} /></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-3">PRN MEDICATION PROTOCOL</p>
              <div className="space-y-3">
                <div><label className="label">Protocol Details</label><textarea className="input w-full" rows={4} value={form.prnProtocol} onChange={e => set('prnProtocol', e.target.value)} /></div>
                <div><label className="label">My List of Current PRN & Use</label><textarea className="input w-full" rows={2} value={form.prnList} onChange={e => set('prnList', e.target.value)} /></div>
                <div><label className="label">Indication for Use</label><textarea className="input w-full" rows={2} value={form.indicationForUse} onChange={e => set('indicationForUse', e.target.value)} /></div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div><label className="label">My aims & outcomes</label><textarea className="input" rows={3} value={form.aimsOutcomes} onChange={e => set('aimsOutcomes', e.target.value)} placeholder="What are we working towards for this person..." /></div>
            <div><label className="label">What I can do independently</label><textarea className="input" rows={3} value={form.whatICanDo} onChange={e => set('whatICanDo', e.target.value)} placeholder="The person's strengths and capabilities..." /></div>
            <div><label className="label">How you can support me</label><textarea className="input" rows={3} value={form.howToSupport} onChange={e => set('howToSupport', e.target.value)} placeholder="Specific guidance for staff supporting this person..." /></div>
          </>
        )}

        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />

        <div>
          <label className="label flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Attachments / document links</label>
          <textarea className="input" rows={2} value={form.attachmentsNotes} onChange={e => set('attachmentsNotes', e.target.value)} placeholder="Paste document links or note attachment references (e.g. Google Drive, SharePoint)..." />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create support plan</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditPlanModal({ plan, suId, onClose, onSaved }: { plan: any; suId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    aimsOutcomes: plan.aims_outcomes || '',
    whatICanDo: plan.what_i_can_do || '',
    howToSupport: plan.how_to_support || '',
    outcomeAchieved: plan.outcome_achieved || '',
    reviewFrequency: plan.review_frequency || 'monthly',
    updateNotes: '',
    suSignOff: plan.su_sign_off || false,
    staffSignOff: plan.staff_sign_off || false,
    attachmentsNotes: plan.attachments_notes || '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.put(`/care-plans/${plan.id}`, form); onClose(); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const label = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type

  return (
    <Modal open={true} onClose={onClose} title={`Edit: ${label}`} size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <div><label className="label">My aims & outcomes</label><textarea className="input" rows={3} value={form.aimsOutcomes} onChange={e => set('aimsOutcomes', e.target.value)} /></div>
        <div><label className="label">What I can do</label><textarea className="input" rows={3} value={form.whatICanDo} onChange={e => set('whatICanDo', e.target.value)} /></div>
        <div><label className="label">How to support me</label><textarea className="input" rows={3} value={form.howToSupport} onChange={e => set('howToSupport', e.target.value)} /></div>
        <Select label="Outcome achieved" value={form.outcomeAchieved} onChange={e => set('outcomeAchieved', e.target.value)} options={OUTCOME_OPTIONS} placeholder="Select outcome" />
        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
        <div><label className="label">Review notes (what changed and why)</label><textarea className="input" rows={3} value={form.updateNotes} onChange={e => set('updateNotes', e.target.value)} /></div>

        <div>
          <label className="label flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Attachments / document links</label>
          <textarea className="input" rows={2} value={form.attachmentsNotes} onChange={e => set('attachmentsNotes', e.target.value)} placeholder="Paste document links or note attachment references..." />
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Sign Off</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.suSignOff} onChange={e => set('suSignOff', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-slate-700">Signed off by Service User / Family</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.staffSignOff} onChange={e => set('staffSignOff', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-slate-700">Signed off by Staff Member</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save review</Button>
        </div>
      </form>
    </Modal>
  )
}
