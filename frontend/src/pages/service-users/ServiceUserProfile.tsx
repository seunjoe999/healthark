import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { suApi } from '../../api'
import { ServiceUser, SUContact } from '../../types'
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

export default function ServiceUserProfile() {
  const { id } = useParams<{ id: string }>()
  const { isRole } = useAuth()
  const navigate = useNavigate()
  const [su, setSu] = useState<ServiceUser | null>(null)
  const [contacts, setContacts] = useState<SUContact[]>([])
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
      setSu(suRes.data.data)
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

  const age = differenceInYears(new Date(), new Date(su.dateOfBirth))

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
      {/* Back */}
      <Link to="/service-users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to service users
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
        {/* Safety banners */}
        <div className="space-y-2 mb-4">
          <DNARBanner dnar={su.dnar} formUrl={su.dnarFormUrl} />
          <NilByMouthBanner nilByMouth={su.nilByMouth} />
        </div>

        {/* Need to know */}
        {su.needToKnow && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Need to know</p>
              <p className="text-sm text-amber-700">{su.needToKnow}</p>
            </div>
          </div>
        )}

        {/* My instructions */}
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
            {su.photoUrl ? <img src={su.photoUrl} className="w-full h-full object-cover" alt="" /> : `${su.firstName[0]}${su.lastName[0]}`}
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
                  Age {age} · DOB {format(new Date(su.dateOfBirth), 'd MMMM yyyy')}
                  {su.nhsNumber && ` · NHS: ${su.nhsNumber}`}
                </p>
              </div>
              {isRole('home_manager', 'group_admin') && (
                <Link to={`/service-users/${su.id}/edit`}>
                  <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />}>Edit</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900 hover:bg-gray-50'
            }`}
          >
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
              <Field label="Admission date" value={su.admissionDate ? format(new Date(su.admissionDate), 'd MMMM yyyy') : '—'} />
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
              <Toggle label="Food allergies" value={!!su.foodAllergies} />
              <Toggle label="Nil by mouth" value={su.nilByMouth} danger />
              <Toggle label="Special diet" value={!!su.specialDiet} />
              <Toggle label="Thickened fluids" value={!!su.fluidConsistency} />
            </div>
            {su.foodAllergies && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg mb-2"><strong>Food allergies:</strong> {su.foodAllergies}</p>}
            {su.specialDiet && <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-2"><strong>Special diet:</strong> {su.specialDiet}</p>}
            {su.dietInstructions && <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg"><strong>Instructions:</strong> {su.dietInstructions}</p>}
            <p className="text-xs text-gray-500 mt-3">Minimum daily fluid intake: <strong>{su.minFluidMl}ml</strong></p>
          </Card>
        </div>
      )}

      {tab === 'health' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <SectionHeading title="Physical measurements" />
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Metric label="Height" value={su.heightCm ? `${su.heightCm}cm` : '—'} />
              <Metric label="Weight" value={su.weightKg ? `${su.weightKg}kg` : '—'} />
              <Metric label="BMI" value={su.bmi ? su.bmi.toString() : '—'} />
            </div>
          </Card>
          <Card>
            <SectionHeading title="Clinical needs" />
            <div className="space-y-3">
              <Toggle label="Requires oxygen" value={su.requiresOxygen} />
              <Toggle label="Has catheter" value={su.hasCatheter} />
              <Toggle label="Has PEG tube" value={su.hasPeg} />
            </div>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medical history" />
            <p className="text-sm text-gray-700 whitespace-pre-line">{su.medicalHistory || '—'}</p>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medication allergies" />
            {su.medAllergies ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">{su.medAllergies}</p>
              </div>
            ) : <p className="text-sm text-gray-400">No known medication allergies recorded</p>}
          </Card>
        </div>
      )}

      {tab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-navy-900">Important contacts ({contacts.length})</h2>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddContactOpen(true)}>
              Add contact
            </Button>
          </div>
          {contacts.length === 0 ? (
            <EmptyState title="No contacts yet" description="Add family members, professionals, and emergency contacts" />
          ) : (
            <div className="grid gap-3">
              {contacts.map(c => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-navy-900">{c.fullName}</h3>
                        {c.contactTag && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.contactTag === 'family' ? 'bg-blue-100 text-blue-700' :
                            c.contactTag === 'professional' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>{c.contactTag}</span>
                        )}
                        {c.isPrimary && <span className="text-xs bg-gold-400/20 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Primary</span>}
                      </div>
                      {c.relationship && <p className="text-sm text-gray-500 mt-0.5">{c.relationship}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                    {c.phonePrimary && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phonePrimary}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-gray-500 mt-2">{c.notes}</p>}
                </Card>
              ))}
            </div>
          )}
          <AddContactModal
            open={addContactOpen}
            onClose={() => setAddContactOpen(false)}
            suId={su.id}
            onAdded={(c) => { setContacts(prev => [...prev, c]); setAddContactOpen(false); toast.success('Contact added') }}
          />
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <SectionHeading title="Key documents" description="Passports, legal documents, assessment reports and more" />
          <EmptyState title="No documents uploaded" description="Upload key documents for this service user" action={<Button size="sm" icon={<Plus className="w-4 h-4" />}>Upload document</Button>} />
        </Card>
      )}

      {tab === 'comms' && (
        <div className="space-y-4">
          <Card>
            <SectionHeading title="My Comms" description="Messages between staff and management about this service user" />
            <div className="flex gap-2 mb-4">
              <input
                className="input flex-1"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <Button onClick={sendMessage} loading={sending}>Send</Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
              ) : messages.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center text-xs font-bold text-navy-600 flex-shrink-0">
                    {m.sender_name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{m.sender_name}</p>
                      <p className="text-xs text-gray-400">{format(new Date(m.created_at), 'd MMM, HH:mm')}</p>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{m.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'background' && (
        <div className="grid gap-4">
          <Card>
            <SectionHeading title="About me" />
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

function Toggle({ label, value, danger }: { label: string; value: boolean; danger?: boolean }) {
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
  open: boolean; onClose: () => void; suId: string; onAdded: (c: SUContact) => void
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
        <Input label="Phone number" value={form.phonePrimary} onChange={e => setForm(p => ({ ...p, phonePrimary: e.target.value }))} />
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
