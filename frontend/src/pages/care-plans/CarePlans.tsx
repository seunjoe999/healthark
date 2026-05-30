import React, { useEffect, useState, useRef, useCallback } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, AlertTriangle, CheckCircle, Clock, FileText, Edit, Printer, Trash2,
         History, ChevronDown, Paperclip, Users, BookOpen, ShieldCheck, Star, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const PLAN_TYPES = [
  { value: 'physical_health', label: 'Physical Health Support Plan' },
  { value: 'physical', label: 'Physical Health Support Plan' },
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

function ReviewStatus({ nextReviewDate }: { nextReviewDate: string }) {
  if (!nextReviewDate) return null
  const days = differenceInDays(new Date(nextReviewDate), new Date())
  if (days < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Overdue by {Math.abs(days)} days</span>
  if (days <= 7) return <span className="flex items-center gap-1 text-xs text-orange-600 font-medium"><Clock className="w-3 h-3" />Due in {days} days</span>
  return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />Due {format(new Date(nextReviewDate), 'd MMM yyyy')}</span>
}

async function fetchSuFull(suId: string): Promise<any> {
  try { const r = await suApi.get(suId); return r.data.data } catch { return null }
}

function doPrint(html: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;visibility:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open(); doc.write(html); doc.close()
  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 3000)
  }, 700)
}

function buildPrintHtml(plan: any, su: any, reads: any[]): string {
  const planLabel = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
  const name = su ? `${su.first_name || ''} ${su.last_name || ''}`.trim() : plan.su_name || ''
  const dob = su?.date_of_birth ? new Date(su.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const age = su?.date_of_birth ? Math.floor((Date.now() - new Date(su.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const address = [su?.address1, su?.address2, su?.address3, su?.postcode].filter(Boolean).join(', ') || '—'
  const reviewDate = plan.last_review_date ? new Date(plan.last_review_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
  const nextReview = plan.next_review_date ? new Date(plan.next_review_date).toLocaleDateString('en-GB') : '—'
  const lastRead = reads.length > 0 ? `Last read by ${reads[0].staff_name} on ${new Date(reads[0].read_at).toLocaleDateString('en-GB')}` : ''

  const photoHtml = su?.photo_url
    ? `<img src="${su.photo_url.startsWith('http') ? su.photo_url : `https://app.comprehensivecare.org.uk${su.photo_url}`}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;display:block;flex-shrink:0" />`
    : `<div style="width:80px;height:100px;border-radius:6px;background:#e2e8f0;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;color:#64748b;flex-shrink:0">${(name[0]||'?').toUpperCase()}</div>`

  const goldSec = (label: string, value?: string | null) =>
    value?.trim()
      ? `<div class="cs"><div class="cs-hd gold">${label}</div><div class="cs-bd">${value.replace(/\n/g,'<br/>')}</div></div>`
      : ''

  const plainSec = (label: string, value?: string | null) =>
    value?.trim()
      ? `<div class="cs"><div class="cs-hd">${label}</div><div class="cs-bd">${value.replace(/\n/g,'<br/>')}</div></div>`
      : ''

  const sigBlock = (role: string, name: string | null, dataUrl: string | null, date: string | null, done: boolean) => `
    <div>
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px">${role}</div>
      ${dataUrl ? `<img src="${dataUrl}" style="height:44px;max-width:180px;display:block;margin-bottom:4px"/>` : ''}
      <div style="border-bottom:1.5px solid #334155;min-height:30px;font-family:'Brush Script MT',cursive;font-size:18px;color:#1e293b;padding-bottom:2px;margin-bottom:6px">${name || ''}</div>
      <div style="display:flex;gap:16px;font-size:9px;color:#64748b">
        <span>Name: <strong style="color:#1e293b">${name || '________________________________'}</strong></span>
        <span>Date: <strong style="color:#1e293b">${date ? new Date(date).toLocaleDateString('en-GB') : '________________________________'}</strong></span>
      </div>
      <div style="margin-top:5px;font-size:9px;color:${done ? '#065f46' : '#94a3b8'};font-weight:600">${done ? '✓ Signed off' : 'Awaiting signature'}</div>
    </div>`

  const consentHtml = plan.consent_notes ? `
    <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:6px;padding:12px;margin-top:12px;page-break-inside:avoid">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#92400e;margin-bottom:6px">Consent</div>
      <div style="font-size:11px;color:#78350f;line-height:1.6">${plan.consent_notes.replace(/\n/g,'<br/>')}</div>
      ${plan.consent_given ? `<div style="font-size:10px;color:#065f46;margin-top:6px;font-weight:600">✓ Consent given${plan.consent_date ? ' on ' + new Date(plan.consent_date).toLocaleDateString('en-GB') : ''}</div>` : ''}
    </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${name} — ${planLabel}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:11px;background:#fff}
    .hdr{background:#1e293b;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-start}
    .hdr-company{font-size:15px;font-weight:700;letter-spacing:.02em;margin-bottom:3px}
    .hdr-addr{font-size:9px;color:rgba(255,255,255,.6);line-height:1.7}
    .hdr-badge{background:rgba(212,160,23,.25);color:#fbbf24;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 10px;border-radius:4px;margin-bottom:8px;display:inline-block}
    .hdr-meta{font-size:9px;color:rgba(255,255,255,.6);line-height:1.8;text-align:right}
    .hdr-meta strong{color:#fff}
    .body{padding:18px 20px}
    .resident{display:flex;gap:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}
    .res-name{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:8px}
    .res-tbl{border-collapse:collapse;font-size:10px;width:100%}
    .res-tbl td{padding:2px 10px 2px 0;vertical-align:top}
    .res-tbl td:first-child{font-weight:600;color:#64748b;min-width:110px;white-space:nowrap}
    .plan-banner{background:#b45309;color:#fff;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.02em;margin-bottom:14px}
    .cs{border:1px solid #e2e8f0;border-radius:6px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}
    .cs-hd{padding:6px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;background:#f1f5f9;color:#64748b;border-left:4px solid #94a3b8}
    .cs-hd.gold{color:#b45309;border-left-color:#b45309;background:#fffbeb}
    .cs-bd{padding:10px 12px;font-size:11px;line-height:1.7;color:#334155}
    .signoff{border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-top:12px;page-break-inside:avoid}
    .signoff-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#94a3b8}
    .confid{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:2px 8px;border-radius:4px;font-weight:700;font-size:8px;letter-spacing:.05em}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:10mm;size:A4}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="hdr-company">Comprehensive Care Ltd</div>
      <div class="hdr-addr">Ivy Business Centre, Office 3-13 Crown Street<br/>Failsworth, Manchester, M35 9BG</div>
    </div>
    <div style="text-align:right">
      <div class="hdr-badge">Support Plan</div>
      <div class="hdr-meta">
        Author: <strong>${plan.created_by_name || '—'}</strong><br/>
        ${plan.staff_signature_dataurl
          ? `<img src="${plan.staff_signature_dataurl}" style="height:30px;max-width:120px;display:inline-block;vertical-align:middle;margin:2px 0"/><br/>`
          : (plan.staff_signed_by ? `<span style="font-family:'Brush Script MT',cursive;font-size:16px;color:#fff">${plan.staff_signed_by}</span><br/>` : '')}
        Review Date: <strong>${reviewDate}</strong><br/>
        Next Review: <strong>${nextReview}</strong>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="resident">
      ${photoHtml}
      <div style="flex:1">
        <div class="res-name">${name}</div>
        <table class="res-tbl">
          <tr><td>Date of Birth</td><td>${dob}${age ? ` (${age} yrs)` : ''}</td><td style="padding-left:20px">NHS Number</td><td>${su?.nhs_number || '—'}</td></tr>
          <tr><td>Gender</td><td>${su?.gender || '—'}</td><td style="padding-left:20px">Preferred Name</td><td>${su?.preferred_name || '—'}</td></tr>
          <tr><td>Address</td><td colspan="3">${address}</td></tr>
          <tr><td>Phone</td><td>${su?.phone || '—'}</td><td style="padding-left:20px">Email</td><td>${su?.email || '—'}</td></tr>
        </table>
      </div>
    </div>

    <div class="plan-banner">${planLabel}</div>

    ${goldSec('My Aims & Objectives', plan.aims_outcomes)}
    ${goldSec('What I Can Do', plan.what_i_can_do)}
    ${goldSec('How To Support Me', plan.how_to_support)}
    ${plainSec('Attachments / Notes', plan.attachments_notes)}
    ${consentHtml}

    <div class="signoff">
      <div class="signoff-title">Sign Off</div>
      <div class="sig-grid">
        ${sigBlock('Service User / Family Representative', plan.su_signed_by, plan.su_signature_dataurl, plan.su_signed_date, !!plan.su_sign_off)}
        ${sigBlock('Staff Member', plan.staff_signed_by, plan.staff_signature_dataurl, plan.staff_signed_date, !!plan.staff_sign_off)}
      </div>
    </div>

    <div class="footer">
      <span class="confid">CONFIDENTIAL</span>
      <span>${lastRead}</span>
      <span>Total reads: ${reads.length} &nbsp;·&nbsp; Printed ${new Date().toLocaleDateString('en-GB')}</span>
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
    const name = getName(suFull)
    const rows = plans.map(plan => buildPrintHtml(plan, suFull, planReads[plan.id] || []))
    const html = `<!DOCTYPE html><html><head><title>${name} — All Support Plans</title>
      <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0} .page{page-break-after:always} @media print{.page:last-child{page-break-after:avoid};print-color-adjust:exact}</style>
      </head><body>${rows.map(h => `<div class="page">${h.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*?<\/html>/, '')}</div>`).join('')}</body></html>`
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" /> Support Plans
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage individual support plans</p>
        </div>
        {isRole('home_manager', 'group_admin') && (
          <Button size="sm" variant="secondary" icon={<Users className="w-4 h-4" />} onClick={openAdminReads}>
            Who read plans
          </Button>
        )}
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
        suId={selectedSu?.id} homeId={selectedHome}
        onSaved={async () => { setAddPlanOpen(false); await refreshPlans(); toast.success('Support plan created') }} />

      {/* View plan modal */}
      {viewPlan && (
        <PlanDetailModal
          plan={viewPlan}
          reads={planReads[viewPlan.id] || []}
          canDelete={isRole('home_manager', 'group_admin')}
          onClose={() => setViewPlan(null)}
          onEdit={() => { setEditPlan(viewPlan); setViewPlan(null) }}
          onDelete={async () => { await deletePlan(viewPlan.id) }}
          onPrint={() => printPlan(viewPlan)}
        />
      )}

      {/* Edit plan modal */}
      {editPlan && (
        <EditPlanModal plan={editPlan} suId={selectedSu?.id || ''} onClose={() => setEditPlan(null)} onSaved={async () => {
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

function PlanDetailModal({ plan, reads, canDelete, onClose, onEdit, onDelete, onPrint }: {
  plan: any; reads: any[]; canDelete: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void; onPrint: () => void
}) {
  const label = plan.custom_name || PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type
  const isMed = plan.plan_type === 'medication_support'

  return (
    <Modal open={true} onClose={onClose} title={label} size="lg">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
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
            {plan.support_types && <Field label="Type of Support" value={plan.support_types} />}
            <div className="space-y-4">
              {plan.aims_outcomes && <GoldSection label="My Aims & Objectives" value={plan.aims_outcomes} />}
              {plan.what_i_can_do && <GoldSection label="What I Can Do" value={plan.what_i_can_do} />}
              {plan.how_to_support && <GoldSection label="How To Support Me" value={plan.how_to_support} />}
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
          </>
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
          <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" /> Sign Off
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
  reviewFrequency: 'monthly', attachmentsNotes: '',
  medicationSupportLevel: '', managesOwnMeds: false, levelOfSupport: '',
  supportTypes: [] as string[], dateMedicationReview: '',
  regularMedications: '', prnMedications: '', otcMedications: '',
  prnProtocol: '', prnList: '', indicationForUse: '',
}

function AddPlanModal({ open, onClose, suId, homeId, onSaved }: {
  open: boolean; onClose: () => void; suId?: string; homeId?: string; onSaved: () => void
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
                  <label className="label">Level of Support Required</label>
                  <textarea className="input w-full" rows={2} value={form.levelOfSupport} onChange={e => set('levelOfSupport', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">SUPPORT</p>
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
          <textarea className="input" rows={2} value={form.attachmentsNotes} onChange={e => set('attachmentsNotes', e.target.value)} placeholder="Paste document links or note attachment references..." />
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

        {/* Consent section */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h4 className="font-semibold text-blue-800 text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Consent</h4>
          <div className="space-y-3">
            <div><label className="label">Consent notes</label><textarea className="input" rows={2} value={form.consentNotes} onChange={e => set('consentNotes', e.target.value)} placeholder="Describe what the service user or representative has consented to..." /></div>
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
