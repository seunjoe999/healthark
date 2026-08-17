import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { staffApi, homesApi, getToken, authApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Select, Card, SectionHeading, Spinner, Modal } from '../../components/ui'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { ArrowLeft, Save, Trash2, Upload, FileText, FileImage, Eye, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STAFF_DOC_TYPES = [
  { value: 'certificate', label: 'Training certificate' },
  { value: 'dbs', label: 'DBS certificate' },
  { value: 'right_to_work', label: 'Right to work / ID' },
  { value: 'contract', label: 'Employment contract' },
  { value: 'appraisal', label: 'Appraisal / review' },
  { value: 'reference', label: 'Reference' },
  { value: 'qualification', label: 'Qualification / degree' },
  { value: 'nmc_pin', label: 'NMC PIN / professional registration' },
  { value: 'other', label: 'Other document' },
]

function UploadStaffDocModal({ open, onClose, staffId, onUploaded }: {
  open: boolean; onClose: () => void; staffId: string; onUploaded: (doc: any) => void
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
    if (!file || !docType) { toast.error('Select a file and document type'); return }
    setLoading(true)
    try {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', docType)
      formData.append('title', title || file.name)
      if (notes) formData.append('notes', notes)
      if (expiryDate) formData.append('expiryDate', expiryDate)
      const res = await fetch(`/api/documents/staff/${staffId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onUploaded(data.data)
      setFile(null); setTitle(''); setNotes(''); setExpiryDate(''); setDocType('')
    } catch (err: any) { toast.error(err?.message || 'Upload failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload certificate / document" size="md">
      <form onSubmit={save} className="space-y-4">
        <Select label="Document type *" required value={docType} onChange={e => setDocType(e.target.value)}
          options={STAFF_DOC_TYPES} placeholder="Select document type" />
        <Input label="Document title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Moving & Handling certificate 2024" hint="Leave blank to use the filename" />
        <div>
          <label className="label">Select file *</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
            {file ? (
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <FileText className="w-5 h-5" />
                <span className="font-medium text-sm">{file.name}</span>
              </div>
            ) : (
              <div className="text-slate-400">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to choose a file</p>
                <p className="text-xs mt-0.5">PDF, JPG, PNG · Max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <Input label="Expiry date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} hint="Optional — for certificates that expire" />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this document" />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Upload className="w-4 h-4" />}>Upload</Button>
        </div>
      </form>
    </Modal>
  )
}

const ROLES = [
  { value: 'director', label: 'Director' },
  { value: 'registered_manager', label: 'Registered Manager' },
  { value: 'service_manager', label: 'Service Manager' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'senior_carer', label: 'Senior Carer' },
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'recruitment_admin', label: 'Recruitment / Administrator' },
  { value: 'home_manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'group_admin', label: 'Group Admin (full access)' },
  { value: 'auditor', label: 'Auditor' },
]
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }, { value: 'terminated', label: 'Terminated' }]
const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }]
const MARITAL = [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]

function norm(s: any) {
  return {
    firstName: s.first_name || s.firstName || '',
    lastName: s.last_name || s.lastName || '',
    email: s.email || '',
    phone: s.phone || '',
    role: s.role || 'care_staff',
    status: s.status || 'active',
    startDate: s.start_date || s.startDate || '',
    leaveDate: s.leave_date || s.leaveDate || '',
    dateOfBirth: s.date_of_birth || s.dateOfBirth || '',
    gender: s.gender || '',
    nationality: s.nationality || '',
    maritalStatus: s.marital_status || s.maritalStatus || '',
    address1: s.address1 || '',
    postcode: s.postcode || '',
    emergencyName: s.emergency_name || s.emergencyName || '',
    emergencyPhone: s.emergency_phone || s.emergencyPhone || '',
    emergencyNotes: s.emergency_notes || s.emergencyNotes || '',
    photoUrl: s.photo_url || s.photoUrl || '',
    niNumber: s.ni_number || s.niNumber || '',
    leaveHoursTotal: s.leave_hours_total || s.leaveHoursTotal || 224,
    homeId: s.home_id || s.homeId || '',
    isActive: s.is_active ?? true,
  }
}

export default function EditStaff() {
  const { id } = useParams<{ id: string }>()
  const { user, isRole } = useAuth()
  const canDelete = isRole('group_admin')
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [homes, setHomes] = useState<any[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [uploadDocOpen, setUploadDocOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const isOwnProfile = !!user?.id && user.id === id
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const savePin = async () => {
    if (pin.length < 4 || pin.length > 8 || !/^[0-9]+$/.test(pin)) { toast.error('PIN must be 4-8 digits'); return }
    setSavingPin(true)
    try {
      if (isOwnProfile) await authApi.setPin(pin)
      else await staffApi.setPin(id!, pin)
      toast.success(isOwnProfile ? 'PIN set. You can now sign in with it' : 'PIN set for this staff member')
      setPin('')
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to set PIN') }
    finally { setSavingPin(false) }
  }

  const removePin = async () => {
    if (!confirm(isOwnProfile ? 'Remove your quick-login PIN?' : "Remove this staff member's PIN?")) return
    try {
      if (isOwnProfile) await authApi.removePin()
      else await staffApi.removePin(id!)
      toast.success('PIN removed')
    }
    catch { toast.error('Failed to remove PIN') }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([staffApi.get(id), homesApi.list()]).then(([sRes, hRes]) => {
      setForm(norm(sRes.data.data))
      setHomes(hRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
    api.get(`/documents/staff/${id}`).then(res => setDocuments(res.data.data || [])).catch(() => setDocuments([]))
  }, [id])

  const deleteDoc = async (docId: string) => {
    if (!id || !confirm('Delete this document?')) return
    try {
      await api.delete(`/documents/staff/${id}/${docId}`)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      toast.success('Document deleted')
    } catch { toast.error('Failed to delete') }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (newPassword) {
        if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); setSaving(false); return }
        payload.password = newPassword
      }
      await staffApi.update(id!, payload)
      toast.success('Staff profile updated')
      navigate('/staff')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const deleteStaff = async () => {
    if (!confirm(`Are you sure you want to permanently delete this staff member? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/staff/${id}`)
      toast.success('Staff member deleted')
      navigate('/staff')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete')
    } finally { setDeleting(false) }
  }

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!form) return <div className="p-8">Staff member not found</div>

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to staff
        </Link>
        <div className="flex gap-2">
          {canDelete && <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} loading={deleting} onClick={deleteStaff}>Delete</Button>}
          <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save changes</Button>
        </div>
      </div>

      <h1 className="font-display text-2xl text-slate-900 mb-6">Edit staff profile — {form.firstName} {form.lastName}</h1>
      {/* Photo upload */}
      {id && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5 flex items-center gap-5">
          <PhotoUpload
            currentUrl={form.photoUrl}
            name={`${form.firstName} ${form.lastName}`}
            uploadUrl={`/api/upload/staff-photo/${id}`}
            onUploaded={(url) => setForm((p: any) => ({ ...p, photoUrl: url }))}
            size="lg"
          />
          <div>
            <p className="font-semibold text-slate-800">Profile photo</p>
            <p className="text-sm text-slate-400 mt-0.5">Click the photo to upload a new image</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG or WebP · Max 5MB</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <Card>
          <SectionHeading title="Personal details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input label="Last name *" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            <Input label="Email address *" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)} options={GENDERS} placeholder="Select gender" />
            <Input label="Nationality" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
            <Select label="Marital status" value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} options={MARITAL} placeholder="Select status" />
            <Input label="NI number" value={form.niNumber} onChange={e => set('niNumber', e.target.value)} />
            <Input label="Address" value={form.address1} onChange={e => set('address1', e.target.value)} />
            <Input label="Postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Employment" />
          <div className="grid md:grid-cols-2 gap-4">
            <Select label="Role" value={form.role} onChange={e => set('role', e.target.value)} options={ROLES} />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={STATUSES} />
            {homes.length > 1 && (
              <Select label="Assigned home" value={form.homeId} onChange={e => set('homeId', e.target.value)}
                options={homes.map(h => ({ value: h.id, label: h.name }))} />
            )}
            <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            <Input label="Leave date" type="date" value={form.leaveDate} onChange={e => set('leaveDate', e.target.value)} hint="Only fill if staff has left" />
            <Input label="Annual leave hours" type="number" value={String(form.leaveHoursTotal)} onChange={e => set('leaveHoursTotal', parseInt(e.target.value))} hint="Total hours per year (default 224)" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="active" className="text-sm text-slate-700 font-medium">Account is active (can log in)</label>
          </div>
        </Card>

        <Card>
          <SectionHeading title="Emergency contact" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Contact name" value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} />
            <Input label="Contact phone" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
            <Input label="Notes" value={form.emergencyNotes} onChange={e => set('emergencyNotes', e.target.value)} className="md:col-span-2" />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Reset password" description="Leave blank to keep the current password" />
          <Input label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" hint="Only fill this in if you want to reset their password" />
        </Card>

        <Card>
          <SectionHeading title="Quick-login PIN"
            description={isOwnProfile ? 'Set a short PIN so you can sign in faster instead of typing your password' : 'Generate a quick-login PIN for this staff member'} />
          <div className="flex items-end gap-3">
            <Input label="New PIN" type="password" inputMode="numeric" value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4-8 digits" maxLength={8} />
            <Button type="button" onClick={savePin} loading={savingPin} disabled={!pin}>Set PIN</Button>
            <Button type="button" variant="outline" onClick={removePin}>Remove PIN</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionHeading title="Certificates & Documents" description="Training certificates, DBS, contracts and other key documents" />
            <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setUploadDocOpen(true)}>
              Upload
            </Button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No documents uploaded yet</p>
              <button onClick={() => setUploadDocOpen(true)} className="mt-2 text-xs text-amber-600 hover:underline font-medium">Upload a document</button>
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border border-slate-100 rounded-xl p-4 flex items-center gap-4 bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {doc.mime_type?.startsWith('image') ? <FileImage className="w-5 h-5 text-slate-500" /> : <FileText className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm">{doc.title || doc.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span className="capitalize">{STAFF_DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}</span>
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
                    <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} onClick={() => deleteDoc(doc.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {id && <UploadStaffDocModal open={uploadDocOpen} onClose={() => setUploadDocOpen(false)} staffId={id}
            onUploaded={(doc) => { setDocuments(prev => [doc, ...prev]); setUploadDocOpen(false); toast.success('Document uploaded') }} />}
        </Card>

        {canDelete && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
            <h3 className="font-semibold text-rose-800 mb-1">Danger zone</h3>
            <p className="text-sm text-rose-600 mb-3">Permanently delete this staff member and all their records. This cannot be undone.</p>
            <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} loading={deleting} onClick={deleteStaff}>
              Delete staff member permanently
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Link to="/staff"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button></Link>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save all changes</Button>
      </div>
    </div>
  )
}
