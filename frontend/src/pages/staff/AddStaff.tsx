import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { homesApi } from '../../api'
import api from '../../api'
import { Button, Input, Select, Card, SectionHeading, Modal } from '../../components/ui'
import { ArrowLeft, UserPlus, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'senior_carer', label: 'Senior Carer' },
  { value: 'home_manager', label: 'Home Manager' },
  { value: 'group_admin', label: 'Group Admin (full access)' },
  { value: 'auditor', label: 'Auditor' },
]

export default function AddStaff() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [homes, setHomes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [createdStaff, setCreatedStaff] = useState<{ email: string; temporaryPassword: string } | null>(null)
  const [form, setForm] = useState({
    homeId: '', firstName: '', lastName: '', email: '', phone: '',
    role: 'care_staff', startDate: '', dateOfBirth: '', gender: '',
    nationality: '', maritalStatus: '', address1: '', postcode: '',
    emergencyName: '', emergencyPhone: '', emergencyNotes: '',
    password: '', confirmPassword: '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      set('homeId', user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.homeId) {
      toast.error('Please fill in first name, last name, email and home')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/staff', form)
      const data = res.data.data
      if (data?.temporaryPassword) {
        setCreatedStaff({ email: data.email, temporaryPassword: data.temporaryPassword })
      } else {
        toast.success('Staff member added')
        navigate('/staff')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add staff')
    } finally { setSaving(false) }
  }

  const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }]
  const MARITAL = [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to staff
        </Link>
        <Button icon={<UserPlus className="w-4 h-4" />} loading={saving} onClick={save}>Add staff member</Button>
      </div>

      <h1 className="font-display text-2xl text-slate-900 mb-6">Add new staff member</h1>

      <div className="space-y-5">
        {homes.length > 1 && (
          <Card>
            <SectionHeading title="Care home" />
            <Select label="Assigned home *" value={form.homeId} onChange={e => set('homeId', e.target.value)}
              options={homes.map(h => ({ value: h.id, label: h.name }))} />
          </Card>
        )}

        <Card>
          <SectionHeading title="Personal details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} autoFocus />
            <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            <Input label="Email address *" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Phone number" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)} options={GENDERS} placeholder="Select gender" />
            <Input label="Nationality" value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. British" />
            <Select label="Marital status" value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} options={MARITAL} placeholder="Select status" />
            <Input label="Address" value={form.address1} onChange={e => set('address1', e.target.value)} className="md:col-span-2" />
            <Input label="Postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Employment details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Select label="Role *" value={form.role} onChange={e => set('role', e.target.value)} options={ROLES} />
            <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Emergency contact" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Contact name" value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} placeholder="Name of emergency contact" />
            <Input label="Contact phone" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
            <Input label="Notes" value={form.emergencyNotes} onChange={e => set('emergencyNotes', e.target.value)} className="md:col-span-2" placeholder="Relationship, any important notes..." />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Account password" description="Set an initial password for this staff member. They can change it after logging in." />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} hint="Min. 8 characters" />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
          </div>
        </Card>
      </div>

      <div className="flex justify-between mt-6">
        <Link to="/staff"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Cancel</Button></Link>
        <Button icon={<UserPlus className="w-4 h-4" />} loading={saving} onClick={save}>Add staff member</Button>
      </div>

      {/* Show generated credentials before navigating */}
      {createdStaff && (
        <Modal open={true} onClose={() => { setCreatedStaff(null); navigate('/staff') }} title="Staff member created">
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <CheckCircle className="w-5 h-5 text-amber-600 inline mr-2" />
              No password was set — a temporary one was generated. Share these credentials with the staff member.
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Email</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-mono text-slate-900">{createdStaff.email}</span>
                <button onClick={() => { navigator.clipboard.writeText(createdStaff.email); toast.success('Copied') }} className="text-slate-400 hover:text-slate-700"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Temporary password</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-mono text-slate-900 font-bold">{createdStaff.temporaryPassword}</span>
                <button onClick={() => { navigator.clipboard.writeText(createdStaff.temporaryPassword); toast.success('Copied') }} className="text-slate-400 hover:text-slate-700"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-xs text-slate-400">The staff member should change their password after first login.</p>
            <div className="flex justify-end pt-2">
              <Button onClick={() => { setCreatedStaff(null); navigate('/staff') }}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
