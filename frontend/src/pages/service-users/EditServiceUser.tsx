import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { suApi } from '../../api'
import { Button, Input, Select, Toggle, Card, SectionHeading, Spinner } from '../../components/ui'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]
const PRONOUNS = [{ value: 'he/him', label: 'He/Him' }, { value: 'she/her', label: 'She/Her' }, { value: 'they/them', label: 'They/Them' }, { value: 'other', label: 'Other' }]
const STATUSES = [{ value: 'live', label: 'Live' }, { value: 'pre_admission', label: 'Pre-admission' }, { value: 'on_hold', label: 'On hold' }, { value: 'hospital', label: 'Hospital' }, { value: 'archive', label: 'Archive' }]
const EMERGENCY = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
const RELIGIONS = [{ value: 'christian', label: 'Christian' }, { value: 'muslim', label: 'Muslim' }, { value: 'hindu', label: 'Hindu' }, { value: 'jewish', label: 'Jewish' }, { value: 'sikh', label: 'Sikh' }, { value: 'buddhist', label: 'Buddhist' }, { value: 'no_religion', label: 'No religion' }, { value: 'other', label: 'Other' }]
const ETHNICITY = [{ value: 'white_british', label: 'White British' }, { value: 'white_irish', label: 'White Irish' }, { value: 'white_other', label: 'White Other' }, { value: 'mixed_white_black_caribbean', label: 'Mixed - White & Black Caribbean' }, { value: 'mixed_white_black_african', label: 'Mixed - White & Black African' }, { value: 'mixed_white_asian', label: 'Mixed - White & Asian' }, { value: 'asian_indian', label: 'Asian - Indian' }, { value: 'asian_pakistani', label: 'Asian - Pakistani' }, { value: 'asian_bangladeshi', label: 'Asian - Bangladeshi' }, { value: 'asian_chinese', label: 'Asian - Chinese' }, { value: 'asian_other', label: 'Asian - Other' }, { value: 'black_african', label: 'Black - African' }, { value: 'black_caribbean', label: 'Black - Caribbean' }, { value: 'black_other', label: 'Black - Other' }, { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]
const MARITAL = [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'civil_partnership', label: 'Civil partnership' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }, { value: 'separated', label: 'Separated' }]
const FLUID_CONSISTENCY = [{ value: 'normal', label: 'Normal' }, { value: 'slightly_thick', label: 'Slightly thick' }, { value: 'mildly_thick', label: 'Mildly thick' }, { value: 'moderately_thick', label: 'Moderately thick' }, { value: 'extremely_thick', label: 'Extremely thick' }]

function normalise(su: any) {
  return {
    firstName: su.first_name || su.firstName || '',
    lastName: su.last_name || su.lastName || '',
    preferredName: su.preferred_name || su.preferredName || '',
    dateOfBirth: su.date_of_birth || su.dateOfBirth || '',
    gender: su.gender || '',
    pronouns: su.pronouns || '',
    status: su.status || 'live',
    emergencyRating: su.emergency_rating || su.emergencyRating || 'low',
    nhsNumber: su.nhs_number || su.nhsNumber || '',
    niNumber: su.ni_number || su.niNumber || '',
    dnar: su.dnar ?? null,
    dnarFormUrl: su.dnar_form_url || su.dnarFormUrl || '',
    admissionDate: su.admission_date || su.admissionDate || '',
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
    foodAllergies: su.food_allergies || su.foodAllergies || '',
    nilByMouth: su.nil_by_mouth || su.nilByMouth || false,
    specialDiet: su.special_diet || su.specialDiet || '',
    fluidConsistency: su.fluid_consistency || su.fluidConsistency || '',
    minFluidMl: su.min_fluid_ml || su.minFluidMl || 1500,
    dietInstructions: su.diet_instructions || su.dietInstructions || '',
    lifeHistory: su.life_history || su.lifeHistory || '',
    hobbies: su.hobbies || '',
    dailyRoutine: su.daily_routine || su.dailyRoutine || '',
  }
}

export default function EditServiceUser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')

  useEffect(() => {
    if (!id) return
    suApi.get(id).then(res => {
      setForm(normalise(res.data.data))
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

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

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!form) return <div className="p-8">Resident not found</div>

  const sections = [
    { key: 'personal', label: 'Personal' },
    { key: 'admission', label: 'Admission' },
    { key: 'health', label: 'Health' },
    { key: 'dietary', label: 'Dietary' },
    { key: 'background', label: 'Background' },
    { key: 'safety', label: 'Safety flags' },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/service-users/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save changes</Button>
      </div>

      <h1 className="font-display text-2xl text-slate-900 mb-6">Edit resident profile</h1>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-card p-1 mb-6 overflow-x-auto">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeSection === s.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'personal' && (
        <Card>
          <SectionHeading title="Personal details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            <Input label="Preferred name" value={form.preferredName} onChange={e => set('preferredName', e.target.value)} placeholder="What they like to be called" />
            <Input label="Date of birth *" type="date" required value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)} options={GENDERS} placeholder="Select gender" />
            <Select label="Pronouns" value={form.pronouns} onChange={e => set('pronouns', e.target.value)} options={PRONOUNS} placeholder="Select pronouns" />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={STATUSES} />
            <Select label="Emergency rating" value={form.emergencyRating} onChange={e => set('emergencyRating', e.target.value)} options={EMERGENCY} />
            <Input label="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Address line 1" value={form.address1} onChange={e => set('address1', e.target.value)} className="md:col-span-2" />
            <Input label="Address line 2" value={form.address2} onChange={e => set('address2', e.target.value)} />
            <div>
              <Input label="Postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} hint="Saving this automatically sets the clock-in geofence for this address" />
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'admission' && (
        <Card>
          <SectionHeading title="Admission details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="NHS number" value={form.nhsNumber} onChange={e => set('nhsNumber', e.target.value)} />
            <Input label="NI number" value={form.niNumber} onChange={e => set('niNumber', e.target.value)} />
            <Input label="Admission date" type="date" value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} />
            <Input label="Local authority" value={form.localAuthority} onChange={e => set('localAuthority', e.target.value)} />
            <Select label="Religion / faith" value={form.religion} onChange={e => set('religion', e.target.value)} options={RELIGIONS} placeholder="Select religion" />
            <Select label="Ethnicity" value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} options={ETHNICITY} placeholder="Select ethnicity" />
            <Select label="Marital status" value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} options={MARITAL} placeholder="Select status" />
            <Input label="Communication preferences" value={form.commsPrefs} onChange={e => set('commsPrefs', e.target.value)} placeholder="e.g. Verbal, Makaton, PECS..." />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">DNAR status</label>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => set('dnar', false)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.dnar === false ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                  ✓ Resuscitate (CPR)
                </button>
                <button type="button" onClick={() => set('dnar', true)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.dnar === true ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>
                  ✗ Do Not Resuscitate
                </button>
              </div>
            </div>
            {form.dnar === true && (
              <Input label="DNAR form URL" value={form.dnarFormUrl} onChange={e => set('dnarFormUrl', e.target.value)} placeholder="Link to DNAR form..." />
            )}
          </div>
        </Card>
      )}

      {activeSection === 'health' && (
        <Card>
          <SectionHeading title="Health information" />
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Input label="Height (cm)" type="number" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} placeholder="e.g. 165" />
            <Input label="Weight (kg)" type="number" step="0.1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="e.g. 65.0" />
            <div>
              <label className="label">BMI (auto)</label>
              <div className="input bg-slate-50 text-slate-500">
                {form.heightCm && form.weightKg
                  ? (parseFloat(form.weightKg) / Math.pow(parseFloat(form.heightCm) / 100, 2)).toFixed(1)
                  : '—'}
              </div>
            </div>
          </div>
          <div className="space-y-4 mb-6">
            <Toggle label="Requires oxygen" checked={form.requiresOxygen} onChange={v => set('requiresOxygen', v)} />
            <Toggle label="Has catheter" checked={form.hasCatheter} onChange={v => set('hasCatheter', v)} />
            <Toggle label="Has PEG tube" checked={form.hasPeg} onChange={v => set('hasPeg', v)} />
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Medical history</label>
              <textarea className="input" rows={4} value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} placeholder="Diagnoses, conditions, medical background..." />
            </div>
            <div>
              <label className="label">Medication allergies</label>
              <textarea className="input" rows={2} value={form.medAllergies} onChange={e => set('medAllergies', e.target.value)} placeholder="List any known medication allergies..." />
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'dietary' && (
        <Card>
          <SectionHeading title="Dietary requirements" />
          <div className="space-y-5">
            <Toggle label="Nil by mouth" checked={form.nilByMouth} onChange={v => set('nilByMouth', v)} danger description="Do not give food or drinks" />
            <Input label="Minimum daily fluid intake (ml)" type="number" value={form.minFluidMl} onChange={e => set('minFluidMl', parseInt(e.target.value))} hint="Recommended: 1500ml" />
            <Input label="Food allergies" value={form.foodAllergies} onChange={e => set('foodAllergies', e.target.value)} placeholder="List any food allergies..." />
            <Select label="Fluid / drink consistency" value={form.fluidConsistency} onChange={e => set('fluidConsistency', e.target.value)} options={FLUID_CONSISTENCY} placeholder="Normal (no thickening)" />
            <div>
              <label className="label">Special diet</label>
              <textarea className="input" rows={2} value={form.specialDiet} onChange={e => set('specialDiet', e.target.value)} placeholder="e.g. Diabetic diet, soft food, pureed..." />
            </div>
            <div>
              <label className="label">Dietary instructions for staff</label>
              <textarea className="input" rows={3} value={form.dietInstructions} onChange={e => set('dietInstructions', e.target.value)} placeholder="Specific instructions staff should follow when supporting meals..." />
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'background' && (
        <Card>
          <SectionHeading title="About me" />
          <div className="space-y-4">
            <div>
              <label className="label">Life history</label>
              <textarea className="input" rows={5} value={form.lifeHistory} onChange={e => set('lifeHistory', e.target.value)} placeholder="Background, family, career, important life events..." />
            </div>
            <div>
              <label className="label">Hobbies & interests</label>
              <textarea className="input" rows={3} value={form.hobbies} onChange={e => set('hobbies', e.target.value)} placeholder="Things I enjoy doing..." />
            </div>
            <div>
              <label className="label">Daily routine</label>
              <textarea className="input" rows={3} value={form.dailyRoutine} onChange={e => set('dailyRoutine', e.target.value)} placeholder="Typical day, preferences, routines..." />
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'safety' && (
        <Card>
          <SectionHeading title="Safety & care flags" description="Important information staff must know" />
          <div className="space-y-4">
            <div>
              <label className="label">Need to know ⚠</label>
              <textarea className="input" rows={3} value={form.needToKnow} onChange={e => set('needToKnow', e.target.value)}
                placeholder="Critical information staff must know before supporting this person. This appears as a warning banner on their profile." />
            </div>
            <div>
              <label className="label">My instructions</label>
              <textarea className="input" rows={3} value={form.myInstructions} onChange={e => set('myInstructions', e.target.value)}
                placeholder="Things I want staff to know about me and how I like to be supported..." />
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between mt-6">
        <Link to={`/service-users/${id}`}>
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button>
        </Link>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save all changes</Button>
      </div>
    </div>
  )
}
