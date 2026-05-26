import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, User, Award, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ── Burnout questions ──────────────────────────────────────────────────────────
const BURNOUT_QUESTIONS = [
  'I feel run down and drained of physical or emotional energy.',
  'I have negative thoughts about my job.',
  'I find it hard to concentrate.',
  'I am easily irritated by small problems, or by my co-workers and team.',
  'I feel that I am not getting what I want out of my job.',
  'I feel misunderstood or unappreciated by my co-workers.',
  'I feel that I have no one to talk to.',
  'I feel under an unpleasant level of pressure to succeed.',
  'I feel that I am not getting what I want out of my job.',
  'I feel that there is more work to do than I practically have the ability to do.',
]

const BURNOUT_LABELS = [
  { value: 0, label: 'Not at All' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Very Often' },
]

const BLANK_SUPERVISION = {
  staffId: '', supervisorId: '', supervisionDate: '', supervisionType: 'SUPERVISION',
  reviewFrequency: 'monthly', supervisorNameText: '', timeOfMeeting: '', location: 'face_to_face',
  previousActionsCompleted: '', summary: '',
  // metadata fields
  healthWellbeing: '', feelingsExperiences: '', annualLeave: '', personalIssues: '',
  hadAbsences: '', workloadScale: 5, dayActivities: '', pdpCompleted: '', pdpDetails: '',
  // values section
  keyValues: '', policyRead: '', safeguardingMeans: '', safeguardingSteps: '',
  safeguardingLead: '', missionReflection: '', serviceUserRelationship: '',
  feedbackToStaff: '', additionalSupport: '',
  // actions
  actionPoints: '', actionsEscalated: '',
  // burnout
  burnout: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as number[],
  burnoutTotal: 0,
  // next
  nextDate: '', nextSupervisionTime: '',
  signatureSupervisor: '', signatureSupervisee: '',
  conductedBy: '',
}

const BLANK_APPRAISAL = {
  staffId: '', appraiserId: '', appraisalDate: '', rating: 'good',
  performanceSummary: '', comments: '', goals: '', nextReviewDate: '',
}

interface SupervisionRecord {
  id: string; staff_id: string; staff_name: string; supervisor_id: string; supervisor_name: string
  supervision_date: string; supervision_type: string; summary?: string; next_date?: string
  review_frequency?: string; location?: string; burnout_total?: number; conducted_by?: string
  previous_actions_completed?: string; metadata?: any; strengths?: string
  areas_for_improvement?: string; action_points?: string
}

export default function SupervisionAppraisal() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'supervision' | 'appraisal'>('supervision')
  const [supervisions, setSupervisions] = useState<SupervisionRecord[]>([])
  const [appraisals, setAppraisals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadSupervisions = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/supervision?homeId=${user.homeId}`)
      setSupervisions(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load supervisions')
    } finally { setLoading(false) }
  }, [user?.homeId])

  const loadAppraisals = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/appraisal?homeId=${user.homeId}`)
      setAppraisals(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load appraisals')
    } finally { setLoading(false) }
  }, [user?.homeId])

  useEffect(() => {
    if (tab === 'supervision') loadSupervisions()
    else loadAppraisals()
  }, [tab, loadSupervisions, loadAppraisals])

  const handleDelete = async (id: string, type: 'supervision' | 'appraisal') => {
    if (!confirm('Delete this record?')) return
    try {
      await api.delete(type === 'supervision' ? `/supervision/${id}` : `/appraisal/${id}`)
      toast.success('Record deleted')
      if (type === 'supervision') loadSupervisions()
      else loadAppraisals()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete')
    }
  }

  const burnoutLabel = (total: number) => {
    if (total <= 12) return { label: 'Low', color: 'text-emerald-600' }
    if (total <= 22) return { label: 'Medium', color: 'text-amber-600' }
    return { label: 'High', color: 'text-rose-600' }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 py-4 flex justify-between items-center" style={{ background: '#111', borderBottom: '1px solid rgba(232,177,48,0.15)' }}>
        <div>
          <h1 className="text-2xl font-bold text-white">Supervision &amp; Appraisals</h1>
          <p className="text-sm text-slate-500 mt-0.5">Staff supervision records and performance appraisals</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New Record</Button>
      </div>

      <div className="flex gap-0 px-6" style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ key: 'supervision', label: 'Supervisions', icon: User }, { key: 'appraisal', label: 'Appraisals', icon: Award }].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                tab === t.key ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner /></div>
        ) : tab === 'supervision' ? (
          supervisions.length === 0 ? (
            <EmptyState title="No supervisions" description="No supervision records found"
              action={<Button onClick={() => setCreateOpen(true)}>Create Record</Button>} />
          ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
              {supervisions.map(s => {
                const expanded = expandedId === s.id
                const bLabel = s.burnout_total != null ? burnoutLabel(s.burnout_total) : null
                const meta = s.metadata || {}
                return (
                  <div key={s.id} className="card overflow-hidden">
                    <button onClick={() => setExpandedId(p => p === s.id ? null : s.id)}
                      className="w-full p-4 text-left hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{s.staff_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Supervisor: {s.supervisor_name}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {bLabel && (
                            <span className={`text-xs font-semibold ${bLabel.color}`}>
                              Burnout: {bLabel.label} ({s.burnout_total})
                            </span>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-400">{s.supervision_type}</p>
                            <p className="text-sm text-slate-300">{format(new Date(s.supervision_date), 'd MMM yyyy')}</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); handleDelete(s.id, 'supervision') }} className="text-slate-600 hover:text-rose-400 ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-5 pb-5 border-t border-white/5 space-y-4 text-sm">
                        <DetailGrid items={[
                          { label: 'Location', value: s.location === 'teams' ? 'Teams' : 'Face to Face' },
                          { label: 'Time', value: s.metadata?.timeOfMeeting },
                          { label: 'Previous Actions Completed', value: s.previous_actions_completed },
                          { label: 'Review Frequency', value: s.review_frequency },
                          { label: 'Conducted By', value: s.conducted_by },
                        ]} />
                        {s.summary && <DetailField label="Health & Wellbeing" value={s.summary} />}
                        {meta.feelingsExperiences && <DetailField label="Feelings & Experiences" value={meta.feelingsExperiences} />}
                        {meta.annualLeave && <DetailField label="Annual Leave" value={meta.annualLeave} />}
                        {meta.workloadScale != null && <DetailField label="Workload Scale (1–10)" value={String(meta.workloadScale)} />}
                        {meta.dayActivities && <DetailField label="Day-to-day Activities" value={meta.dayActivities} />}
                        {s.action_points && <DetailField label="Action Points" value={s.action_points} />}
                        {s.burnout_total != null && (
                          <div className="p-3 rounded-lg border border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Burnout Assessment</p>
                            <p className="text-sm font-semibold">Total: <span className={bLabel?.color}>{s.burnout_total} — {bLabel?.label}</span></p>
                            {Array.isArray(meta.burnout) && (
                              <div className="mt-2 space-y-1">
                                {meta.burnout.map((score: number, i: number) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                                    <span className="text-xs text-slate-400 flex-1 truncate">{BURNOUT_QUESTIONS[i]?.substring(0, 50)}…</span>
                                    <span className="text-xs font-semibold text-slate-300 w-20 text-right">{BURNOUT_LABELS.find(l => l.value === score)?.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {s.next_date && <DetailField label="Next Supervision" value={`${format(new Date(s.next_date), 'd MMM yyyy')}${meta.nextSupervisionTime ? ' at ' + meta.nextSupervisionTime : ''}`} />}
                        <DetailGrid items={[
                          { label: 'Signature — Supervisor', value: meta.signatureSupervisor },
                          { label: 'Signature — Supervisee', value: meta.signatureSupervisee },
                        ]} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          appraisals.length === 0 ? (
            <EmptyState title="No appraisals" description="No appraisal records found"
              action={<Button onClick={() => setCreateOpen(true)}>Create Record</Button>} />
          ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
              {appraisals.map((a: any) => (
                <div key={a.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{a.staff_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Appraiser: {a.appraiser_name}</p>
                  </div>
                  <div className="text-right">
                    {a.rating && <p className="text-sm font-bold text-amber-400">{a.rating}</p>}
                    <p className="text-sm text-slate-300">{format(new Date(a.appraisal_date), 'd MMM yyyy')}</p>
                  </div>
                  <button onClick={() => handleDelete(a.id, 'appraisal')} className="text-slate-600 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} homeId={user?.homeId || ''}
        type={tab}
        onSaved={() => { setCreateOpen(false); tab === 'supervision' ? loadSupervisions() : loadAppraisals() }} />
    </div>
  )
}

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-200 whitespace-pre-line">{value}</p>
    </div>
  )
}

function DetailGrid({ items }: { items: Array<{ label: string; value?: string | null }> }) {
  const visible = items.filter(i => i.value)
  if (!visible.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {visible.map(i => (
        <div key={i.label} className="p-2.5 rounded-lg" style={{ background: '#1a1a1a' }}>
          <p className="text-xs text-slate-500 mb-0.5">{i.label}</p>
          <p className="text-sm font-medium text-slate-200 capitalize">{i.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreateModal({ open, onClose, homeId, type, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; type: 'supervision' | 'appraisal'; onSaved: () => void
}) {
  const [form, setForm] = useState<any>(type === 'supervision' ? { ...BLANK_SUPERVISION } : { ...BLANK_APPRAISAL })
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      api.get(`/staff?homeId=${homeId}`).then(res => setStaff(res.data.data || []))
      setForm(type === 'supervision' ? { ...BLANK_SUPERVISION } : { ...BLANK_APPRAISAL })
    }
  }, [open, homeId, type])

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const setBurnout = (idx: number, val: number) => {
    const updated = [...form.burnout]
    updated[idx] = val
    const total = updated.reduce((a: number, b: number) => a + b, 0)
    setForm((p: any) => ({ ...p, burnout: updated, burnoutTotal: total }))
  }

  const staffOptions = staff.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (type === 'supervision') {
        if (!form.staffId || !form.supervisorId || !form.supervisionDate) {
          toast.error('Staff, supervisor and date are required'); setLoading(false); return
        }
        const meta = {
          timeOfMeeting: form.timeOfMeeting,
          healthWellbeing: form.healthWellbeing,
          feelingsExperiences: form.feelingsExperiences,
          annualLeave: form.annualLeave,
          personalIssues: form.personalIssues,
          hadAbsences: form.hadAbsences,
          workloadScale: form.workloadScale,
          dayActivities: form.dayActivities,
          pdpCompleted: form.pdpCompleted,
          pdpDetails: form.pdpDetails,
          keyValues: form.keyValues,
          policyRead: form.policyRead,
          safeguardingMeans: form.safeguardingMeans,
          safeguardingSteps: form.safeguardingSteps,
          safeguardingLead: form.safeguardingLead,
          missionReflection: form.missionReflection,
          serviceUserRelationship: form.serviceUserRelationship,
          feedbackToStaff: form.feedbackToStaff,
          additionalSupport: form.additionalSupport,
          burnout: form.burnout,
          nextSupervisionTime: form.nextSupervisionTime,
          signatureSupervisor: form.signatureSupervisor,
          signatureSupervisee: form.signatureSupervisee,
        }
        await api.post('/supervision', {
          homeId, staffId: form.staffId, supervisorId: form.supervisorId,
          supervisionDate: form.supervisionDate, supervisionType: form.supervisionType,
          reviewFrequency: form.reviewFrequency, supervisorNameText: form.supervisorNameText,
          timeOfMeeting: form.timeOfMeeting, location: form.location,
          previousActionsCompleted: form.previousActionsCompleted,
          summary: form.healthWellbeing,
          actionPoints: form.actionPoints, actionsEscalated: form.actionsEscalated,
          hadAbsences: form.hadAbsences, workloadScale: form.workloadScale,
          pdpCompleted: form.pdpCompleted,
          burnoutTotal: form.burnoutTotal, nextDate: form.nextDate || null,
          nextSupervisionTime: form.nextSupervisionTime,
          conductedBy: form.conductedBy, metadata: meta,
        })
      } else {
        if (!form.staffId || !form.appraiserId || !form.appraisalDate) {
          toast.error('Please fill required fields'); setLoading(false); return
        }
        await api.post('/appraisal', { homeId, ...form })
      }
      toast.success('Record created')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
    } finally { setLoading(false) }
  }

  if (type === 'appraisal') {
    return (
      <Modal open={open} onClose={onClose} title="Create Appraisal Record" size="lg">
        <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Select label="Staff Member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={staffOptions} placeholder="Select staff" />
          <Select label="Appraiser *" required value={form.appraiserId} onChange={e => set('appraiserId', e.target.value)} options={staffOptions} placeholder="Select appraiser" />
          <Input label="Appraisal Date *" type="date" required value={form.appraisalDate} onChange={e => set('appraisalDate', e.target.value)} />
          <Select label="Rating" value={form.rating} onChange={e => set('rating', e.target.value)} options={[
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' },
            { value: 'satisfactory', label: 'Satisfactory' }, { value: 'needs_improvement', label: 'Needs Improvement' }
          ]} />
          <div><label className="label">Performance Summary</label><textarea className="input" rows={3} value={form.performanceSummary} onChange={e => set('performanceSummary', e.target.value)} /></div>
          <div><label className="label">Comments</label><textarea className="input" rows={2} value={form.comments} onChange={e => set('comments', e.target.value)} /></div>
          <div><label className="label">Goals</label><textarea className="input" rows={2} value={form.goals} onChange={e => set('goals', e.target.value)} /></div>
          <Input label="Next review date" type="date" value={form.nextReviewDate} onChange={e => set('nextReviewDate', e.target.value)} />
          <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Record</Button>
          </div>
        </form>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Supervision Record" size="lg">
      <form onSubmit={save} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">

        {/* ── Assessment details ── */}
        <Section title="Assessment">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Staff *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={staffOptions} placeholder="Select staff" />
            <Select label="Assessment Type" value={form.supervisionType} onChange={e => set('supervisionType', e.target.value)} options={[
              { value: 'SUPERVISION', label: 'Supervision' },
              { value: 'APPRAISAL', label: 'Appraisal' },
              { value: 'PROBATION', label: 'Probation Review' },
              { value: 'INFORMAL', label: 'Informal 1:1' },
            ]} />
            <Input label="Last Assessed *" type="date" required value={form.supervisionDate} onChange={e => set('supervisionDate', e.target.value)} />
            <Select label="Review Frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={[
              { value: 'monthly', label: 'Monthly' }, { value: 'fortnightly', label: 'Fortnightly' },
              { value: 'eight_weekly', label: 'Every 8 weeks' }, { value: 'yearly', label: 'Yearly' },
            ]} />
          </div>
        </Section>

        {/* ── Meeting details ── */}
        <Section title="Meeting Details">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Supervisor *" required value={form.supervisorId} onChange={e => set('supervisorId', e.target.value)} options={staffOptions} placeholder="Select supervisor" />
            <Input label="Supervisor Name (free text)" value={form.supervisorNameText} onChange={e => set('supervisorNameText', e.target.value)} />
            <Input label="Time of Meeting" type="time" value={form.timeOfMeeting} onChange={e => set('timeOfMeeting', e.target.value)} />
            <div>
              <label className="label">Location</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="location" value="face_to_face" checked={form.location === 'face_to_face'} onChange={() => set('location', 'face_to_face')} /><span className="text-sm text-slate-300">Face to Face</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="location" value="teams" checked={form.location === 'teams'} onChange={() => set('location', 'teams')} /><span className="text-sm text-slate-300">Teams</span></label>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Previous actions ── */}
        <Section title="Previous Actions">
          <div>
            <label className="label">Has All Actions From Previous Supervision Been Completed?</label>
            <div className="flex gap-4 mt-1">
              {['Yes', 'No', 'Partially'].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="prevActions" value={v.toLowerCase()} checked={form.previousActionsCompleted === v.toLowerCase()} onChange={() => set('previousActionsCompleted', v.toLowerCase())} />
                  <span className="text-sm text-slate-300">{v}</span>
                </label>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Health & Wellbeing ── */}
        <Section title="Health &amp; Wellbeing">
          <div className="space-y-3">
            <div><label className="label">General Notes</label><textarea className="input" rows={3} value={form.healthWellbeing} onChange={e => set('healthWellbeing', e.target.value)} placeholder="How is the staff member's health and wellbeing..." /></div>
            <div><label className="label">Feelings &amp; Experiences (Start of supervision / how they feel today)</label><textarea className="input" rows={2} value={form.feelingsExperiences} onChange={e => set('feelingsExperiences', e.target.value)} /></div>
            <div><label className="label">Annual Leave (balance and planned leave)</label><textarea className="input" rows={2} value={form.annualLeave} onChange={e => set('annualLeave', e.target.value)} /></div>
            <div><label className="label">Personal Issues potentially impacting on work</label><textarea className="input" rows={2} value={form.personalIssues} onChange={e => set('personalIssues', e.target.value)} /></div>
            <div>
              <label className="label">Have You Had Any Absences In The Previous 6 Weeks?</label>
              <div className="flex gap-4 mt-1">
                {['Yes', 'No'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="absences" value={v.toLowerCase()} checked={form.hadAbsences === v.toLowerCase()} onChange={() => set('hadAbsences', v.toLowerCase())} />
                    <span className="text-sm text-slate-300">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Workload & Performance ── */}
        <Section title="Workload &amp; Performance Management">
          <div className="space-y-3">
            <div>
              <label className="label">Workload Scale (1 = not manageable, 10 = fully manageable): {form.workloadScale}</label>
              <input type="range" min={1} max={10} value={form.workloadScale} onChange={e => set('workloadScale', parseInt(e.target.value))}
                className="w-full mt-1" />
              <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                <span>1 — Not manageable</span>
                <span>10 — Fully manageable</span>
              </div>
            </div>
            <div><label className="label">Brief Snapshot of Day-to-Day Activities</label><textarea className="input" rows={3} value={form.dayActivities} onChange={e => set('dayActivities', e.target.value)} /></div>
            <div>
              <label className="label">Have You Completed Your PDP Plan?</label>
              <div className="flex gap-4 mt-1">
                {['Yes', 'No', 'In Progress'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pdp" value={v.toLowerCase().replace(' ', '_')} checked={form.pdpCompleted === v.toLowerCase().replace(' ', '_')} onChange={() => set('pdpCompleted', v.toLowerCase().replace(' ', '_'))} />
                    <span className="text-sm text-slate-300">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div><label className="label">Personal Development Plan (PDP) Details</label><textarea className="input" rows={3} value={form.pdpDetails} onChange={e => set('pdpDetails', e.target.value)} /></div>
          </div>
        </Section>

        {/* ── Our Values ── */}
        <Section title="Our Values &amp; Policy">
          <div className="space-y-3">
            <div><label className="label">What are the KEY VALUES that guide our organisation, and how do you apply them?</label><textarea className="input" rows={2} value={form.keyValues} onChange={e => set('keyValues', e.target.value)} /></div>
            <div><label className="label">What Policy have you read and how do you apply it day to day?</label><textarea className="input" rows={2} value={form.policyRead} onChange={e => set('policyRead', e.target.value)} /></div>
            <div><label className="label">What does Safeguarding Mean To You?</label><textarea className="input" rows={2} value={form.safeguardingMeans} onChange={e => set('safeguardingMeans', e.target.value)} /></div>
            <div><label className="label">What Steps Would You Take If You Discover A Safeguarding Concern?</label><textarea className="input" rows={2} value={form.safeguardingSteps} onChange={e => set('safeguardingSteps', e.target.value)} /></div>
            <div><label className="label">Who is The Safeguarding Lead?</label><input className="input w-full" value={form.safeguardingLead} onChange={e => set('safeguardingLead', e.target.value)} /></div>
            <div><label className="label">How do you help reflect our mission in your work with service users?</label><textarea className="input" rows={2} value={form.missionReflection} onChange={e => set('missionReflection', e.target.value)} /></div>
            <div><label className="label">Steps you take to develop a trusting relationship with service users</label><textarea className="input" rows={2} value={form.serviceUserRelationship} onChange={e => set('serviceUserRelationship', e.target.value)} /></div>
            <div><label className="label">Feedback from Supervisor (areas of strength and improvement)</label><textarea className="input" rows={3} value={form.feedbackToStaff} onChange={e => set('feedbackToStaff', e.target.value)} /></div>
            <div><label className="label">Would Staff Require Any Additional Support?</label><textarea className="input" rows={2} value={form.additionalSupport} onChange={e => set('additionalSupport', e.target.value)} /></div>
          </div>
        </Section>

        {/* ── Burnout Assessment ── */}
        <Section title="Burnout Assessment">
          <p className="text-xs text-slate-400 mb-4">This tool uses an informal approach to assessing burnout. Interpret results with common sense.</p>
          <div className="space-y-4">
            {BURNOUT_QUESTIONS.map((q, i) => (
              <div key={i}>
                <p className="text-sm text-slate-300 mb-2">{i + 1}. {q}</p>
                <div className="flex flex-wrap gap-2">
                  {BURNOUT_LABELS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium border transition-all ${
                      form.burnout[i] === opt.value
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}>
                      <input type="radio" name={`burnout_${i}`} value={opt.value} checked={form.burnout[i] === opt.value}
                        onChange={() => setBurnout(i, opt.value)} className="sr-only" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 mt-4">
              <p className="text-sm font-bold text-amber-400">Total Score: {form.burnoutTotal}</p>
              <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                <p>Low (1–12): No action required</p>
                <p>Medium (12–22): General advice on how to look after their wellbeing</p>
                <p>High (22–32): Offer appointment with therapist or signpost if need be</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Actions & Next Steps ── */}
        <Section title="Actions &amp; Next Steps">
          <div className="space-y-3">
            <div><label className="label">Agreed Action Plan for Next Supervision</label><textarea className="input" rows={3} value={form.actionPoints} onChange={e => set('actionPoints', e.target.value)} /></div>
            <div>
              <label className="label">Have Any Identified Actions Or Learning Needs Been Escalated To Management?</label>
              <div className="flex gap-4 mt-1">
                {['Yes', 'No'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="escalated" value={v.toLowerCase()} checked={form.actionsEscalated === v.toLowerCase()} onChange={() => set('actionsEscalated', v.toLowerCase())} />
                    <span className="text-sm text-slate-300">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Summary / Sign-off ── */}
        <Section title="Summary &amp; Sign-off">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Next Supervision" type="date" value={form.nextDate} onChange={e => set('nextDate', e.target.value)} />
            <Input label="Time of Next Supervision" type="time" value={form.nextSupervisionTime} onChange={e => set('nextSupervisionTime', e.target.value)} />
            <Input label="Signature — Supervisor" value={form.signatureSupervisor} onChange={e => set('signatureSupervisor', e.target.value)} placeholder="Type name as signature..." />
            <Input label="Signature — Supervisee" value={form.signatureSupervisee} onChange={e => set('signatureSupervisee', e.target.value)} placeholder="Type name as signature..." />
            <Input label="Conducted By" value={form.conductedBy} onChange={e => set('conductedBy', e.target.value)} />
          </div>
        </Section>

        <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Record</Button>
        </div>
      </form>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <div className="px-4 py-2.5" style={{ background: 'rgba(232,177,48,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400/80" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
