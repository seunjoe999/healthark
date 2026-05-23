import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { suApi } from '../../api'
import api from '../../api'
import {
  Spinner, StatusBadge, EmergencyBadge, DNARBanner, NilByMouthBanner,
  Button, Card, SectionHeading, EmptyState, Modal, Input, Select
} from '../../components/ui'
import {
  ArrowLeft, Phone, Mail, MapPin, Heart, FileText, MessageSquare,
  Plus, Edit, User, AlertTriangle, Clipboard, Activity, Users,
  Upload, Download, Trash2, Eye, File, FileImage, Lock, QrCode
} from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { QRModal } from './QRModal'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'health' | 'contacts' | 'documents' | 'comms' | 'background'

const SU_DOC_TYPES = [
  { value: 'passport', label: 'Copy of passport' },
  { value: 'dnar_form', label: 'DNAR form' },
  { value: 'mental_capacity', label: 'Mental capacity assessment' },
  { value: 'advance_care_plan', label: 'Advance care plan' },
  { value: 'funeral_arrangements', label: 'Funeral arrangements' },
  { value: 'birth_certificate', label: 'Birth certificate' },
  { value: 'legal_document', label: 'Legal document' },
  { value: 'medical_report', label: 'Medical report' },
  { value: 'hospital_letter', label: 'Hospital letter' },
  { value: 'referral_letter', label: 'Referral letter' },
  { value: 'risk_assessment_doc', label: 'Risk assessment document' },
  { value: 'care_plan_doc', label: 'Care plan document' },
  { value: 'photo', label: 'Family photo / image' },
  { value: 'other', label: 'Other important document' },
]

function normalise(su: any) {
  if (!su) return su
  return {
    id: su.id, homeId: su.homeId || su.home_id,
    firstName: su.firstName || su.first_name || '',
    lastName: su.lastName || su.last_name || '',
    preferredName: su.preferredName || su.preferred_name || '',
    dateOfBirth: su.dateOfBirth || su.date_of_birth || '',
    gender: su.gender || '', pronouns: su.pronouns || '',
    photoUrl: su.photoUrl || su.photo_url || '',
    status: su.status || 'live',
    emergencyRating: su.emergencyRating || su.emergency_rating || 'low',
    nhsNumber: su.nhsNumber || su.nhs_number || '',
    niNumber: su.niNumber || su.ni_number || '',
    dnar: su.dnar, dnarFormUrl: su.dnarFormUrl || su.dnar_form_url || '',
    nilByMouth: su.nilByMouth || su.nil_by_mouth || false,
    minFluidMl: su.minFluidMl || su.min_fluid_ml || 1500,
    needToKnow: su.needToKnow || su.need_to_know || '',
    myInstructions: su.myInstructions || su.my_instructions || '',
    admissionDate: su.admissionDate || su.admission_date || '',
    localAuthority: su.localAuthority || su.local_authority || '',
    religion: su.religion || '', ethnicity: su.ethnicity || '',
    maritalStatus: su.maritalStatus || su.marital_status || '',
    commsPrefs: su.commsPrefs || su.comms_prefs || '',
    lifeHistory: su.lifeHistory || su.life_history || '',
    hobbies: su.hobbies || '', dailyRoutine: su.dailyRoutine || su.daily_routine || '',
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
    address1: su.address1 || '', postcode: su.postcode || '', phone: su.phone || '',
  }
}

export default function ServiceUserProfile() {
  const { id } = useParams<{ id: string }>()
  const { isRole } = useAuth()
  const [su, setSu] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [uploadDocOpen, setUploadDocOpen] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    // Load core data first, documents separately (may not be wired yet)
    Promise.all([
      suApi.get(id),
      suApi.getContacts(id),
      suApi.getMessages(id),
    ]).then(([suRes, contactRes, msgRes]) => {
      setSu(normalise(suRes.data.data))
      setContacts(contactRes.data.data || [])
      setMessages(msgRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
    // Documents loaded separately — won't crash page if endpoint missing
    api.get(`/documents/su/${id}`).then(res => setDocuments(res.data.data || [])).catch(() => setDocuments([]))
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

  const deleteDoc = async (docId: string) => {
    if (!id || !confirm('Delete this document?')) return
    try {
      await api.delete(`/documents/su/${id}/${docId}`)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      toast.success('Document deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!su) return <div className="p-8"><EmptyState title="Resident not found" /></div>

  const age = su.dateOfBirth ? differenceInYears(new Date(), new Date(su.dateOfBirth)) : '?'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'health', label: 'Health' },
    { key: 'contacts', label: `Contacts (${contacts.length})` },
    { key: 'documents', label: `Documents (${documents.length})` },
    { key: 'comms', label: 'My Comms' },
    { key: 'background', label: 'Background' },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      <Link to="/service-users" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 uppercase tracking-wider transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to residents
      </Link>

      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="space-y-2 mb-4">
          <DNARBanner dnar={su.dnar} formUrl={su.dnarFormUrl} />
          <NilByMouthBanner nilByMouth={su.nilByMouth} />
        </div>
        {su.needToKnow && (
          <div className="flex items-start gap-3 p-4 bg-amber-400 border-2 border-amber-600 rounded-xl mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-900 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">⚠ Need To Know</p>
              <p className="text-sm font-bold text-amber-950">{su.needToKnow}</p>
            </div>
          </div>
        )}
        {su.myInstructions && (
          <div className="flex items-start gap-3 p-4 bg-blue-500/8 border border-blue-500/20 rounded-xl mb-4">
            <Clipboard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">My instructions</p>
              <p className="text-sm text-blue-800">{su.myInstructions}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-5">
          <PhotoUpload
            currentUrl={su.photoUrl}
            name={`${su.firstName} ${su.lastName}`}
            uploadUrl={`/api/upload/su-photo/${su.id}`}
            onUploaded={(url) => setSu((p: any) => ({ ...p, photoUrl: url }))}
            size="md"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-display text-2xl text-slate-900">
                  {su.firstName} {su.lastName}
                  {su.preferredName && <span className="text-slate-400 font-sans font-normal text-lg ml-2">({su.preferredName})</span>}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={su.status} />
                  <EmergencyBadge rating={su.emergencyRating} />
                  {su.gender && <span className="text-sm text-slate-500 capitalize">{su.gender}</span>}
                  {su.pronouns && <span className="text-sm text-slate-400">({su.pronouns})</span>}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Age {age}{su.dateOfBirth && ` · Born ${format(new Date(su.dateOfBirth), 'd MMMM yyyy')}`}
                  {su.nhsNumber && ` · NHS: ${su.nhsNumber}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<QrCode className="w-3.5 h-3.5" />} onClick={() => setQrOpen(true)}>QR clock-in</Button>
                {true && (
                  <Link to={`/service-users/${su.id}/edit`}>
                    <Button variant="outline" size="sm" icon={<Edit className="w-3.5 h-3.5" />}>Edit profile</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-white rounded-2xl border border-slate-100 shadow-card p-1 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              tab === t.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <SectionHeading title="Admission details" />
            <dl className="space-y-3.5">
              <Field label="Admission date" value={su.admissionDate ? format(new Date(su.admissionDate), 'd MMMM yyyy') : null} />
              <Field label="Local authority" value={su.localAuthority} />
              <Field label="NHS number" value={su.nhsNumber} />
              <Field label="NI number" value={su.niNumber} />
            </dl>
          </Card>
          <Card>
            <SectionHeading title="Contact details" />
            <dl className="space-y-3.5">
              <Field label="Phone" value={su.phone} icon={<Phone className="w-3.5 h-3.5" />} />
              <Field label="Address" value={[su.address1, su.postcode].filter(Boolean).join(', ')} icon={<MapPin className="w-3.5 h-3.5" />} />
            </dl>
            {su.postcode && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-semibold text-slate-600">Clock-in geofence active</p>
                  </div>
                  <button onClick={() => setQrOpen(true)} className="text-xs text-purple-600 font-semibold hover:text-purple-800 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> View QR code
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Staff must be near <strong className="text-slate-600">{su.postcode}</strong> to clock in or out</p>
              </div>
            )}
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Dietary requirements" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <ToggleDisp label="Food allergies" value={!!su.foodAllergies} />
              <ToggleDisp label="Nil by mouth" value={su.nilByMouth} danger />
              <ToggleDisp label="Special diet" value={!!su.specialDiet} />
              <ToggleDisp label="Thickened fluids" value={!!su.fluidConsistency} />
            </div>
            {su.foodAllergies && <p className="text-sm text-rose-700 bg-rose-500/8 p-3 rounded-xl mb-2 border border-rose-500/15"><strong>Allergies:</strong> {su.foodAllergies}</p>}
            {su.specialDiet && <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl mb-2"><strong>Special diet:</strong> {su.specialDiet}</p>}
            {su.dietInstructions && <p className="text-sm text-blue-800 bg-blue-500/8 p-3 rounded-xl border border-blue-500/15"><strong>Instructions:</strong> {su.dietInstructions}</p>}
            <p className="text-xs text-slate-400 mt-3">Minimum daily fluid intake: <strong className="text-slate-700">{su.minFluidMl}ml</strong></p>
          </Card>
        </div>
      )}

      {tab === 'health' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <SectionHeading title="Physical measurements" />
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Height" value={su.heightCm ? `${su.heightCm}cm` : '—'} />
              <Metric label="Weight" value={su.weightKg ? `${su.weightKg}kg` : '—'} />
              <Metric label="BMI" value={su.bmi ? String(su.bmi) : '—'} />
            </div>
          </Card>
          <Card>
            <SectionHeading title="Clinical needs" />
            <div className="space-y-3.5">
              <ToggleDisp label="Requires oxygen" value={su.requiresOxygen} />
              <ToggleDisp label="Has catheter" value={su.hasCatheter} />
              <ToggleDisp label="Has PEG tube" value={su.hasPeg} />
            </div>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medical history" />
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{su.medicalHistory || '—'}</p>
          </Card>
          <Card className="md:col-span-2">
            <SectionHeading title="Medication allergies" />
            {su.medAllergies
              ? <div className="p-4 bg-rose-500/8 border border-rose-500/15 rounded-xl"><p className="text-sm text-rose-800 font-medium">{su.medAllergies}</p></div>
              : <p className="text-sm text-slate-400">No known medication allergies recorded</p>}
          </Card>
        </div>
      )}

      {tab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">Important contacts ({contacts.length})</h2>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddContactOpen(true)}>Add contact</Button>
          </div>
          {contacts.length === 0 ? (
            <EmptyState title="No contacts yet" description="Add family members, professionals, and emergency contacts" />
          ) : (
            <div className="grid gap-3">
              {contacts.map((c: any) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{c.full_name || c.fullName}</h3>
                        {(c.contact_tag || c.contactTag) && (
                          <span className={`badge ${(c.contact_tag || c.contactTag) === 'family' ? 'badge-info' : (c.contact_tag || c.contactTag) === 'professional' ? 'badge-success' : 'badge-critical'}`}>
                            {c.contact_tag || c.contactTag}
                          </span>
                        )}
                        {(c.is_primary || c.isPrimary) && <span className="badge bg-gold-500/10 text-gold-700 ring-1 ring-gold-500/20">Primary</span>}
                      </div>
                      {c.relationship && <p className="text-sm text-slate-500 mt-0.5">{c.relationship}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                    {(c.phone_primary || c.phonePrimary) && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{c.phone_primary || c.phonePrimary}</span>}
                    {c.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-slate-400 mt-2">{c.notes}</p>}
                </Card>
              ))}
            </div>
          )}
          <AddContactModal open={addContactOpen} onClose={() => setAddContactOpen(false)} suId={su.id}
            onAdded={(c) => { setContacts(prev => [...prev, c]); setAddContactOpen(false); toast.success('Contact added') }} />
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">My key documents ({documents.length})</h2>
            <Button size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setUploadDocOpen(true)}>Upload document</Button>
          </div>

          {documents.length === 0 ? (
            <EmptyState title="No documents uploaded yet"
              description="Upload passports, DNAR forms, mental capacity assessments, and other important documents"
              action={<Button icon={<Upload className="w-4 h-4" />} onClick={() => setUploadDocOpen(true)}>Upload first document</Button>} />
          ) : (
            <div className="grid gap-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {doc.mime_type?.startsWith('image') ? <FileImage className="w-5 h-5 text-slate-500" /> : <FileText className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{doc.title || doc.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="capitalize">{SU_DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}</span>
                      <span>·</span>
                      <span>Uploaded by {doc.uploaded_by_name || 'Unknown'}</span>
                      <span>·</span>
                      <span>{doc.created_at ? format(new Date(doc.created_at), 'd MMM yyyy') : ''}</span>
                      {doc.expiry_date && <><span>·</span><span className="text-amber-600 font-medium">Expires {format(new Date(doc.expiry_date), 'd MMM yyyy')}</span></>}
                    </div>
                    {doc.notes && <p className="text-xs text-slate-400 mt-1 italic">{doc.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={doc.file_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                    </a>
                    {true && (
                      <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} onClick={() => deleteDoc(doc.id)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <UploadDocModal open={uploadDocOpen} onClose={() => setUploadDocOpen(false)} suId={su.id}
            onUploaded={(doc) => { setDocuments(prev => [doc, ...prev]); setUploadDocOpen(false); toast.success('Document uploaded') }} />
        </div>
      )}

      {tab === 'comms' && (
        <Card>
          <SectionHeading title="My Comms" description="Messages between staff about this resident" />
          <div className="flex gap-2 mb-5">
            <input className="input flex-1" placeholder="Type a message..."
              value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} />
            <Button onClick={sendMessage} loading={sending} icon={<MessageSquare className="w-4 h-4" />}>Send</Button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No messages yet</p>
            ) : messages.map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                  {(m.sender_name || '?').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{m.sender_name}</p>
                    <p className="text-xs text-slate-400">{m.created_at ? format(new Date(m.created_at), 'd MMM, HH:mm') : ''}</p>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'background' && (
        <div className="grid gap-4">
          <Card>
            <SectionHeading title="Personal background" />
            <dl className="grid md:grid-cols-2 gap-3.5">
              <Field label="Religion / faith" value={su.religion} />
              <Field label="Ethnicity" value={su.ethnicity} />
              <Field label="Marital status" value={su.maritalStatus} />
              <Field label="Communication preferences" value={su.commsPrefs} />
            </dl>
          </Card>
          <Card>
            <SectionHeading title="Life history" />
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{su.lifeHistory || '—'}</p>
          </Card>
          <Card>
            <SectionHeading title="Hobbies & interests" />
            <p className="text-sm text-slate-700 whitespace-pre-line">{su.hobbies || '—'}</p>
          </Card>
          <Card>
            <SectionHeading title="Daily routine" />
            <p className="text-sm text-slate-700 whitespace-pre-line">{su.dailyRoutine || '—'}</p>
          </Card>
        </div>
      )}
      {qrOpen && su && <QRModal open={qrOpen} onClose={() => setQrOpen(false)} suId={su.id} suName={`${su.firstName} ${su.lastName}`} />}
    </div>
  )
}

function Field({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div>
        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
        <dd className="text-sm text-slate-800 mt-0.5">{value || '—'}</dd>
      </div>
    </div>
  )
}

function ToggleDisp({ label, value, danger }: { label: string; value: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ${value ? (danger ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-200'}`}>
        {value && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className={`text-sm ${value && danger ? 'text-rose-700 font-semibold' : 'text-slate-700'}`}>{label}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-4 bg-slate-50 rounded-xl">
      <p className="text-xl font-bold text-slate-900 font-display">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
    </div>
  )
}

function AddContactModal({ open, onClose, suId, onAdded }: {
  open: boolean; onClose: () => void; suId: string; onAdded: (c: any) => void
}) {
  const [form, setForm] = useState({ fullName: '', relationship: '', contactTag: 'family', phonePrimary: '', email: '', isPrimary: false, notes: '' })
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
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
      <form onSubmit={save} className="space-y-4">
        <Input label="Full name *" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
        <Input label="Relationship" value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} />
        <Select label="Contact type" value={form.contactTag} onChange={e => setForm(p => ({ ...p, contactTag: e.target.value }))}
          options={[{ value: 'family', label: 'Family' }, { value: 'professional', label: 'Professional' }, { value: 'emergency', label: 'Emergency' }]} />
        <Input label="Phone number" value={form.phonePrimary} onChange={e => setForm(p => ({ ...p, phonePrimary: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <Input label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="primary" checked={form.isPrimary} onChange={e => setForm(p => ({ ...p, isPrimary: e.target.checked }))} className="rounded" />
          <label htmlFor="primary" className="text-sm text-slate-700">Set as primary contact</label>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add contact</Button>
        </div>
      </form>
    </Modal>
  )
}

function UploadDocModal({ open, onClose, suId, onUploaded }: {
  open: boolean; onClose: () => void; suId: string; onUploaded: (doc: any) => void
}) {
  const [docType, setDocType] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !docType) { toast.error('Please select a document type and file'); return }
    setLoading(true)
    try {
      const token = (window as any).__HA_TOKEN__
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', docType)
      formData.append('title', title || file.name)
      if (notes) formData.append('notes', notes)
      if (expiryDate) formData.append('expiryDate', expiryDate)

      const res = await fetch(`/api/documents/su/${suId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onUploaded(data.data)
      toast.success('Document uploaded successfully')
    } catch (err: any) { toast.error(err?.message || 'Upload failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload key document" size="md">
      <form onSubmit={save} className="space-y-4">
        <Select label="Document type *" required value={docType} onChange={e => setDocType(e.target.value)}
          options={SU_DOC_TYPES} placeholder="Select document type" />
        <Input label="Document title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. John's Passport, DNAR form 2024..." hint="Leave blank to use the filename" />
        <div>
          <label className="label">Select file *</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-emerald-400 bg-emerald-500/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
            {file ? (
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)}KB)</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click to choose a file</p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word, images up to 20MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <Input label="Expiry date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
          hint="For passports, certificates, etc. Leave blank if no expiry." />
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this document..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Upload className="w-4 h-4" />}>Upload document</Button>
        </div>
      </form>
    </Modal>
  )
}
