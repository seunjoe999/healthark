import React, { useEffect, useState } from 'react'
import api, { staffApi } from '../../../api'
import { Button, Input } from '../../../components/ui'
import { format } from 'date-fns'
import { Users2 } from 'lucide-react'

export default function FollowUpForm({ suId, homeId, onSaved }: { suId: string; homeId: string; onSaved: () => void }) {
  const [staffList, setStaffList] = useState<any[]>([])
  const [teamsList, setTeamsList] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [staffIds, setStaffIds] = useState<string[]>([])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [form, setForm] = useState({ title: '', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!homeId) return
    staffApi.list({ homeId }).then(res => setStaffList(res.data.data || [])).catch(() => {})
    api.get('/teams', { params: { homeId } }).then(res => setTeamsList(res.data.data || [])).catch(() => {})
  }, [homeId])

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const filteredStaff = staffOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const filteredTeams = teamsList.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const totalSelected = staffIds.length + teamIds.length

  const toggleStaff = (id: string) => setStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleTeam = (id: string) => setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totalSelected) { alert('Select at least one staff member or team to follow up with'); return }
    setLoading(true)
    try {
      // Teams expand to their member staff IDs at send time, merged with any
      // individually-selected staff — same approach as the Inbox compose modal,
      // so a follow-up can be handed to a whole team, not just one person.
      const teamMemberIds = (await Promise.all(teamIds.map(id => api.get(`/teams/${id}/members`))))
        .flatMap(res => (res.data.data || []).map((m: any) => m.staff_id || m.id))
      const allStaffIds = Array.from(new Set([...staffIds, ...teamMemberIds]))
      await Promise.all(allStaffIds.map(assignedStaffId =>
        api.post('/tasks', { homeId, suId, ...form, assignedStaffId, category: 'follow_up', priority: 'normal' })
      ))
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-slate-500">Ask a colleague (or a whole team) to follow up on something about this resident on a specific day — e.g. checking a medication order arrived. It'll pop up as a task for them on the date and time you set.</p>
      <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check medication order arrived" autoFocus />
      <div><label className="label">Message *</label><textarea required className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details for whoever follows this up..." /></div>
      <div>
        <label className="label">Follow up with * {totalSelected > 0 && <span className="text-purple-600 font-semibold">({totalSelected} selected)</span>}</label>
        <input className="input mb-2 text-sm" placeholder="Search staff or teams..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto">
          {filteredTeams.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teams</p>
              {filteredTeams.map(t => (
                <label key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" className="rounded accent-purple-600" checked={teamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                  <Users2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{t.name}</span>
                </label>
              ))}
              <div className="border-t border-slate-100" />
            </>
          )}
          {filteredStaff.length > 0 && (
            <>
              {filteredTeams.length > 0 && <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff</p>}
              {filteredStaff.map(o => (
                <label key={o.value} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" className="rounded accent-purple-600" checked={staffIds.includes(o.value)} onChange={() => toggleStaff(o.value)} />
                  <span className="text-sm text-slate-700">{o.label}</span>
                </label>
              ))}
            </>
          )}
          {filteredStaff.length === 0 && filteredTeams.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No staff or teams found</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date *" type="date" required value={form.taskDate} onChange={e => set('taskDate', e.target.value)} />
        <Input label="Time *" type="time" required value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
      </div>
      <Button type="submit" loading={loading} className="w-full">Schedule follow up</Button>
    </form>
  )
}
