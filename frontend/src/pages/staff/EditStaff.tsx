import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { staffApi, homesApi } from '../../api'
import api from '../../api'
import { Button, Input, Select, Card, SectionHeading, Spinner } from '../../components/ui'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'admin', label: 'Admin' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'home_manager', label: 'Manager' },
  { value: 'group_admin', label: 'Director' },
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
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [homes, setHomes] = useState<any[]>([])
  const [newPassword, setNewPassword] = useState('')
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!id) return
    Promise.all([staffApi.get(id), homesApi.list()]).then(([sRes, hRes]) => {
      setForm(norm(sRes.data.data))
      setHomes(hRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

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
          <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} loading={deleting} onClick={deleteStaff}>Delete</Button>
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

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <h3 className="font-semibold text-rose-800 mb-1">Danger zone</h3>
          <p className="text-sm text-rose-600 mb-3">Permanently delete this staff member and all their records. This cannot be undone.</p>
          <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} loading={deleting} onClick={deleteStaff}>
            Delete staff member permanently
          </Button>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Link to="/staff"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button></Link>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save all changes</Button>
      </div>
    </div>
  )
}
