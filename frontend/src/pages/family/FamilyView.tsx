import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { format, differenceInYears, parseISO } from 'date-fns'
import {
  Heart, Phone, Calendar, FileText, Loader2, AlertTriangle,
  Pill, ClipboardList, Shield, User, Activity, ChevronDown, ChevronUp,
  Eye, X, Scale, Star, Info, Syringe, BookOpen, TrendingUp, ChevronRight,
  MapPin, Clock
} from 'lucide-react'

// ─────────── design tokens ───────────
const BRAND = '#1e3a5f'          // deep navy
const BRAND_LIGHT = '#2d5282'
const ACCENT = '#e8a317'         // warm amber
const BG = '#f8f5f0'             // warm cream background

const RECORD_LABELS: Record<string, { label: string; color: string }> = {
  personal_care:     { label: 'Personal Care',       color: '#7c3aed' },
  food_intake:       { label: 'Food & Nutrition',    color: '#059669' },
  fluid:             { label: 'Fluid Intake',        color: '#0ea5e9' },
  fluids:            { label: 'Fluid Intake',        color: '#0ea5e9' },
  blood_pressure:    { label: 'Blood Pressure',      color: '#dc2626' },
  weight:            { label: 'Weight',              color: '#0891b2' },
  temperature:       { label: 'Temperature',         color: '#ea580c' },
  oxygen_saturation: { label: 'Oxygen',              color: '#2563eb' },
  pulse:             { label: 'Pulse',               color: '#db2777' },
  vital_signs:       { label: 'Vital Signs',         color: '#dc2626' },
  incident:          { label: 'Incident',            color: '#b91c1c' },
  skin:              { label: 'Skin Care',           color: '#d97706' },
  body_map:          { label: 'Body Map',            color: '#b45309' },
  repositioning:     { label: 'Repositioning',       color: '#7c3aed' },
  continence:        { label: 'Continence',          color: '#0d9488' },
  activity:          { label: 'Activity',            color: '#16a34a' },
  communication:     { label: 'Communication',       color: '#2563eb' },
  sleep:             { label: 'Sleep',               color: '#6d28d9' },
  mood:              { label: 'Mood & Wellbeing',    color: '#d97706' },
  medication:        { label: 'Medication',          color: '#7c3aed' },
  handover:          { label: 'Handover',            color: '#475569' },
  general:           { label: 'General Note',        color: '#475569' },
}

const RISK_CFG: Record<string, { bg: string; text: string; border: string }> = {
  high:   { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  low:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
}

const SEV_CFG: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fef2f2', text: '#b91c1c' },
  serious:  { bg: '#fef2f2', text: '#dc2626' },
  moderate: { bg: '#fffbeb', text: '#92400e' },
  minor:    { bg: '#f0fdf4', text: '#166534' },
}

// ─────────── small components ───────────
function Pill({ text, bg, textColor, border }: { text: string; bg: string; textColor: string; border?: string }) {
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: bg, color: textColor, border: border ? `1px solid ${border}` : undefined }}>
      {text}
    </span>
  )
}

function Card({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm border border-slate-200/70 ${className}`} style={style}>
      {children}
    </div>
  )
}

function Section({ title, icon, badge, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; badge?: number | string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="mb-4 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span style={{ color: BRAND }}>{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {badge !== undefined && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BRAND }}>
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
    </Card>
  )
}

function InfoGrid({ items }: { items: { label: string; value?: string | null | boolean }[] }) {
  const filtered = items.filter(i => i.value !== null && i.value !== undefined && i.value !== '' && i.value !== false)
  if (!filtered.length) return null
  return (
    <div className="grid sm:grid-cols-2 gap-px bg-slate-100 rounded-xl overflow-hidden mt-4 border border-slate-100">
      {filtered.map((item, i) => (
        <div key={i} className="bg-white p-3.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{item.label}</p>
          <p className="text-sm text-slate-800">{typeof item.value === 'boolean' ? 'Yes' : item.value}</p>
        </div>
      ))}
    </div>
  )
}

function NoteModal({ note, onClose }: { note: any; onClose: () => void }) {
  const cfg = RECORD_LABELS[note.record_type] || { label: note.record_type?.replace(/_/g, ' ') || 'Note', color: '#475569' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800">{cfg.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {note.record_date ? format(parseISO(note.record_date.toString().slice(0, 10)), 'EEEE, d MMMM yyyy') : ''}
              {note.shift ? ` · ${note.shift.charAt(0).toUpperCase() + note.shift.slice(1)} shift` : ''}
              {note.staff_name ? ` · ${note.staff_name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {note.mood && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mood:</span>
              <span className="text-sm text-slate-700 capitalize">{note.mood}</span>
            </div>
          )}
          {note.wellbeing_score && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Wellbeing:</span>
              <span className="text-sm font-bold" style={{ color: ACCENT }}>{note.wellbeing_score}/10</span>
            </div>
          )}
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{note.notes || 'No details recorded.'}</p>
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: BRAND }}>Close</button>
        </div>
      </div>
    </div>
  )
}

function CarePlanModal({ plan, onClose }: { plan: any; onClose: () => void }) {
  const isOverdue = plan.next_review_date && new Date(plan.next_review_date) < new Date()
  const isDueSoon = !isOverdue && plan.next_review_date && new Date(plan.next_review_date) < new Date(Date.now() + 14 * 86400000)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ background: BRAND }}>
          <div>
            <p className="font-semibold text-white text-base">
              {plan.custom_name || plan.plan_type?.replace(/_/g, ' ')}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {!plan.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">Archived</span>
              )}
              {isOverdue ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800">Review overdue</span>
              ) : isDueSoon ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">Review due soon</span>
              ) : plan.is_active !== false ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800">Current</span>
              ) : null}
              {plan.next_review_date && (
                <span className="text-xs text-white/70">Review: {format(parseISO(plan.next_review_date.toString().slice(0,10)), 'd MMM yyyy')}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white mt-0.5"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {plan.aims_outcomes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Aims & Outcomes</p>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{plan.aims_outcomes}</p>
            </div>
          )}
          {plan.what_matters && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">What Matters to Me</p>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{plan.what_matters}</p>
            </div>
          )}
          {plan.how_to_support && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">How to Support Me</p>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{plan.how_to_support}</p>
            </div>
          )}
          {!plan.aims_outcomes && !plan.what_matters && !plan.how_to_support && (
            <p className="text-slate-400 text-sm text-center py-6">No detailed content recorded for this care plan.</p>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end flex-shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─────────── main component ───────────
export default function FamilyView() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewNote, setPreviewNote] = useState<any>(null)
  const [previewPlan, setPreviewPlan] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'health'>('overview')
  const [recordFilter, setRecordFilter] = useState<string>('all')

  useEffect(() => {
    if (!token) return
    fetch(`/api/family/${token}?days=90`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setError(json.error || 'Not found'); return }
        setData(json.data)
      })
      .catch(() => setError('Could not load resident information'))
      .finally(() => setLoading(false))
  }, [token])

  const { resident, records = [], medications = [], carePlans = [],
    riskAssessments = [], incidents = [], weightRecords = [], careReviews = [] } = data || {}

  // Derived
  const name = resident ? (resident.preferred_name || `${resident.first_name} ${resident.last_name}`) : ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  const age = resident?.date_of_birth ? differenceInYears(new Date(), new Date(resident.date_of_birth)) : null

  const activeMeds = medications.filter((m: any) => m.is_active !== false)
  const regularMeds = activeMeds.filter((m: any) => !m.is_prn)
  const prnMeds = activeMeds.filter((m: any) => m.is_prn)
  const pastMeds = medications.filter((m: any) => m.is_active === false)

  const activeCarePlans = carePlans.filter((cp: any) => cp.is_active !== false)
  const archivedCarePlans = carePlans.filter((cp: any) => cp.is_active === false)

  const activeRisks = riskAssessments.filter((ra: any) => ra.is_active !== false)

  const recordTypes = useMemo(() => {
    const types = new Set<string>(records.map((r: any) => r.record_type).filter(Boolean))
    return Array.from(types).sort()
  }, [records])

  const filteredRecords = useMemo(() => {
    if (recordFilter === 'all') return records
    return records.filter((r: any) => r.record_type === recordFilter)
  }, [records, recordFilter])

  const recordsByDate: Record<string, any[]> = {}
  filteredRecords.forEach((r: any) => {
    const d = r.record_date ? r.record_date.toString().slice(0, 10) : 'unknown'
    if (!recordsByDate[d]) recordsByDate[d] = []
    recordsByDate[d].push(r)
  })
  const sortedDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a))

  const hasAlerts = resident && (resident.dnar || resident.nil_by_mouth || resident.requires_oxygen || resident.has_catheter || resident.has_peg)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: BG }}>
        <img src="/logo.jpeg" alt="CompCare" className="w-14 h-14 rounded-2xl object-contain shadow-md" style={{ padding: 4, background: 'white' }} />
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND }} />
        <p className="text-slate-500 text-sm">Loading care record…</p>
      </div>
    )
  }

  if (error || !data?.resident) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 flex-col gap-4" style={{ background: BG }}>
        <img src="/logo.jpeg" alt="CompCare" className="w-14 h-14 rounded-2xl object-contain shadow-md" style={{ padding: 4, background: 'white' }} />
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-slate-800 text-xl font-semibold">Link not found</h2>
        <p className="text-slate-500 text-sm text-center">{error || 'This family portal link is invalid or has expired.'}</p>
      </div>
    )
  }

  const TABS = [
    { id: 'overview' as const, label: 'Overview', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'records' as const, label: 'Care Notes', icon: <FileText className="w-3.5 h-3.5" />, badge: records.length },
    { id: 'health' as const, label: 'Health & Plans', icon: <Activity className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-screen pb-12" style={{ background: BG }}>

      {/* ── Top banner ── */}
      <div className="sticky top-0 z-10 border-b border-slate-200 shadow-sm" style={{ background: BRAND }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/logo.jpeg" alt="CompCare" className="w-9 h-9 rounded-xl object-contain flex-shrink-0"
            style={{ padding: 3, background: 'white' }} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{name}</p>
            <p className="text-white/60 text-xs truncate">{resident.home_name}</p>
          </div>
          {resident.home_phone && (
            <a href={`tel:${resident.home_phone}`}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs transition-colors flex-shrink-0">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:block">{resident.home_phone}</span>
            </a>
          )}
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-white/50 hover:text-white/75'
              }`}>
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white text-slate-900' : 'bg-white/20 text-white'
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Resident hero card */}
            <Card className="mb-4 overflow-hidden">
              <div className="h-20" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)` }} />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex items-end gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg border-4 border-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #c97d10)` }}>
                    {initials}
                  </div>
                  <div className="pb-1">
                    <h1 className="text-slate-900 text-xl font-bold leading-tight">{name}</h1>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {resident.home_name}
                    </p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  {age && (
                    <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-100">
                      <p className="text-slate-900 text-xl font-black">{age}</p>
                      <p className="text-slate-500 text-xs font-medium">years old</p>
                    </div>
                  )}
                  <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-100">
                    <p className="text-slate-900 text-xl font-black">{activeMeds.length}</p>
                    <p className="text-slate-500 text-xs font-medium">medication{activeMeds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-100">
                    <p className="text-slate-900 text-xl font-black">{records.length}</p>
                    <p className="text-slate-500 text-xs font-medium">care notes</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Medical alerts */}
            {hasAlerts && (
              <Card className="mb-4 border-red-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2 border-b border-red-100" style={{ background: '#fef2f2' }}>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-red-700 text-sm font-bold">Medical Alerts</p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {resident.dnar && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600">
                      DNAR
                    </span>
                  )}
                  {resident.nil_by_mouth && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 border border-red-300 bg-red-50">
                      Nil By Mouth
                    </span>
                  )}
                  {resident.requires_oxygen && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 border border-amber-300 bg-amber-50">
                      Requires Oxygen
                    </span>
                  )}
                  {resident.has_catheter && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-slate-100">
                      Catheter
                    </span>
                  )}
                  {resident.has_peg && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-slate-100">
                      PEG Feed
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Personal information */}
            <Section title="Personal Information" icon={<User className="w-4 h-4" />}>
              <InfoGrid items={[
                { label: 'Full name', value: `${resident.first_name} ${resident.last_name}` },
                { label: 'Preferred name', value: resident.preferred_name },
                { label: 'Date of birth', value: resident.date_of_birth ? format(new Date(resident.date_of_birth), 'd MMMM yyyy') : null },
                { label: 'Age', value: age ? `${age} years old` : null },
                { label: 'Gender', value: resident.gender },
                { label: 'NHS number', value: resident.nhs_number },
                { label: 'Admitted', value: resident.admission_date ? format(new Date(resident.admission_date), 'd MMMM yyyy') : null },
                { label: 'Care home', value: resident.home_name },
                { label: 'Height', value: resident.height_cm ? `${resident.height_cm} cm` : null },
                { label: 'Weight', value: resident.weight_kg ? `${resident.weight_kg} kg` : null },
              ]} />
            </Section>

            {/* Medical information */}
            {(resident.medical_history || resident.med_allergies || resident.food_allergies || resident.special_diet || resident.diet_instructions) && (
              <Section title="Medical Information" icon={<Activity className="w-4 h-4" />}>
                <InfoGrid items={[
                  { label: 'Medical history', value: resident.medical_history },
                  { label: 'Medication allergies', value: resident.med_allergies },
                  { label: 'Food allergies', value: resident.food_allergies },
                  { label: 'Special diet', value: resident.special_diet },
                  { label: 'Fluid consistency', value: resident.fluid_consistency },
                  { label: 'Min. daily fluids', value: resident.min_fluid_ml ? `${resident.min_fluid_ml} ml` : null },
                  { label: 'Diet instructions', value: resident.diet_instructions },
                ]} />
              </Section>
            )}

            {/* Important info / need to know */}
            {resident.need_to_know && (
              <Section title="Important Information" icon={<Star className="w-4 h-4" />}>
                <div className="mt-4 rounded-xl p-4 border-l-4 text-sm leading-relaxed whitespace-pre-line text-slate-700"
                  style={{ background: '#fffbeb', borderColor: ACCENT }}>
                  {resident.need_to_know}
                </div>
              </Section>
            )}

            {/* Daily life */}
            {(resident.hobbies || resident.daily_routine || resident.my_instructions) && (
              <Section title="Daily Life & Preferences" icon={<Info className="w-4 h-4" />} defaultOpen={false}>
                {resident.daily_routine && (
                  <div className="mt-4 mb-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Daily Routine</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{resident.daily_routine}</p>
                  </div>
                )}
                {resident.hobbies && (
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Hobbies & Interests</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{resident.hobbies}</p>
                  </div>
                )}
                {resident.my_instructions && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Care Preferences</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{resident.my_instructions}</p>
                  </div>
                )}
              </Section>
            )}

            {/* Recent incidents summary */}
            {incidents.length > 0 && (
              <Section title="Incident Summary" icon={<AlertTriangle className="w-4 h-4" />} badge={incidents.length} defaultOpen={false}>
                <div className="space-y-2 mt-4">
                  {incidents.slice(0, 5).map((inc: any, i: number) => {
                    const sevCfg = SEV_CFG[inc.severity] || { bg: '#f8fafc', text: '#475569' }
                    return (
                      <div key={i} className="rounded-xl p-3 border border-slate-100"
                        style={{ background: sevCfg.bg }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {inc.incident_type?.replace(/_/g, ' ') || 'Incident'}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {inc.severity && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                                style={{ background: sevCfg.bg, color: sevCfg.text, border: `1px solid ${sevCfg.text}30` }}>
                                {inc.severity}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {inc.incident_date ? format(new Date(inc.incident_date.toString().slice(0,10)), 'd MMM yyyy') : ''}
                          {inc.reported_by ? ` · ${inc.reported_by}` : ''}
                        </p>
                        {inc.description && (
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{inc.description}</p>
                        )}
                        {inc.outcome && (
                          <p className="text-xs font-medium mt-1.5" style={{ color: BRAND }}>
                            Outcome: {inc.outcome}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {incidents.length > 5 && (
                    <p className="text-center text-xs text-slate-400 pt-1">+ {incidents.length - 5} more incidents</p>
                  )}
                </div>
              </Section>
            )}

            {/* Care reviews */}
            {careReviews.length > 0 && (
              <Section title="Care Reviews" icon={<BookOpen className="w-4 h-4" />} badge={careReviews.length} defaultOpen={false}>
                <div className="space-y-2 mt-4">
                  {careReviews.map((cr: any, i: number) => (
                    <div key={i} className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 capitalize">
                          {cr.review_type?.replace(/_/g, ' ') || 'Care Review'}
                        </p>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {cr.review_date ? format(new Date(cr.review_date.toString().slice(0,10)), 'd MMM yyyy') : ''}
                        </span>
                      </div>
                      {cr.reviewed_by && (
                        <p className="text-xs text-slate-500 mt-0.5">Reviewed by {cr.reviewed_by}</p>
                      )}
                      {cr.summary && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{cr.summary}</p>}
                      {cr.outcome && (
                        <div className="mt-2 text-xs font-medium text-slate-600 flex items-start gap-1">
                          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {cr.outcome}
                        </div>
                      )}
                      {cr.next_review_date && (
                        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Next review: {format(new Date(cr.next_review_date.toString().slice(0,10)), 'd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ══════════════ RECORDS TAB ══════════════ */}
        {activeTab === 'records' && (
          <>
            {/* Filter bar */}
            {recordTypes.length > 1 && (
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-2 pb-1 min-w-max">
                  <button onClick={() => setRecordFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      recordFilter === 'all' ? 'text-white shadow' : 'text-slate-600 bg-white border border-slate-200'
                    }`}
                    style={recordFilter === 'all' ? { background: BRAND } : {}}>
                    All ({records.length})
                  </button>
                  {recordTypes.map(type => {
                    const cfg = RECORD_LABELS[type]
                    const count = records.filter((r: any) => r.record_type === type).length
                    const active = recordFilter === type
                    return (
                      <button key={type} onClick={() => setRecordFilter(type)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
                        style={active
                          ? { background: cfg?.color || '#475569', color: 'white', borderColor: 'transparent' }
                          : { background: 'white', color: '#475569', borderColor: '#e2e8f0' }}>
                        {cfg?.label || type.replace(/_/g, ' ')} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {sortedDates.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No records match this filter</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedDates.map(date => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {format(parseISO(date), 'EEEE, d MMMM yyyy')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {recordsByDate[date].map((r: any, i: number) => {
                        const cfg = RECORD_LABELS[r.record_type] || { label: r.record_type?.replace(/_/g, ' ') || 'Note', color: '#475569' }
                        return (
                          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setPreviewNote(r)}>
                            <div className="px-4 py-3 flex items-center gap-3">
                              <div className="w-1 self-stretch rounded-full flex-shrink-0"
                                style={{ background: cfg.color, minHeight: 32 }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold uppercase tracking-wide"
                                    style={{ color: cfg.color }}>
                                    {cfg.label}
                                  </span>
                                  {r.wellbeing_score && (
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                                      style={{ background: ACCENT }}>
                                      {r.wellbeing_score}/10
                                    </span>
                                  )}
                                </div>
                                {r.notes && (
                                  <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{r.notes}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                  {r.shift ? r.shift.charAt(0).toUpperCase() + r.shift.slice(1) + ' shift' : ''}
                                  {r.staff_name ? ` · ${r.staff_name}` : ''}
                                </p>
                              </div>
                              <Eye className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════ HEALTH & PLANS TAB ══════════════ */}
        {activeTab === 'health' && (
          <>
            {/* Medications — active */}
            <Section title="Current Medications" icon={<Pill className="w-4 h-4" />} badge={activeMeds.length}>
              {activeMeds.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4 mt-4">No active medications recorded</p>
              ) : (
                <>
                  {regularMeds.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Regular</p>
                      <div className="space-y-2">
                        {regularMeds.map((med: any, i: number) => (
                          <div key={i} className="rounded-xl p-3.5 bg-slate-50 border border-slate-100">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{med.medication_name}</p>
                              {med.dose && <span className="text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full text-white" style={{ background: BRAND }}>{med.dose}</span>}
                            </div>
                            <div className="flex gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                              {med.frequency && <span>{med.frequency}</span>}
                              {med.route && <span>· via {med.route}</span>}
                              {med.prescribed_by && <span>· Dr. {med.prescribed_by}</span>}
                            </div>
                            {med.instructions && <p className="text-xs text-slate-500 mt-1.5 italic">{med.instructions}</p>}
                            {med.start_date && <p className="text-xs text-slate-400 mt-1">Started: {format(new Date(med.start_date.toString().slice(0,10)), 'd MMM yyyy')}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {prnMeds.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">PRN (As Required)</p>
                      <div className="space-y-2">
                        {prnMeds.map((med: any, i: number) => (
                          <div key={i} className="rounded-xl p-3.5 border bg-amber-50 border-amber-200">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{med.medication_name}</p>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: ACCENT, color: 'white' }}>PRN</span>
                            </div>
                            <div className="flex gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                              {med.dose && <span>{med.dose}</span>}
                              {med.route && <span>· via {med.route}</span>}
                            </div>
                            {med.instructions && <p className="text-xs text-slate-600 mt-1.5 italic">{med.instructions}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Past medications */}
              {pastMeds.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-2">Past Medications</p>
                  <div className="space-y-1.5">
                    {pastMeds.map((med: any, i: number) => (
                      <div key={i} className="rounded-xl p-3 bg-slate-50 border border-slate-100 opacity-60">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-600 line-through">{med.medication_name}</p>
                          <span className="text-xs text-slate-400">{med.dose}</span>
                        </div>
                        {med.end_date && (
                          <p className="text-xs text-slate-400 mt-0.5">Stopped: {format(new Date(med.end_date.toString().slice(0,10)), 'd MMM yyyy')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Weight trend */}
            {weightRecords.length > 0 && (
              <Section title="Weight Records" icon={<Scale className="w-4 h-4" />} badge={weightRecords.length} defaultOpen={false}>
                <div className="space-y-2 mt-4">
                  {weightRecords.slice(0, 12).map((wr: any, i: number) => (
                    <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{wr.weight_kg} kg</p>
                        {wr.notes && <p className="text-xs text-slate-500 mt-0.5">{wr.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {wr.measured_at ? format(new Date(wr.measured_at), 'd MMM yyyy') : ''}
                        </p>
                        {wr.recorded_by && <p className="text-xs text-slate-400">{wr.recorded_by}</p>}
                      </div>
                    </div>
                  ))}
                  {weightRecords.length > 12 && (
                    <p className="text-center text-xs text-slate-400">+ {weightRecords.length - 12} earlier records</p>
                  )}
                </div>
              </Section>
            )}

            {/* Active care plans */}
            {carePlans.length > 0 && (
              <Section title="Care Plans" icon={<ClipboardList className="w-4 h-4" />} badge={carePlans.length}>
                {activeCarePlans.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {activeCarePlans.map((cp: any, i: number) => {
                      const isOverdue = cp.next_review_date && new Date(cp.next_review_date) < new Date()
                      const isDueSoon = !isOverdue && cp.next_review_date && new Date(cp.next_review_date) < new Date(Date.now() + 14 * 86400000)
                      return (
                        <div key={i}
                          className="rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-sm transition-shadow bg-white border border-slate-200"
                          onClick={() => setPreviewPlan(cp)}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {cp.custom_name || cp.plan_type?.replace(/_/g, ' ')}
                            </p>
                            {cp.aims_outcomes && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cp.aims_outcomes}</p>
                            )}
                            {cp.next_review_date && (
                              <p className="text-xs text-slate-400 mt-1">
                                Review: {format(parseISO(cp.next_review_date.toString().slice(0,10)), 'd MMM yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isOverdue ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-red-700 bg-red-100 border border-red-200">Overdue</span>
                            ) : isDueSoon ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-amber-800 bg-amber-100 border border-amber-200">Due soon</span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-green-700 bg-green-100 border border-green-200">Current</span>
                            )}
                            <Eye className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {archivedCarePlans.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-2">Archived Plans</p>
                    <div className="space-y-1.5">
                      {archivedCarePlans.map((cp: any, i: number) => (
                        <div key={i}
                          className="rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer opacity-60 bg-slate-50 border border-slate-100"
                          onClick={() => setPreviewPlan(cp)}>
                          <p className="text-xs text-slate-500 flex-1">
                            {cp.custom_name || cp.plan_type?.replace(/_/g, ' ')}
                          </p>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-slate-400 text-xs text-center mt-3">Tap any care plan to read full details</p>
              </Section>
            )}

            {/* Risk assessments */}
            {riskAssessments.length > 0 && (
              <Section title="Risk Assessments" icon={<Shield className="w-4 h-4" />} badge={activeRisks.length}>
                <div className="space-y-2 mt-4">
                  {riskAssessments.map((ra: any, i: number) => {
                    const cfg = RISK_CFG[ra.risk_level] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
                    return (
                      <div key={i} className="rounded-xl p-3.5 border"
                        style={{ background: cfg.bg, borderColor: cfg.border }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 flex-1">{ra.assessment_name}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!ra.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Archived</span>
                            )}
                            {ra.risk_level && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize border"
                                style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                                {ra.risk_level} risk
                              </span>
                            )}
                          </div>
                        </div>
                        {ra.description && (
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{ra.description}</p>
                        )}
                        {ra.management_plan && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: cfg.border }}>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5">Management plan</p>
                            <p className="text-xs text-slate-600 line-clamp-2">{ra.management_plan}</p>
                          </div>
                        )}
                        {ra.review_date && (
                          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Review: {format(new Date(ra.review_date.toString().slice(0,10)), 'd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <img src="/logo.jpeg" alt="CompCare" className="w-8 h-8 rounded-lg object-contain mx-auto mb-2 opacity-60"
            style={{ padding: 2, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          <p className="text-xs text-slate-400">Confidential — Authorised family members only</p>
          <p className="text-xs text-slate-400 mt-0.5">Generated {format(new Date(), 'd MMMM yyyy')} · CompCare Hub</p>
        </div>
      </div>

      {previewNote && <NoteModal note={previewNote} onClose={() => setPreviewNote(null)} />}
      {previewPlan && <CarePlanModal plan={previewPlan} onClose={() => setPreviewPlan(null)} />}
    </div>
  )
}
