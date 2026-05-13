import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, staffApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Users, Plus, ChevronLeft, ChevronRight, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const SHIFT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'early', label: 'Early (7am–2pm)' },
  { value: 'late', label: 'Late (2pm–10pm)' },
  { value: 'night', label: 'Night (10pm–7am)' },
  { value: 'waking_night', label: 'Waking night' },
  { value: 'sleep_in', label: 'Sleep in' },
]

const SHIFT_COLORS: Record<string, string> = {
  early: 'bg-blue-100 text-blue-800 border-blue-200',
  late: 'bg-purple-100 text-purple-800 border-purple-200',
  night: 'bg-slate-700 text-white border-slate-600',
  waking_night: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  sleep_in: 'bg-teal-100 text-teal-800 border-teal-200',
  regular: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export default function Rota() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [suList, setSuList] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      const hid = user?.homeId || h[0]?.id || ''
      setSelectedHome(hid)
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    Promise.all([
      staffApi.list({ homeId: selectedHome }),
      suApi.list(selectedHome, { status: 'live' }),
    ]).then(([sRes, suRes]) => {
      setStaffList(sRes.data.data || [])
      setSuList(suRes.data.data || [])
    })
    load()
  }, [selectedHome, weekStart])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/shifts', {
        params: { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') }
      })
      setShifts(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deleteShift = async (id: string) => {
    try {
      await api.delete(`/shifts/${id}`)
      setShifts(prev => prev.filter(s => s.id !== id))
      toast.success('Shift removed')
    } catch { toast.error('Failed') }
  }

  const getDayShifts = (day: Date) => shifts.filter(s => isSameDay(parseISO(s.shift_date), day))

  const todayShifts = getDayShifts(new Date())

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" /> Shift Rota
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{todayShifts.length} staff on shift today</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedDay(new Date()); setAddOpen(true) }}>Add shift</Button>
        </div>
      </div>

      {/* Today's staff */}
      {todayShifts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-500" /> Working today — {format(new Date(), 'EEEE d MMMM')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {todayShifts.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.regular}`}>
                <div className="w-7 h-7 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                  {s.staff_photo
                    ? <img src={s.staff_photo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" />
                    : (s.staff_name || '?').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold leading-none">{s.staff_name}</p>
                  <p className="text-xs opacity-70 mt-0.5">{s.start_time?.substring(0,5)}–{s.end_time?.substring(0,5)}{s.su_name ? ` · ${s.su_name}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="font-semibold text-slate-800">
          {format(weekStart, 'd MMM')} — {format(addDays(weekStart, 6), 'd MMM yyyy')}
        </h2>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Weekly grid */}
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const isToday = isSameDay(day, new Date())
            const dayShifts = getDayShifts(day)
            return (
              <div key={day.toString()} className={`bg-white rounded-2xl border min-h-[160px] overflow-hidden ${isToday ? 'border-gold-400 shadow-md' : 'border-slate-100 shadow-card'}`}>
                <div className={`px-3 py-2 border-b ${isToday ? 'border-gold-200' : 'border-slate-50'}`}
                  style={isToday ? { background: 'linear-gradient(135deg, rgba(232,177,48,0.15), rgba(212,150,26,0.08))' } : {}}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-gold-700' : 'text-slate-400'}`}>{format(day, 'EEE')}</p>
                  <p className={`text-lg font-display ${isToday ? 'text-gold-800' : 'text-slate-700'}`}>{format(day, 'd')}</p>
                </div>
                <div className="p-2 space-y-1.5">
                  {dayShifts.map((s: any) => (
                    <div key={s.id} className={`group relative px-2 py-1.5 rounded-lg border text-xs ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.regular}`}>
                      <p className="font-semibold truncate">{s.staff_name?.split(' ')[0]}</p>
                      <p className="opacity-70">{s.start_time?.substring(0,5)}–{s.end_time?.substring(0,5)}</p>
                      {s.su_name && <p className="opacity-60 truncate text-[10px]">{s.su_name}</p>}
                      <button onClick={() => deleteShift(s.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => { setSelectedDay(day); setAddOpen(true) }}
                    className="w-full py-1 rounded-lg text-xs text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors text-center">
                    + Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddShiftModal open={addOpen} onClose={() => setAddOpen(false)}
        defaultDate={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        staffList={staffList} suList={suList} homeId={selectedHome}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Shift added') }} />
    </div>
  )
}

function AddShiftModal({ open, onClose, defaultDate, staffList, suList, homeId, onSaved }: {
  open: boolean; onClose: () => void; defaultDate: string
  staffList: any[]; suList: any[]; homeId: string; onSaved: () => void
}) {
  const [form, setForm] = useState({ staffId: '', suId: '', shiftDate: defaultDate, startTime: '08:00', endTime: '16:00', shiftType: 'regular', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Preset times for shift types
  useEffect(() => {
    const presets: Record<string, [string, string]> = {
      early: ['07:00', '14:00'], late: ['14:00', '22:00'],
      night: ['22:00', '07:00'], waking_night: ['22:00', '07:00'],
      sleep_in: ['22:00', '07:00'], regular: ['08:00', '16:00'],
    }
    if (presets[form.shiftType]) {
      setForm(p => ({ ...p, startTime: presets[form.shiftType][0], endTime: presets[form.shiftType][1] }))
    }
  }, [form.shiftType])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId) { toast.error('Select a staff member'); return }
    setLoading(true)
    try { await api.post('/shifts', { homeId, ...form, suId: form.suId || null }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName} (${(s.role || '').replace(/_/g, ' ')})` }))
  const suOptions = suList.map(su => ({ value: su.id, label: `${su.first_name || su.firstName} ${su.last_name || su.lastName}` }))

  return (
    <Modal open={open} onClose={onClose} title="Add shift">
      <form onSubmit={save} className="space-y-4">
        <Select label="Staff member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={staffOptions} placeholder="Select staff..." />
        <Select label="Linked to resident (optional)" value={form.suId} onChange={e => set('suId', e.target.value)} options={suOptions} placeholder="Any resident (unassigned)" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.shiftDate} onChange={e => set('shiftDate', e.target.value)} />
          <Select label="Shift type" value={form.shiftType} onChange={e => set('shiftType', e.target.value)} options={SHIFT_TYPES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time *" type="time" required value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          <Input label="End time *" type="time" required value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes for this shift..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add shift</Button>
        </div>
      </form>
    </Modal>
  )
}
