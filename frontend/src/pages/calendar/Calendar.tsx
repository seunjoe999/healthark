import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { ukDateStr } from '../../utils/ukDate'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isPast } from 'date-fns'
import { Spinner, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, FileText, Check, Clock, CheckCircle2, BookOpen, Search, ListFilter, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const APPOINTMENT_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'review', label: 'Care review' },
  { value: 'inspection', label: 'Inspection' },
]

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'activity', label: 'Activity' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

const TASK_TYPES = [
  { value: 'task', label: 'Task' },
]

const ALL_TYPES = [...APPOINTMENT_TYPES, ...EVENT_TYPES, ...TASK_TYPES]

const APPOINTMENT_TYPE_VALUES = APPOINTMENT_TYPES.map(t => t.value)

const TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-blue-500',
  meeting: 'bg-purple-500',
  activity: 'bg-green-500',
  inspection: 'bg-red-500',
  training: 'bg-orange-500',
  review: 'bg-teal-500',
  other: 'bg-slate-500',
  task: 'bg-indigo-500',
}

const TYPE_BG: Record<string, string> = {
  appointment: 'bg-blue-50 border-blue-200 text-blue-800',
  meeting: 'bg-purple-50 border-purple-200 text-purple-800',
  activity: 'bg-green-50 border-green-200 text-green-800',
  inspection: 'bg-red-50 border-red-200 text-red-800',
  training: 'bg-orange-50 border-orange-200 text-orange-800',
  review: 'bg-teal-50 border-teal-200 text-teal-800',
  other: 'bg-slate-50 border-slate-200 text-slate-800',
  task: 'bg-indigo-50 border-indigo-200 text-indigo-800',
}

// Management plans the calendar; care staff view it but don't add to it —
// matches the backend gate on POST/DELETE /api/calendar.
const CALENDAR_MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager']

export default function CalendarPage() {
  const { user, isRole } = useAuth()
  const canManageCalendar = isRole(...CALENDAR_MANAGE_ROLES)
  const [events, setEvents] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [dayOverflowModal, setDayOverflowModal] = useState<{ date: Date; items: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sideTab, setSideTab] = useState<'upcoming' | 'done'>('upcoming')

  // Searchable list underneath the calendar (RoundSys-style) — the grid above
  // only ever shows the month on screen, so finding "what happened at Mrs
  // Smith's last review" meant guessing the date and clicking into it. This
  // list is its own query, independent of which month the grid is showing,
  // filtered by date range, type and resident so a specific appointment can
  // be found directly instead of hunting through the calendar day by day.
  const todayStrForList = ukDateStr()
  const [listFrom, setListFrom] = useState(format(addMonths(new Date(), -3), 'yyyy-MM-dd'))
  const [listTo, setListTo] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [listType, setListType] = useState('')
  const [listSuId, setListSuId] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [listEvents, setListEvents] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [allSus, setAllSus] = useState<any[]>([])

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome, currentMonth])

  useEffect(() => { if (selectedHome) suApi.list(selectedHome).then(res => setAllSus(res.data.data || [])).catch(() => {}) }, [selectedHome])

  const loadList = async () => {
    if (!selectedHome) return
    setListLoading(true)
    try {
      const params: Record<string, string> = { homeId: selectedHome, audience: 'resident' }
      if (listFrom) params.from = listFrom
      if (listTo) params.to = listTo
      const res = await api.get('/calendar', { params })
      setListEvents(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setListLoading(false) }
  }
  useEffect(() => { loadList() }, [selectedHome, listFrom, listTo])

  const getSuName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
  const filteredList = listEvents
    .filter(e => !listType || e.event_type === listType)
    .filter(e => !listSuId || e.su_id === listSuId)
    .filter(e => !listSearch.trim() || `${e.title} ${e.description || ''} ${e.su_name || ''}`.toLowerCase().includes(listSearch.trim().toLowerCase()))
    .sort((a, b) => new Date(b.start_time || b.event_date).getTime() - new Date(a.start_time || a.event_date).getTime())
  const listFiltersActive = !!(listType || listSuId || listSearch.trim())

  const load = async () => {
    setLoading(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const res = await api.get('/calendar', { params: { homeId: selectedHome, from, to, audience: 'resident' } })
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <CalIcon className="w-6 h-6 text-purple-600" /> Calendar
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} this month</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add event</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-50">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} className="min-h-[80px] border-b border-r border-slate-50" />)}
            {days.map(day => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), day))
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const today = isToday(day)
              return (
                <button key={day.toString()} onClick={() => setSelectedDay(day)}
                  className={`min-h-[80px] border-b border-r border-slate-50 p-2 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}>
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${today ? 'text-white font-bold' : isSelected ? 'text-purple-900' : 'text-slate-600'}`}
                    style={today ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e: any) => (
                      <div key={e.id} className={`text-xs text-white px-1.5 py-0.5 rounded truncate ${TYPE_COLORS[e.event_type] || 'bg-slate-500'}`}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={ev => { ev.stopPropagation(); setDayOverflowModal({ date: day, items: dayEvents }) }}
                        className="block text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <Modal
          open={!!dayOverflowModal}
          onClose={() => setDayOverflowModal(null)}
          title={dayOverflowModal ? `Events — ${format(dayOverflowModal.date, 'EEEE, d MMMM yyyy')} (${dayOverflowModal.items.length})` : 'Events'}
          size="md"
        >
          {dayOverflowModal && (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto">
              {dayOverflowModal.items.map((e: any) => (
                <div
                  key={e.id}
                  onClick={() => { setDayOverflowModal(null); setSelectedEvent(e) }}
                  className={`p-3.5 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${TYPE_BG[e.event_type] || TYPE_BG.other}`}
                >
                  <p className="font-semibold text-sm">{e.title}</p>
                  {e.su_name && <p className="text-xs font-semibold mt-0.5">👤 {e.su_name}</p>}
                  <p className="text-xs opacity-75 mt-0.5 capitalize">{(e.event_type || '').replace('_', ' ')}</p>
                  {e.description && <p className="text-xs opacity-70 mt-1 line-clamp-2">{e.description}</p>}
                </div>
              ))}
            </div>
          )}
        </Modal>

        {/* Side panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">
              {selectedDay ? format(selectedDay, 'EEEE, d MMMM') : 'All events'}
            </h3>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setSideTab('upcoming')} className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${sideTab === 'upcoming' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
                <Clock className="w-3 h-3" /> Upcoming
              </button>
              <button onClick={() => setSideTab('done')} className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${sideTab === 'done' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3 h-3" /> Done
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(() => {
              const now = new Date()
              const pool = selectedDay ? selectedDayEvents : events
              const shown = pool.filter(e => {
                const d = new Date(e.event_date + (e.start_time ? `T${e.start_time}` : 'T00:00:00'))
                return sideTab === 'upcoming' ? !isPast(d) || isSameDay(d, now) : isPast(d) && !isSameDay(d, now)
              })
              if (shown.length === 0) return (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400">{sideTab === 'upcoming' ? 'No upcoming events' : 'No completed events'}</p>
                  {sideTab === 'upcoming' && <button onClick={() => setAddOpen(true)} className="text-sm text-purple-600 hover:underline mt-2 font-medium">Add event</button>}
                </div>
              )
              return shown.map((e: any) => (
                <div key={e.id} className={`p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${TYPE_BG[e.event_type] || TYPE_BG.other} ${sideTab === 'done' ? 'opacity-70' : ''}`}
                  onClick={() => setSelectedEvent(e)}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm">{e.title}</p>
                    {sideTab === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 opacity-60" /> : <FileText className="w-3.5 h-3.5 opacity-60" />}
                  </div>
                  {!selectedDay && <p className="text-xs opacity-60 mb-0.5">{format(new Date(e.event_date), 'd MMM yyyy')}</p>}
                  {e.start_time && !isNaN(new Date(e.start_time).getTime()) && (
                    <p className="text-xs opacity-70">
                      {format(new Date(e.start_time), 'HH:mm')}
                      {e.end_time && !isNaN(new Date(e.end_time).getTime()) ? ` — ${format(new Date(e.end_time), 'HH:mm')}` : ''}
                    </p>
                  )}
                  {e.description && <p className="text-xs opacity-60 mt-1 line-clamp-2">{e.description}</p>}
                  <p className="text-xs font-semibold mt-2 opacity-70 capitalize">{(e.event_type || '').replace('_', ' ')} · Click to view details</p>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>

      {/* All appointments & events — a searchable list independent of the grid
          above, so finding what happened at a past appointment (or what's
          coming up) doesn't mean guessing a date and clicking into it. */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-purple-600" /> All appointments &amp; events
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
              {APPOINTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Service user</label>
            <select className="input text-sm py-1.5 max-w-[200px]" value={listSuId} onChange={e => setListSuId(e.target.value)}>
              <option value="">All service users</option>
              {allSus.map(su => <option key={su.id} value={su.id}>{getSuName(su)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="input text-sm py-1.5 pl-8" placeholder="Title, notes, service user..." value={listSearch} onChange={e => setListSearch(e.target.value)} />
            </div>
          </div>
          {listFiltersActive && (
            <button onClick={() => { setListType(''); setListSuId(''); setListSearch('') }}
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
              {listEvents.length === 0 ? 'No appointments or events in this date range.' : 'Nothing matches these filters.'}
            </div>
          ) : filteredList.map((e: any) => {
            const isPastEvent = String(e.event_date).slice(0, 10) < todayStrForList
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
                      ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Outcome recorded</span>
                      : <span className="text-[10px] font-bold text-amber-600">No outcome recorded yet</span>)}
                  </div>
                  {e.su_name && <p className="text-xs text-purple-700 font-medium">{e.su_name}</p>}
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

      <AddEventModal open={addOpen} onClose={() => setAddOpen(false)} homeId={selectedHome} defaultDate={selectedDay} canManageCalendar={canManageCalendar}
        onSaved={async () => { setAddOpen(false); await load(); await loadList(); toast.success('Event added') }} />

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)}
          onDeleted={() => { if (!confirm('Delete this event?')) return; const id = selectedEvent.id; setSelectedEvent(null); deleteEvent(id); loadList() }}
          onSaved={async () => { setSelectedEvent(null); await load(); await loadList(); toast.success('Notes saved') }} />
      )}
    </div>
  )
}

function EventDetailModal({ event, onClose, onDeleted, onSaved }: { event: any; onClose: () => void; onDeleted: () => void; onSaved: () => void }) {
  const { user, isRole } = useAuth()
  const canManageCalendar = isRole(...CALENDAR_MANAGE_ROLES)
  const isAppointment = APPOINTMENT_TYPE_VALUES.includes(event.event_type)
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
    }).catch(() => {
      setEditing(true)
    }).finally(() => setLoading(false))
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
  const typeStyle: Record<string, string> = {
    appointment: 'bg-blue-50 text-blue-700', meeting: 'bg-purple-50 text-purple-700',
    activity: 'bg-green-50 text-green-700', inspection: 'bg-red-50 text-red-700',
    training: 'bg-orange-50 text-orange-700', review: 'bg-teal-50 text-teal-700',
    other: 'bg-slate-50 text-slate-700'
  }

  return (
    <Modal open={true} onClose={onClose} title={event.title} size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Event info */}
        <div className={`flex items-center justify-between gap-3 p-3.5 rounded-xl ${typeStyle[event.event_type] || typeStyle.other}`}>
          <div>
            <p className="text-sm font-bold capitalize">{(event.event_type || '').replace('_', ' ')}</p>
            {(() => {
              const fmtT = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '' : format(d, 'HH:mm') }
              const st = event.start_time ? fmtT(event.start_time) : ''
              const et = event.end_time ? fmtT(event.end_time) : ''
              return (
                <p className="text-xs opacity-80">
                  {event.event_date ? format(new Date(event.event_date), 'd MMMM yyyy') : ''}{st ? ` · ${st}` : ''}{et ? `–${et}` : ''}
                </p>
              )
            })()}
            {event.su_name && <p className="text-xs font-semibold mt-0.5">Resident: {event.su_name}</p>}
            {event.location && <p className="text-xs opacity-80">📍 {event.location}</p>}
          </div>
          {!loading && hasExistingNotes && !editing && canManageCalendar && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit notes</Button>
          )}
        </div>

        {event.description && (
          <div>
            <p className="doc-section-heading">Booking Description</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          </div>
        )}

        {/* Read-only view when outcome/notes have already been recorded, vs form when unrecorded or explicitly editing */}
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-400">Loading...</div>
        ) : !editing && hasExistingNotes ? (
          <div className="space-y-4">
            {notes.attendees && (
              <div>
                <p className="doc-section-heading">Attendees / Who Was Present</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.attendees}
                </div>
              </div>
            )}
            {notes.outcome && (
              <div>
                <p className="doc-section-heading">Outcome</p>
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.outcome}
                </div>
              </div>
            )}
            {notes.summary && (
              <div>
                <p className="doc-section-heading">Summary</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.summary}
                </div>
              </div>
            )}
            {notes.notes && (
              <div>
                <p className="doc-section-heading">Appointment Outcome &amp; Notes</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.notes}
                </div>
              </div>
            )}
            {notes.concerns && (
              <div>
                <p className="doc-section-heading">Concerns</p>
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.concerns}
                </div>
              </div>
            )}
            {notes.actionPoints && (
              <div>
                <p className="doc-section-heading">Action Points &amp; Follow-up</p>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {notes.actionPoints}
                </div>
              </div>
            )}
          </div>
        ) : isAppointment ? (
          <>
            <SectionHeading title="Appointment details" description="Record what happened and the outcome" />
            <div className="space-y-3">
              <div><label className="label">Attendees / who was present</label><input className="input" value={notes.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of people present..." /></div>
              <div><label className="label">Notes / Outcome</label><textarea className="input" rows={4} value={notes.notes} onChange={e => set('notes', e.target.value)} placeholder="What happened during this appointment..." /></div>
              <div><label className="label">Action Points</label><textarea className="input" rows={3} value={notes.actionPoints} onChange={e => set('actionPoints', e.target.value)} placeholder="Any actions or follow-ups required..." /></div>
            </div>
          </>
        ) : (
          <>
            <SectionHeading title="Event details" description="Document what took place" />
            <div className="space-y-3">
              <div><label className="label">Attendees</label><input className="input" value={notes.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of people present..." /></div>
              <div><label className="label">Summary</label><textarea className="input" rows={4} value={notes.summary} onChange={e => set('summary', e.target.value)} placeholder="Summarise what took place..." /></div>
              <div><label className="label">Notes</label><textarea className="input" rows={3} value={notes.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." /></div>
            </div>
          </>
        )}

        {/* Sign-offs */}
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
          {canManageCalendar ? <Button variant="danger" size="sm" onClick={onDeleted}>Delete</Button> : <span />}
          <div className="flex gap-2">
            {isAppointment && event.su_id && (
              <Link to={`/diary?su=${event.su_id}`}>
                <Button variant="outline" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>Log in Resident Diary</Button>
              </Link>
            )}
            {!alreadySigned && (
              <Button variant="outline" size="sm" icon={<Check className="w-3.5 h-3.5" />} loading={signing} onClick={signOff}>Sign off</Button>
            )}
            {alreadySigned && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Signed</span>}
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

function AddEventModal({ open, onClose, homeId, defaultDate, canManageCalendar, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; defaultDate: Date | null; canManageCalendar: boolean; onSaved: () => void
}) {
  const [kind, setKind] = useState<'appointment' | 'event' | 'task'>('appointment')
  const blankForm = (d: Date | null) => ({
    title: '', eventType: 'appointment', suId: '',
    eventDate: d ? format(d, 'yyyy-MM-dd') : ukDateStr(),
    startTime: '', endTime: '', description: '', location: ''
  })
  const [form, setForm] = useState(blankForm(defaultDate))
  const [sus, setSus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Reopening the modal previously kept whatever was left over from the last
  // appointment (title, description, type...) — this was silently showing
  // the previous entry's details instead of a blank form.
  useEffect(() => {
    if (open) { setForm(blankForm(defaultDate)); setKind('appointment') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && homeId) suApi.list(homeId).then(res => setSus(res.data.data || [])).catch(() => {})
  }, [open, homeId])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/calendar', { homeId, ...form, suId: form.suId || null })
      setForm(blankForm(defaultDate))
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const typeOptions = kind === 'appointment' ? APPOINTMENT_TYPES : kind === 'event' ? EVENT_TYPES : TASK_TYPES
  const getSuName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()

  return (
    <Modal open={open} onClose={onClose} title="Add to calendar">
      <div className="space-y-4">
        {/* Kind selector — Event/Task have no resident attached, so only
            management can create them (matches the backend gate); care staff
            booking a resident's own appointment always see that option. */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button type="button" onClick={() => { setKind('appointment'); set('eventType', 'appointment') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'appointment' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
            Appointment
          </button>
          {canManageCalendar && (
            <>
              <button type="button" onClick={() => { setKind('event'); set('eventType', 'meeting') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'event' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
                Event
              </button>
              <button type="button" onClick={() => { setKind('task'); set('eventType', 'task') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'task' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                Task
              </button>
            </>
          )}
        </div>
        <form onSubmit={save} className="space-y-4">
          <Input label={`${kind === 'appointment' ? 'Appointment' : kind === 'event' ? 'Event' : 'Task'} title *`} required value={form.title} onChange={e => set('title', e.target.value)} placeholder={kind === 'appointment' ? 'e.g. GP appointment, Dental check...' : kind === 'event' ? 'e.g. Fire drill, Staff meeting...' : 'e.g. Order supplies, Follow up with GP...'} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.eventType} onChange={e => set('eventType', e.target.value)} options={typeOptions} />
            <Input label="Date *" type="date" required value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
          </div>
          {kind === 'appointment' && (
            <Select label="Service user" value={form.suId} onChange={e => set('suId', e.target.value)}
              options={[{ value: '', label: 'Not resident-specific' }, ...sus.map(su => ({ value: su.id, label: getSuName(su) }))]} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            <Input label="End time" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </div>
          <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Room, address, online..." />
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
