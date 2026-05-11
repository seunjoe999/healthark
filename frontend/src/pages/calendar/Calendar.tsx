import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import { Spinner, Button, Modal, Input, Select } from '../../components/ui'
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const EVENT_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'activity', label: 'Activity' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'training', label: 'Training' },
  { value: 'review', label: 'Care review' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-blue-500',
  meeting: 'bg-purple-500',
  activity: 'bg-green-500',
  inspection: 'bg-red-500',
  training: 'bg-orange-500',
  review: 'bg-teal-500',
  other: 'bg-gray-500',
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()
  const selectedDayEvents = selectedDay ? events.filter(e => isSameDay(new Date(e.event_date), selectedDay)) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <CalIcon className="w-6 h-6 text-purple-600" /> Calendar
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} this month</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add event</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50" />)}
            {days.map(day => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), day))
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <button key={day.toString()} onClick={() => setSelectedDay(day)}
                  className={`min-h-[80px] border-b border-r border-gray-50 p-2 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}>
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? 'bg-purple-600 text-white' : isSelected ? 'bg-purple-100 text-purple-900' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e: any) => (
                      <div key={e.id} className={`text-xs text-white px-1.5 py-0.5 rounded truncate ${TYPE_COLORS[e.event_type] || 'bg-gray-500'}`}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <p className="text-xs text-gray-400">+{dayEvents.length - 2} more</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel — selected day events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {selectedDay ? format(selectedDay, 'EEEE, d MMMM') : 'Select a day'}
            </h3>
          </div>
          <div className="p-4">
            {!selectedDay ? (
              <p className="text-sm text-gray-400 text-center py-4">Click a day to see events</p>
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No events this day</p>
                <button onClick={() => setAddOpen(true)} className="text-sm text-purple-600 hover:underline mt-2">Add event</button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${TYPE_COLORS[e.event_type] || 'bg-gray-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.title}</p>
                      {e.start_time && <p className="text-xs text-gray-500">{e.start_time}{e.end_time ? ` — ${e.end_time}` : ''}</p>}
                      {e.description && <p className="text-xs text-gray-600 mt-1">{e.description}</p>}
                      <p className="text-xs text-gray-400 mt-1 capitalize">{(e.event_type || '').replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddEventModal open={addOpen} onClose={() => setAddOpen(false)} homeId={selectedHome} defaultDate={selectedDay}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Event added') }} />
    </div>
  )
}

function AddEventModal({ open, onClose, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void; homeId: string; defaultDate: Date | null; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: '', eventType: 'appointment', eventDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
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

  return (
    <Modal open={open} onClose={onClose} title="Add calendar event">
      <form onSubmit={save} className="space-y-4">
        <Input label="Event title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. GP appointment, Fire drill, Staff meeting..." />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Event type" value={form.eventType} onChange={e => set('eventType', e.target.value)} options={EVENT_TYPES} />
          <Input label="Date *" type="date" required value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          <Input label="End time" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Room, address, online..." />
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add event</Button>
        </div>
      </form>
    </Modal>
  )
}
