import React, { useEffect, useState, useRef, useCallback } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, SpeechTextarea } from '../../components/ui'
import { Plus, AlertTriangle, CheckCircle, Clock, FileText, Edit, Printer, Trash2,
         History, ChevronDown, Paperclip, Users, BookOpen, ShieldCheck, Star, Copy, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

async function uploadDoc(file: File): Promise<{ fileUrl: string; fileName: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data.data
}

function AttachmentUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { fileUrl, fileName } = await uploadDoc(file)
      const base = window.location.origin
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${base}${fileUrl}`
      const line = `${fileName}: ${fullUrl}`
      onChange(value ? `${value}\n${line}` : line)
      toast.success(`${fileName} uploaded`)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  return (
    <div>
      <label className="label flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Attachments / document links</label>
      <SpeechTextarea rows={2} value={value} onChange={onChange} placeholder="Paste document links or note attachment references..." />
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload file'}
        </button>
        <span className="text-xs text-slate-400">PDF, Word, Excel, images up to 20MB</span>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
          onChange={handleFile} />
      </div>
    </div>
  )
}

const PLAN_TYPES = [
  { value: 'physical_health', label: 'Physical Health Support Plan' },
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
  { value: 'pen_assessment', label: 'Pain Assessment' },
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
  { value: 'monthly_progress', label: 'Monthly Progress Report' },
  { value: 'custom', label: 'Custom / Other' },
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

const TEMPLATE_KEY = 'compcare_plan_templates'

function getTemplates(): any[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]') } catch { return [] }
}
function saveTemplate(tpl: any) {
  const templates = getTemplates()
  templates.unshift({ ...tpl, savedAt: new Date().toISOString() })
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates.slice(0, 20)))
}
function deleteTemplate(idx: number) {
  const templates = getTemplates()
  templates.splice(idx, 1)
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates))
}

// ── TEMPLATE INFRASTRUCTURE ──────────────────────────────────────────────────

const AUTISM_SECTIONS = [
  { key: 'background', label: 'Background' },
  { key: 'autismProfile', label: 'My Autism and PDA Profile' },
  { key: 'distressBehaviours', label: 'My Behaviour When I\'m Distressed' },
  { key: 'behaviourTriggers', label: 'What These Behaviours Are Usually Linked To' },
  { key: 'whatHelpsDistress', label: 'What Helps Me in These Moments' },
  { key: 'howICommunicate', label: 'How I Communicate' },
  { key: 'communicationNeeds', label: 'How I Need People to Communicate With Me' },
  { key: 'setupApproach', label: 'The SETUP Communication Approach' },
  { key: 'dailyRoutines', label: 'My Daily Activities and Routines' },
  { key: 'changeExperience', label: 'My Experience of Change' },
  { key: 'changeSupport', label: 'How Staff Should Support Me During Change' },
  { key: 'changeHarderFactors', label: 'What Makes Change Harder for Me' },
  { key: 'cognitiveNeeds', label: 'My Cognition / Thinking Style' },
  { key: 'mentalHealth', label: 'My Mental Health & Emotional Wellbeing' },
  { key: 'whatHelpsRegulation', label: 'What Helps Me Stay Regulated' },
  { key: 'whatMakesHarder', label: 'What Makes Things Harder for Me' },
]

const ADHD_SECTIONS = [
  { key: 'background', label: 'Background – How My ADHD Affects Me' },
  { key: 'attentionFocus', label: 'Attention & Focus' },
  { key: 'organisationPlanning', label: 'Organisation & Planning' },
  { key: 'emotionalRegulation', label: 'Emotional Regulation' },
  { key: 'impulsivity', label: 'Impulsivity' },
  { key: 'hyperactivity', label: 'Hyperactivity (Internal or External)' },
  { key: 'whatHelpsAdhd', label: 'What Helps Me With My ADHD' },
  { key: 'adhdTriggers', label: 'My ADHD Triggers' },
  { key: 'earlyWarningSigns', label: 'Early Warning Signs I\'m Struggling' },
  { key: 'whatHelpsRegulate', label: 'What Helps Me Regulate My ADHD' },
  { key: 'whatMakesWorse', label: 'What Makes My ADHD Worse' },
  { key: 'communicationSupport', label: 'Communication Support – How to Help Me' },
  { key: 'aboutMe', label: 'About Me' },
  { key: 'strengths', label: 'My Strengths' },
  { key: 'crisisSupport', label: 'Crisis-Level Support' },
  { key: 'dailyActivities', label: 'Daily Activities & Routine Support' },
  { key: 'socialRelationships', label: 'Social & Relationship Support' },
  { key: 'changeExperience', label: 'My Experience of Change' },
  { key: 'cognitionThinking', label: 'My Cognition / Thinking Style' },
  { key: 'emotionalSupport', label: 'Emotional Regulation Support' },
]

const MONTHLY_HEADER_SECTIONS = [
  { key: 'month', label: 'Month', isText: true },
  { key: 'completedBy', label: 'Completed by (Name & Role)', isText: true },
  { key: 'dateCompleted', label: 'Date Completed', isText: true },
]
const MONTHLY_BODY_SECTIONS = [
  { key: 'personalOralCare', label: 'Personal & Oral Care' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'householdTasks', label: 'Household Tasks' },
  { key: 'nutritionHydration', label: 'Nutrition and Hydration' },
  { key: 'communityEngagement', label: 'Community Engagement' },
  { key: 'behaviouralConcerns', label: 'Behavioural Concerns' },
  { key: 'medicationCompliance', label: 'Medication Compliance' },
  { key: 'communityAccessSafeguarding', label: 'Community Access and Safeguarding' },
  { key: 'mentalHealthEmotionalWellbeing', label: 'Mental Health & Emotional Wellbeing' },
  { key: 'financialManagement', label: 'Financial Management' },
  { key: 'familySocialContact', label: 'Family and Social Contact' },
  { key: 'selfHarm', label: 'Self-Harm' },
  { key: 'behaviourTowardsStaff', label: 'Behaviour Towards Staff' },
  { key: 'summaryNotes', label: 'Summary / Additional Notes' },
]

function YesNoRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex gap-4">
        {['Yes', 'No'].map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="w-3.5 h-3.5" />
            <span className="text-sm text-slate-600">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function TemplateFields({ planType, data, onChange, suName }: { planType: string; data: any; onChange: (d: any) => void; suName?: string }) {
  const set = (key: string, val: string) => onChange({ ...data, [key]: val })
  const tv = (key: string) => data?.[key] || ''

  if (planType === 'oral_care') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">About My Teeth</p>
          <p className="text-xs text-slate-500 italic mb-2">Good oral hygiene helps reduce the risk of systemic illnesses such as heart disease, diabetes-related complications, and respiratory infections. Staff must consistently provide high-quality oral care, supporting people with brushing, flossing, denture cleaning, and arranging regular dental checkups.</p>
          <YesNoRow label="I have all my own teeth" value={tv('hasOwnTeeth')} onChange={v => set('hasOwnTeeth', v)} />
          <YesNoRow label="I have dentures" value={tv('hasDentures')} onChange={v => set('hasDentures', v)} />
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">My Preference</p>
          <YesNoRow label="I use mouth wash" value={tv('usesMouthwash')} onChange={v => set('usesMouthwash', v)} />
          <YesNoRow label="I use prescribed mouth wash" value={tv('usesPrescribedMouthwash')} onChange={v => set('usesPrescribedMouthwash', v)} />
          <div className="mt-3"><label className="label">My mouthwash preference</label><input className="input w-full text-sm" value={tv('mouthwashPreference')} onChange={e => set('mouthwashPreference', e.target.value)} /></div>
          <YesNoRow label="I use floss" value={tv('usesFloss')} onChange={v => set('usesFloss', v)} />
          <div className="mt-3"><label className="label">My floss preference</label><input className="input w-full text-sm" value={tv('flossPreference')} onChange={e => set('flossPreference', e.target.value)} /></div>
          <YesNoRow label="I use denture tablets" value={tv('usesDentureTablets')} onChange={v => set('usesDentureTablets', v)} />
          <div className="mt-3"><label className="label">My denture tablet preference</label><input className="input w-full text-sm" value={tv('dentureTabletPreference')} onChange={e => set('dentureTabletPreference', e.target.value)} /></div>
          <div className="mt-3"><label className="label">My toothbrush preference</label><input className="input w-full text-sm" value={tv('toothbrushPreference')} onChange={e => set('toothbrushPreference', e.target.value)} /></div>
          <div className="mt-3"><label className="label">My toothpaste preference</label><input className="input w-full text-sm" value={tv('toothpastePreference')} onChange={e => set('toothpastePreference', e.target.value)} /></div>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#e8b130' }}>Support</p>
          <YesNoRow label="I require support with my oral hygiene" value={tv('requiresSupport')} onChange={v => set('requiresSupport', v)} />
          <div className="mt-3"><SpeechTextarea label="Details" className="w-full" rows={3} value={tv('supportDetails')} onChange={v => set('supportDetails', v)} /></div>
        </div>
      </div>
    )
  }

  if (planType === 'autism') {
    return (
      <div className="space-y-3">
        {AUTISM_SECTIONS.map(s => (
          <SpeechTextarea key={s.key} label={s.label} className="w-full text-sm" rows={4} value={tv(s.key)} onChange={v => set(s.key, v)} />
        ))}
      </div>
    )
  }

  if (planType === 'adhd') {
    return (
      <div className="space-y-3">
        {ADHD_SECTIONS.map(s => (
          <SpeechTextarea key={s.key} label={s.label} className="w-full text-sm" rows={3} value={tv(s.key)} onChange={v => set(s.key, v)} />
        ))}
      </div>
    )
  }

  if (planType === 'monthly_progress') {
    return (
      <div className="space-y-0 border border-slate-300 rounded-xl overflow-hidden">
        {/* Template header */}
        <div className="bg-slate-800 text-white px-5 py-3 text-center">
          <p className="text-sm font-bold tracking-widest uppercase">Monthly Progress Report</p>
        </div>
        {/* Header fields */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 w-52 flex-shrink-0">Service User Name:</span>
            <span className="flex-1 border-b border-slate-400 pb-0.5 text-sm text-slate-900 font-medium min-h-[22px]">{suName || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 w-52 flex-shrink-0">Month:</span>
            <input className="flex-1 border-b border-slate-400 bg-transparent text-sm outline-none py-0.5 focus:border-amber-500"
              value={tv('month')} onChange={e => set('month', e.target.value)} placeholder="e.g. June 2026" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 w-52 flex-shrink-0">Completed by (Name &amp; Role):</span>
            <input className="flex-1 border-b border-slate-400 bg-transparent text-sm outline-none py-0.5 focus:border-amber-500"
              value={tv('completedBy')} onChange={e => set('completedBy', e.target.value)} placeholder="Name and role" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 w-52 flex-shrink-0">Date Completed:</span>
            <input type="date" className="flex-1 border-b border-slate-400 bg-transparent text-sm outline-none py-0.5 focus:border-amber-500"
              value={tv('dateCompleted')} onChange={e => set('dateCompleted', e.target.value)} />
          </div>
        </div>
        {/* Care area sections */}
        {MONTHLY_BODY_SECTIONS.map((s, i) => (
          <div key={s.key} className={`border-b border-slate-200 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
            <div className="px-5 pt-3 pb-1">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{s.label}</p>
            </div>
            <div className="px-5 pb-3">
              <textarea
                rows={s.key === 'summaryNotes' ? 4 : 3}
                className="w-full text-sm border-0 bg-transparent outline-none resize-none text-slate-800 placeholder-slate-300 leading-relaxed"
                value={tv(s.key)} onChange={e => set(s.key, e.target.value)}
                placeholder={`Enter notes for ${s.label.toLowerCase()}...`}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

function TemplateDetail({ plan }: { plan: any }) {
  const td = plan.template_data || {}
  const tv = (key: string) => td[key] || ''
  const pt = plan.plan_type

  const row = (label: string, value: string) => value ? (
    <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  ) : null

  const sec = (label: string, value: string) => value ? (
    <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/30">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  ) : null

  if (pt === 'oral_care') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">About My Teeth</p>
          {row('I have all my own teeth', tv('hasOwnTeeth'))}
          {row('I have dentures', tv('hasDentures'))}
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">My Preference</p>
          {row('I use mouth wash', tv('usesMouthwash'))}
          {row('I use prescribed mouth wash', tv('usesPrescribedMouthwash'))}
          {row('My mouthwash preference', tv('mouthwashPreference'))}
          {row('I use floss', tv('usesFloss'))}
          {row('My floss preference', tv('flossPreference'))}
          {row('I use denture tablets', tv('usesDentureTablets'))}
          {row('My denture tablet preference', tv('dentureTabletPreference'))}
          {row('My toothbrush preference', tv('toothbrushPreference'))}
          {row('My toothpaste preference', tv('toothpastePreference'))}
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#e8b130' }}>Support</p>
          {row('I require support with my oral hygiene', tv('requiresSupport'))}
          {tv('supportDetails') && <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">{tv('supportDetails')}</p>}
        </div>
      </div>
    )
  }

  if (pt === 'autism') {
    return (
      <div className="space-y-3">
        {AUTISM_SECTIONS.filter(s => tv(s.key)).map(s => sec(s.label, tv(s.key)))}
      </div>
    )
  }

  if (pt === 'adhd') {
    return (
      <div className="space-y-3">
        {ADHD_SECTIONS.filter(s => tv(s.key)).map(s => sec(s.label, tv(s.key)))}
      </div>
    )
  }

  if (pt === 'monthly_progress') {
    return (
      <div className="space-y-0 border border-slate-300 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 text-center">
          <p className="text-sm font-bold tracking-widest uppercase">Monthly Progress Report</p>
        </div>
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 space-y-2">
          {plan.su_name && (
            <div className="flex gap-3 py-1 border-b border-slate-200 last:border-0">
              <span className="text-sm font-semibold text-slate-500 w-52 flex-shrink-0">Service User Name:</span>
              <span className="text-sm text-slate-900">{plan.su_name}</span>
            </div>
          )}
          {tv('month') && (
            <div className="flex gap-3 py-1 border-b border-slate-200 last:border-0">
              <span className="text-sm font-semibold text-slate-500 w-52 flex-shrink-0">Month:</span>
              <span className="text-sm text-slate-900">{tv('month')}</span>
            </div>
          )}
          {tv('completedBy') && (
            <div className="flex gap-3 py-1 border-b border-slate-200 last:border-0">
              <span className="text-sm font-semibold text-slate-500 w-52 flex-shrink-0">Completed by (Name &amp; Role):</span>
              <span className="text-sm text-slate-900">{tv('completedBy')}</span>
            </div>
          )}
          {tv('dateCompleted') && (
            <div className="flex gap-3 py-1">
              <span className="text-sm font-semibold text-slate-500 w-52 flex-shrink-0">Date Completed:</span>
              <span className="text-sm text-slate-900">{tv('dateCompleted')}</span>
            </div>
          )}
        </div>
        {MONTHLY_BODY_SECTIONS.map((s, i) => tv(s.key) ? (
          <div key={s.key} className={`border-b border-slate-200 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
            <div className="px-5 pt-3 pb-1">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{s.label}</p>
            </div>
            <div className="px-5 pb-3">
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{tv(s.key)}</p>
            </div>
          </div>
        ) : null)}
      </div>
    )
  }

  return null
}

function ReviewStatus({ nextReviewDate }: { nextReviewDate: string }) {
  if (!nextReviewDate) return null
  const days = differenceInDays(new Date(nextReviewDate), new Date())
  if (days < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Overdue by {Math.abs(days)} days</span>
  if (days <= 7) return <span className="flex items-center gap-1 text-xs text-orange-600 font-medium"><Clock className="w-3 h-3" />Next review in {days} days</span>
  return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />Next review date: {format(new Date(nextReviewDate), 'd MMM yyyy')}</span>
}

async function fetchSuFull(suId: string): Promise<any> {
  try { const r = await suApi.get(suId); return r.data.data } catch { return null }
}

function doPrint(html: string) {
  const w = window.open('', '_blank', 'width=1000,height=750')
  if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 900)
}

const CARE_PLAN_PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11.5px;line-height:1.5;background:#fff}

  /* Letterhead */
  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:10px;margin-bottom:4px}
  .org-name{font-size:15px;font-weight:700;letter-spacing:.01em;color:#132a4f}
  .org-addr{font-size:9.5px;color:#444;margin-top:3px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9.5px;color:#444;font-family:Arial,sans-serif;line-height:1.6}
  .doc-meta strong{color:#132a4f}

  .doc-title{text-align:center;margin:20px 0 4px;font-size:19px;font-weight:700;letter-spacing:.02em;color:#132a4f}
  .doc-subtitle{text-align:center;font-size:10px;color:#555;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.09em;margin-bottom:18px}

  /* Resident identity block */
  .res-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:4px}
  .res-photo{width:58px;height:72px;object-fit:cover;border:1px solid #999;flex-shrink:0}
  .res-photo-fallback{width:58px;height:72px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#666;font-family:Arial,sans-serif;flex-shrink:0;background:#f2f2f0}
  table.idtable{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10.5px}
  table.idtable td{border:1px solid #999;padding:6px 10px;vertical-align:top}
  table.idtable td.lbl{width:19%;background:#f2f2f0;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.05em;color:#333}
  table.idtable td.val{width:31%;font-size:11px}

  /* Plan meta strip */
  .plan-meta-box{border:1.5px solid #132a4f;padding:9px 14px;margin-bottom:4px;font-family:Arial,sans-serif;display:flex;flex-wrap:wrap;gap:4px 22px}
  .plan-meta-box span{font-size:9.5px;color:#333}
  .plan-meta-box strong{color:#132a4f}

  /* Section headings */
  h2.sec{font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#132a4f;border-bottom:1px solid #132a4f;padding-bottom:4px;margin:22px 0 10px;page-break-after:avoid}
  h2.sec .num{display:inline-block;width:18px}
  h3.sub{font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;color:#132a4f;margin:12px 0 4px;page-break-after:avoid}
  .body-text{font-size:11px;line-height:1.7;color:#222;white-space:pre-line;margin-bottom:8px}
  .body-text.muted{color:#777;font-style:italic}

  /* Data / field tables */
  table.fields{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10.5px;page-break-inside:avoid}
  table.fields th{width:38%;text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  table.fields td{border:1px solid #999;padding:6px 10px;font-size:11px}
  table.fields tr.on td{font-weight:700}

  table.data{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10px;page-break-inside:avoid}
  table.data th{text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  table.data td{border:1px solid #999;padding:6px 10px;vertical-align:top;font-size:10.5px}

  .allergy-block{border:1px solid #132a4f;border-left:5px solid #132a4f;padding:9px 14px;margin-bottom:16px;font-family:Arial,sans-serif}
  .allergy-block .al-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .allergy-block .al-val{font-size:12.5px;font-weight:700}

  /* Sign-off */
  .sig-panel{display:flex;gap:24px;margin-top:6px}
  .sig-cell{flex:1;border:1px solid #999;padding:10px 12px}
  .sig-role{font-family:Arial,sans-serif;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:8px}
  .sig-img-slot{height:44px;border-bottom:1px solid #1a1a1a;display:flex;align-items:flex-end;padding-bottom:2px}
  .sig-img-slot img{max-height:40px;max-width:180px}
  .sig-typed{font-family:'Brush Script MT',cursive;font-size:17px;color:#1a1a1a}
  .sig-caption{font-family:Arial,sans-serif;font-size:8.5px;color:#555;margin-top:6px;display:flex;justify-content:space-between;gap:12px}
  .sig-status{font-family:Arial,sans-serif;font-size:8.5px;margin-top:6px;font-weight:700}
  .sig-status.pending{font-weight:400;font-style:italic;color:#777}

  .footer{margin-top:22px;padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8.5px;color:#555}
  .footer .confid{font-weight:700;letter-spacing:.05em}

  /* Pagination — cover page uses a fixed print-safe height (A4 height minus
     @page margins), never 100vh, since 100vh resolves against the print
     engine's viewport rather than the physical page. */
  .cover{max-width:190mm;margin:0 auto;display:flex;flex-direction:column;min-height:273mm;page-break-after:always;padding:16mm 14mm 10mm}
  .content-page{max-width:190mm;margin:0 auto;padding:10mm 14mm 16mm}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4}
  }

  /* "Print all" concatenates multiple plans — force a break after each one
     so a short plan's content-page never runs into the next plan's cover. */
  .plan-block{page-break-after:always}
  .plan-block:last-child{page-break-after:avoid}
`

function buildTemplateSections(plan: any, su?: any): { title: string; inner: string }[] {
  const td = plan.template_data || {}
  const tv = (key: string) => (td[key] || '').toString().trim()
  const p = plan.plan_type
  const esc = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v))
  const bodyText = (v?: string | null) => (v && v.trim() ? `<p class="body-text">${v.replace(/\n/g, '<br/>')}</p>` : '')
  const yesNoRow = (label: string, value: string) =>
    value ? `<tr class="${value === 'Yes' ? 'on' : ''}"><th>${label}</th><td>${value}</td></tr>` : ''
  const textRow = (label: string, value: string) =>
    value ? `<tr><th>${label}</th><td>${value}</td></tr>` : ''

  const sections: { title: string; inner: string }[] = []

  if (p === 'oral_care') {
    const teethRows = [yesNoRow('I have all my own teeth', tv('hasOwnTeeth')), yesNoRow('I have dentures', tv('hasDentures'))].filter(Boolean).join('')
    sections.push({
      title: 'About My Teeth',
      inner: `
        <p class="body-text muted">Good oral hygiene helps reduce the risk of systemic illnesses such as heart disease, diabetes-related complications, and respiratory infections.</p>
        ${teethRows ? `<table class="fields">${teethRows}</table>` : ''}
      `,
    })
    const prefRows = [
      yesNoRow('I use mouth wash', tv('usesMouthwash')),
      yesNoRow('I use prescribed mouth wash', tv('usesPrescribedMouthwash')),
      textRow('My mouthwash preference', tv('mouthwashPreference')),
      yesNoRow('I use floss', tv('usesFloss')),
      textRow('My floss preference', tv('flossPreference')),
      yesNoRow('I use denture tablets', tv('usesDentureTablets')),
      textRow('My denture tablet preference', tv('dentureTabletPreference')),
      textRow('My toothbrush preference', tv('toothbrushPreference')),
      textRow('My toothpaste preference', tv('toothpastePreference')),
    ].filter(Boolean).join('')
    if (prefRows) sections.push({ title: 'My Preference', inner: `<table class="fields">${prefRows}</table>` })
    const supportRow = yesNoRow('I require support with my oral hygiene', tv('requiresSupport'))
    sections.push({
      title: 'Support',
      inner: `
        ${supportRow ? `<table class="fields">${supportRow}</table>` : ''}
        ${tv('supportDetails') ? `<p class="body-text">${tv('supportDetails').replace(/\n/g, '<br/>')}</p>` : ''}
      `,
    })
    return sections
  }

  if (p === 'autism' || p === 'adhd') {
    if (plan.aims_outcomes && plan.aims_outcomes.trim()) sections.push({ title: 'My Aims & Objectives', inner: bodyText(plan.aims_outcomes) })
    const list = p === 'autism' ? AUTISM_SECTIONS : ADHD_SECTIONS
    list.forEach(s => { if (tv(s.key)) sections.push({ title: s.label, inner: bodyText(tv(s.key)) }) })
    return sections
  }

  if (p === 'monthly_progress') {
    const suDisplayName = su ? `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim() : (plan.su_name || '')
    sections.push({
      title: 'Report Details',
      inner: `
        <table class="fields">
          <tr><th>Service User Name</th><td>${esc(suDisplayName)}</td></tr>
          <tr><th>Month</th><td>${esc(tv('month'))}</td></tr>
          <tr><th>Completed By</th><td>${esc(tv('completedBy'))}</td></tr>
          <tr><th>Date Completed</th><td>${esc(tv('dateCompleted'))}</td></tr>
        </table>
      `,
    })
    const parts = MONTHLY_BODY_SECTIONS.filter(s => tv(s.key)).map(s => `<h3 class="sub">${s.label}</h3><p class="body-text">${tv(s.key).replace(/\n/g, '<br/>')}</p>`).join('')
    if (parts) sections.push({ title: 'Monthly Progress Details', inner: parts })
    return sections
  }

  if (p === 'medication_support') {
    if (plan.aims_outcomes && plan.aims_outcomes.trim()) sections.push({ title: 'My Aims & Objectives', inner: bodyText(plan.aims_outcomes) })
    if (plan.what_i_can_do && plan.what_i_can_do.trim()) sections.push({ title: 'What I Can Do', inner: bodyText(plan.what_i_can_do) })
    if (plan.how_to_support && plan.how_to_support.trim()) sections.push({ title: 'How To Support Me', inner: bodyText(plan.how_to_support) })
    if (plan.regular_medications && plan.regular_medications.trim()) sections.push({ title: 'Regular Medications', inner: bodyText(plan.regular_medications) })
    if (plan.prn_medications && plan.prn_medications.trim()) sections.push({ title: 'PRN Medications', inner: bodyText(plan.prn_medications) })
    if (plan.otc_medications && plan.otc_medications.trim()) sections.push({ title: 'Over-The-Counter Medications', inner: bodyText(plan.otc_medications) })
    if (plan.prn_list && plan.prn_list.trim()) sections.push({ title: 'PRN List', inner: bodyText(plan.prn_list) })
    if (plan.indication_for_use && plan.indication_for_use.trim()) sections.push({ title: 'Indication for Use', inner: bodyText(plan.indication_for_use) })
    const prnRows = [
      { key: 'prnAssessment', label: 'Assessment Before Administration' },
      { key: 'prnStaffInvolvement', label: 'Staff Involvement' },
      { key: 'prnAdminProcess', label: 'Administration Process' },
      { key: 'prnRefusal', label: 'PRN Refusal' },
      { key: 'prnMonitoring', label: 'Monitoring After Administration' },
      { key: 'prnEvaluation', label: 'Evaluation' },
      { key: 'prnDocumentation', label: 'Documentation' },
      { key: 'prnEmergency', label: 'When to Seek Advice / Emergency' },
      { key: 'prnSpecial', label: 'Special Considerations' },
      { key: 'prnTraining', label: 'Staff Training Requirements' },
    ]
    const prnParts = prnRows.filter(s => td[s.key]).map(s => `<h3 class="sub">${s.label}</h3><p class="body-text">${String(td[s.key]).replace(/\n/g, '<br/>')}</p>`).join('')
    if (prnParts) sections.push({ title: 'PRN Protocol Details', inner: prnParts })
    if (plan.prn_protocol && plan.prn_protocol.trim()) sections.push({ title: 'General PRN Protocol Notes', inner: bodyText(plan.prn_protocol) })
    return sections
  }

  // Default — standard 3 fields
  if (plan.aims_outcomes && plan.aims_outcomes.trim()) sections.push({ title: 'My Aims & Objectives', inner: bodyText(plan.aims_outcomes) })
  if (plan.what_i_can_do && plan.what_i_can_do.trim()) sections.push({ title: 'What I Can Do', inner: bodyText(plan.what_i_can_do) })
  if (plan.how_to_support && plan.how_to_support.trim()) sections.push({ title: 'How To Support Me', inner: bodyText(plan.how_to_support) })
  return sections
}

function buildPrintHtml(plan: any, su: any, reads: any[]): string {
  const esc = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v))
  const planLabel = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
  const name = su ? `${su.first_name || ''} ${su.last_name || ''}`.trim() : plan.su_name || ''
  const dobLong = su?.date_of_birth ? new Date(su.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const age = su?.date_of_birth ? Math.floor((Date.now() - new Date(su.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const address = [su?.address1, su?.address2, su?.address3, su?.postcode].filter(Boolean).join(', ') || '—'
  const reviewDate = plan.last_review_date ? new Date(plan.last_review_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
  const nextReview = plan.next_review_date ? new Date(plan.next_review_date).toLocaleDateString('en-GB') : '—'
  const lastRead = reads.length > 0 ? `Last read by ${reads[0].staff_name} on ${new Date(reads[0].read_at).toLocaleDateString('en-GB')}` : ''
  const admissionDate = su?.admission_date ? new Date(su.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const allergiesText = [su?.food_allergies, su?.allergies].filter(Boolean).join(', ')

  const photoHtml = su?.photo_url
    ? `<img class="res-photo" src="${su.photo_url.startsWith('http') ? su.photo_url : `https://app.comprehensivecare.org.uk${su.photo_url}`}" alt="Resident photo" />`
    : `<div class="res-photo-fallback">${(name[0] || '?').toUpperCase()}</div>`

  const bodyText = (v?: string | null) => (v && v.trim() ? `<p class="body-text">${v.replace(/\n/g, '<br/>')}</p>` : '')

  // Build the numbered content sections as an ordered array, then number them
  // in one final pass — this keeps printed numbering matching render order
  // regardless of which optional sections are present for this plan.
  const sections: { title: string; inner: string }[] = []

  buildTemplateSections(plan, su).forEach(s => sections.push(s))

  if (plan.attachments_notes && plan.attachments_notes.trim()) {
    sections.push({ title: 'Attachments / Notes', inner: bodyText(plan.attachments_notes) })
  }

  if (plan.consent_notes && plan.consent_notes.trim()) {
    sections.push({
      title: 'Consent',
      inner: `
        <p class="body-text">${plan.consent_notes.replace(/\n/g, '<br/>')}</p>
        ${plan.consent_given ? `<p class="body-text" style="font-weight:700">Consent given${plan.consent_date ? ' on ' + new Date(plan.consent_date).toLocaleDateString('en-GB') : ''}</p>` : ''}
      `,
    })
  }

  if (plan.updates && plan.updates.length) {
    const rows = plan.updates.map((u: any) => `
      <tr>
        <td style="white-space:nowrap">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}</td>
        <td>${esc(u.updated_by_name)}</td>
        <td>${(u.update_notes || '').replace(/\n/g, '<br/>')}</td>
      </tr>`).join('')
    sections.push({
      title: 'Review History',
      inner: `
        <table class="data">
          <thead><tr><th>Date Reviewed</th><th>Reviewed By</th><th>Notes</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    })
  }

  const sigCell = (role: string, signName: string | null, dataUrl: string | null, date: string | null, done: boolean) => `
    <div class="sig-cell">
      <div class="sig-role">${role}</div>
      <div class="sig-img-slot">${dataUrl ? `<img src="${dataUrl}" alt="Signature" />` : (signName ? `<span class="sig-typed">${esc(signName)}</span>` : '')}</div>
      <div class="sig-caption"><span>Name: ${esc(signName)}</span><span>Date: ${date ? new Date(date).toLocaleDateString('en-GB') : '—'}</span></div>
      <div class="sig-status${done ? '' : ' pending'}">${done ? 'Signed off' : 'Awaiting signature'}</div>
    </div>`

  sections.push({
    title: 'Sign Off',
    inner: `
      <div class="sig-panel">
        ${sigCell('Service User / Family Representative', plan.su_signed_by, plan.su_signature_dataurl, plan.su_signed_date, !!plan.su_sign_off)}
        ${sigCell('Staff Member', plan.staff_signed_by, plan.staff_signature_dataurl, plan.staff_signed_date, !!plan.staff_sign_off)}
      </div>
    `,
  })

  const sectionsHtml = sections.map((s, i) => `<h2 class="sec"><span class="num">${i + 1}.</span>${s.title}</h2>${s.inner}`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${name} — ${planLabel}</title>
  <style>${CARE_PLAN_PRINT_CSS}</style></head><body>

  <!-- PAGE 1: Personal Information -->
  <div class="cover">
    <div class="letterhead">
      <div>
        <div class="org-name">Comprehensive Care Ltd</div>
        <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
      </div>
      <div class="doc-meta">
        <div>Document ref: SP-${plan.id || '—'}</div>
        <div>Printed: <strong>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
      </div>
    </div>

    <div class="doc-title">${planLabel}</div>
    <div class="doc-subtitle">Support Plan — Individual Resident Record</div>

    <div class="res-head">
      <div style="flex:1">
        <table class="idtable">
          <tr><td class="lbl">Resident</td><td class="val" colspan="3" style="font-weight:700;font-size:12.5px">${esc(name)}</td></tr>
          <tr><td class="lbl">Date of Birth</td><td class="val">${dobLong}${age !== null ? ` (${age} yrs)` : ''}</td><td class="lbl">NHS Number</td><td class="val">${esc(su?.nhs_number)}</td></tr>
          <tr><td class="lbl">Gender</td><td class="val">${esc(su?.gender)}</td><td class="lbl">Preferred Name</td><td class="val">${esc(su?.preferred_name)}</td></tr>
          <tr><td class="lbl">Address</td><td class="val" colspan="3">${address}</td></tr>
          <tr><td class="lbl">Phone</td><td class="val">${esc(su?.phone)}</td><td class="lbl">Email</td><td class="val">${esc(su?.email)}</td></tr>
          ${admissionDate ? `<tr><td class="lbl">Admission Date</td><td class="val" colspan="3">${admissionDate}</td></tr>` : ''}
          ${su?.gp_name ? `<tr><td class="lbl">GP</td><td class="val" colspan="3">${esc(su.gp_name)}${su.gp_phone ? ` · ${su.gp_phone}` : ''}</td></tr>` : ''}
          ${su?.pharmacy_name ? `<tr><td class="lbl">Pharmacy</td><td class="val" colspan="3">${esc(su.pharmacy_name)}${su.pharmacy_phone ? ` · ${su.pharmacy_phone}` : ''}</td></tr>` : ''}
        </table>
      </div>
      ${photoHtml}
    </div>

    ${allergiesText ? `<div class="allergy-block"><div class="al-label">Known Allergies</div><div class="al-val">${allergiesText}</div></div>` : ''}

    <div class="plan-meta-box">
      <span>Author: <strong>${esc(plan.created_by_name)}</strong></span>
      <span>Review frequency: <strong>${(plan.review_frequency || 'monthly').replace(/_/g, ' ')}</strong></span>
      <span>Last review: <strong>${reviewDate}</strong></span>
      <span>Next review: <strong>${nextReview}</strong></span>
      ${lastRead ? `<span>${lastRead}</span>` : ''}
    </div>
  </div>

  <!-- PAGE 2+: Plan Content -->
  <div class="content-page">
    ${sectionsHtml}

    <div class="footer">
      <span class="confid">CONFIDENTIAL</span>
      <span>Total reads: ${reads.length}</span>
      <span>Printed ${new Date().toLocaleDateString('en-GB')}</span>
    </div>
  </div>
</body></html>`
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
  const [readsModal, setReadsModal] = useState(false)
  const [readsData, setReadsData] = useState<any[]>([])
  const [readsLoading, setReadsLoading] = useState(false)

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

  const printPlan = async (plan: any) => {
    const reads = planReads[plan.id] || []
    let suFull = selectedSu
    if (selectedSu?.id) {
      try { const full = await fetchSuFull(selectedSu.id); if (full) suFull = full } catch {}
    }
    doPrint(buildPrintHtml(plan, suFull, reads))
  }

  const printAll = async () => {
    if (!selectedSu) return
    let suFull = selectedSu
    try { const full = await fetchSuFull(selectedSu.id); if (full) suFull = full } catch {}

    const missing = plans.filter(p => !planReads[p.id])
    let allReads = { ...planReads }
    if (missing.length) {
      const results = await Promise.allSettled(missing.map(p => api.get(`/care-plans/${p.id}/reads`)))
      missing.forEach((p, i) => {
        const r = results[i]
        allReads[p.id] = r.status === 'fulfilled' ? (r.value.data.data || []) : []
      })
      setPlanReads(allReads)
    }

    const name = getName(suFull)
    const rows = plans.map(plan => buildPrintHtml(plan, suFull, allReads[plan.id] || []))
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${name} — All Support Plans</title>
      <style>${CARE_PLAN_PRINT_CSS}</style>
      </head><body>${rows.map(h => `<div class="plan-block">${h.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*?<\/html>/, '')}</div>`).join('')}</body></html>`
    doPrint(html)
  }

  const openAdminReads = async () => {
    setReadsModal(true)
    setReadsLoading(true)
    try {
      const res = await api.get('/care-plans/reads-summary', { params: { homeId: selectedHome } })
      setReadsData(res.data.data || [])
    } catch { toast.error('Failed to load reads data') }
    finally { setReadsLoading(false) }
  }

  const suOptions = sus.map(su => ({ value: su.id, label: getName(su) }))

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Print-only header — hidden on screen, visible when printing */}
      <div className="print-only">
        <div className="print-logo">CompCare Hub</div>
        <div className="print-title">Support Plans</div>
        {selectedSu && (
          <div className="print-meta">
            Resident: {getName(selectedSu)} &nbsp;·&nbsp;
            Printed: {format(new Date(), 'd MMMM yyyy, HH:mm')}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase flex items-center gap-2" style={{ color: '#e8b130' }}>
            <FileText className="w-6 h-6" style={{ color: '#e8b130' }} /> SUPPORT PLANS
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage individual support plans</p>
        </div>
        {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
          <Button size="sm" variant="secondary" icon={<Users className="w-4 h-4" />} onClick={openAdminReads}
            style={{ color: '#ffffff' }}>
            Who read plans
          </Button>
        )}
      </div>

      {/* SU + Home selectors */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end no-print">
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
            <select className="input text-sm w-full appearance-none pr-8" value={selectedSu?.id || ''}
              onChange={e => { const su = sus.find(s => s.id === e.target.value); if (su) selectSu(su) }}>
              <option value="">— Select a service user —</option>
              {sus.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {selectedSu && (
          <div className="flex gap-2 flex-wrap">
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
            const reads = planReads[plan.id] || []
            const reviewDays = plan.next_review_date ? differenceInDays(new Date(plan.next_review_date), new Date()) : null
            const cardBorderCls = reviewDays === null
              ? 'border-slate-100 hover:border-slate-200'
              : reviewDays < 0
                ? 'border-red-500/60 hover:border-red-500/80 bg-red-500/5'
                : 'border-green-500/50 hover:border-green-500/70 bg-green-500/5'
            return (
              <button key={plan.id} onClick={() => openPlan(plan)}
                className={`bg-white rounded-2xl border shadow-sm p-5 text-left hover:shadow-md transition-all group ${cardBorderCls}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{plan.review_frequency?.replace('_', ' ')}</p>
                  </div>
                  {(plan.su_sign_off && plan.staff_sign_off) && (
                    <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <ReviewStatus nextReviewDate={plan.next_review_date} />
                  {plan.outcome_achieved && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">{plan.outcome_achieved}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {plan.attachments_notes && <span className="text-xs text-slate-400 flex items-center gap-1"><Paperclip className="w-3 h-3" />Attachments</span>}
                  {reads.length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><BookOpen className="w-3 h-3" />{reads.length} read{reads.length !== 1 ? 's' : ''}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Add plan modal */}
      <AddPlanModal open={addPlanOpen} onClose={() => setAddPlanOpen(false)}
        suId={selectedSu?.id} homeId={selectedHome} suName={selectedSu ? getName(selectedSu) : undefined}
        onSaved={async () => { setAddPlanOpen(false); await refreshPlans(); toast.success('Support plan created') }} />

      {/* View plan modal */}
      {viewPlan && (
        <PlanDetailModal
          plan={viewPlan}
          su={selectedSu}
          reads={planReads[viewPlan.id] || []}
          canDelete={isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')}
          onClose={() => setViewPlan(null)}
          onEdit={() => { setEditPlan(viewPlan); setViewPlan(null) }}
          onDelete={async () => { await deletePlan(viewPlan.id) }}
          onPrint={() => printPlan(viewPlan)}
        />
      )}

      {/* Edit plan modal */}
      {editPlan && (
        <EditPlanModal plan={editPlan} suId={selectedSu?.id || ''} suName={selectedSu ? getName(selectedSu) : undefined}
          onClose={() => setEditPlan(null)} onSaved={async () => {
            setEditPlan(null); await refreshPlans(); toast.success('Support plan updated')
          }} />
      )}

      {/* Admin reads summary modal */}
      <Modal open={readsModal} onClose={() => setReadsModal(false)} title="Who has read support plans" size="lg">
        {readsLoading ? <Spinner /> : (
          <div className="max-h-[70vh] overflow-y-auto">
            {readsData.length === 0 ? (
              <EmptyState title="No reads recorded yet" description="Reads are tracked when staff open a support plan" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                  <tr>
                    {['Resident', 'Plan', 'Total reads', 'Last read', 'Read by'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {readsData.map((row: any, i: number) => (
                    <tr key={i} className={row.total_reads === '0' || !row.total_reads ? 'bg-amber-50/40' : ''}>
                      <td className="px-3 py-2 font-medium text-slate-900">{row.su_name}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs capitalize">{(row.custom_name || row.plan_type || '').replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(+row.total_reads || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {row.total_reads || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{row.last_read_at ? format(new Date(row.last_read_at), 'd MMM yyyy, HH:mm') : <span className="text-amber-600">Never read</span>}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{row.readers || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function PlanDetailModal({ plan, su, reads, canDelete, onClose, onEdit, onDelete, onPrint }: {
  plan: any; su?: any; reads: any[]; canDelete: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void; onPrint: () => void
}) {
  const label = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
  const isMed = plan.plan_type === 'medication_support'
  const isTemplatedPlan = TEMPLATED_TYPES.has(plan.plan_type)
  const [fullSu, setFullSu] = useState<any>(su || null)
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    if (su?.id) {
      fetchSuFull(su.id).then(full => { if (full) setFullSu(full) })
      api.get(`/service-users/${su.id}/contacts`).then(res => setContacts(res.data.data || [])).catch(() => {})
    }
  }, [su?.id])

  const suName = fullSu ? `${fullSu.first_name || ''} ${fullSu.last_name || ''}`.trim() : plan.su_name || ''
  const suAge = fullSu?.date_of_birth ? Math.floor((Date.now() - new Date(fullSu.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const photoUrl = fullSu?.photo_url || null

  const personalFields = fullSu ? [
    { label: 'Address', value: [fullSu.address1, fullSu.address2, fullSu.postcode].filter(Boolean).join(', ') },
    { label: 'Preferred Name', value: fullSu.preferred_name },
    { label: 'Date of Birth', value: fullSu.date_of_birth ? `${format(new Date(fullSu.date_of_birth), 'd MMM yyyy')}${suAge !== null ? ` (${suAge} yrs)` : ''}` : null },
    { label: 'Gender', value: fullSu.gender },
    { label: 'NHS Number', value: fullSu.nhs_number },
    { label: 'Admission Date', value: fullSu.admission_date ? format(new Date(fullSu.admission_date), 'd MMM yyyy') : null },
    { label: 'Food Allergies', value: fullSu.food_allergies || 'None' },
    { label: 'Medicine Allergies', value: fullSu.med_allergies || 'None known' },
    { label: 'Status', value: fullSu.status },
  ].filter(f => f.value) : []

  return (
    <Modal open={true} onClose={onClose} title={label} size="lg">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Document-style header — matches the printed care plan letterhead */}
        {suName && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            <div className="px-5 py-3 text-white font-bold text-base" style={{ background: 'linear-gradient(90deg, #14b8a6, #0d9488)' }}>
              {suName}'s Care Plan
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 bg-white border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800 text-sm">Comprehensive Care Ltd</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">Ivy Business Centre, Office 3-13 Crown Street,<br />Failsworth, Manchester, M35 9BG</p>
              </div>
              <div className="text-xs text-slate-500 space-y-1 text-right">
                {plan.staff_signed_by && <p>Author: <span className="font-semibold text-slate-800">{plan.staff_signed_by}</span></p>}
                {plan.last_review_date && <p>Latest Review Date: <span className="font-semibold text-slate-800">{format(new Date(plan.last_review_date), 'd MMM yyyy')}</span></p>}
                {plan.next_review_date && <p>Next Review Date: <span className="font-semibold text-slate-800">{format(new Date(plan.next_review_date), 'd MMM yyyy')}</span></p>}
              </div>
            </div>

            <div className="p-4 bg-white">
              <div className="flex items-start gap-4">
                {photoUrl ? (
                  <img src={photoUrl} alt={suName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold bg-teal-50 text-teal-700 flex-shrink-0">
                    {suName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700 mb-1.5">Service User: {suName}</p>
                  {personalFields.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                      {personalFields.map(f => (
                        <p key={f.label} className="text-xs text-slate-500">
                          {f.label}: <span className="text-slate-800 font-medium">{f.value}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {contacts.length > 0 && (
              <div className="border-t border-slate-100">
                <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-teal-700">My Important Contacts</p>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400">
                        <th className="pr-3 pb-1.5 font-semibold">Name</th>
                        <th className="pr-3 pb-1.5 font-semibold">Role</th>
                        <th className="pr-3 pb-1.5 font-semibold">Phone</th>
                        <th className="pb-1.5 font-semibold">Emergency Contact?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {contacts.map((c: any) => (
                        <tr key={c.id}>
                          <td className="pr-3 py-1.5 font-medium text-slate-800">{c.full_name}</td>
                          <td className="pr-3 py-1.5 text-slate-600">{c.relationship || '—'}</td>
                          <td className="pr-3 py-1.5 text-slate-600">{c.phone_primary || c.phone_secondary || c.phone_home || '—'}</td>
                          <td className="py-1.5 text-slate-600">{c.is_primary ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meta */}
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
            {plan.template_data?.requiresSupportManage && <Field label="Requires Support To Manage Medication" value={plan.template_data.requiresSupportManage} />}
            {plan.template_data?.hasPrescribedCreams && <Field label="Has Prescribed Creams / Eyedrops / Inhalers" value={plan.template_data.hasPrescribedCreams} />}
            {plan.support_types && <Field label="Type of Support Required" value={plan.support_types} />}
            <div className="space-y-4">
              {plan.aims_outcomes && <GoldSection label="My Aims & Objectives" value={plan.aims_outcomes} />}
              {plan.what_i_can_do && <GoldSection label="What I Can Do" value={plan.what_i_can_do} />}
              {plan.how_to_support && <GoldSection label="How To Support Me" value={plan.how_to_support} />}
            </div>
            {plan.regular_medications && <Field label="Regular Medications" value={plan.regular_medications} />}
            {plan.prn_medications && <Field label="PRN Medications" value={plan.prn_medications} />}
            {plan.otc_medications && <Field label="Over-The-Counter Medications" value={plan.otc_medications} />}
            {plan.prn_list && <Field label="PRN List" value={plan.prn_list} />}
            {plan.indication_for_use && <Field label="Indication for Use" value={plan.indication_for_use} />}
            {(() => {
              const td = plan.template_data || {}
              const prnSections = [
                { key: 'prnAssessment', label: 'Assessment Before Administration' },
                { key: 'prnStaffInvolvement', label: 'Staff Involvement' },
                { key: 'prnAdminProcess', label: 'Administration Process' },
                { key: 'prnRefusal', label: 'PRN Refusal' },
                { key: 'prnMonitoring', label: 'Monitoring After Administration' },
                { key: 'prnEvaluation', label: 'Evaluation' },
                { key: 'prnDocumentation', label: 'Documentation' },
                { key: 'prnEmergency', label: 'When to Seek Advice / Emergency' },
                { key: 'prnSpecial', label: 'Special Considerations' },
                { key: 'prnTraining', label: 'Staff Training Requirements' },
              ].filter(s => td[s.key])
              if (!prnSections.length && !plan.prn_protocol) return null
              return (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">PRN Medication Protocol</p>
                  <div className="space-y-2">
                    {prnSections.map(s => (
                      <div key={s.key}>
                        <p className="text-xs font-semibold text-rose-600">{s.label}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{td[s.key]}</p>
                      </div>
                    ))}
                    {plan.prn_protocol && (
                      <div>
                        <p className="text-xs font-semibold text-rose-600">General Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{plan.prn_protocol}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </>
        ) : isTemplatedPlan ? (
          <div className="space-y-4">
            {(plan.plan_type === 'autism' || plan.plan_type === 'adhd') && plan.aims_outcomes && (
              <GoldSection label="My Aims & Objectives" value={plan.aims_outcomes} />
            )}
            <TemplateDetail plan={plan} />
          </div>
        ) : (
          <div className="space-y-4">
            <GoldSection label="My Aims & Objectives" value={plan.aims_outcomes} />
            <GoldSection label="What I Can Do" value={plan.what_i_can_do} />
            <GoldSection label="How To Support Me" value={plan.how_to_support} />
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

        {/* Consent section */}
        {plan.consent_notes && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Consent
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{plan.consent_notes}</p>
            {plan.consent_given && (
              <p className="text-xs text-green-700 font-semibold mt-1">
                ✓ Consent given{plan.consent_date ? ' on ' + format(new Date(plan.consent_date), 'd MMM yyyy') : ''}
              </p>
            )}
          </div>
        )}

        {/* Sign-off section */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 uppercase tracking-wide" style={{ color: '#e8b130' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: '#e8b130' }} /> Sign Off
          </h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Service User / Family</p>
              {plan.su_signature_dataurl
                ? <img src={plan.su_signature_dataurl} alt="SU signature" className="h-12 mb-1 border-b border-slate-300" />
                : plan.su_signed_by
                  ? <p className="font-['Brush_Script_MT',cursive] italic text-xl text-slate-800 border-b border-slate-300 pb-1 mb-1" style={{ fontFamily: 'cursive' }}>{plan.su_signed_by}</p>
                  : <div className="h-10 border-b border-slate-300 mb-1" />}
              <div className={`flex items-center gap-1.5 text-xs mt-1 ${plan.su_sign_off ? 'text-green-700' : 'text-slate-400'}`}>
                {plan.su_sign_off ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {plan.su_sign_off ? 'Signed off' : 'Not signed off'}
              </div>
              {plan.su_signed_by && <p className="text-xs text-slate-500 mt-0.5">Name: {plan.su_signed_by}</p>}
              {plan.su_signed_date && <p className="text-xs text-slate-400">Date: {format(new Date(plan.su_signed_date), 'd MMM yyyy')}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Staff Member</p>
              {plan.staff_signature_dataurl
                ? <img src={plan.staff_signature_dataurl} alt="Staff signature" className="h-12 mb-1 border-b border-slate-300" />
                : plan.staff_signed_by
                  ? <p className="italic text-xl text-slate-800 border-b border-slate-300 pb-1 mb-1" style={{ fontFamily: 'cursive' }}>{plan.staff_signed_by}</p>
                  : <div className="h-10 border-b border-slate-300 mb-1" />}
              <div className={`flex items-center gap-1.5 text-xs mt-1 ${plan.staff_sign_off ? 'text-green-700' : 'text-slate-400'}`}>
                {plan.staff_sign_off ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {plan.staff_sign_off ? 'Signed off' : 'Not signed off'}
              </div>
              {plan.staff_signed_by && <p className="text-xs text-slate-500 mt-0.5">Name: {plan.staff_signed_by}</p>}
              {plan.staff_signed_date && <p className="text-xs text-slate-400">Date: {format(new Date(plan.staff_signed_date), 'd MMM yyyy')}</p>}
            </div>
          </div>
        </div>

        {/* Review History */}
        {plan.updates && plan.updates.length > 0 && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 uppercase tracking-wide" style={{ color: '#e8b130' }}>
              <History className="w-4 h-4" style={{ color: '#e8b130' }} /> Review History
            </h4>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {plan.updates.map((u: any, i: number) => (
                <div key={i} className="py-2.5 first:pt-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">
                      {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy') : '—'}
                    </span>
                    {u.updated_by_name && (
                      <span className="text-xs text-slate-500">· {u.updated_by_name}</span>
                    )}
                  </div>
                  {u.update_notes && (
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{u.update_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
          <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={onPrint}>Print</Button>
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

function GoldSection({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/30">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  )
}

function SignaturePad({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    if (value.startsWith('data:')) {
      const img = new Image()
      img.onload = () => { canvas.getContext('2d')?.drawImage(img, 0, 0) }
      img.src = value
    }
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); drawing.current = true; lastPos.current = getPos(e)
  }
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    lastPos.current = pos
    onChange(canvas.toDataURL())
  }
  const stopDraw = () => { drawing.current = false; lastPos.current = null }
  const clear = useCallback(() => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }, [onChange])

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} width={560} height={100}
          className="block w-full cursor-crosshair"
          style={{ height: 80 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>
      <button type="button" onClick={clear} className="text-xs text-slate-400 hover:text-red-500 mt-1 transition-colors">
        Clear signature
      </button>
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

const EMPTY_ADD_FORM = {
  planType: '', customName: '', aimsOutcomes: '', whatICanDo: '', howToSupport: '',
  reviewFrequency: 'monthly', attachmentsNotes: '', templateData: {} as Record<string, any>,
  medicationSupportLevel: '', managesOwnMeds: false, levelOfSupport: '',
  supportTypes: [] as string[], dateMedicationReview: '',
  regularMedications: '', prnMedications: '', otcMedications: '',
  prnProtocol: '', prnList: '', indicationForUse: '',
}

const TEMPLATED_TYPES = new Set(['oral_care', 'autism', 'adhd', 'monthly_progress'])

function AddPlanModal({ open, onClose, suId, homeId, onSaved, suName }: {
  open: boolean; onClose: () => void; suId?: string; homeId?: string; onSaved: () => void; suName?: string
}) {
  const [form, setForm] = useState<any>({ ...EMPTY_ADD_FORM })
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))
  const toggleSupport = (s: string) => setForm((p: any) => ({
    ...p, supportTypes: p.supportTypes.includes(s) ? p.supportTypes.filter((x: string) => x !== s) : [...p.supportTypes, s]
  }))

  useEffect(() => {
    if (open) setTemplates(getTemplates())
  }, [open])

  const applyTemplate = (tpl: any) => {
    setForm({ ...EMPTY_ADD_FORM, ...tpl, savedAt: undefined })
    setShowTemplates(false)
    toast.success('Template applied')
  }

  const saveAsTemplate = () => {
    const label = form.customName || PLAN_TYPES.find(t => t.value === form.planType)?.label || form.planType
    saveTemplate({ ...form, templateName: `${label} — ${new Date().toLocaleDateString('en-GB')}` })
    toast.success('Template saved to device')
  }

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
        templateData: Object.keys(form.templateData || {}).length ? form.templateData : undefined,
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
      setForm({ ...EMPTY_ADD_FORM })
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create support plan')
    } finally { setLoading(false) }
  }

  const isMedPlan = form.planType === 'medication_support'
  const isTemplated = TEMPLATED_TYPES.has(form.planType)

  return (
    <Modal open={open} onClose={onClose} title="Add support plan" size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

        {/* Templates bar */}
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
            <Copy className="w-3.5 h-3.5" /> Use template ({templates.length})
          </button>
          {form.planType && (
            <button type="button" onClick={saveAsTemplate}
              className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Star className="w-3.5 h-3.5" /> Save as template
            </button>
          )}
        </div>

        {showTemplates && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            {templates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No saved templates yet. Fill in a plan and click "Save as template" to save it.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {templates.map((tpl: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{tpl.templateName || tpl.planType}</p>
                      <p className="text-xs text-slate-400">{tpl.savedAt ? new Date(tpl.savedAt).toLocaleDateString('en-GB') : ''}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => applyTemplate(tpl)} className="text-xs text-emerald-700 font-semibold hover:underline">Use</button>
                      <button type="button" onClick={() => { deleteTemplate(i); setTemplates(getTemplates()) }} className="text-xs text-red-500 hover:underline ml-2">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Select label="Support plan type *" required value={form.planType} onChange={e => set('planType', e.target.value)} options={PLAN_TYPES} placeholder="Select type" />
        {(form.planType === 'custom' || form.planType === '') && form.planType === 'custom' && (
          <Input label="Custom plan name" required value={form.customName} onChange={e => set('customName', e.target.value)} />
        )}

        {isMedPlan ? (
          <>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">MEDICATION</p>
              <div className="space-y-3">
                <div>
                  <label className="label">Medication Support Level</label>
                  <input className="input w-full" value={form.medicationSupportLevel} onChange={e => set('medicationSupportLevel', e.target.value)} placeholder="e.g. Level 2 — Prompt and assist" />
                </div>
                <div className="flex gap-6 flex-wrap">
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
                  <SpeechTextarea label="Level of Support Required" className="w-full" rows={2} value={form.levelOfSupport} onChange={v => set('levelOfSupport', v)} />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#e8b130' }}>SUPPORT</p>
              <div className="mb-3">
                <YesNoRow
                  label="I Require Support To Manage My Medication (i.e. Ordering, Collecting, or Reminding To Take)"
                  value={form.templateData?.requiresSupportManage || 'No'}
                  onChange={v => set('templateData', { ...form.templateData, requiresSupportManage: v })} />
                <YesNoRow
                  label="I Have Prescribed Creams, Eyedrops or Inhalers Which I Require Support With"
                  value={form.templateData?.hasPrescribedCreams || 'No'}
                  onChange={v => set('templateData', { ...form.templateData, hasPrescribedCreams: v })} />
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Type of Support Required:</p>
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
                <SpeechTextarea label="My Aims / Outcomes" className="w-full" rows={2} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} />
                <SpeechTextarea label="What I Can Do" className="w-full" rows={2} value={form.whatICanDo} onChange={v => set('whatICanDo', v)} />
                <SpeechTextarea label="What You Can Do To Support Me" className="w-full" rows={2} value={form.howToSupport} onChange={v => set('howToSupport', v)} />
                <SpeechTextarea label="My Regular Medications" className="w-full" rows={3} value={form.regularMedications} onChange={v => set('regularMedications', v)} placeholder="List each medication, dose, frequency and purpose..." />
                <SpeechTextarea label="My PRN Medications" className="w-full" rows={2} value={form.prnMedications} onChange={v => set('prnMedications', v)} />
                <SpeechTextarea label="Over-The-Counter Medications (OTC)" className="w-full" rows={2} value={form.otcMedications} onChange={v => set('otcMedications', v)} />
                <SpeechTextarea label="PRN List (name, dose, max daily dose)" className="w-full" rows={2} value={form.prnList} onChange={v => set('prnList', v)} placeholder="e.g. Paracetamol 500mg – max 4 times/day" />
                <SpeechTextarea label="Indication for Use" className="w-full" rows={2} value={form.indicationForUse} onChange={v => set('indicationForUse', v)} placeholder="When should PRN medications be given and why?" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-3">PRN MEDICATION PROTOCOL</p>
              <div className="space-y-3">
                <p className="text-xs text-rose-600">Complete all sections below to ensure consistent, safe PRN administration across all staff.</p>
                {[
                  { key: 'prnAssessment', label: 'Assessment Before Administration', ph: 'Steps staff must take before administering PRN (e.g. check vital signs, assess pain level)...' },
                  { key: 'prnStaffInvolvement', label: 'Staff Involvement', ph: 'Who can administer? Witness requirements?' },
                  { key: 'prnAdminProcess', label: 'Administration Process', ph: 'Step-by-step administration instructions...' },
                  { key: 'prnRefusal', label: 'PRN Refusal — What to do if the person refuses', ph: 'Actions if the person refuses the medication...' },
                  { key: 'prnMonitoring', label: 'Monitoring After Administration', ph: 'What to observe and for how long after giving the medication...' },
                  { key: 'prnEvaluation', label: 'Evaluation', ph: 'How to assess effectiveness — what indicates success or failure?' },
                  { key: 'prnDocumentation', label: 'Documentation', ph: 'What must be recorded and where?' },
                  { key: 'prnEmergency', label: 'When to Seek Advice / Emergency', ph: 'Signs that require contacting GP, pharmacy, 999...' },
                  { key: 'prnSpecial', label: 'Special Considerations', ph: 'Allergies, interactions, specific timing restrictions...' },
                  { key: 'prnTraining', label: 'Staff Training Requirements', ph: 'Any specific training needed to administer this PRN?' },
                ].map(({ key, label, ph }) => (
                  <SpeechTextarea key={key} label={label} className="w-full" rows={2} value={form.templateData?.[key] || ''}
                    onChange={v => set('templateData', { ...form.templateData, [key]: v })}
                    placeholder={ph} />
                ))}
                <SpeechTextarea label="General PRN Protocol Notes" className="w-full" rows={3} value={form.prnProtocol} onChange={v => set('prnProtocol', v)} placeholder="Any additional protocol information or overarching guidance..." />
              </div>
            </div>
          </>
        ) : isTemplated ? (
          <>
            {(form.planType === 'autism' || form.planType === 'adhd') && (
              <SpeechTextarea label="My aims & outcomes" rows={3} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} placeholder="List the aims and outcomes for this person..." />
            )}
            <TemplateFields planType={form.planType} data={form.templateData} onChange={td => set('templateData', td)} suName={suName} />
          </>
        ) : (
          <>
            <SpeechTextarea label="My aims & outcomes" rows={3} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} placeholder="What are we working towards for this person..." />
            <SpeechTextarea label="What I can do independently" rows={3} value={form.whatICanDo} onChange={v => set('whatICanDo', v)} placeholder="The person's strengths and capabilities..." />
            <SpeechTextarea label="How you can support me" rows={3} value={form.howToSupport} onChange={v => set('howToSupport', v)} placeholder="Specific guidance for staff supporting this person..." />
          </>
        )}

        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />

        <AttachmentUploader value={form.attachmentsNotes} onChange={v => set('attachmentsNotes', v)} />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create support plan</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditPlanModal({ plan, suId, onClose, onSaved, suName }: { plan: any; suId: string; onClose: () => void; onSaved: () => void; suName?: string }) {
  const [form, setForm] = useState({
    aimsOutcomes: plan.aims_outcomes || '',
    whatICanDo: plan.what_i_can_do || '',
    howToSupport: plan.how_to_support || '',
    outcomeAchieved: plan.outcome_achieved || '',
    reviewFrequency: plan.review_frequency || 'monthly',
    updateNotes: '',
    suSignOff: plan.su_sign_off || false,
    staffSignOff: plan.staff_sign_off || false,
    suSignedBy: plan.su_signed_by || '',
    suSignedDate: plan.su_signed_date ? plan.su_signed_date.split('T')[0] : '',
    staffSignedBy: plan.staff_signed_by || '',
    staffSignedDate: plan.staff_signed_date ? plan.staff_signed_date.split('T')[0] : '',
    suSignatureDataurl: plan.su_signature_dataurl || '',
    staffSignatureDataurl: plan.staff_signature_dataurl || '',
    attachmentsNotes: plan.attachments_notes || '',
    consentNotes: plan.consent_notes || '',
    consentGiven: plan.consent_given || false,
    consentDate: plan.consent_date ? plan.consent_date.split('T')[0] : '',
    templateData: (plan.template_data || {}) as Record<string, any>,
    // Medication support plan fields
    regularMedications: plan.regular_medications || '',
    prnMedications: plan.prn_medications || '',
    otcMedications: plan.otc_medications || '',
    prnList: plan.prn_list || '',
    indicationForUse: plan.indication_for_use || '',
    prnProtocol: plan.prn_protocol || '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const isTemplated = TEMPLATED_TYPES.has(plan.plan_type)
  const isMedPlan = plan.plan_type === 'medication_support'

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
        {isMedPlan ? (
          <>
            <SpeechTextarea label="My aims & outcomes" rows={3} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} />
            <SpeechTextarea label="What I can do" rows={2} value={form.whatICanDo} onChange={v => set('whatICanDo', v)} />
            <SpeechTextarea label="How to support me" rows={2} value={form.howToSupport} onChange={v => set('howToSupport', v)} />
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#e8b130' }}>Support</p>
              <YesNoRow
                label="I Require Support To Manage My Medication (i.e. Ordering, Collecting, or Reminding To Take)"
                value={form.templateData?.requiresSupportManage || 'No'}
                onChange={v => set('templateData', { ...form.templateData, requiresSupportManage: v })} />
              <YesNoRow
                label="I Have Prescribed Creams, Eyedrops or Inhalers Which I Require Support With"
                value={form.templateData?.hasPrescribedCreams || 'No'}
                onChange={v => set('templateData', { ...form.templateData, hasPrescribedCreams: v })} />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 space-y-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Medications</p>
              <SpeechTextarea label="Regular Medications" className="w-full" rows={2} value={form.regularMedications} onChange={v => set('regularMedications', v)} />
              <SpeechTextarea label="PRN Medications" className="w-full" rows={2} value={form.prnMedications} onChange={v => set('prnMedications', v)} />
              <SpeechTextarea label="OTC Medications" className="w-full" rows={2} value={form.otcMedications} onChange={v => set('otcMedications', v)} />
              <SpeechTextarea label="PRN List" className="w-full" rows={2} value={form.prnList} onChange={v => set('prnList', v)} />
              <SpeechTextarea label="Indication for Use" className="w-full" rows={2} value={form.indicationForUse} onChange={v => set('indicationForUse', v)} />
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 space-y-3">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">PRN Medication Protocol</p>
              {[
                { key: 'prnAssessment', label: 'Assessment Before Administration' },
                { key: 'prnStaffInvolvement', label: 'Staff Involvement' },
                { key: 'prnAdminProcess', label: 'Administration Process' },
                { key: 'prnRefusal', label: 'PRN Refusal' },
                { key: 'prnMonitoring', label: 'Monitoring After Administration' },
                { key: 'prnEvaluation', label: 'Evaluation' },
                { key: 'prnDocumentation', label: 'Documentation' },
                { key: 'prnEmergency', label: 'When to Seek Advice / Emergency' },
                { key: 'prnSpecial', label: 'Special Considerations' },
                { key: 'prnTraining', label: 'Staff Training Requirements' },
              ].map(({ key, label }) => (
                <SpeechTextarea key={key} label={label} className="w-full" rows={2} value={form.templateData?.[key] || ''}
                  onChange={v => set('templateData', { ...form.templateData, [key]: v })} />
              ))}
              <SpeechTextarea label="General PRN Protocol Notes" className="w-full" rows={3} value={form.prnProtocol} onChange={v => set('prnProtocol', v)} />
            </div>
          </>
        ) : isTemplated ? (
          <>
            {(plan.plan_type === 'autism' || plan.plan_type === 'adhd') && (
              <SpeechTextarea label="My aims & outcomes" rows={3} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} />
            )}
            <TemplateFields planType={plan.plan_type} data={form.templateData} onChange={td => set('templateData', td)} suName={suName} />
          </>
        ) : (
          <>
            <SpeechTextarea label="My aims & outcomes" rows={3} value={form.aimsOutcomes} onChange={v => set('aimsOutcomes', v)} />
            <SpeechTextarea label="What I can do" rows={3} value={form.whatICanDo} onChange={v => set('whatICanDo', v)} />
            <SpeechTextarea label="How to support me" rows={3} value={form.howToSupport} onChange={v => set('howToSupport', v)} />
          </>
        )}
        <Select label="Outcome achieved" value={form.outcomeAchieved} onChange={e => set('outcomeAchieved', e.target.value)} options={OUTCOME_OPTIONS} placeholder="Select outcome" />
        <Select label="Review frequency" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)} options={FREQ_OPTIONS} />
        <SpeechTextarea label="Review notes (what changed and why)" rows={3} value={form.updateNotes} onChange={v => set('updateNotes', v)} />

        <AttachmentUploader value={form.attachmentsNotes} onChange={v => set('attachmentsNotes', v)} />

        {/* Consent section */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h4 className="font-semibold text-blue-800 text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Consent</h4>
          <div className="space-y-3">
            <SpeechTextarea label="Consent notes" rows={2} value={form.consentNotes} onChange={v => set('consentNotes', v)} placeholder="Describe what the service user or representative has consented to..." />
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.consentGiven} onChange={e => set('consentGiven', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-slate-700">Consent given</span>
              </label>
              {form.consentGiven && (
                <div>
                  <label className="label">Date consent given</label>
                  <input type="date" className="input w-40" value={form.consentDate} onChange={e => set('consentDate', e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sign-off section */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Sign Off</h4>
          <div className="grid md:grid-cols-2 gap-4">
            {/* SU sign off */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.suSignOff} onChange={e => set('suSignOff', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-slate-700">Signed by Service User / Family</span>
              </label>
              {form.suSignOff && (
                <>
                  <input className="input w-full text-sm" placeholder="Full name of service user / representative" value={form.suSignedBy} onChange={e => set('suSignedBy', e.target.value)} />
                  <input type="date" className="input w-full text-sm" value={form.suSignedDate} onChange={e => set('suSignedDate', e.target.value)} />
                  <SignaturePad label="Draw signature below" value={form.suSignatureDataurl} onChange={v => set('suSignatureDataurl', v)} />
                </>
              )}
            </div>
            {/* Staff sign off */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.staffSignOff} onChange={e => set('staffSignOff', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-slate-700">Signed by Staff Member</span>
              </label>
              {form.staffSignOff && (
                <>
                  <input className="input w-full text-sm" placeholder="Staff member full name" value={form.staffSignedBy} onChange={e => set('staffSignedBy', e.target.value)} />
                  <input type="date" className="input w-full text-sm" value={form.staffSignedDate} onChange={e => set('staffSignedDate', e.target.value)} />
                  <SignaturePad label="Draw signature below" value={form.staffSignatureDataurl} onChange={v => set('staffSignatureDataurl', v)} />
                </>
              )}
            </div>
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




