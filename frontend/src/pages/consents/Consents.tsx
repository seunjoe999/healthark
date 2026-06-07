import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import {
  FileSignature, CheckCircle, XCircle, AlertCircle,
  User, Moon, Home, UtensilsCrossed, Globe2, Brain,
  Pill, ShieldCheck, Heart, DollarSign, Users, AlertTriangle,
  UserX, ChevronRight, ClipboardList,
  Shield, ShieldAlert, CalendarCheck, Camera, Package, Database,
  UserCheck, Syringe, Wrench, Share2, Wallet, MapPin, Key
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Care-area clinical consents ───────────────────────────────────────────
const CARE_AREA_TYPES = [
  { key: 'personal_oral_care',               label: 'Personal & Oral Care',               icon: User,            color: 'blue',    description: 'Consent for personal hygiene, washing, bathing, and oral hygiene care.' },
  { key: 'sleep',                             label: 'Sleep',                               icon: Moon,            color: 'indigo',  description: 'Consent for sleep support, nighttime checks, and sleep environment management.' },
  { key: 'household_tasks',                   label: 'Household Tasks',                     icon: Home,            color: 'emerald', description: 'Consent for assistance with household tasks including cooking, cleaning, and laundry.' },
  { key: 'nutrition_hydration',               label: 'Nutrition and Hydration',             icon: UtensilsCrossed, color: 'orange',  description: 'Consent for dietary support, meal preparation, and nutritional monitoring.' },
  { key: 'community_engagement',              label: 'Community Engagement',                icon: Globe2,          color: 'teal',    description: 'Consent for participation in community activities, outings, and social programmes.' },
  { key: 'behavioural_concerns',              label: 'Behavioural Concerns',                icon: Brain,           color: 'purple',  description: 'Consent for behaviour support plans and positive behaviour interventions.' },
  { key: 'medication_compliance',             label: 'Medication Compliance',               icon: Pill,            color: 'rose',    description: 'Consent for medication administration, compliance monitoring, and PRN protocols.' },
  { key: 'community_access_safeguarding',     label: 'Community Access and Safeguarding',   icon: ShieldCheck,     color: 'amber',   description: 'Consent for community access arrangements with appropriate safeguarding measures.' },
  { key: 'mental_health_emotional_wellbeing', label: 'Mental Health & Emotional Wellbeing', icon: Heart,           color: 'pink',    description: 'Consent for mental health support, emotional wellbeing interventions, and counselling referrals.' },
  { key: 'financial_management',              label: 'Financial Management',                icon: DollarSign,      color: 'green',   description: 'Consent for financial management support, budgeting assistance, and spending decisions.' },
  { key: 'family_social_contact',             label: 'Family and Social Contact',           icon: Users,           color: 'sky',     description: 'Consent for arrangements regarding family contact, visits, and social relationships.' },
  { key: 'self_harm',                         label: 'Self-Harm',                           icon: AlertTriangle,   color: 'red',     description: 'Consent for self-harm risk management strategies and safeguarding interventions.' },
  { key: 'behaviour_towards_staff',           label: 'Behaviour Towards Staff',             icon: UserX,           color: 'zinc',    description: 'Consent for agreed management strategies for behaviour directed towards staff members.' },
]

// ─── Agreements & declarations ─────────────────────────────────────────────
const DECLARATION_TYPES = [
  { key: 'care_plan_support',              label: 'Care Plan Support Consent',          icon: ClipboardList, color: 'violet',  description: 'Declaration that the service user has read their care plan and consents to be supported as detailed within it.' },
  { key: 'health_safety_agreement',        label: 'Health & Safety Agreement',          icon: Shield,        color: 'slate',   description: 'Declaration confirming the service user has read the Health & Safety Agreement and agrees to its terms.' },
  { key: 'risk_assessment_support',        label: 'Risk Assessment Support Consent',    icon: ShieldAlert,   color: 'orange',  description: 'Consent confirming the service user has read and agreed to the Risk Assessment and Health & Safety terms.' },
  { key: 'monthly_joint_care_plan_review', label: 'Monthly Joint Care Plan Review',     icon: CalendarCheck, color: 'cyan',    description: 'Acknowledgement that the service user has been involved in and understands their monthly care plan review.' },
  { key: 'photo_consent',                  label: 'Photo Consent',                      icon: Camera,        color: 'fuchsia', description: 'Consent for photographs and videos to be taken and used for specified purposes in line with CQC and GDPR.' },
  { key: 'property_list',                  label: 'Consent — Property List',            icon: Package,       color: 'lime',    description: 'Consent to allow the care service to look after personal belongings and photograph them for audit purposes.' },
  { key: 'personal_data',                  label: 'Consent — Use of Personal Data',     icon: Database,      color: 'sky',     description: 'GDPR consent for collection and use of personal information for the purpose of providing care services.' },
  { key: 'personal_care_support',          label: 'Consent — Personal Care Support',    icon: UserCheck,     color: 'teal',    description: 'Consent to receive personal care and support in a way that maintains dignity, privacy, and personal preferences.' },
  { key: 'medication_support',             label: 'Consent — Medication Support',       icon: Syringe,       color: 'red',     description: 'Informed consent for medication support and administration in line with CQC Regulation 11 and NICE guidelines.' },
  { key: 'property_damage_repair',         label: 'Consent — Property & Equipment',     icon: Wrench,        color: 'amber',   description: 'Consent accepting responsibility for accommodation damage and allowing authorised repairs under tenancy agreement.' },
  { key: 'information_sharing',            label: 'Information Sharing & Confidentiality', icon: Share2,     color: 'indigo',  description: 'Consent for personal and health information to be shared with relevant professionals and agencies involved in care.' },
  { key: 'financial_support',              label: 'Consent — Financial Support',        icon: Wallet,        color: 'green',   description: 'Consent for staff to provide financial support including budgeting, shopping, and transaction recording.' },
  { key: 'community_access_activities',    label: 'Consent — Community Access',         icon: MapPin,        color: 'emerald', description: 'Consent for participation in supported community activities and outings with staff or authorised carers.' },
  { key: 'rent_service_charge',            label: 'Rent & Service Charge Agreement',    icon: Key,           color: 'stone',   description: 'Agreement to pay rent, service charges, and utility bills as applicable under the tenancy with Comprehensive Care.' },
]

const ALL_CONSENT_TYPES = [...CARE_AREA_TYPES, ...DECLARATION_TYPES]
const DECLARATION_KEYS = new Set(DECLARATION_TYPES.map(t => t.key))

// Declaration text for each administrative consent type
const DECLARATION_META: Record<string, {
  text: string
  consentLabel?: string
  noConsentLabel?: string
  noChoice?: boolean      // acknowledgement only — no consent toggle
  multiOption?: boolean   // special multi-option rendering
}> = {
  care_plan_support: {
    text: 'I declare that I have read my care plan and I consent to be supported as detailed in my care plan.',
    consentLabel: 'I Consent',
    noConsentLabel: 'I Do Not Consent',
  },
  health_safety_agreement: {
    text: 'I declare that I have read the Health & Safety Agreement and agree to the terms set out.\n\nI declare I have also been taken through the agreement with a member of the support team and my questions have been answered.',
    consentLabel: 'I Consent',
    noConsentLabel: 'I Do Not Consent',
  },
  risk_assessment_support: {
    text: 'I declare that I have read the Health & Safety Agreement and agree to the terms set out.\n\nI declare I have also been taken through the agreement with a member of the support team and my questions have been answered.',
    consentLabel: 'I Consent',
    noConsentLabel: 'I Do Not Consent',
  },
  monthly_joint_care_plan_review: {
    text: 'I confirm that my Care Plan Review has been discussed with me. I have been given the opportunity to share my views, preferences, and goals regarding my care and support.\n\nI understand the information that has been explained to me about my current support needs, the support provided, and any changes that may be made to my care plan. I have been able to ask questions and discuss any concerns.\n\nI acknowledge that:\n• I have been involved in the review of my care and support plan.\n• My views, wishes, and preferences have been considered.\n• I understand the support that will be provided moving forward.\n• I know who to speak to if I have any questions or if my needs change.\n• If I require support to understand my care plan, I know that staff are available to explain this to me in a way that I can understand.',
    noChoice: true,
  },
  photo_consent: {
    text: 'Under the Health and Social Care Act 2008, the CQC expects all providers to handle photography and video use with respect, consent, and safeguarding in mind.\n\nI confirm that:\n• I understand the reason for taking photographs/videos.\n• I have had the opportunity to ask questions and received satisfactory answers.\n• I understand that I can withdraw consent at any time without affecting the quality of my care.\n• Images will be stored and shared in accordance with UK GDPR and the organisation\'s data protection policy.',
    multiOption: true,
  },
  property_list: {
    text: 'I have agreed to allow the care service to look after my personal belongings.\n\nI have seen the list of my belongings, which have been logged and encompass all my belongings.',
    consentLabel: 'I consent to photographs being taken of my property for audit purposes',
    noConsentLabel: 'I Do Not Consent',
  },
  personal_data: {
    text: 'We collect and use your personal information to provide and manage the services and support you receive. This may include your contact details, care needs, and relevant health information.\n\nYour information may be shared, where necessary, with professionals involved in your care (such as healthcare staff, social services, or regulatory bodies). All information will be handled confidentially and in line with UK GDPR and the Data Protection Act 2018.\n\nYou have the right to access your information, request corrections, and withdraw your consent where applicable.',
    consentLabel: 'I Consent — I understand I can withdraw my consent at any time.',
    noConsentLabel: 'I Do Not Consent',
  },
  personal_care_support: {
    text: 'I consent to receive personal care and support in a way that maintains my dignity, respects my privacy, and upholds my personal preferences at all times.\n\nI understand that support staff will always:\n• Knock before entering my room.\n• Explain what they are doing before and during personal care tasks.\n• Offer me choices and respect my wishes regarding who provides my care.\n• Maintain my dignity by covering me appropriately and only exposing the areas needed for care.\n• Provide care in a private, quiet space unless there is a risk to my safety.\n• Respect my personal boundaries, cultural needs, and preferences.\n\nI have the right to say no to any aspect of my care and to request a review of my care plan at any time.',
    consentLabel: 'I Consent to be supported with my Personal Care, Daily living tasks, and Medication Management in a manner that respects my dignity, privacy, and individual needs.',
    noConsentLabel: 'I Do Not consent to be supported with my personal care.',
  },
  medication_support: {
    text: 'In line with CQC Regulation 11 and NICE Guidelines (SC1 & NG108):\n\n"I understand that I will receive support with my medication as part of my care at Comprehensive Care. The purpose, benefits, and any potential risks or side effects of the medication have been explained to me in a way I can understand.\n\nI give my informed consent to receive this support. I am aware that I can ask questions or withdraw my consent at any time. If I am unable to make or communicate this decision in the future, a best interest decision will be made in accordance with the Mental Capacity Act 2005 and clearly documented."',
    consentLabel: 'I consent to be supported with the administration and management of my medication, including assistance with taking my prescribed medication, safe storage, monitoring for side effects, and communication with healthcare professionals as necessary. I understand that I can withdraw this consent at any time.',
    noConsentLabel: 'I Do Not consent to be supported with the administration and management of my medication.',
  },
  property_damage_repair: {
    text: 'I agree to take responsibility for any damage I cause to my accommodation or equipment belonging to Comprehensive Care. I consent to arrange or allow repairs to be carried out within 7 days of the damage occurring at my cost.\n\nI consent to allow authorised maintenance personnel to inspect and carry out repairs in line with tenancy or housing agreements.\n\nI understand that:\n• I will be informed of any planned repairs or maintenance, and every effort will be made to respect my privacy.\n• In cases of emergency or health and safety risks, immediate access and repair may be required.\n• I may be evicted if I do not look after my accommodation.',
    consentLabel: 'I accept full responsibility for any damage I cause to my accommodation or any equipment provided as part of my tenancy with Comprehensive Care. I consent to arrange or allow repairs to be carried out within 7 days, at my own cost.',
    noConsentLabel: 'I Do NOT accept personal responsibility for any damage I may intentionally cause to the accommodation or equipment belonging to Comprehensive Care.',
  },
  information_sharing: {
    text: 'By signing this form, you consent to the sharing of your personal information, where appropriate, with relevant professionals and family members involved in your care and support. This may include:\n• Health professionals (e.g., GP, nurse, mental health team)\n• Social workers and care coordinators\n• Housing officers or local authority representatives\n• Emergency services (if necessary for your safety or wellbeing)\n• External agencies involved in safeguarding or welfare\n\nNote: In some circumstances (e.g., risk to life or safeguarding concerns), information may still need to be shared without your consent, in line with legal requirements.',
    multiOption: true,
  },
  financial_support: {
    text: 'This form confirms consent for Comprehensive Care staff to provide support with financial matters as needed.\n\nSupport May Include:\n• Assisting with budgeting and managing day-to-day expenses.\n• Supporting with shopping or paying for services and activities.\n• Helping to understand financial decisions and manage money safely.\n• Recording transactions and keeping receipts as appropriate.\n\nAll financial support will be provided in the individual\'s best interests and in line with organisational policies.',
    consentLabel: 'I understand the purpose of this support and give permission for staff to assist with financial matters as outlined above. I am aware that consent can be withdrawn at any time.',
    noConsentLabel: 'I Do Not Consent — I do not give permission for staff to assist with financial matters. I am aware that consent can be given at any time in the future if required.',
  },
  community_access_activities: {
    text: 'This form confirms consent for Comprehensive Care to support the individual to participate in community activities and outings with staff or authorised carers.\n\nActivities may include shopping, attending appointments, social or recreational activities, visiting parks or cafés, and other community-based activities.\n\nStaff will provide appropriate support and supervision to ensure the individual\'s safety, wellbeing, and inclusion in the community. While reasonable steps will be taken to manage risks, some general risks may exist when participating in activities outside the home.',
    consentLabel: 'I understand the above and give permission for participation in supported community activities. I am aware that I can withdraw my consent at any time.',
    noConsentLabel: 'I Do Not Consent to participation in supported community activities. I understand that I can consent in the future if required.',
  },
  rent_service_charge: {
    text: 'I consent to the following:\n\n1. Pay My Rent and Service Charge / Utility Bill as applicable.\n   Note: Rent may be covered through Universal Credit. The service charge is not eligible for benefit and is the tenant\'s responsibility.\n\n2. Payment Method: Rent will be paid via Universal Credit or direct payment, and any shortfall may be claimed via Discretionary Housing Benefit.\n\nService User Agreement — I agree to:\n• Pay the weekly service charge as agreed.\n• Provide all necessary documents to assist with any Housing Benefit claim.\n• Notify staff immediately if there are any changes to my financial situation.\n• Understand that failure to pay rent or service charges may impact my tenancy.\n• Allow access for inspections and rent reviews.',
    consentLabel: 'I Consent to the Rent and Service Charge / Utility Bill Payment Agreement. I shall pay all my Rent, Service Charge or Utility Bill as applicable.',
    noConsentLabel: 'I Do NOT Consent — I understand that by refusing this agreement, I am no longer eligible to remain in the accommodation provided by Comprehensive Care.',
  },
}

const PHOTO_PURPOSES = [
  { value: 'internal_documentation', label: 'Internal documentation (e.g. care records, handovers)' },
  { value: 'newsletters',            label: 'Newsletters or Organisational presentations' },
  { value: 'staff_training',         label: 'Staff Training or Reflective Supervision' },
  { value: 'external_promotion',     label: 'External promotion (e.g. website, social media)' },
]

const INFO_SHARING_OPTIONS = [
  { value: 'consent_with_family',  label: 'I Consent — including sharing with family members when required.' },
  { value: 'consent_no_family',    label: 'I Consent — but I do NOT consent for information to be shared with my family.' },
  { value: 'no_consent',           label: 'I Do NOT consent to my personal and health information being shared.' },
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
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  icon: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-300',   icon: 'text-slate-600',   badge: 'bg-slate-200 text-slate-700' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    icon: 'text-cyan-600',    badge: 'bg-cyan-100 text-cyan-700' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', icon: 'text-fuchsia-600', badge: 'bg-fuchsia-100 text-fuchsia-700' },
  lime:    { bg: 'bg-lime-50',    border: 'border-lime-200',    icon: 'text-lime-600',    badge: 'bg-lime-100 text-lime-700' },
  stone:   { bg: 'bg-stone-50',   border: 'border-stone-200',   icon: 'text-stone-600',   badge: 'bg-stone-100 text-stone-700' },
}

const CAPACITY_OPTIONS = [
  { value: 'yes',          label: 'Has capacity' },
  { value: 'no',           label: 'Lacks capacity (best interest)' },
  { value: 'fluctuating',  label: 'Fluctuating capacity' },
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
  // photo consent purposes
  const [photoPurposes, setPhotoPurposes] = useState<string[]>([])

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
      if (key === 'photo_consent') {
        setPhotoPurposes((existing.notes || '').split(',').filter(Boolean))
      }
    } else {
      setForm({ ...EMPTY_FORM })
      setPhotoPurposes([])
    }
    setModalType(key)
  }

  const save = async () => {
    if (!modalType || !selectedSu) return
    setSaving(true)
    try {
      const payload = { ...form }
      if (modalType === 'photo_consent') {
        payload.consentGiven = photoPurposes.length > 0
        payload.notes = photoPurposes.join(',')
      }
      if (modalType === 'monthly_joint_care_plan_review') {
        payload.consentGiven = true
      }
      await api.post('/consents', {
        suId: selectedSu,
        homeId: user?.homeId,
        consentType: modalType,
        ...payload,
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
    if (key === 'monthly_joint_care_plan_review') return 'Acknowledged'
    if (key === 'photo_consent') {
      if (!c.consent_given) return 'No consent given'
      const purposes = (c.notes || '').split(',').filter(Boolean)
      return purposes.length ? `${purposes.length} purpose(s) selected` : 'Consent given'
    }
    if (key === 'information_sharing') {
      const v = c.notes
      if (v === 'consent_with_family') return 'Consent incl. family'
      if (v === 'consent_no_family') return 'Consent — no family'
      if (v === 'no_consent') return 'No consent given'
    }
    if (DECLARATION_KEYS.has(key)) return c.consent_given ? 'I Consent' : 'I Do Not Consent'
    if (c.has_capacity === 'no') return 'Best interest decision'
    if (c.has_capacity === 'fluctuating') return 'Fluctuating capacity'
    return c.consent_given ? 'Consent given' : 'Consent withheld'
  }

  const activeType = ALL_CONSENT_TYPES.find(t => t.key === modalType)
  const given = consents.filter(c => c.consent_given).length
  const total = ALL_CONSENT_TYPES.length

  const ConsentCard = ({ ct }: { ct: typeof ALL_CONSENT_TYPES[0] }) => {
    const c = getConsent(ct.key)
    const colors = COLOR_MAP[ct.color]
    const Icon = ct.icon
    return (
      <button
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
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c
            ? (c.consent_given ? 'bg-green-100 text-green-700' : c.has_capacity === 'no' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
            : 'bg-slate-100 text-slate-500'}`}>
            {statusText(ct.key)}
          </span>
          {c?.review_date && (
            <span className="text-xs text-slate-400">Review: {format(new Date(c.review_date), 'dd MMM yyyy')}</span>
          )}
        </div>
      </button>
    )
  }

  const DeclarationForm = ({ meta, type }: { meta: typeof DECLARATION_META[string]; type: string }) => {
    const textLines = meta.text.split('\n')

    if (type === 'photo_consent') {
      return (
        <>
          <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-fuchsia-900 mb-2">Declaration</p>
            {textLines.map((line, i) => (
              <p key={i} className="text-sm text-fuchsia-800 mb-1">{line}</p>
            ))}
          </div>
          <div>
            <label className="label">Consent given for (select all that apply):</label>
            <div className="space-y-2 mt-2">
              {PHOTO_PURPOSES.map(p => (
                <label key={p.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300"
                    checked={photoPurposes.includes(p.value)}
                    onChange={e => {
                      setPhotoPurposes(prev =>
                        e.target.checked ? [...prev, p.value] : prev.filter(v => v !== p.value)
                      )
                    }}
                  />
                  <span className="text-sm text-slate-700">{p.label}</span>
                </label>
              ))}
              <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-slate-200">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={photoPurposes.length === 0}
                  onChange={() => setPhotoPurposes([])}
                />
                <span className="text-sm text-red-600 font-medium">I Do Not give consent for any photographs of me to be taken, stored, or used by the service under any circumstances.</span>
              </label>
            </div>
          </div>
        </>
      )
    }

    if (type === 'information_sharing') {
      return (
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-indigo-900 mb-2">Declaration</p>
            {textLines.map((line, i) => (
              <p key={i} className="text-sm text-indigo-800 mb-1">{line || ' '}</p>
            ))}
          </div>
          <div>
            <label className="label">Select your information sharing preference:</label>
            <div className="space-y-2 mt-2">
              {INFO_SHARING_OPTIONS.map(o => (
                <label key={o.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="info_sharing"
                    className="mt-0.5"
                    checked={form.notes === o.value}
                    onChange={() => {
                      set('notes', o.value)
                      set('consentGiven', o.value !== 'no_consent')
                    }}
                  />
                  <span className="text-sm text-slate-700">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )
    }

    const bgColor = type === 'care_plan_support' ? 'bg-violet-50 border-violet-200'
      : type === 'monthly_joint_care_plan_review' ? 'bg-cyan-50 border-cyan-200'
      : 'bg-slate-50 border-slate-200'
    const textColor = type === 'care_plan_support' ? 'text-violet-900'
      : type === 'monthly_joint_care_plan_review' ? 'text-cyan-900'
      : 'text-slate-800'
    const headingColor = type === 'care_plan_support' ? 'text-violet-900'
      : type === 'monthly_joint_care_plan_review' ? 'text-cyan-900'
      : 'text-slate-900'

    return (
      <>
        <div className={`border rounded-lg p-4 ${bgColor}`}>
          <p className={`text-sm font-semibold mb-2 ${headingColor}`}>Declaration</p>
          {textLines.map((line, i) => (
            line.startsWith('•')
              ? <p key={i} className={`text-sm pl-3 mb-0.5 ${textColor}`}>{line}</p>
              : <p key={i} className={`text-sm mb-1 ${textColor}`}>{line || ' '}</p>
          ))}
        </div>

        {!meta.noChoice && (
          <div>
            <label className="label">Declaration</label>
            <div className="flex flex-col gap-2 mt-1">
              {[
                { v: true,  l: meta.consentLabel || 'I Consent' },
                { v: false, l: meta.noConsentLabel || 'I Do Not Consent' },
              ].map(o => (
                <button key={String(o.v)} type="button"
                  onClick={() => set('consentGiven', o.v)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${form.consentGiven === o.v
                    ? (o.v ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600')
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

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
            <p className="text-slate-500 text-sm">Record and manage consent for all care areas and agreements.</p>
          </div>
        </div>
        {sus.length > 1 && (
          <select className="input w-auto" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
            {sus.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress summary */}
      {selectedSu && !loading && (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-6 flex-wrap">
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
        <>
          {/* Section 1: Care Area Consents */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-3">Care Area Consents</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CARE_AREA_TYPES.map(ct => <ConsentCard key={ct.key} ct={ct} />)}
            </div>
          </div>

          {/* Section 2: Agreements & Declarations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-3">Agreements & Declarations</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DECLARATION_TYPES.map(ct => <ConsentCard key={ct.key} ct={ct} />)}
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {activeType && (
        <Modal
          open={!!modalType}
          onClose={() => setModalType(null)}
          title={activeType.label}
          size="lg">
          <div className="space-y-4">

            {DECLARATION_KEYS.has(modalType!) ? (
              // ── Declaration-style form ──────────────────────────────────
              <>
                <DeclarationForm
                  meta={DECLARATION_META[modalType!] || { text: activeType.description }}
                  type={modalType!}
                />

                {/* Comprehensive Care's signature */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Comprehensive Care's Signature</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Name" value={form.staffSignedBy}
                      onChange={e => set('staffSignedBy', e.target.value)}
                      placeholder="Staff member name" />
                    <Input label="Date signed" type="date" value={form.staffSignedDate}
                      onChange={e => set('staffSignedDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Comments</label>
                    <textarea className="input w-full" rows={2} value={form.capacityNotes}
                      onChange={e => set('capacityNotes', e.target.value)}
                      placeholder="Any comments from Comprehensive Care..." />
                  </div>
                </div>

                {/* Service User's signature */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Service User's Signature</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Name" value={form.suSignedBy}
                      onChange={e => set('suSignedBy', e.target.value)}
                      placeholder="Service user name" />
                    <Input label="Date signed" type="date" value={form.suSignedDate}
                      onChange={e => set('suSignedDate', e.target.value)} />
                  </div>
                  {modalType !== 'photo_consent' && modalType !== 'information_sharing' && (
                    <div>
                      <label className="label">Comments</label>
                      <textarea className="input w-full" rows={2} value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Any comments from the service user..." />
                    </div>
                  )}
                </div>
              </>
            ) : (
              // ── Clinical capacity-based form ────────────────────────────
              <>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{activeType.description}</p>

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
              </>
            )}

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
