import React, { useEffect, useState } from 'react'
import api, { staffApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'
import { format } from 'date-fns'

export default function FollowUpForm({ suId, homeId, onSaved }: { suId: string; homeId: string; onSaved: () => void }) {
  const [staffList, setStaffList] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '', assignedStaffId: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (homeId) staffApi.list({ homeId }).then(res => setStaffList(res.data.data || [])).catch(() => {})
  }, [homeId])

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assignedStaffId) { alert('Select who this follow up is for'); return }
    setLoading(true)
    try {
      await api.post('/tasks', { homeId, suId, ...form, category: 'follow_up', priority: 'normal' })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-slate-500">Ask a colleague to follow up on something about this resident on a specific day — e.g. checking a medication order arrived. It'll pop up as a task for them on the date and time you set.</p>
      <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check medication order arrived" autoFocus />
      <div><label className="label">Message *</label><textarea required className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details for whoever follows this up..." /></div>
      <Select label="Follow up with *" required value={form.assignedStaffId} onChange={e => set('assignedStaffId', e.target.value)}
        options={staffOptions} placeholder="Select staff member" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date *" type="date" required value={form.taskDate} onChange={e => set('taskDate', e.target.value)} />
        <Input label="Time *" type="time" required value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
      </div>
      <Button type="submit" loading={loading} className="w-full">Schedule follow up</Button>
    </form>
  )
}
