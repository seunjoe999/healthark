import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isPast } from 'date-fns'
import { Spinner, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, FileText, Check, Clock, CheckCircle2 } from 'lucide-react'
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

const ALL_TYPES = [...APPOINTMENT_TYPES, ...EVENT_TYPES]

const APPOINTMENT_TYPE_VALUES = APPOINTMENT_TYPES.map(t => t.value)

const TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-blue-500',
  meeting: 'bg-purple-500',
  activity: 'bg-green-500',
  inspection: 'bg-red-500',
  training: 'bg-orange-500',
  review: 'bg-teal-500',
  other: 'bg-slate-500',
}

const TYPE_BG: Record<string, string> = {
  appointment: 'bg-blue-50 border-blue-200 text-blue-800',
  meeting: 'bg-purple-50 border-purple-200 text-purple-800',
  activity: 'bg-green-50 border-green-200 text-green-800',
  inspection: 'bg-red-50 border-red-200 text-red-800',
  training: 'bg-orange-50 border-orange-200 text-orange-800',
  review: 'bg-teal-50 border-teal-200 text-teal-800',
  other: 'bg-slate-50 border-slate-200 text-slate-800',
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sideTab, setSideTab] = useState<'upcoming' | 'done'>('upcoming')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome, currentMonth])

  const load = async () => {
    setLoading(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const res = await api.get('/calendar', { params: { homeId: selectedHome, from, to } })
      setEvents(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return
    try {
      await api.delete(`/calendar/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      toast.success('Event deleted')
    } catch { toast.error('Failed') }
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
                    {dayEvents.length > 2 && <p className="text-xs text-slate-400">+{dayEvents.length - 2} more</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

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
                  {e.start_time && <p className="text-xs opacity-70">{e.start_time}{e.end_time ? ` — ${e.end_time}` : ''}</p>}
                  {e.description && <p className="text-xs opacity-60 mt-1 line-clamp-2">{e.description}</p>}
                  <p className="text-xs font-semibold mt-2 opacity-70 capitalize">{(e.event_type || '').replace('_', ' ')} · Click to view details</p>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>

      <AddEventModal open={addOpen} onClose={() => setAddOpen(false)} homeId={selectedHome} defaultDate={selectedDay}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Event added') }} />

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)}
          onDeleted={() => { setSelectedEvent(null); deleteEvent(selectedEvent.id) }}
          onSaved={async () => { setSelectedEvent(null); await load(); toast.success('Notes saved') }} />
      )}
    </div>
  )
}

function EventDetailModal({ event, onClose, onDeleted, onSaved }: { event: any; onClose: () => void; onDeleted: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const isAppointment = APPOINTMENT_TYPE_VALUES.includes(event.event_type)
  const [notes, setNotes] = useState({ notes: '', actionPoints: '', concerns: '', attendees: '', outcome: '', summary: '' })
  const [signoffs, setSignoffs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const set = (k: string, v: string) => setNotes(p => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get(`/calendar/${event.id}/notes`).then(res => {
      const d = res.data.data
      if (d.notes?.[0]) setNotes({
        notes: d.notes[0].notes || '',
        actionPoints: d.notes[0].action_points || '',
        concerns: d.notes[0].concerns || '',
        attendees: d.notes[0].attendees || '',
        outcome: d.notes[0].outcome || '',
        summary: d.notes[0].summary || '',
      })
      setSignoffs(d.signoffs || [])
    }).catch(() => {}).finally(() => setLoading(false))
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
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Event info */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${typeStyle[event.event_type] || typeStyle.other}`}>
          <div>
            <p className="text-sm font-semibold capitalize">{(event.event_type || '').replace('_', ' ')}</p>
            <p className="text-xs opacity-70">{event.event_date ? format(new Date(event.event_date), 'd MMMM yyyy') : ''}{event.start_time ? ` · ${event.start_time}` : ''}{event.end_time ? `–${event.end_time}` : ''}</p>
            {event.location && <p className="text-xs opacity-70">📍 {event.location}</p>}
          </div>
        </div>

        {/* Appointment fields */}
        {isAppointment ? (
          <>
            <SectionHeading title="Appointment details" description="Record what happened and the outcome" />
            {loading ? <div className="text-center py-4 text-sm text-slate-400">Loading...</div> : (
              <div className="space-y-3">
                <div><label className="label">Attendees / who was present</label><input className="input" value={notes.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of people present..." /></div>
                <div><label className="label">Notes</label><textarea className="input" rows={3} value={notes.notes} onChange={e => set('notes', e.target.value)} placeholder="What happened during this appointment..." /></div>
                <div><label className="label">Outcome *</label><textarea className="input" rows={3} value={notes.outcome} onChange={e => set('outcome', e.target.value)} placeholder="What was the outcome? Any decisions, referrals, or follow-ups..." /></div>
                <div><label className="label">Concerns raised</label><textarea className="input" rows={2} value={notes.concerns} onChange={e => set('concerns', e.target.value)} placeholder="Any concerns identified..." /></div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Event (meeting/activity/training/other) fields */}
            <SectionHeading title="Event details" description="Document what took place" />
            {loading ? <div className="text-center py-4 text-sm text-slate-400">Loading...</div> : (
              <div className="space-y-3">
                <div><label className="label">Attendees</label><input className="input" value={notes.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of people present..." /></div>
                <div><label className="label">Summary</label><textarea className="input" rows={4} value={notes.summary} onChange={e => set('summary', e.target.value)} placeholder="Summarise what took place..." /></div>
                <div><label className="label">Notes</label><textarea className="input" rows={3} value={notes.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." /></div>
              </div>
            )}
          </>
        )}

        {/* Sign-offs */}
        {signoffs.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Signed off by</p>
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
          <Button variant="danger" size="sm" onClick={onDeleted}>Delete</Button>
          <div className="flex gap-2">
            {!alreadySigned && (
              <Button variant="outline" size="sm" icon={<Check className="w-3.5 h-3.5" />} loading={signing} onClick={signOff}>Sign off</Button>
            )}
            {alreadySigned && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Signed</span>}
            <Button loading={saving} onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function AddEventModal({ open, onClose, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; defaultDate: Date | null; onSaved: () => void
}) {
  const [kind, setKind] = useState<'appointment' | 'event'>('appointment')
  const [form, setForm] = useState({
    title: '', eventType: 'appointment',
    eventDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
    startTime: '', endTime: '', description: '', location: ''
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/calendar', { homeId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const typeOptions = kind === 'appointment' ? APPOINTMENT_TYPES : EVENT_TYPES

  return (
    <Modal open={open} onClose={onClose} title="Add to calendar">
      <div className="space-y-4">
        {/* Kind selector */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button type="button" onClick={() => { setKind('appointment'); set('eventType', 'appointment') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'appointment' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
            Appointment
          </button>
          <button type="button" onClick={() => { setKind('event'); set('eventType', 'meeting') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'event' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
            Event
          </button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <Input label={`${kind === 'appointment' ? 'Appointment' : 'Event'} title *`} required value={form.title} onChange={e => set('title', e.target.value)} placeholder={kind === 'appointment' ? 'e.g. GP appointment, Dental check...' : 'e.g. Fire drill, Staff meeting...'} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.eventType} onChange={e => set('eventType', e.target.value)} options={typeOptions} />
            <Input label="Date *" type="date" required value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
          </div>
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
