import React, { useEffect, useState } from 'react'
import { homesApi, staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { ukDateStr } from '../../utils/ukDate'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, subDays, addDays } from 'date-fns'
import { Spinner, Button, Modal, Input, Select, SectionHeading } from '../../components/ui'
import { GraduationCap, Plus, ChevronLeft, ChevronRight, Trash2, X, ListFilter, Search, CheckCircle2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

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

const EVENT_TYPES = [
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Staff meeting' },
  { value: 'supervision', label: 'Supervision / 1-to-1' },
  { value: 'inspection', label: 'Inspection / Audit' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  training: 'bg-orange-500',
  meeting: 'bg-purple-500',
  supervision: 'bg-teal-500',
  inspection: 'bg-red-500',
  other: 'bg-slate-500',
}
const TYPE_BG: Record<string, string> = {
  training: 'bg-orange-50 border-orange-200 text-orange-800',
  meeting: 'bg-purple-50 border-purple-200 text-purple-800',
  supervision: 'bg-teal-50 border-teal-200 text-teal-800',
  inspection: 'bg-red-50 border-red-200 text-red-800',
  other: 'bg-slate-50 border-slate-200 text-slate-800',
}

const MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager', 'super_admin']

export default function StaffCalendarPage() {
  const { user, isRole } = useAuth()
  const canManage = isRole(...MANAGE_ROLES)
  const [events, setEvents] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sideTab, setSideTab] = useState<'upcoming' | 'done'>('upcoming')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [dayOverflowModal, setDayOverflowModal] = useState<{ date: Date; items: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])

  // Searchable & filterable "All staff appointments & events" list (parity with Calendar.tsx)
  const [listEvents, setListEvents] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listFrom, setListFrom] = useState(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'))
  const [listTo, setListTo] = useState(() => format(addDays(new Date(), 60), 'yyyy-MM-dd'))
  const [listType, setListType] = useState('')
  const [listStaffId, setListStaffId] = useState('')
  const [listSearch, setListSearch] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const load = async () => {
    if (!selectedHome) return
    setLoading(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const res = await api.get('/calendar', { params: { homeId: selectedHome, from, to, audience: 'staff' } })
      setEvents(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadList = async () => {
    if (!selectedHome) return
    setListLoading(true)
    try {
      const res = await api.get('/calendar', {
        params: { homeId: selectedHome, from: listFrom, to: listTo, audience: 'staff' },
      })
      setListEvents(res.data.data || [])
    } catch { setListEvents([]) }
    finally { setListLoading(false) }
  }

  useEffect(() => { if (selectedHome) load() }, [selectedHome, currentMonth])
  useEffect(() => { if (selectedHome) loadList() }, [selectedHome, listFrom, listTo])

  useEffect(() => {
    if (!selectedHome) return
    staffApi.list({ homeId: selectedHome }).then(res => setStaffList(res.data.data || [])).catch(() => {})
    api.get('/teams', { params: { homeId: selectedHome } }).then(res => setTeams(res.data.data || [])).catch(() => setTeams([]))
  }, [selectedHome])

  const deleteEvent = async (id: string) => {
    try {
      await api.delete(`/calendar/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      await loadList()
      toast.success('Event deleted')
    } catch { toast.error('Failed to delete event') }
  }

  const todayStr = ukDateStr()
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()
  const selectedDayEvents = selectedDay ? events.filter(e => isSameDay(new Date(e.event_date), selectedDay)) : []

  const upcomingEvents = [...events]
    .filter(e => String(e.event_date).slice(0, 10) >= todayStr)
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
  const doneEvents = [...events]
    .filter(e => String(e.event_date).slice(0, 10) < todayStr)
    .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)))

  const listFiltersActive = Boolean(listType || listStaffId || listSearch.trim())
  const filteredList = listEvents.filter((e: any) => {
    if (listType && e.event_type !== listType) return false
    if (listStaffId && e.assigned_staff_id !== listStaffId && e.created_by !== listStaffId) return false
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase()
      const hay = [e.title, e.description, e.assigned_staff_name, e.created_by_name, e.outcome, e.mn_summary, e.mn_notes]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-600" /> Staff Calendar
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Training, meetings, supervisions &amp; staff schedules — {events.length} this month</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && (
            <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add training/event</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <h3 className="font-semibold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-slate-100">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1.5">{d}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), day))
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    className={`min-h-[72px] rounded-xl p-1.5 text-left border transition-colors flex flex-col ${
                      selectedDay && isSameDay(day, selectedDay) ? 'border-purple-400 bg-purple-50' : isToday(day) ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100 hover:bg-slate-50'
                    }`}>
                    <span className={`text-xs font-semibold mb-1 ${isToday(day) ? 'text-amber-700' : 'text-slate-600'}`}>{format(day, 'd')}</span>
                    <div className="space-y-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={`text-[10px] font-medium px-1 py-0.5 rounded truncate text-white ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={ev => { ev.stopPropagation(); setDayOverflowModal({ date: day, items: dayEvents }) }}
                          className="block text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1 py-0.5 rounded cursor-pointer"
                        >
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <Modal
          open={!!dayOverflowModal}
          onClose={() => setDayOverflowModal(null)}
          title={dayOverflowModal ? `Staff Events — ${format(dayOverflowModal.date, 'EEEE, d MMMM yyyy')} (${dayOverflowModal.items.length})` : 'Staff Events'}
          size="md"
        >
          {dayOverflowModal && (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto">
              {dayOverflowModal.items.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => { setDayOverflowModal(null); setSelectedEvent(e) }}
                  className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${TYPE_BG[e.event_type] || TYPE_BG.other}`}
                >
                  <p className="font-semibold text-sm">{e.title}</p>
                  {e.assigned_staff_name && <p className="text-xs font-semibold mt-0.5">👤 {e.assigned_staff_name}</p>}
                  <p className="text-xs opacity-75 mt-0.5 capitalize">{(e.event_type || '').replace('_', ' ')}</p>
                  {e.description && <p className="text-xs opacity-70 mt-1 line-clamp-2">{e.description}</p>}
                </button>
              ))}
            </div>
          )}
        </Modal>

        {/* Right sidebar — Day view OR Upcoming / Done toggle (mirrors Service User Calendar) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          {selectedDay ? (
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{format(selectedDay, 'd MMMM yyyy')}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-xs font-semibold text-purple-600 hover:underline">Show all</button>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-3">
              <button onClick={() => setSideTab('upcoming')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Upcoming ({upcomingEvents.length})
              </button>
              <button onClick={() => setSideTab('done')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === 'done' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Done ({doneEvents.length})
              </button>
            </div>
          )}

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
            {(() => {
              const shown = selectedDay ? selectedDayEvents : (sideTab === 'upcoming' ? upcomingEvents : doneEvents)
              if (shown.length === 0) {
                return <p className="text-sm text-slate-400 text-center py-8">No staff events</p>
              }
              return shown.map((e: any) => (
                <button key={e.id} onClick={() => setSelectedEvent(e)}
                  className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${TYPE_BG[e.event_type] || TYPE_BG.other}`}>
                  <p className="font-semibold text-sm">{e.title}</p>
                  {e.assigned_staff_name && <p className="text-xs font-semibold mt-0.5 opacity-90">👤 {e.assigned_staff_name}</p>}
                  <p className="text-xs opacity-75 mt-0.5 capitalize">
                    {(e.event_type || '').replace('_', ' ')} · {format(new Date(e.event_date), 'd MMM yyyy')}
                    {e.start_time && !isNaN(new Date(e.start_time).getTime()) ? ` · ${format(new Date(e.start_time), 'HH:mm')}` : ''}
                  </p>
                  {e.description && <p className="text-xs opacity-70 mt-1 line-clamp-2">{e.description}</p>}
                  <p className="text-[11px] font-semibold mt-1.5 opacity-75">Click to view details</p>
                </button>
              ))
            })()}
          </div>
        </div>
      </div>

      {/* All staff appointments & events — chronological searchable & filterable list directly below calendar grid */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-purple-600" /> All staff appointments &amp; events
          </h3>
          <p className="text-xs text-slate-400">{filteredList.length} of {listEvents.length} in range</p>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-end gap-3 bg-slate-50/60">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">From</label>
            <input type="date" className="input text-sm py-1.5" value={listFrom} onChange={e => setListFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">To</label>
            <input type="date" className="input text-sm py-1.5" value={listTo} onChange={e => setListTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Type</label>
            <select className="input text-sm py-1.5" value={listType} onChange={e => setListType(e.target.value)}>
              <option value="">All types</option>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Staff member</label>
            <select className="input text-sm py-1.5 max-w-[200px]" value={listStaffId} onChange={e => setListStaffId(e.target.value)}>
              <option value="">All staff</option>
              {staffList.map(st => <option key={st.id} value={st.id}>{st.first_name} {st.last_name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="input text-sm py-1.5 pl-8" placeholder="Title, staff name, notes..." value={listSearch} onChange={e => setListSearch(e.target.value)} />
            </div>
          </div>
          {listFiltersActive && (
            <button onClick={() => { setListType(''); setListStaffId(''); setListSearch('') }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
          {listLoading ? (
            <div className="py-10 text-center"><Spinner /></div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {listEvents.length === 0 ? 'No staff appointments or events in this date range.' : 'Nothing matches these filters.'}
            </div>
          ) : filteredList.map((e: any) => {
            const isPastEvent = String(e.event_date).slice(0, 10) < todayStr
            const outcomeText = e.outcome || e.mn_summary || e.mn_notes
            return (
              <button key={e.id} onClick={() => setSelectedEvent(e)}
                className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                <div className="w-16 flex-shrink-0 text-center">
                  <p className="text-xs font-bold text-slate-700">{format(new Date(e.event_date), 'd MMM')}</p>
                  <p className="text-[10px] text-slate-400">{format(new Date(e.event_date), 'yyyy')}</p>
                </div>
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_COLORS[e.event_type] || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 truncate">{e.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{(e.event_type || '').replace('_', ' ')}</span>
                    {isPastEvent && (outcomeText
                      ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Notes recorded</span>
                      : <span className="text-[10px] font-bold text-slate-400">Completed</span>)}
                  </div>
                  {e.assigned_staff_name ? (
                    <p className="text-xs text-purple-700 font-medium">Staff: {e.assigned_staff_name}</p>
                  ) : (
                    <p className="text-xs text-slate-500">All staff</p>
                  )}
                  {outcomeText && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{outcomeText}</p>}
                  {!outcomeText && e.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{e.description}</p>}
                </div>
                {e.start_time && !isNaN(new Date(e.start_time).getTime()) && (
                  <p className="text-xs text-slate-400 flex-shrink-0">{format(new Date(e.start_time), 'HH:mm')}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <AddStaffEventModal open={addOpen} onClose={() => setAddOpen(false)} homeId={selectedHome} defaultDate={selectedDay} staffList={staffList} teams={teams}
        onSaved={async () => { setAddOpen(false); await load(); await loadList(); toast.success('Added to staff calendar') }} />

      {selectedEvent && (
        <StaffEventDetailModal
          event={selectedEvent}
          teams={teams}
          canManage={canManage}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => { if (confirm('Delete this event?')) deleteEvent(selectedEvent.id) }}
          onSaved={async () => { setSelectedEvent(null); await load(); await loadList(); toast.success('Notes saved') }}
        />
      )}
    </div>
  )
}

function StaffEventDetailModal({ event, teams, canManage, onClose, onDelete, onSaved }: {
  event: any; teams: any[]; canManage: boolean; onClose: () => void; onDelete: () => void; onSaved: () => void
}) {
  const { user } = useAuth()
  const [notes, setNotes] = useState({ notes: '', actionPoints: '', concerns: '', attendees: '', outcome: '', summary: '' })
  const [hasExistingNotes, setHasExistingNotes] = useState(false)
  const [editing, setEditing] = useState(false)
  const [signoffs, setSignoffs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const set = (k: string, v: string) => setNotes(p => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get(`/calendar/${event.id}/notes`).then(res => {
      const d = res.data.data
      if (d.notes?.[0]) {
        const loaded = {
          notes: d.notes[0].notes || '',
          actionPoints: d.notes[0].action_points || '',
          concerns: d.notes[0].concerns || '',
          attendees: d.notes[0].attendees || '',
          outcome: d.notes[0].outcome || '',
          summary: d.notes[0].summary || '',
        }
        setNotes(loaded)
        const recorded = !!(loaded.notes || loaded.actionPoints || loaded.concerns || loaded.attendees || loaded.outcome || loaded.summary)
        setHasExistingNotes(recorded)
        setEditing(!recorded)
      } else {
        setHasExistingNotes(false)
        setEditing(true)
      }
      setSignoffs(d.signoffs || [])
    }).catch(() => setEditing(true)).finally(() => setLoading(false))
  }, [event.id])

  const save = async () => {
    setSaving(true)
    try { await api.post(`/calendar/${event.id}/notes`, notes); onSaved() }
    catch { toast.error('Failed to save notes') }
    finally { setSaving(false) }
  }

  const signOff = async () => {
    setSigning(true)
    try {
      await api.post(`/calendar/${event.id}/signoff`)
      const res = await api.get(`/calendar/${event.id}/notes`)
      setSignoffs(res.data.data.signoffs || [])
      toast.success('Signed off')
    } catch { toast.error('Failed') }
    finally { setSigning(false) }
  }

  const alreadySigned = signoffs.some(s => s.staff_id === user?.id)

  return (
    <Modal open={true} onClose={onClose} title={event.title} size="lg">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-purple-50 text-purple-900">
          <div className="space-y-1">
            <p className="text-sm font-bold capitalize">
              {(event.event_type || '').replace('_', ' ')} · {format(new Date(event.event_date), 'd MMMM yyyy')}
              {event.start_time && !isNaN(new Date(event.start_time).getTime()) ? ` at ${format(new Date(event.start_time), 'HH:mm')}` : ''}
            </p>
            {event.location && <p className="text-xs opacity-80">📍 {event.location}</p>}
            {event.assigned_staff_name ? (
              <span className="text-xs font-semibold text-purple-800 bg-white/80 px-2.5 py-0.5 rounded-full inline-block">
                Booked for: {event.assigned_staff_name}
              </span>
            ) : event.visible_team_ids && event.visible_team_ids.length > 0 ? (
              <span className="text-xs font-semibold text-indigo-800 bg-white/80 px-2.5 py-0.5 rounded-full inline-block">
                Visible to: {event.visible_team_ids.map((id: string) => teams.find(t => t.id === id)?.name || 'team').join(', ')}
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-full inline-block">
                Visible to: All staff
              </span>
            )}
          </div>
          {!loading && hasExistingNotes && !editing && canManage && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit notes</Button>
          )}
        </div>

        {event.description && (
          <div>
            <p className="doc-section-heading">Description</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-sm text-slate-400">Loading...</div>
        ) : !editing && hasExistingNotes ? (
          <div className="space-y-4">
            {notes.attendees && (
              <div>
                <p className="doc-section-heading">Attendees</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{notes.attendees}</div>
              </div>
            )}
            {notes.summary && (
              <div>
                <p className="doc-section-heading">Summary</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{notes.summary}</div>
              </div>
            )}
            {notes.notes && (
              <div>
                <p className="doc-section-heading">Notes &amp; Outcomes</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{notes.notes}</div>
              </div>
            )}
            {notes.actionPoints && (
              <div>
                <p className="doc-section-heading">Action Points</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{notes.actionPoints}</div>
              </div>
            )}
          </div>
        ) : (
          <>
            <SectionHeading title="Event notes & attendance" description="Record attendees, summary, and outcomes" />
            <div className="space-y-3">
              <div><label className="label">Attendees</label><input className="input" value={notes.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of staff present..." /></div>
              <div><label className="label">Summary</label><textarea className="input" rows={3} value={notes.summary} onChange={e => set('summary', e.target.value)} placeholder="Summarise what took place..." /></div>
              <div><label className="label">Action Points / Notes</label><textarea className="input" rows={3} value={notes.notes} onChange={e => set('notes', e.target.value)} placeholder="Follow-up notes..." /></div>
            </div>
          </>
        )}

        {signoffs.length > 0 && (
          <div>
            <p className="doc-section-heading">Signed Off By</p>
            <div className="flex flex-wrap gap-2">
              {signoffs.map((s: any) => (
                <span key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> {s.staff_name} · {s.signed_at ? format(new Date(s.signed_at), 'd MMM') : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {canManage ? (
            <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={onDelete}>Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            {!alreadySigned && (
              <Button variant="outline" size="sm" icon={<Check className="w-3.5 h-3.5" />} loading={signing} onClick={signOff}>Sign off</Button>
            )}
            {editing ? (
              <>
                {hasExistingNotes && <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel edit</Button>}
                <Button loading={saving} onClick={save}>Save</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
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
