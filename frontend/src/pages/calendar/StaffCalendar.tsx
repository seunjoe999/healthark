import React, { useEffect, useState } from 'react'
import { homesApi, staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { ukDateStr } from '../../utils/ukDate'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isPast } from 'date-fns'
import { Spinner, Button, Modal, Input, Select } from '../../components/ui'
import { GraduationCap, Plus, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

// "Who should see this" — multi-select of real Teams when teams have been set
// up for this home; otherwise falls back to "All staff" only. Mirrors the same
// picker used for tasks (frontend/src/pages/tasks/Tasks.tsx).
function TeamVisibilitySelect({ teams, value, onChange }: { teams: any[]; value: string[]; onChange: (ids: string[]) => void }) {
  const allSelected = value.length === 0
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id))
    else onChange([...value, id])
  }
  return (
    <div>
      <label className="label">Visible to</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([])}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${allSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
          All staff
        </button>
        {teams.map(t => (
          <button type="button" key={t.id} onClick={() => toggle(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${value.includes(t.id) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
            {t.name}
          </button>
        ))}
      </div>
      {teams.length === 0 && <p className="text-xs text-slate-400 mt-1">No teams set up yet under Settings → Teams — everyone can see this, or book it for one specific staff member below.</p>}
    </div>
  )
}

// Staff Calendar is deliberately separate from the resident/service-user
// calendar — it's purely for things booked for the team (training, staff
// meetings), never mixed with a resident's own appointments. Rows here are
// the same calendar_events table but always have su_id = null.
const EVENT_TYPES = [
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Staff meeting' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  training: 'bg-orange-500', meeting: 'bg-purple-500', other: 'bg-slate-500',
}
const TYPE_BG: Record<string, string> = {
  training: 'bg-orange-50 border-orange-200 text-orange-800',
  meeting: 'bg-purple-50 border-purple-200 text-purple-800',
  other: 'bg-slate-50 border-slate-200 text-slate-800',
}

const MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager']

export default function StaffCalendarPage() {
  const { user, isRole } = useAuth()
  const canManage = isRole(...MANAGE_ROLES)
  const [events, setEvents] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome, currentMonth])

  useEffect(() => {
    if (!selectedHome) return
    staffApi.list({ homeId: selectedHome }).then(res => setStaffList(res.data.data || [])).catch(() => {})
    api.get('/teams', { params: { homeId: selectedHome } }).then(res => setTeams(res.data.data || [])).catch(() => setTeams([]))
  }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const res = await api.get('/calendar', { params: { homeId: selectedHome, from, to, audience: 'staff' } })
      setEvents(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deleteEvent = async (id: string) => {
    try {
      await api.delete(`/calendar/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      toast.success('Event deleted')
    } catch { toast.error('Failed to delete event') }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()
  const selectedDayEvents = selectedDay ? events.filter(e => isSameDay(new Date(e.event_date), selectedDay)) : []
  const upcoming = events.filter(e => {
    const d = new Date(e.event_date + (e.start_time ? `T${e.start_time}` : 'T00:00:00'))
    return !isPast(d) || isSameDay(d, new Date())
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-600" /> Staff Calendar
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Training and staff events — {events.length} this month</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add training/event</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
            <h3 className="font-semibold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>)}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), day))
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDay(day)}
                    className={`aspect-square rounded-lg p-1 text-left border transition-colors ${
                      selectedDay && isSameDay(day, selectedDay) ? 'border-purple-400 bg-purple-50' : isToday(day) ? 'border-amber-300 bg-amber-50/50' : 'border-transparent hover:bg-slate-50'
                    }`}>
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-amber-700' : 'text-slate-600'}`}>{format(day, 'd')}</span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map(e => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`} />)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Day / upcoming list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
          <h3 className="font-semibold text-slate-800 mb-3">{selectedDay ? format(selectedDay, 'd MMMM yyyy') : 'Upcoming'}</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {(selectedDay ? selectedDayEvents : upcoming).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No events</p>
            ) : (selectedDay ? selectedDayEvents : upcoming).map((e: any) => (
              <button key={e.id} onClick={() => setSelectedEvent(e)}
                className={`w-full text-left p-3 rounded-xl border ${TYPE_BG[e.event_type] || TYPE_BG.other}`}>
                <p className="font-semibold text-sm">{e.title}</p>
                <p className="text-xs opacity-75 mt-0.5 capitalize">{e.event_type} · {format(new Date(e.event_date), 'd MMM')}{e.start_time ? ` ${format(new Date(e.start_time), 'HH:mm')}` : ''}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AddStaffEventModal open={addOpen} onClose={() => setAddOpen(false)} homeId={selectedHome} defaultDate={selectedDay} staffList={staffList} teams={teams}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Added to staff calendar') }} />

      {selectedEvent && (
        <Modal open={true} onClose={() => setSelectedEvent(null)} title={selectedEvent.title}>
          <div className="space-y-3">
            <p className="text-sm text-slate-500 capitalize">{selectedEvent.event_type} · {format(new Date(selectedEvent.event_date), 'd MMMM yyyy')}{selectedEvent.start_time ? ` at ${format(new Date(selectedEvent.start_time), 'HH:mm')}` : ''}</p>
            {selectedEvent.description && <p className="text-sm text-slate-700">{selectedEvent.description}</p>}
            {selectedEvent.location && <p className="text-sm text-slate-500">Location: {selectedEvent.location}</p>}
            {selectedEvent.assigned_staff_name ? (
              <p className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full inline-block">Booked for: {selectedEvent.assigned_staff_name}</p>
            ) : selectedEvent.visible_team_ids && selectedEvent.visible_team_ids.length > 0 ? (
              <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full inline-block">
                Visible to: {selectedEvent.visible_team_ids.map((id: string) => teams.find(t => t.id === id)?.name || 'team').join(', ')}
              </p>
            ) : (
              <p className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full inline-block">Visible to: All staff</p>
            )}
            {canManage && (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => { if (confirm('Delete this event?')) deleteEvent(selectedEvent.id) }}>Delete</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function AddStaffEventModal({ open, onClose, homeId, defaultDate, staffList, teams, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; defaultDate: Date | null; staffList: any[]; teams: any[]; onSaved: () => void
}) {
  const blankForm = (d: Date | null) => ({
    title: '', eventType: 'training',
    eventDate: d ? format(d, 'yyyy-MM-dd') : ukDateStr(),
    startTime: '', endTime: '', description: '', location: '',
    assignedStaffId: '', visibleTeamIds: [] as string[],
  })
  const [form, setForm] = useState(blankForm(defaultDate))
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  // Reopening previously kept the last entry's title/description/visibility
  // instead of showing a blank form.
  useEffect(() => {
    if (open) setForm(blankForm(defaultDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/calendar', { homeId, ...form, assignedStaffId: form.assignedStaffId || null, allStaff: true })
      setForm(blankForm(defaultDate))
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to staff calendar">
      <form onSubmit={save} className="space-y-4">
        <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Manual handling training" autoFocus />
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.eventType} onChange={e => set('eventType', e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Date *" type="date" required value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
          <Input label="Start time" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          <Input label="End time" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Training room" />
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <TeamVisibilitySelect teams={teams} value={form.visibleTeamIds} onChange={ids => setForm(p => ({ ...p, visibleTeamIds: ids, assignedStaffId: ids.length ? '' : p.assignedStaffId }))} />
        <Select label="Or book for one specific staff member (optional)" value={form.assignedStaffId}
          onChange={e => setForm(p => ({ ...p, assignedStaffId: e.target.value, visibleTeamIds: e.target.value ? [] : p.visibleTeamIds }))}
          options={staffOptions} placeholder="Anyone covered above" />
        {(form.assignedStaffId || form.visibleTeamIds.length > 0) && (
          <p className="text-xs text-slate-400 -mt-2">Only {form.assignedStaffId ? 'that staff member' : 'staff on the selected team(s)'} (and management) will see this entry on the staff calendar.</p>
        )}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add</Button>
        </div>
      </form>
    </Modal>
  )
}
