import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { homesApi } from '../../api'
import api from '../../api'
import { Button, Input, Select, Card, SectionHeading, Modal } from '../../components/ui'
import { ArrowLeft, UserPlus, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function AddStaff() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [homes, setHomes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [createdStaff, setCreatedStaff] = useState<{ email: string; temporaryPassword: string } | null>(null)
  const [form, setForm] = useState({ homeId: '', firstName: '', lastName: '', email: '' })
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
      toast.error('Please fill in first name, last name and email')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/staff', { ...form, role: 'care_staff' })
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

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to staff
        </Link>
        <Button icon={<UserPlus className="w-4 h-4" />} loading={saving} onClick={save}>Add staff member</Button>
      </div>

      <h1 className="font-display text-2xl text-slate-900 mb-2">Add new staff member</h1>
      <p className="text-sm text-slate-400 mb-6">Just their name and email to get started — they can fill in the rest of their profile after logging in.</p>

      <div className="space-y-5">
        {homes.length > 1 && (
          <Card>
            <SectionHeading title="Care home" />
            <Select label="Assigned home *" value={form.homeId} onChange={e => set('homeId', e.target.value)}
              options={homes.map(h => ({ value: h.id, label: h.name }))} />
          </Card>
        )}

        <Card>
          <SectionHeading title="Staff details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First name *" required value={form.firstName} onChange={e => set('firstName', e.target.value)} autoFocus />
            <Input label="Last name *" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            <Input label="Email address *" type="email" required value={form.email} onChange={e => set('email', e.target.value)} className="md:col-span-2" />
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
              A temporary password was generated. Share these credentials with the staff member so they can log in and complete their profile.
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
            <p className="text-xs text-slate-400">The staff member should change their password after first login, and can fill in the rest of their profile from their account settings.</p>
            <div className="flex justify-end pt-2">
              <Button onClick={() => { setCreatedStaff(null); navigate('/staff') }}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
