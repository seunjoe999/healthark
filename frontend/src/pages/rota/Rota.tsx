import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, staffApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Spinner, Button, Modal, Input, Select } from '../../components/ui'
import {
  Users, Plus, ChevronLeft, ChevronRight, Trash2, Clock,
  Wand2, BarChart2, Copy, Printer, CalendarX, ArrowLeftRight,
} from 'lucide-react'
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
  early:       'bg-blue-900/60 text-blue-200 border-blue-700',
  late:        'bg-purple-900/60 text-purple-200 border-purple-700',
  night:       'bg-slate-700 text-white border-slate-600',
  waking_night:'bg-indigo-900/60 text-indigo-200 border-indigo-700',
  sleep_in:    'bg-teal-900/60 text-teal-200 border-teal-700',
  regular:     'bg-emerald-900/60 text-emerald-200 border-emerald-700',
}

const LEAVE_COLORS: Record<string, string> = {
  annual: 'bg-sky-900/60 text-sky-200 border-sky-700',
  sick:   'bg-rose-900/60 text-rose-200 border-rose-700',
  other:  'bg-amber-900/40 text-amber-200 border-amber-700',
}

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual leave',
  sick:   'Sick',
  other:  'Absence',
}

export default function Rota() {
  const { user, isRole } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [swaps, setSwaps] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [suList, setSuList] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [autoOpen, setAutoOpen] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveDay, setLeaveDay] = useState<Date | null>(null)
  const [swapShift, setSwapShift] = useState<any | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
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
    loadLeave()
    loadSwaps()
  }, [selectedHome, weekStart])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/shifts', { params: { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') } })
      setShifts(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadLeave = async () => {
    try {
      const res = await api.get('/shifts/leave', { params: { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') } })
      setLeaves(res.data.data || [])
    } catch {}
  }

  const loadSwaps = async () => {
    try {
      const res = await api.get('/shifts/swaps', { params: { homeId: selectedHome } })
      setSwaps(res.data.data || [])
    } catch {}
  }

  const deleteShift = async (id: string) => {
    try {
      await api.delete(`/shifts/${id}`)
      setShifts(prev => prev.filter(s => s.id !== id))
      toast.success('Shift removed')
    } catch { toast.error('Failed') }
  }

  const deleteLeave = async (id: string) => {
    try {
      await api.delete(`/shifts/leave/${id}`)
      setLeaves(prev => prev.filter(l => l.id !== id))
      toast.success('Leave removed')
    } catch { toast.error('Failed') }
  }

  const copyWeek = async () => {
    setCopyLoading(true)
    try {
      const res = await api.post('/shifts/copy-week', { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') })
      const { copied } = res.data.data || {}
      await load()
      if (copied === 0) toast('No shifts found in the previous week', { icon: 'ℹ️' })
      else toast.success(`${copied} shift${copied !== 1 ? 's' : ''} copied from last week`)
    } catch { toast.error('Failed to copy week') }
    finally { setCopyLoading(false) }
  }

  const respondSwap = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/shifts/swaps/${id}`, { status })
      setSwaps(prev => prev.filter(s => s.id !== id))
      toast.success(status === 'approved' ? 'Swap approved' : 'Swap declined')
      if (status === 'approved') load()
    } catch { toast.error('Failed') }
  }

  const runAutoSchedule = async () => {
    setAutoLoading(true)
    try {
      const res = await api.post('/shifts/auto-schedule', { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') })
      const { created, errors } = res.data.data || {}
      setAutoOpen(false)
      await load()
      if (created === 0) toast('No new shifts needed — week already covered', { icon: 'ℹ️' })
      else toast.success(`${created} shift${created !== 1 ? 's' : ''} scheduled`)
      if (errors?.length) console.warn('Auto-schedule errors:', errors)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Auto-schedule failed')
    } finally { setAutoLoading(false) }
  }

  const getDayShifts = (day: Date) => shifts.filter(s => isSameDay(parseISO(s.shift_date), day))
  const getDayLeaves = (day: Date) => leaves.filter(l => isSameDay(parseISO(l.leave_date), day))
  const todayShifts = getDayShifts(new Date())

  const shiftHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
    return Math.round((mins / 60) * 10) / 10
  }

  const weeklyHours = shifts.reduce((acc: Record<string, { name: string; hours: number }>, s: any) => {
    if (!acc[s.staff_id]) acc[s.staff_id] = { name: s.staff_name || '', hours: 0 }
    acc[s.staff_id].hours += shiftHours(s.start_time?.substring(0, 5), s.end_time?.substring(0, 5))
    return acc
  }, {})

  const canManage = isRole('home_manager', 'group_admin', 'senior_carer')

  function DayCell({ day, compact = false }: { day: Date; compact?: boolean }) {
    const isToday = isSameDay(day, new Date())
    const dayShifts = getDayShifts(day)
    const dayLeaves = getDayLeaves(day)
    return (
      <div className={`bg-[#1a1a2e] rounded-2xl border overflow-hidden ${isToday ? 'border-yellow-500 shadow-md shadow-yellow-900/30' : 'border-slate-700'}`}>
        {/* Day header */}
        <div
          className={`px-3 py-2 border-b flex items-center justify-between ${isToday ? 'border-yellow-700' : 'border-slate-700'}`}
          style={isToday ? { background: 'linear-gradient(135deg,rgba(232,177,48,.20),rgba(212,150,26,.10))' } : {}}
        >
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-yellow-400' : 'text-slate-500'}`}>{format(day, 'EEE')}</p>
            <p className={`text-lg font-display leading-none mt-0.5 ${isToday ? 'text-yellow-300' : 'text-slate-200'}`}>{format(day, compact ? 'd' : 'd MMM')}</p>
          </div>
          {(dayShifts.length + dayLeaves.length) > 0 && (
            <span className="text-xs text-slate-500">{dayShifts.length + dayLeaves.length}</span>
          )}
        </div>

        {/* Shift + leave entries */}
        <div className="p-2 space-y-1.5">
          {dayShifts.map((s: any) => (
            <div key={s.id} className={`group relative px-2 py-1.5 rounded-lg border text-xs ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.regular}`}>
              <p className="font-semibold truncate pr-5">{s.staff_name?.split(' ')[0]}</p>
              <p className="opacity-80 text-[11px]">{s.start_time?.substring(0, 5)}–{s.end_time?.substring(0, 5)} <span className="font-semibold">({shiftHours(s.start_time?.substring(0, 5), s.end_time?.substring(0, 5))}h)</span></p>
              {s.su_name && <p className="opacity-60 truncate text-[10px]">{s.su_name}</p>}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setSwapShift(s)} className="p-0.5 hover:text-blue-300" title="Request swap">
                  <ArrowLeftRight className="w-3 h-3" />
                </button>
                {canManage && (
                  <button onClick={() => deleteShift(s.id)} className="p-0.5 hover:text-red-400" title="Remove shift">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {dayLeaves.map((l: any) => (
            <div key={l.id} className={`group relative px-2 py-1.5 rounded-lg border text-xs ${LEAVE_COLORS[l.leave_type] || LEAVE_COLORS.other}`}>
              <p className="font-semibold truncate pr-4">{l.staff_name?.split(' ')[0]}</p>
              <p className="opacity-80 text-[11px]">{LEAVE_LABELS[l.leave_type] || l.leave_type}</p>
              {canManage && (
                <button onClick={() => deleteLeave(l.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add actions */}
          <div className="flex gap-1 pt-0.5">
            <button onClick={() => { setSelectedDay(day); setAddOpen(true) }}
              className="flex-1 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors text-center">
              + Shift
            </button>
            {canManage && (
              <button onClick={() => { setLeaveDay(day); setLeaveOpen(true) }}
                title="Mark absence"
                className="py-1 px-2 rounded-lg text-xs text-slate-600 hover:text-amber-300 hover:bg-slate-700 transition-colors">
                <CalendarX className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" /> Shift Rota
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{todayShifts.length} staff on shift today</p>
          </div>
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>

        {/* Action buttons — wrap on mobile */}
        <div className="flex flex-wrap gap-2 mt-4">
          {canManage && (
            <Button variant="outline" icon={<Copy className="w-4 h-4" />} loading={copyLoading} onClick={copyWeek}>
              Copy last week
            </Button>
          )}
          {isRole('home_manager', 'group_admin') && (
            <Button variant="outline" icon={<Wand2 className="w-4 h-4" />} onClick={() => setAutoOpen(true)}>
              Auto-schedule
            </Button>
          )}
          <Button variant="outline" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Print
          </Button>
          {canManage && (
            <Button variant="outline" icon={<CalendarX className="w-4 h-4" />} onClick={() => { setLeaveDay(new Date()); setLeaveOpen(true) }}>
              Mark absence
            </Button>
          )}
          {canManage && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedDay(new Date()); setAddOpen(true) }}>
              Add shift
            </Button>
          )}
        </div>
      </div>

      {/* Today's staff */}
      {todayShifts.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-2xl border border-slate-700 p-4 mb-5 no-print">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-yellow-500" /> On shift today — {format(new Date(), 'EEEE d MMMM')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {todayShifts.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.regular}`}>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                  {s.staff_photo
                    ? <img src={s.staff_photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : (s.staff_name || '?').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold leading-none text-xs">{s.staff_name}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{s.start_time?.substring(0, 5)}–{s.end_time?.substring(0, 5)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-semibold text-white text-sm sm:text-base">
          {format(weekStart, 'd MMM')} — {format(addDays(weekStart, 6), 'd MMM yyyy')}
        </h2>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {days.map(day => <DayCell key={day.toString()} day={day} compact />)}
          </div>

          {/* Mobile: vertical stack */}
          <div className="md:hidden space-y-3">
            {days.map(day => <DayCell key={day.toString()} day={day} />)}
          </div>
        </>
      )}

      {/* Weekly hours */}
      {Object.keys(weeklyHours).length > 0 && (
        <div className="mt-4 bg-[#1a1a2e] rounded-2xl border border-slate-700 p-4">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
            <BarChart2 className="w-4 h-4 text-purple-400" /> Staff hours this week
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(weeklyHours).sort((a, b) => b.hours - a.hours).map((sw: any) => (
              <div key={sw.name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${sw.hours > 40 ? 'bg-red-900/40 border-red-700 text-red-300' : sw.hours > 35 ? 'bg-amber-900/40 border-amber-700 text-amber-300' : 'bg-emerald-900/40 border-emerald-700 text-emerald-300'}`}>
                <span className="font-medium">{sw.name}</span>
                <span className="font-bold">{sw.hours}h</span>
                {sw.hours > 40 && <span className="text-xs font-semibold">⚠ Over 40h</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending swap requests */}
      {swaps.length > 0 && (
        <div className="mt-4 bg-[#1a1a2e] rounded-2xl border border-amber-700/50 p-4 no-print">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            Pending swap requests
            <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded-full text-xs font-bold">{swaps.length}</span>
          </h2>
          <div className="space-y-2">
            {swaps.map((sw: any) => (
              <div key={sw.id} className="flex flex-wrap items-center gap-3 bg-slate-800 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{sw.requesting_name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {format(parseISO(sw.shift_date), 'd MMM')} · {sw.start_time?.substring(0, 5)}–{sw.end_time?.substring(0, 5)} · <span className="capitalize">{sw.shift_type}</span>
                    {sw.target_name && <> · Swap with: <span className="text-slate-300">{sw.target_name}</span></>}
                  </p>
                  {sw.notes && <p className="text-slate-500 text-xs mt-0.5 italic">"{sw.notes}"</p>}
                </div>
                {isRole('home_manager', 'group_admin') && (
                  <div className="flex gap-2">
                    <button onClick={() => respondSwap(sw.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-600 transition-colors">
                      Approve
                    </button>
                    <button onClick={() => respondSwap(sw.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-900/60 text-rose-200 hover:bg-rose-800 transition-colors">
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddShiftModal
        open={addOpen} onClose={() => setAddOpen(false)}
        defaultDate={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        staffList={staffList} suList={suList} homeId={selectedHome}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Shift added') }}
      />

      <MarkLeaveModal
        open={leaveOpen} onClose={() => setLeaveOpen(false)}
        defaultDate={leaveDay ? format(leaveDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        staffList={staffList} homeId={selectedHome}
        onSaved={async () => { setLeaveOpen(false); await loadLeave(); toast.success('Leave recorded') }}
      />

      {swapShift && (
        <SwapRequestModal
          open={!!swapShift} onClose={() => setSwapShift(null)}
          shift={swapShift} staffList={staffList} homeId={selectedHome}
          onSaved={() => { setSwapShift(null); loadSwaps() }}
        />
      )}

      <Modal open={autoOpen} onClose={() => setAutoOpen(false)} title="Auto-schedule week">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Fill empty shifts for{' '}
            <span className="font-semibold text-white">{format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}</span>{' '}
            by rotating available care staff across early, late and night shifts.
          </p>
          <p className="text-slate-400 text-sm bg-slate-800 rounded-xl p-3 border border-slate-700">
            Existing shifts will not be changed. Staff will not exceed 5 days per week.
          </p>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setAutoOpen(false)}>Cancel</Button>
            <Button icon={<Wand2 className="w-4 h-4" />} loading={autoLoading} onClick={runAutoSchedule}>Schedule now</Button>
          </div>
        </div>
      </Modal>

      <style>{`
        @media print {
          .no-print { display: none !important }
          body { background: #fff !important; color: #000 !important }
          * { color: inherit !important; background: transparent !important; border-color: #ccc !important; }
          .font-display { font-family: serif }
          @page { margin: 1.5cm }
        }
      `}</style>
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

  useEffect(() => { if (open) setForm(f => ({ ...f, shiftDate: defaultDate })) }, [open, defaultDate])

  useEffect(() => {
    const presets: Record<string, [string, string]> = {
      early: ['07:00', '14:00'], late: ['14:00', '22:00'],
      night: ['22:00', '07:00'], waking_night: ['22:00', '07:00'],
      sleep_in: ['22:00', '07:00'], regular: ['08:00', '16:00'],
    }
    if (presets[form.shiftType]) setForm(p => ({ ...p, startTime: presets[form.shiftType][0], endTime: presets[form.shiftType][1] }))
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
        <Select label="Resident (optional)" value={form.suId} onChange={e => set('suId', e.target.value)} options={suOptions} placeholder="Unassigned" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.shiftDate} onChange={e => set('shiftDate', e.target.value)} />
          <Select label="Shift type" value={form.shiftType} onChange={e => set('shiftType', e.target.value)} options={SHIFT_TYPES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start *" type="time" required value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          <Input label="End *" type="time" required value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." /></div>
        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add shift</Button>
        </div>
      </form>
    </Modal>
  )
}

function MarkLeaveModal({ open, onClose, defaultDate, staffList, homeId, onSaved }: {
  open: boolean; onClose: () => void; defaultDate: string
  staffList: any[]; homeId: string; onSaved: () => void
}) {
  const [form, setForm] = useState({ staffId: '', leaveDate: defaultDate, leaveType: 'annual', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setForm(f => ({ ...f, leaveDate: defaultDate })) }, [open, defaultDate])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId) { toast.error('Select a staff member'); return }
    setLoading(true)
    try { await api.post('/shifts/leave', { homeId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))
  const leaveTypes = [
    { value: 'annual', label: 'Annual leave' },
    { value: 'sick', label: 'Sick leave' },
    { value: 'other', label: 'Other absence' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Mark absence / leave">
      <form onSubmit={save} className="space-y-4">
        <Select label="Staff member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={staffOptions} placeholder="Select staff..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.leaveDate} onChange={e => set('leaveDate', e.target.value)} />
          <Select label="Type" value={form.leaveType} onChange={e => set('leaveType', e.target.value)} options={leaveTypes} />
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." /></div>
        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}

function SwapRequestModal({ open, onClose, shift, staffList, homeId, onSaved }: {
  open: boolean; onClose: () => void; shift: any
  staffList: any[]; homeId: string; onSaved: () => void
}) {
  const [targetStaffId, setTargetStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/shifts/swaps', { homeId, shiftId: shift.id, targetStaffId: targetStaffId || null, notes: notes || null })
      toast.success('Swap request sent to manager')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const staffOptions = staffList
    .filter(s => s.id !== shift?.staff_id)
    .map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))

  return (
    <Modal open={open} onClose={onClose} title="Request shift swap">
      <div className="mb-4 p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm text-slate-300">
        <p className="text-white font-medium">{shift && format(parseISO(shift.shift_date), 'EEEE d MMMM yyyy')}</p>
        <p className="text-slate-400 text-xs mt-0.5">{shift?.start_time?.substring(0, 5)} – {shift?.end_time?.substring(0, 5)} · <span className="capitalize">{shift?.shift_type}</span></p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Select label="Swap with (optional)" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} options={staffOptions} placeholder="Any available staff" />
        <div><label className="label">Reason</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for swap request..." /></div>
        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<ArrowLeftRight className="w-4 h-4" />}>Send request</Button>
        </div>
      </form>
    </Modal>
  )
}
