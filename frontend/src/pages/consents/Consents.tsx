import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import {
  FileSignature, CheckCircle, XCircle, AlertCircle, Plus,
  User, Moon, Home, UtensilsCrossed, Globe2, Brain,
  Pill, ShieldCheck, Heart, DollarSign, Users, AlertTriangle,
  UserX, ChevronRight, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

const CONSENT_TYPES = [
  { key: 'personal_oral_care',               label: 'Personal & Oral Care',               icon: User,             color: 'blue',   description: 'Consent for personal hygiene, washing, bathing, and oral hygiene care.' },
  { key: 'sleep',                             label: 'Sleep',                               icon: Moon,             color: 'indigo', description: 'Consent for sleep support, nighttime checks, and sleep environment management.' },
  { key: 'household_tasks',                   label: 'Household Tasks',                     icon: Home,             color: 'emerald',description: 'Consent for assistance with household tasks including cooking, cleaning, and laundry.' },
  { key: 'nutrition_hydration',               label: 'Nutrition and Hydration',             icon: UtensilsCrossed,  color: 'orange', description: 'Consent for dietary support, meal preparation, and nutritional monitoring.' },
  { key: 'community_engagement',              label: 'Community Engagement',                icon: Globe2,           color: 'teal',   description: 'Consent for participation in community activities, outings, and social programmes.' },
  { key: 'behavioural_concerns',              label: 'Behavioural Concerns',                icon: Brain,            color: 'purple', description: 'Consent for behaviour support plans and positive behaviour interventions.' },
  { key: 'medication_compliance',             label: 'Medication Compliance',               icon: Pill,             color: 'rose',   description: 'Consent for medication administration, compliance monitoring, and PRN protocols.' },
  { key: 'community_access_safeguarding',     label: 'Community Access and Safeguarding',   icon: ShieldCheck,      color: 'amber',  description: 'Consent for community access arrangements with appropriate safeguarding measures.' },
  { key: 'mental_health_emotional_wellbeing', label: 'Mental Health & Emotional Wellbeing', icon: Heart,            color: 'pink',   description: 'Consent for mental health support, emotional wellbeing interventions, and counselling referrals.' },
  { key: 'financial_management',              label: 'Financial Management',                icon: DollarSign,       color: 'green',  description: 'Consent for financial management support, budgeting assistance, and spending decisions.' },
  { key: 'family_social_contact',             label: 'Family and Social Contact',           icon: Users,            color: 'sky',    description: 'Consent for arrangements regarding family contact, visits, and social relationships.' },
  { key: 'self_harm',                         label: 'Self-Harm',                           icon: AlertTriangle,    color: 'red',    description: 'Consent for self-harm risk management strategies and safeguarding interventions.' },
  { key: 'behaviour_towards_staff',           label: 'Behaviour Towards Staff',             icon: UserX,            color: 'zinc',   description: 'Consent for agreed management strategies for behaviour directed towards staff members.' },
]

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    icon: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'text-purple-600',  badge: 'bg-purple-100 text-purple-700' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  pink:    { bg: 'bg-pink-50',    border: 'border-pink-200',    icon: 'text-pink-600',    badge: 'bg-pink-100 text-pink-700' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',   icon: 'text-green-600',   badge: 'bg-green-100 text-green-700' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     icon: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     icon: 'text-red-600',     badge: 'bg-red-100 text-red-700' },
  zinc:    { bg: 'bg-zinc-50',    border: 'border-zinc-200',    icon: 'text-zinc-600',    badge: 'bg-zinc-100 text-zinc-700' },
}

const CAPACITY_OPTIONS = [
  { value: 'yes',      label: 'Has capacity' },
  { value: 'no',       label: 'Lacks capacity (best interest)' },
  { value: 'fluctuating', label: 'Fluctuating capacity' },
]

const METHOD_OPTIONS = [
  { value: 'verbal',   label: 'Verbal' },
  { value: 'written',  label: 'Written' },
  { value: 'gestural', label: 'Gestural / non-verbal' },
  { value: 'other',    label: 'Other' },
]

const EMPTY_FORM = {
  hasCapacity: 'yes',
  capacityNotes: '',
  consentGiven: true,
  consentMethod: 'verbal',
  bestInterestDecision: '',
  decisionMaker: '',
  reviewDate: '',
  notes: '',
  suSignedBy: '',
  suSignedDate: '',
  staffSignedBy: '',
  staffSignedDate: '',
}

export default function Consents() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [consents, setConsents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalType, setModalType] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/service-users', { params: { homeId: user?.homeId, status: 'live', limit: 200 } })
      .then(r => {
        const list = r.data.data || []
        setSus(list)
        if (list.length) setSelectedSu(list[0].id)
      }).catch(console.error)
  }, [user?.homeId])

  const load = useCallback(() => {
    if (!selectedSu || !user?.homeId) return
    setLoading(true)
    api.get('/consents', { params: { suId: selectedSu, homeId: user.homeId } })
      .then(r => setConsents(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedSu, user?.homeId])

  useEffect(() => { load() }, [load])

  const getConsent = (key: string) => consents.find(c => c.consent_type === key)

  const openModal = (key: string) => {
    const existing = getConsent(key)
    if (existing) {
      setForm({
        hasCapacity: existing.has_capacity || 'yes',
        capacityNotes: existing.capacity_notes || '',
        consentGiven: existing.consent_given ?? true,
        consentMethod: existing.consent_method || 'verbal',
        bestInterestDecision: existing.best_interest_decision || '',
        decisionMaker: existing.decision_maker || '',
        reviewDate: existing.review_date ? existing.review_date.substring(0, 10) : '',
        notes: existing.notes || '',
        suSignedBy: existing.su_signed_by || '',
        suSignedDate: existing.su_signed_date ? existing.su_signed_date.substring(0, 10) : '',
        staffSignedBy: existing.staff_signed_by || '',
        staffSignedDate: existing.staff_signed_date ? existing.staff_signed_date.substring(0, 10) : '',
      })
    } else {
      setForm({ ...EMPTY_FORM })
    }
    setModalType(key)
  }

  const save = async () => {
    if (!modalType || !selectedSu) return
    setSaving(true)
    try {
      await api.post('/consents', {
        suId: selectedSu,
        homeId: user?.homeId,
        consentType: modalType,
        ...form,
      })
      toast.success('Consent record saved')
      setModalType(null)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const statusIcon = (key: string) => {
    const c = getConsent(key)
    if (!c) return <AlertCircle className="w-4 h-4 text-slate-400" />
    if (c.has_capacity === 'no') return <AlertCircle className="w-4 h-4 text-amber-500" />
    if (c.consent_given) return <CheckCircle className="w-4 h-4 text-green-500" />
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const statusText = (key: string) => {
    const c = getConsent(key)
    if (!c) return 'Not recorded'
    if (c.has_capacity === 'no') return 'Best interest decision'
    if (c.has_capacity === 'fluctuating') return 'Fluctuating capacity'
    return c.consent_given ? 'Consent given' : 'Consent withheld'
  }

  const activeType = CONSENT_TYPES.find(t => t.key === modalType)
  const given = consents.filter(c => c.consent_given).length
  const total = CONSENT_TYPES.length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consents & Signatures</h1>
            <p className="text-slate-500 text-sm">Record and manage consent for all care areas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {sus.length > 1 && (
            <select className="input w-auto"
              value={selectedSu}
              onChange={e => setSelectedSu(e.target.value)}>
              {sus.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Progress summary */}
      {selectedSu && !loading && (
        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-slate-700">{given} of {total} consents recorded</span>
          </div>
          <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[120px]">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(given / total) * 100}%` }} />
          </div>
          <span className="text-sm text-slate-500">{total - consents.length} not yet recorded</span>
        </div>
      )}

      {loading ? <Spinner /> : !selectedSu ? (
        <EmptyState title="No residents found" description="Add residents to record consent forms." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONSENT_TYPES.map(ct => {
            const c = getConsent(ct.key)
            const colors = COLOR_MAP[ct.color]
            const Icon = ct.icon
            return (
              <button key={ct.key}
                onClick={() => openModal(ct.key)}
                className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md hover:scale-[1.01] ${colors.bg} ${colors.border} group`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    {statusIcon(ct.key)}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1 leading-tight">{ct.label}</h3>
                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{ct.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c ? (c.consent_given ? 'bg-green-100 text-green-700' : c.has_capacity === 'no' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') : 'bg-slate-100 text-slate-500'}`}>
                    {statusText(ct.key)}
                  </span>
                  {c?.review_date && (
                    <span className="text-xs text-slate-400">Review: {format(new Date(c.review_date), 'dd MMM yyyy')}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Consent Form Modal */}
      {activeType && (
        <Modal
          open={!!modalType}
          onClose={() => setModalType(null)}
          title={`${activeType.label} — Consent`}
          size="lg">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{activeType.description}</p>

            {/* Capacity */}
            <div>
              <label className="label">Mental capacity assessment</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CAPACITY_OPTIONS.map(o => (
                  <button key={o.value} type="button"
                    onClick={() => set('hasCapacity', o.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.hasCapacity === o.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Capacity assessment notes (optional)" value={form.capacityNotes}
              onChange={e => set('capacityNotes', e.target.value)}
              placeholder="Briefly describe the capacity assessment..." />

            {form.hasCapacity !== 'no' ? (
              <>
                <div>
                  <label className="label">Consent given?</label>
                  <div className="flex gap-3 mt-1">
                    {[{ v: true, l: 'Yes — consent given' }, { v: false, l: 'No — consent withheld' }].map(o => (
                      <button key={String(o.v)} type="button"
                        onClick={() => set('consentGiven', o.v)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors ${form.consentGiven === o.v ? (o.v ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Method of consent</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {METHOD_OPTIONS.map(o => (
                      <button key={o.value} type="button"
                        onClick={() => set('consentMethod', o.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.consentMethod === o.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Best interest decision</label>
                  <textarea className="input w-full" rows={3} value={form.bestInterestDecision}
                    onChange={e => set('bestInterestDecision', e.target.value)}
                    placeholder="Describe the best interest decision made on behalf of the person..." />
                </div>
                <Input label="Decision maker (name / role)" value={form.decisionMaker}
                  onChange={e => set('decisionMaker', e.target.value)}
                  placeholder="e.g. Next of kin — Jane Smith / Deputy" />
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Review date" type="date" value={form.reviewDate}
                onChange={e => set('reviewDate', e.target.value)} />
            </div>

            <div>
              <label className="label">Additional notes (optional)</label>
              <textarea className="input w-full" rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any further detail or context..." />
            </div>

            {/* Sign-off section */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Sign-off</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Service user / decision maker signed by" value={form.suSignedBy}
                  onChange={e => set('suSignedBy', e.target.value)}
                  placeholder="Name of person who signed" />
                <Input label="Date signed" type="date" value={form.suSignedDate}
                  onChange={e => set('suSignedDate', e.target.value)} />
                <Input label="Staff signed by" value={form.staffSignedBy}
                  onChange={e => set('staffSignedBy', e.target.value)}
                  placeholder="Staff member completing this record" />
                <Input label="Date signed" type="date" value={form.staffSignedDate}
                  onChange={e => set('staffSignedDate', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} loading={saving} className="flex-1">Save consent record</Button>
              <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
