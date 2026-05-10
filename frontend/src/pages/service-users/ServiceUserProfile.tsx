import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { suApi } from '../../api'
import {
  Spinner, StatusBadge, EmergencyBadge, DNARBanner, NilByMouthBanner,
  Button, Card, SectionHeading, EmptyState, Modal, Input, Select
} from '../../components/ui'
import {
  ArrowLeft, Phone, Mail, MapPin, Heart, FileText, MessageSquare,
  Plus, Edit, User, AlertTriangle, Clipboard, Activity, Users
} from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'health' | 'contacts' | 'documents' | 'comms' | 'background'

// Normalise backend snake_case to camelCase
function normalise(su: any) {
  if (!su) return su
  return {
    id: su.id,
    homeId: su.homeId || su.home_id,
    firstName: su.firstName || su.first_name || '',
    lastName: su.lastName || su.last_name || '',
    preferredName: su.preferredName || su.preferred_name || '',
    dateOfBirth: su.dateOfBirth || su.date_of_birth || '',
    gender: su.gender || '',
    pronouns: su.pronouns || '',
    photoUrl: su.photoUrl || su.photo_url || '',
    status: su.status || 'live',
    emergencyRating: su.emergencyRating || su.emergency_rating || 'low',
    nhsNumber: su.nhsNumber || su.nhs_number || '',
    niNumber: su.niNumber || su.ni_number || '',
    dnar: su.dnar,
    dnarFormUrl: su.dnarFormUrl || su.dnar_form_url || '',
    nilByMouth: su.nilByMouth || su.nil_by_mouth || false,
    minFluidMl: su.minFluidMl || su.min_fluid_ml || 1500,
    needToKnow: su.needToKnow || su.need_to_know || '',
    myInstructions: su.myInstructions || su.my_instructions || '',
    admissionDate: su.admissionDate || su.admission_date || '',
    localAuthority: su.localAuthority || su.local_authority || '',
    religion: su.religion || '',
    ethnicity: su.ethnicity || '',
    maritalStatus: su.maritalStatus || su.marital_status || '',
    commsPrefs: su.commsPrefs || su.comms_prefs || '',
    lifeHistory: su.lifeHistory || su.life_history || '',
    hobbies: su.hobbies || '',
    dailyRoutine: su.dailyRoutine || su.daily_routine || '',
    heightCm: su.heightCm || su.height_cm || null,
    weightKg: su.weightKg || su.weight_kg || null,
    bmi: su.bmi || null,
    medicalHistory: su.medicalHistory || su.medical_history || '',
    medAllergies: su.medAllergies || su.med_allergies || '',
    requiresOxygen: su.requiresOxygen || su.requires_oxygen || false,
    hasCatheter: su.hasCatheter || su.has_catheter || false,
    hasPeg: su.hasPeg || su.has_peg || false,
    foodAllergies: su.foodAllergies || su.food_allergies || '',
    specialDiet: su.specialDiet || su.special_diet || '',
    fluidConsistency: su.fluidConsistency || su.fluid_consistency || '',
    dietInstructions: su.dietInstructions || su.diet_instructions || '',
    address1: su.address1 || '',
    postcode: su.postcode || '',
    phone: su.phone || '',
  }
}

export default function ServiceUserProfile() {
  const { id } = useParams<{ id: string }>()
  const { isRole } = useAuth()
  const [su, setSu] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      suApi.get(id),
      suApi.getContacts(id),
      suApi.getMessages(id),
    ]).then(([suRes, contactRes, msgRes]) => {
      setSu(normalise(suRes.data.data))
      setContacts(contactRes.data.data || [])
      setMessages(msgRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const sendMessage = async () => {
    if (!newMessage.trim() || !id) return
    setSending(true)
    try {
      const res = await suApi.sendMessage(id, { message: newMessage })
      setMessages(prev => [res.data.data, ...prev])
      setNewMessage('')
      toast.success('Message sent')
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  if (loading) return <div className="p-6"><Spinner /></div>
  if (!su) return <div className="p-6"><EmptyState title="Service user not found" /></div>

  const age = su.dateOfBirth ? differenceInYears(new Date(), new Date(su.dateOfBirth)) : '?'

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'health', label: 'Health', icon: <Activity className="w-4 h-4" /> },
    { key: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
    { key: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { key: 'comms', label: 'My Comms', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'background', label: 'Background', icon: <Heart className="w-4 h-4" /> },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link to="/service-users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to service users
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="space-y-2 mb-4">
          <DNARBanner dnar={su.dnar} formUrl={su.dnarFormUrl} />
          <NilByMouthBanner nilByMouth={su.nilByMouth} />
        </div>

        {su.needToKnow && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Need to know</p>
              <p className="text-sm text-amber-700">{su.needToKnow}</p>
            </div>
          </div>
        )}

        {su.myInstructions && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <Clipboard className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-0.5">My instructions</p>
              <p className="text-sm text-blue-700">{su.myInstructions}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-navy-600 overflow-hidden">
            {su.photoUrl
              ? <img src={su.photoUrl} className="w-full h-full object-cover" alt="" />
              : `${su.firstName?.[0] || '?'}${su.lastName?.[0] || '?'}`
            }
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-navy-900">
                  {su.firstName} {su.lastName}
                  {su.preferredName && <span className="text-gray-400 font-normal text-lg ml-2">({su.preferredName})</span>}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={su.status} />
                  <EmergencyBadge rating={su.emergencyRating} />
                  {su.gender && <span className="text-sm text-gray-500 capitalize">{su.gender}</span>}
                  {su.pronouns && <span className="text-sm text-gray-400">({su.pronouns})</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Age {age}
                  {su.dateOfBirth && ` · DOB ${format(new Date(su.dateOfBirth), 'd MMMM yyyy')}`}
                  {su.nhsNumber && ` · NHS: ${su.nhsNumber}`}
                </p>
              </div>
              {isRole('home_manager', 'group_admin') && (
                <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />}>Edit</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900 hover:bg-gray-50'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <SectionHeading title="Admission details" />
            <dl className="space-y-3">
              <Field label="Admission date" value={su.admissionDate ? format(new Date(su.admissionDate), 'd MMMM yyyy') : null} />
              <Field label="Local authority" value={su.localAuthority} />
              <Field label="NHS number" value={su.nhsNumber} />
              <Field label="NI number" value={su.niNumber} />
            </dl>
          </Card>
          <Card>
            <SectionHeading title="Contact details" />
            <dl className="space-y-3">
              <Field label="Phone" value={su.phone} icon={<Phone className="w-4 h-4" />} />
              <Field label="Address" value={[su.address1, su.postcode].filter(Boolean).join(', ')} icon={<MapPin className="w-4 h-4" />} />
            </dl>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Dietary requirements" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <ToggleDisplay label="Food allergies" value={!!su.foodAllergies} />
              <ToggleDisplay label="Nil by mouth" value={su.nilByMouth} danger />
              <ToggleDisplay label="Special diet" value={!!su.specialDiet} />
              <ToggleDisplay label="Thickened fluids" value={!!su.fluidConsistency} />
            </div>
            {su.foodAllergies && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg mb-2"><strong>Allergies:</strong> {su.foodAllergies}</p>}
            {su.specialDiet && <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-2"><strong>Special diet:</strong> {su.specialDiet}</p>}
            {su.dietInstructions && <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg"><strong>Instructions:</strong> {su.dietInstructions}</p>}
            <p className="text-xs text-gray-500 mt-3">Min daily fluid: <strong>{su.minFluidMl}ml</strong></p>
          </Card>
        </div>
      )}

      {tab === 'health' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <SectionHeading title="Measurements" />
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Height" value={su.heightCm ? `${su.heightCm}cm` : '—'} />
              <Metric label="Weight" value={su.weightKg ? `${su.weightKg}kg` : '—'} />
              <Metric label="BMI" value={su.bmi ? String(su.bmi) : '—'} />
            </div>
          </Card>
          <Card>
            <SectionHeading title="Clinical needs" />
            <div className="space-y-3">
              <ToggleDisplay label="Requires oxygen" value={su.requiresOxygen} />
              <ToggleDisplay label="Has catheter" value={su.hasCatheter} />
              <ToggleDisplay label="Has PEG tube" value={su.hasPeg} />
            </div>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medical history" />
            <p className="text-sm text-gray-700 whitespace-pre-line">{su.medicalHistory || '—'}</p>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medication allergies" />
            {su.medAllergies
              ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800 font-medium">{su.medAllergies}</p></div>
              : <p className="text-sm text-gray-400">No known medication allergies</p>
            }
          </Card>
        </div>
      )}

      {tab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-navy-900">Contacts ({contacts.length})</h2>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddContactOpen(true)}>Add contact</Button>
          </div>
          {contacts.length === 0
            ? <EmptyState title="No contacts yet" description="Add family, professionals and emergency contacts" />
            : (
              <div className="grid gap-3">
                {contacts.map((c: any) => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-navy-900">{c.full_name || c.fullName}</h3>
                          {(c.contact_tag || c.contactTag) && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              (c.contact_tag || c.contactTag) === 'family' ? 'bg-blue-100 text-blue-700' :
                              (c.contact_tag || c.contactTag) === 'professional' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>{c.contact_tag || c.contactTag}</span>
                          )}
                          {(c.is_primary || c.isPrimary) && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Primary</span>}
                        </div>
                        {(c.relationship) && <p className="text-sm text-gray-500 mt-0.5">{c.relationship}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      {(c.phone_primary || c.phonePrimary) && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone_primary || c.phonePrimary}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-gray-500 mt-2">{c.notes}</p>}
                  </Card>
                ))}
              </div>
            )
          }
          <AddContactModal open={addContactOpen} onClose={() => setAddContactOpen(false)} suId={su.id}
            onAdded={(c) => { setContacts(prev => [...prev, c]); setAddContactOpen(false); toast.success('Contact added') }} />
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <SectionHeading title="Key documents" />
          <EmptyState title="No documents uploaded" description="Upload key documents for this resident"
            action={<Button size="sm" icon={<Plus className="w-4 h-4" />}>Upload document</Button>} />
        </Card>
      )}

      {tab === 'comms' && (
        <Card>
          <SectionHeading title="My Comms" description="Messages between staff and management" />
          <div className="flex gap-2 mb-4">
            <input className="input flex-1" placeholder="Type a message..."
              value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <Button onClick={sendMessage} loading={sending}>Send</Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
              : messages.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center text-xs font-bold text-navy-600 flex-shrink-0">
                    {(m.sender_name || m.senderName || '?').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{m.sender_name || m.senderName}</p>
                      <p className="text-xs text-gray-400">{format(new Date(m.created_at || m.createdAt), 'd MMM, HH:mm')}</p>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{m.message}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </Card>
      )}

      {tab === 'background' && (
        <div className="grid gap-4">
          <Card>
            <SectionHeading title="Personal background" />
            <dl className="space-y-4">
              <Field label="Religion / faith" value={su.religion} />
              <Field label="Ethnicity" value={su.ethnicity} />
              <Field label="Marital status" value={su.maritalStatus} />
              <Field label="Communication preferences" value={su.commsPrefs} />
            </dl>
          </Card>
          <Card>
            <SectionHeading title="Life history" />
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{su.lifeHistory || '—'}</p>
          </Card>
          <Card>
            <SectionHeading title="Hobbies & interests" />
            <p className="text-sm text-gray-700 whitespace-pre-line">{su.hobbies || '—'}</p>
          </Card>
          <Card>
            <SectionHeading title="Daily routine" />
            <p className="text-sm text-gray-700 whitespace-pre-line">{su.dailyRoutine || '—'}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div>
        <dt className="text-xs text-gray-500 font-medium">{label}</dt>
        <dd className="text-sm text-gray-900 mt-0.5">{value || '—'}</dd>
      </div>
    </div>
  )
}

function ToggleDisplay({ label, value, danger }: { label: string; value: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${value ? (danger ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-200'}`}>
        {value && <span className="text-white text-xs">✓</span>}
      </div>
      <span className={`text-sm ${value && danger ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{label}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <p className="text-xl font-bold text-navy-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function AddContactModal({ open, onClose, suId, onAdded }: {
  open: boolean; onClose: () => void; suId: string; onAdded: (c: any) => void
}) {
  const [form, setForm] = useState({ fullName: '', relationship: '', contactTag: 'family', phonePrimary: '', email: '', isPrimary: false, notes: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await suApi.addContact(suId, form)
      onAdded(res.data.data)
    } catch { toast.error('Failed to add contact') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add contact">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name *" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
        <Input label="Relationship" value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} />
        <Select label="Type" value={form.contactTag} onChange={e => setForm(p => ({ ...p, contactTag: e.target.value }))}
          options={[{ value: 'family', label: 'Family' }, { value: 'professional', label: 'Professional' }, { value: 'emergency', label: 'Emergency' }]} />
        <Input label="Phone" value={form.phonePrimary} onChange={e => setForm(p => ({ ...p, phonePrimary: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <Input label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add contact</Button>
        </div>
      </form>
    </Modal>
  )
}
