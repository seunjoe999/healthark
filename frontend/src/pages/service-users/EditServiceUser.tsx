import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { suApi } from '../../api'
import api from '../../api'
import { Button, Input, Select, Toggle, Card, SectionHeading, Spinner } from '../../components/ui'
import { ArrowLeft, Save, Plus, Trash2, Phone, Mail, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]
const PRONOUNS = [{ value: 'he/him', label: 'He/Him' }, { value: 'she/her', label: 'She/Her' }, { value: 'they/them', label: 'They/Them' }, { value: 'other', label: 'Other' }]
const STATUSES = [{ value: 'live', label: 'Live' }, { value: 'pre_admission', label: 'Pre-admission' }, { value: 'on_hold', label: 'On hold' }, { value: 'hospital', label: 'Hospital' }, { value: 'archive', label: 'Archive' }]
const EMERGENCY = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
const RELIGIONS = [{ value: 'christian', label: 'Christian' }, { value: 'muslim', label: 'Muslim' }, { value: 'hindu', label: 'Hindu' }, { value: 'jewish', label: 'Jewish' }, { value: 'sikh', label: 'Sikh' }, { value: 'buddhist', label: 'Buddhist' }, { value: 'no_religion', label: 'No religion' }, { value: 'other', label: 'Other' }]
const ETHNICITY = [{ value: 'white_british', label: 'White British' }, { value: 'white_irish', label: 'White Irish' }, { value: 'white_other', label: 'White Other' }, { value: 'mixed_white_black_caribbean', label: 'Mixed - White & Black Caribbean' }, { value: 'mixed_white_black_african', label: 'Mixed - White & Black African' }, { value: 'mixed_white_asian', label: 'Mixed - White & Asian' }, { value: 'asian_indian', label: 'Asian - Indian' }, { value: 'asian_pakistani', label: 'Asian - Pakistani' }, { value: 'asian_bangladeshi', label: 'Asian - Bangladeshi' }, { value: 'asian_chinese', label: 'Asian - Chinese' }, { value: 'asian_other', label: 'Asian - Other' }, { value: 'black_african', label: 'Black - African' }, { value: 'black_caribbean', label: 'Black - Caribbean' }, { value: 'black_other', label: 'Black - Other' }, { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]
const MARITAL = [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'civil_partnership', label: 'Civil partnership' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }, { value: 'separated', label: 'Separated' }]
const FLUID_CONSISTENCY = [{ value: 'normal', label: 'Normal' }, { value: 'slightly_thick', label: 'Slightly thick' }, { value: 'mildly_thick', label: 'Mildly thick' }, { value: 'moderately_thick', label: 'Moderately thick' }, { value: 'extremely_thick', label: 'Extremely thick' }]
const SEXUALITY_OPTIONS = [{ value: 'heterosexual', label: 'Heterosexual / Straight' }, { value: 'gay', label: 'Gay / Lesbian' }, { value: 'bisexual', label: 'Bisexual' }, { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]
const MCA_OPTIONS = [{ value: 'has_capacity', label: 'Has Capacity' }, { value: 'lacks_capacity', label: 'Lacks Capacity' }, { value: 'fluctuating', label: 'Fluctuating Capacity' }]
const BATH_FREQ = [{ value: 'daily', label: 'Daily' }, { value: 'twice_weekly', label: 'Twice Weekly' }, { value: 'three_weekly', label: 'Three Times a Week' }, { value: 'weekly', label: 'Weekly' }, { value: 'as_needed', label: 'As Needed' }]
const BATH_TIME_OPT = [{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }, { value: 'evening', label: 'Evening' }, { value: 'flexible', label: 'Flexible' }]
const BATH_TYPE_OPT = [{ value: 'shower', label: 'Shower' }, { value: 'bath', label: 'Bath' }, { value: 'bed_bath', label: 'Bed Bath' }, { value: 'strip_wash', label: 'Strip Wash' }, { value: 'no_preference', label: 'No Preference' }]
const MEAL_FREQ = [{ value: 'three_daily', label: '3 meals per day' }, { value: 'small_frequent', label: 'Small frequent meals' }, { value: 'two_daily', label: '2 meals per day' }]
const CONTACT_TAGS = [{ value: 'gp', label: 'GP' }, { value: 'next_of_kin', label: 'Next of Kin' }, { value: 'social_worker', label: 'Social Worker' }, { value: 'advocate', label: 'Advocate' }, { value: 'lpa', label: 'LPA / Attorney' }, { value: 'community_nurse', label: 'Community Nurse' }, { value: 'dentist', label: 'Dentist' }, { value: 'optician', label: 'Optician' }, { value: 'other', label: 'Other' }]

function nd(v: any) { return v && String(v).trim() ? String(v).trim() : null }

function normalise(su: any) {
  return {
    firstName: su.first_name || su.firstName || '',
    lastName: su.last_name || su.lastName || '',
    preferredName: su.preferred_name || su.preferredName || '',
    dateOfBirth: su.date_of_birth?.split?.('T')[0] || su.dateOfBirth || '',
    gender: su.gender || '',
    pronouns: su.pronouns || '',
    genderAtBirth: su.gender_at_birth || '',
    sexuality: su.sexuality || '',
    status: su.status || 'live',
    emergencyRating: su.emergency_rating || su.emergencyRating || 'low',
    roomNumber: su.room_number || '',
    carePlanLiveDate: su.care_plan_live_date?.split?.('T')[0] || '',
    nhsNumber: su.nhs_number || su.nhsNumber || '',
    niNumber: su.ni_number || su.niNumber || '',
    banding: su.banding || '',
    personId: su.person_id || '',
    dnar: su.dnar ?? null,
    dnarFormUrl: su.dnar_form_url || su.dnarFormUrl || '',
    admissionDate: su.admission_date?.split?.('T')[0] || su.admissionDate || '',
    localAuthority: su.local_authority || su.localAuthority || '',
    religion: su.religion || '',
    ethnicity: su.ethnicity || '',
    maritalStatus: su.marital_status || su.maritalStatus || '',
    commsPrefs: su.comms_prefs || su.commsPrefs || '',
    address1: su.address1 || '',
    address2: su.address2 || '',
    postcode: su.postcode || '',
    phone: su.phone || '',
    email: su.email || '',
    needToKnow: su.need_to_know || su.needToKnow || '',
    myInstructions: su.my_instructions || su.myInstructions || '',
    heightCm: su.height_cm || su.heightCm || '',
    weightKg: su.weight_kg || su.weightKg || '',
    medicalHistory: su.medical_history || su.medicalHistory || '',
    medAllergies: su.med_allergies || su.medAllergies || '',
    requiresOxygen: su.requires_oxygen || su.requiresOxygen || false,
    hasCatheter: su.has_catheter || su.hasCatheter || false,
    hasPeg: su.has_peg || su.hasPeg || false,
    teamInvolvement: su.team_involvement || '',
    mcaCapacity: su.mca_capacity || '',
    dolsActive: su.dols_active || false,
    dolsStartDate: su.dols_start_date?.split?.('T')[0] || '',
    dolsEndDate: su.dols_end_date?.split?.('T')[0] || '',
    dolsNotes: su.dols_notes || '',
    cqcInformed: su.cqc_informed || false,
    hasLpa: su.has_lpa || false,
    lpaType: su.lpa_type || '',
    lpaAttorney: su.lpa_attorney || '',
    hasCopOrder: su.has_cop_order || false,
    copDetails: su.cop_details || '',
    foodAllergies: su.food_allergies || su.foodAllergies || '',
    nilByMouth: su.nil_by_mouth || su.nilByMouth || false,
    specialDiet: su.special_diet || su.specialDiet || '',
    fluidConsistency: su.fluid_consistency || su.fluidConsistency || '',
    minFluidMl: su.min_fluid_ml || su.minFluidMl || 1500,
    dietInstructions: su.diet_instructions || su.dietInstructions || '',
    mealFrequency: su.meal_frequency || '',
    eatDirections: su.eat_directions || '',
    eatTeamPreference: su.eat_team_preference || '',
    bathFrequency: su.bath_frequency || '',
    bathPreferredTime: su.bath_preferred_time || '',
    bathTeamSupport: su.bath_team_support || '',
    bathTypePref: su.bath_type_pref || '',
    bathDirections: su.bath_directions || '',
    bathPreferredProducts: su.bath_preferred_products || '',
    lifeHistory: su.life_history || su.lifeHistory || '',
    hobbies: su.hobbies || '',
    dailyRoutine: su.daily_routine || su.dailyRoutine || '',
    funeralNoted: su.funeral_noted || false,
    funeralDetails: su.funeral_details || '',
    funeralDirector: su.funeral_director || '',
  }
}

const emptyContact = { fullName: '', relationship: '', contactTag: '', phonePrimary: '', phoneSecondary: '', phoneHome: '', email: '', isPrimary: false, notes: '' }

export default function EditServiceUser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  const [contacts, setContacts] = useState<any[]>([])
  const [contactForm, setContactForm] = useState<any>(emptyContact)
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [savingContact, setSavingContact] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      suApi.get(id),
      api.get(`/service-users/${id}/contacts`),
    ]).then(([suRes, contactsRes]) => {
      setForm(normalise(suRes.data.data))
      setContacts(contactsRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))
  const setC = (k: string, v: any) => setContactForm((p: any) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!id || !form) return
    setSaving(true)
    try {
      await suApi.update(id, form)
      toast.success('Profile updated')
      navigate(`/service-users/${id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const saveContact = async () => {
    if (!id) return
    setSavingContact(true)
    try {
      if (editingContact) {
        await api.put(`/service-users/${id}/contacts/${editingContact}`, contactForm)
        toast.success('Contact updated')
      } else {
        await api.post(`/service-users/${id}/contacts`, contactForm)
        toast.success('Contact added')
      }
      const res = await api.get(`/service-users/${id}/contacts`)
      setContacts(res.data.data || [])
      setContactForm(emptyContact)
      setEditingContact(null)
      setShowContactForm(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save contact')
    } finally { setSavingContact(false) }
  }

  const deleteContact = async (contactId: string) => {
    if (!id || !confirm('Delete this contact?')) return
    try {
      await api.delete(`/service-users/${id}/contacts/${contactId}`)
      setContacts(c => c.filter(x => x.id !== contactId))
      toast.success('Contact removed')
    } catch { toast.error('Failed to delete') }
  }

  const startEditContact = (c: any) => {
    setContactForm({ fullName: c.full_name || '', relationship: c.relationship || '', contactTag: c.contact_tag || '', phonePrimary: c.phone_primary || '', phoneSecondary: c.phone_secondary || '', phoneHome: c.phone_home || '', email: c.email || '', isPrimary: c.is_primary || false, notes: c.notes || '' })
    setEditingContact(c.id)
    setShowContactForm(true)
  }

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!form) return <div className="p-8 text-slate-400">Resident not found</div>

  const sections = [
    { key: 'personal', label: 'Personal' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'admission', label: 'Admission' },
    { key: 'health', label: 'Health' },
    { key: 'best_interest', label: 'Best Interest' },
    { key: 'dietary', label: 'Dietary' },
    { key: 'eating', label: 'Eating & Drinking' },
    { key: 'bath', label: 'Bath Routine' },
    { key: 'background', label: 'About Me' },
    { key: 'funeral', label: 'Funeral' },
    { key: 'safety', label: 'Safety' },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/service-users/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save} variant="gold">Save changes</Button>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Edit Service User</h1>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: '#1a1a1a' }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={clsx('py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all', activeSection === s.key ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={activeSection === s.key ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── PERSONAL ─────────────────────────────────────────────────── */}
      {activeSection === 'personal' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Personal Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            <Input label="Preferred name" value={form.preferredName} onChange={e => set('preferredName', e.target.value)} placeholder="What they like to be called" />
            <Input label="Date of birth *" type="date" required value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)} options={GENDERS} placeholder="Select gender" />
            <Select label="Gender at birth" value={form.genderAtBirth} onChange={e => set('genderAtBirth', e.target.value)} options={GENDERS} placeholder="Select gender at birth" />
            <Select label="Pronouns" value={form.pronouns} onChange={e => set('pronouns', e.target.value)} options={PRONOUNS} placeholder="Select pronouns" />
            <Select label="Sexuality" value={form.sexuality} onChange={e => set('sexuality', e.target.value)} options={SEXUALITY_OPTIONS} placeholder="Prefer not to say" />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={STATUSES} />
            <Select label="Emergency rating" value={form.emergencyRating} onChange={e => set('emergencyRating', e.target.value)} options={EMERGENCY} />
            <Input label="Room number" value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} placeholder="e.g. Room 4" />
            <Input label="Care plan last went live" type="date" value={form.carePlanLiveDate} onChange={e => set('carePlanLiveDate', e.target.value)} />
            <Input label="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Address line 1" value={form.address1} onChange={e => set('address1', e.target.value)} className="md:col-span-2" />
            <Input label="Address line 2" value={form.address2} onChange={e => set('address2', e.target.value)} />
            <Input label="Postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
          </div>
        </div>
      )}

      {/* ── CONTACTS ─────────────────────────────────────────────────── */}
      {activeSection === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Important Contacts</h2>
            <Button variant="gold" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setContactForm(emptyContact); setEditingContact(null); setShowContactForm(true) }}>
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 && !showContactForm && (
            <div className="card p-8 text-center text-slate-400 text-sm">No contacts added yet.</div>
          )}

          {contacts.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    {c.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{c.full_name}</p>
                      {c.contact_tag && <span className="badge badge-info text-xs capitalize">{c.contact_tag.replace(/_/g, ' ')}</span>}
                      {c.is_primary && <span className="badge badge-success text-xs">Emergency Contact</span>}
                    </div>
                    {c.relationship && <p className="text-xs text-slate-400 mt-0.5">{c.relationship}</p>}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                      {c.phone_primary && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone_primary}</span>}
                      {c.phone_secondary && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {c.phone_secondary}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-slate-500 mt-1">{c.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEditContact(c)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Edit</button>
                  <button onClick={() => deleteContact(c.id)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}

          {showContactForm && (
            <div className="card p-5 border-amber-500/30">
              <h3 className="font-bold text-white mb-4 text-sm">{editingContact ? 'Edit Contact' : 'New Contact'}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Full name *" value={contactForm.fullName} onChange={e => setC('fullName', e.target.value)} />
                <Select label="Type / Tag" options={CONTACT_TAGS} value={contactForm.contactTag} onChange={e => setC('contactTag', e.target.value)} placeholder="Select type..." />
                <Input label="Relationship" value={contactForm.relationship} onChange={e => setC('relationship', e.target.value)} placeholder="e.g. Daughter, GP, Social Worker" />
                <Input label="Mobile / Primary phone" value={contactForm.phonePrimary} onChange={e => setC('phonePrimary', e.target.value)} />
                <Input label="Work / Secondary phone" value={contactForm.phoneSecondary} onChange={e => setC('phoneSecondary', e.target.value)} />
                <Input label="Email" type="email" value={contactForm.email} onChange={e => setC('email', e.target.value)} />
              </div>
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={contactForm.isPrimary} onChange={e => setC('isPrimary', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-300">Emergency contact</span>
                </label>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-400 block mb-1">Notes</label>
                <textarea className="input" rows={2} value={contactForm.notes} onChange={e => setC('notes', e.target.value)} placeholder="Additional notes..." />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" size="sm" onClick={() => { setShowContactForm(false); setEditingContact(null); setContactForm(emptyContact) }}>Cancel</Button>
                <Button variant="gold" size="sm" loading={savingContact} onClick={saveContact}>Save Contact</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADMISSION ────────────────────────────────────────────────── */}
      {activeSection === 'admission' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Admission Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="NHS number" value={form.nhsNumber} onChange={e => set('nhsNumber', e.target.value)} />
            <Input label="NI number" value={form.niNumber} onChange={e => set('niNumber', e.target.value)} />
            <Input label="Person ID (Local Authority)" value={form.personId} onChange={e => set('personId', e.target.value)} placeholder="Authority reference number" />
            <Input label="Funding banding" value={form.banding} onChange={e => set('banding', e.target.value)} placeholder="e.g. Band 3, Standard, Enhanced" />
            <Input label="Admission date" type="date" value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} />
            <Input label="Local authority" value={form.localAuthority} onChange={e => set('localAuthority', e.target.value)} />
            <Select label="Religion / faith" value={form.religion} onChange={e => set('religion', e.target.value)} options={RELIGIONS} placeholder="Select religion" />
            <Select label="Ethnicity" value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} options={ETHNICITY} placeholder="Select ethnicity" />
            <Select label="Marital status" value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} options={MARITAL} placeholder="Select status" />
            <Input label="Communication preferences" value={form.commsPrefs} onChange={e => set('commsPrefs', e.target.value)} placeholder="e.g. Verbal, Makaton, PECS..." />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-400 block">DNAR status</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => set('dnar', false)}
                className={clsx('flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors', form.dnar === false ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-slate-400')}>
                Resuscitate (CPR)
              </button>
              <button type="button" onClick={() => set('dnar', true)}
                className={clsx('flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors', form.dnar === true ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-white/10 text-slate-400')}>
                ✗ Do Not Resuscitate
              </button>
            </div>
            {form.dnar === true && (
              <Input label="DNAR form URL" value={form.dnarFormUrl} onChange={e => set('dnarFormUrl', e.target.value)} placeholder="Link to DNAR form..." />
            )}
          </div>
        </div>
      )}

      {/* ── HEALTH ───────────────────────────────────────────────────── */}
      {activeSection === 'health' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Health Information</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="Height (cm)" type="number" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} placeholder="e.g. 165" />
            <Input label="Weight (kg)" type="number" step="0.1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="e.g. 65.0" />
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">BMI (auto)</label>
              <div className="input text-slate-400">
                {form.heightCm && form.weightKg ? (parseFloat(form.weightKg) / Math.pow(parseFloat(form.heightCm) / 100, 2)).toFixed(1) : '—'}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Toggle label="Requires oxygen" checked={form.requiresOxygen} onChange={v => set('requiresOxygen', v)} />
            <Toggle label="Has catheter" checked={form.hasCatheter} onChange={v => set('hasCatheter', v)} />
            <Toggle label="Has PEG tube" checked={form.hasPeg} onChange={v => set('hasPeg', v)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Team involvement</label>
            <textarea className="input" rows={3} value={form.teamInvolvement} onChange={e => set('teamInvolvement', e.target.value)} placeholder="e.g. Community nurse, physiotherapist, CMHT team, district nurse..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Medical history</label>
            <textarea className="input" rows={4} value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} placeholder="Diagnoses, conditions, medical background..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Medication allergies</label>
            <textarea className="input" rows={2} value={form.medAllergies} onChange={e => set('medAllergies', e.target.value)} placeholder="List any known medication allergies..." />
          </div>
        </div>
      )}

      {/* ── BEST INTEREST ────────────────────────────────────────────── */}
      {activeSection === 'best_interest' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Best Interest & Legal</h2>
          <Select label="Mental Capacity Assessment (MCA)" value={form.mcaCapacity} onChange={e => set('mcaCapacity', e.target.value)} options={MCA_OPTIONS} placeholder="Select capacity status..." />
          <div className="p-4 rounded-xl space-y-4" style={{ background: '#1a1a1a' }}>
            <h3 className="text-sm font-bold text-white">Deprivation of Liberty Safeguards (DoLS)</h3>
            <Toggle label="DoLS currently active" checked={form.dolsActive} onChange={v => set('dolsActive', v)} />
            {form.dolsActive && (
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="DoLS start date" type="date" value={form.dolsStartDate} onChange={e => set('dolsStartDate', e.target.value)} />
                <Input label="DoLS end date" type="date" value={form.dolsEndDate} onChange={e => set('dolsEndDate', e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">DoLS notes</label>
              <textarea className="input" rows={2} value={form.dolsNotes} onChange={e => set('dolsNotes', e.target.value)} placeholder="Conditions, restrictions, relevant details..." />
            </div>
            <Toggle label="CQC informed of DoLS" checked={form.cqcInformed} onChange={v => set('cqcInformed', v)} />
          </div>
          <div className="p-4 rounded-xl space-y-4" style={{ background: '#1a1a1a' }}>
            <h3 className="text-sm font-bold text-white">Lasting Power of Attorney (LPA)</h3>
            <Toggle label="LPA in place" checked={form.hasLpa} onChange={v => set('hasLpa', v)} />
            {form.hasLpa && (
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="LPA type" value={form.lpaType} onChange={e => set('lpaType', e.target.value)} placeholder="e.g. Property & Finance, Health & Welfare" />
                <Input label="Attorney name" value={form.lpaAttorney} onChange={e => set('lpaAttorney', e.target.value)} placeholder="Attorney's full name" />
              </div>
            )}
          </div>
          <div className="p-4 rounded-xl space-y-4" style={{ background: '#1a1a1a' }}>
            <h3 className="text-sm font-bold text-white">Court of Protection (CoP)</h3>
            <Toggle label="CoP order in place" checked={form.hasCopOrder} onChange={v => set('hasCopOrder', v)} />
            {form.hasCopOrder && (
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">CoP details</label>
                <textarea className="input" rows={2} value={form.copDetails} onChange={e => set('copDetails', e.target.value)} placeholder="Order details, appointed deputy..." />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DIETARY ──────────────────────────────────────────────────── */}
      {activeSection === 'dietary' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Dietary Requirements</h2>
          <Toggle label="Nil by mouth" checked={form.nilByMouth} onChange={v => set('nilByMouth', v)} />
          <Input label="Minimum daily fluid intake (ml)" type="number" value={form.minFluidMl} onChange={e => set('minFluidMl', parseInt(e.target.value))} />
          <Input label="Food allergies" value={form.foodAllergies} onChange={e => set('foodAllergies', e.target.value)} placeholder="List any food allergies..." />
          <Select label="Fluid / drink consistency" value={form.fluidConsistency} onChange={e => set('fluidConsistency', e.target.value)} options={FLUID_CONSISTENCY} placeholder="Normal (no thickening)" />
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Special diet</label>
            <textarea className="input" rows={2} value={form.specialDiet} onChange={e => set('specialDiet', e.target.value)} placeholder="e.g. Diabetic diet, soft food, pureed..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Dietary instructions for staff</label>
            <textarea className="input" rows={3} value={form.dietInstructions} onChange={e => set('dietInstructions', e.target.value)} placeholder="Specific instructions staff should follow..." />
          </div>
        </div>
      )}

      {/* ── EATING & DRINKING ─────────────────────────────────────────── */}
      {activeSection === 'eating' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Eating & Drinking Need</h2>
          <Select label="Meal frequency" value={form.mealFrequency} onChange={e => set('mealFrequency', e.target.value)} options={MEAL_FREQ} placeholder="Select frequency..." />
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Directions for mealtimes</label>
            <textarea className="input" rows={4} value={form.eatDirections} onChange={e => set('eatDirections', e.target.value)} placeholder="How should staff support this person at mealtimes? Positioning, prompting, adaptive equipment, pace of eating..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Team / staff preference</label>
            <textarea className="input" rows={2} value={form.eatTeamPreference} onChange={e => set('eatTeamPreference', e.target.value)} placeholder="Any preferences for who supports at mealtimes, preferred approach..." />
          </div>
        </div>
      )}

      {/* ── BATH ROUTINE ─────────────────────────────────────────────── */}
      {activeSection === 'bath' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Bath / Shower Routine</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Select label="Bath / shower frequency" value={form.bathFrequency} onChange={e => set('bathFrequency', e.target.value)} options={BATH_FREQ} placeholder="Select frequency..." />
            <Select label="Preferred time" value={form.bathPreferredTime} onChange={e => set('bathPreferredTime', e.target.value)} options={BATH_TIME_OPT} placeholder="Select time..." />
            <Select label="Bath type preference" value={form.bathTypePref} onChange={e => set('bathTypePref', e.target.value)} options={BATH_TYPE_OPT} placeholder="Select type..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Directions for staff</label>
            <textarea className="input" rows={4} value={form.bathDirections} onChange={e => set('bathDirections', e.target.value)} placeholder="How should staff support bathing? Hoisting, preferred temperature, special considerations..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Team support notes</label>
            <textarea className="input" rows={2} value={form.bathTeamSupport} onChange={e => set('bathTeamSupport', e.target.value)} placeholder="Number of staff required, any 2-person assist..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Preferred products</label>
            <textarea className="input" rows={2} value={form.bathPreferredProducts} onChange={e => set('bathPreferredProducts', e.target.value)} placeholder="Preferred soap, shampoo, moisturiser, skin products..." />
          </div>
        </div>
      )}

      {/* ── ABOUT ME ─────────────────────────────────────────────────── */}
      {activeSection === 'background' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">About Me</h2>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Life history</label>
            <textarea className="input" rows={6} value={form.lifeHistory} onChange={e => set('lifeHistory', e.target.value)} placeholder="Background, family, career, important life events, places they've lived..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Hobbies & interests</label>
            <textarea className="input" rows={3} value={form.hobbies} onChange={e => set('hobbies', e.target.value)} placeholder="Things I enjoy doing, music, TV, activities..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Daily routine</label>
            <textarea className="input" rows={4} value={form.dailyRoutine} onChange={e => set('dailyRoutine', e.target.value)} placeholder="Typical day, wake/sleep times, preferences, routines..." />
          </div>
        </div>
      )}

      {/* ── FUNERAL ──────────────────────────────────────────────────── */}
      {activeSection === 'funeral' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Funeral Arrangements</h2>
          <Toggle label="Funeral wishes noted" checked={form.funeralNoted} onChange={v => set('funeralNoted', v)} />
          <Input label="Funeral director" value={form.funeralDirector} onChange={e => set('funeralDirector', e.target.value)} placeholder="Name of funeral director / company" />
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Funeral details / wishes</label>
            <textarea className="input" rows={4} value={form.funeralDetails} onChange={e => set('funeralDetails', e.target.value)} placeholder="Burial or cremation preference, religious wishes, specific requests..." />
          </div>
        </div>
      )}

      {/* ── SAFETY ───────────────────────────────────────────────────── */}
      {activeSection === 'safety' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">Safety & Care Flags</h2>
          <p className="text-xs text-slate-400">Important information displayed prominently to staff on this person's profile.</p>
          <div>
            <label className="text-xs font-medium text-amber-400 block mb-1.5">⚠ Need to know</label>
            <textarea className="input" rows={3} value={form.needToKnow} onChange={e => set('needToKnow', e.target.value)}
              placeholder="Critical information staff must know before supporting this person. This appears as a warning banner on their profile." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">My instructions</label>
            <textarea className="input" rows={3} value={form.myInstructions} onChange={e => set('myInstructions', e.target.value)}
              placeholder="Things I want staff to know about me and how I like to be supported..." />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Link to={`/service-users/${id}`}>
          <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button>
        </Link>
        <Button variant="gold" icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save all changes</Button>
      </div>
    </div>
  )
}
