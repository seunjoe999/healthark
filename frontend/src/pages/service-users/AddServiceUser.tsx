import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { suApi, homesApi } from '../../api'
import { Button, Input, Select, Toggle, Card, SectionHeading } from '../../components/ui'
import { ArrowLeft, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }]
const PRONOUNS = [{ value: 'he/him', label: 'He/Him' }, { value: 'she/her', label: 'She/Her' }, { value: 'they/them', label: 'They/Them' }]
const STATUSES = [{ value: 'pre_admission', label: 'Pre-admission' }, { value: 'live', label: 'Live' }]
const EMERGENCY = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
const RELIGIONS = [{ value: 'christian', label: 'Christian' }, { value: 'muslim', label: 'Muslim' }, { value: 'hindu', label: 'Hindu' }, { value: 'jewish', label: 'Jewish' }, { value: 'sikh', label: 'Sikh' }, { value: 'buddhist', label: 'Buddhist' }, { value: 'no_religion', label: 'No religion' }, { value: 'other', label: 'Other' }]
const ETHNICITY = [{ value: 'white_british', label: 'White British' }, { value: 'white_irish', label: 'White Irish' }, { value: 'white_other', label: 'White Other' }, { value: 'mixed_white_black_caribbean', label: 'Mixed - White & Black Caribbean' }, { value: 'asian_indian', label: 'Asian - Indian' }, { value: 'asian_pakistani', label: 'Asian - Pakistani' }, { value: 'black_african', label: 'Black - African' }, { value: 'black_caribbean', label: 'Black - Caribbean' }, { value: 'other', label: 'Other' }]
const MARITAL = [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'civil_partnership', label: 'Civil partnership' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]

export default function AddServiceUser() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [homes, setHomes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  const [form, setForm] = useState({
    homeId: '', firstName: '', lastName: '', preferredName: '', dateOfBirth: '',
    gender: '', pronouns: '', status: 'pre_admission', emergencyRating: 'low',
    nhsNumber: '', niNumber: '', dnar: null as boolean | null, dnarFormUrl: '',
    admissionDate: '', localAuthority: '', religion: '', ethnicity: '',
    maritalStatus: '', commsPrefs: '', address1: '', address2: '', postcode: '',
    phone: '', email: '', needToKnow: '', myInstructions: '',
    heightCm: '', weightKg: '', medicalHistory: '', medAllergies: '',
    requiresOxygen: false, hasCatheter: false, hasPeg: false,
    foodAllergies: '', nilByMouth: false, specialDiet: '',
    fluidConsistency: '', minFluidMl: 1500, dietInstructions: '',
    lifeHistory: '', hobbies: '', dailyRoutine: '',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      set('homeId', user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.homeId) {
      toast.error('Please fill in first name, last name, date of birth and home')
      return
    }
    if (form.dnar === true && !form.dnarFormUrl) {
      toast.error('DNAR form URL is required when Do Not Resuscitate is selected')
      return
    }
    setSaving(true)
    try {
      const res = await suApi.create(form)
      toast.success('Resident added successfully')
      navigate(`/service-users/${res.data.data.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add resident')
    } finally { setSaving(false) }
  }

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
        <Link to="/service-users" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to residents
        </Link>
        <Button icon={<UserPlus className="w-4 h-4" />} loading={saving} onClick={save}>Add resident</Button>
      </div>

      <h1 className="font-display text-2xl text-slate-900 mb-2">Add new resident</h1>
      <p className="text-slate-400 text-sm mb-6">Complete as much information as possible. You can always update later.</p>

      {homes.length > 1 && (
        <div className="mb-4">
          <Select label="Care home *" value={form.homeId} onChange={e => set('homeId', e.target.value)}
            options={homes.map(h => ({ value: h.id, label: h.name }))} />
        </div>
      )}

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
            <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} autoFocus />
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
              <Input label="Postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} hint="Automatically sets the clock-in geofence — staff must be near this postcode to clock in" />
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
          <div className="mt-5">
            <label className="label">DNAR status</label>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => set('dnar', false)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${form.dnar === false ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                Resuscitate (CPR)
              </button>
              <button type="button" onClick={() => set('dnar', true)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${form.dnar === true ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                ✗ Do Not Resuscitate
              </button>
            </div>
            {form.dnar === true && (
              <div className="mt-3">
                <Input label="DNAR form URL *" value={form.dnarFormUrl} onChange={e => set('dnarFormUrl', e.target.value)}
                  placeholder="Link to uploaded DNAR form" hint="Required — upload the form and paste the link" />
              </div>
            )}
          </div>
        </Card>
      )}

      {activeSection === 'health' && (
        <Card>
          <SectionHeading title="Health information" />
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Input label="Height (cm)" type="number" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} placeholder="165" />
            <Input label="Weight (kg)" type="number" step="0.1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="65.0" />
            <div>
              <label className="label">BMI (auto)</label>
              <div className="input bg-slate-50 text-slate-500">
                {form.heightCm && form.weightKg ? (parseFloat(String(form.weightKg)) / Math.pow(parseFloat(String(form.heightCm)) / 100, 2)).toFixed(1) : '—'}
              </div>
            </div>
          </div>
          <div className="space-y-4 mb-6">
            <Toggle label="Requires oxygen" checked={form.requiresOxygen} onChange={v => set('requiresOxygen', v)} />
            <Toggle label="Has catheter" checked={form.hasCatheter} onChange={v => set('hasCatheter', v)} />
            <Toggle label="Has PEG tube" checked={form.hasPeg} onChange={v => set('hasPeg', v)} />
          </div>
          <div className="space-y-4">
            <div><label className="label">Medical history</label><textarea className="input" rows={4} value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} placeholder="Diagnoses, conditions, medical background..." /></div>
            <div><label className="label">Medication allergies</label><textarea className="input" rows={2} value={form.medAllergies} onChange={e => set('medAllergies', e.target.value)} placeholder="Known medication allergies..." /></div>
          </div>
        </Card>
      )}

      {activeSection === 'dietary' && (
        <Card>
          <SectionHeading title="Dietary requirements" />
          <div className="space-y-5">
            <Toggle label="Nil by mouth" checked={form.nilByMouth} onChange={v => set('nilByMouth', v)} danger description="Do not give food or drinks" />
            <Input label="Minimum daily fluid intake (ml)" type="number" value={String(form.minFluidMl)} onChange={e => set('minFluidMl', parseInt(e.target.value))} hint="Recommended minimum: 1500ml" />
            <Input label="Food allergies" value={form.foodAllergies} onChange={e => set('foodAllergies', e.target.value)} placeholder="Any known food allergies..." />
            <div><label className="label">Special diet</label><textarea className="input" rows={2} value={form.specialDiet} onChange={e => set('specialDiet', e.target.value)} placeholder="e.g. Diabetic, soft food, pureed..." /></div>
            <div><label className="label">Dietary instructions for staff</label><textarea className="input" rows={3} value={form.dietInstructions} onChange={e => set('dietInstructions', e.target.value)} placeholder="Specific instructions staff should follow..." /></div>
          </div>
        </Card>
      )}

      {activeSection === 'background' && (
        <Card>
          <SectionHeading title="About me" />
          <div className="space-y-4">
            <div><label className="label">Life history</label><textarea className="input" rows={5} value={form.lifeHistory} onChange={e => set('lifeHistory', e.target.value)} placeholder="Background, family, career, important life events..." /></div>
            <div><label className="label">Hobbies & interests</label><textarea className="input" rows={3} value={form.hobbies} onChange={e => set('hobbies', e.target.value)} placeholder="Things I enjoy doing..." /></div>
            <div><label className="label">Daily routine</label><textarea className="input" rows={3} value={form.dailyRoutine} onChange={e => set('dailyRoutine', e.target.value)} placeholder="Typical day, preferences, routines..." /></div>
          </div>
        </Card>
      )}

      {activeSection === 'safety' && (
        <Card>
          <SectionHeading title="Safety & care flags" description="This information appears prominently on the resident's profile" />
          <div className="space-y-4">
            <div><label className="label">Need to know ⚠</label><textarea className="input" rows={3} value={form.needToKnow} onChange={e => set('needToKnow', e.target.value)} placeholder="Critical information displayed as a warning banner on their profile..." /></div>
            <div><label className="label">My instructions</label><textarea className="input" rows={3} value={form.myInstructions} onChange={e => set('myInstructions', e.target.value)} placeholder="How I like to be supported, my preferences..." /></div>
          </div>
        </Card>
      )}

      <div className="flex justify-between mt-6">
        <Link to="/service-users"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button></Link>
        <Button icon={<UserPlus className="w-4 h-4" />} loading={saving} onClick={save}>Add resident</Button>
      </div>
    </div>
  )
}
