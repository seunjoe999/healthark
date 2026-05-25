import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { homesApi, staffApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Button, Modal, Input, Select } from '../../components/ui'
import {
  Plus, ChevronLeft, ChevronRight, Trash2,
  Filter, RefreshCw, X, Check, Search,
  Printer, CalendarX, ArrowLeftRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64
const START_HOUR = 6
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT

const SHIFT_TYPES = [
  { value: 'regular',      label: 'Regular' },
  { value: 'early',        label: 'Early' },
  { value: 'late',         label: 'Late' },
  { value: 'night',        label: 'Night' },
  { value: 'waking_night', label: 'Waking Night' },
  { value: 'sleep_in',     label: 'Sleep In' },
]

const ROLE_ABBR: Record<string, string> = {
  care_staff:    'CS',
  senior_carer:  'SC',
  home_manager:  'HM',
  group_admin:   'GA',
  auditor:       'AU',
}

const SHIFT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  regular:      { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  early:        { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  late:         { bg: '#faf5ff', border: '#c4b5fd', text: '#5b21b6' },
  night:        { bg: '#0f172a', border: '#334155', text: '#e2e8f0' },
  waking_night: { bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' },
  sleep_in:     { bg: '#f0fdfa', border: '#5eead4', text: '#115e59' },
  standby:      { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
}
const UNFILLED_COLORS = { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' }

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', other: 'Absence',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}
function shiftTopPx(startTime: string): number {
  return Math.max(0, (timeToMins(startTime) - START_HOUR * 60) / 60 * HOUR_HEIGHT)
}
function shiftHeightPx(startTime: string, endTime: string): number {
  let start = timeToMins(startTime)
  let end   = timeToMins(endTime)
  if (end <= start) end += 1440
  return Math.max((end - start) / 60 * HOUR_HEIGHT, 28)
}
function getName(p: any) {
  return `${p?.first_name || p?.firstName || ''} ${p?.last_name || p?.lastName || ''}`.trim()
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Rota() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'senior_carer')

  const [view, setView]           = useState<'week' | 'day'>('week')
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [dayDate,   setDayDate]   = useState(new Date())

  const [shifts,   setShifts]   = useState<any[]>([])
  const [leaves,   setLeaves]   = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [suList,    setSuList]   = useState<any[]>([])
  const [homes,    setHomes]    = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading,  setLoading]  = useState(true)

  // filters
  const [filterSu,    setFilterSu]    = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [filterType,  setFilterType]  = useState('')

  // modals
  const [createOpen,  setCreateOpen]  = useState(false)
  const [standbyOpen, setStandbyOpen] = useState(false)
  const [leaveOpen,   setLeaveOpen]   = useState(false)
  const [bulkOpen,    setBulkOpen]    = useState(false)
  const [detailShift, setDetailShift] = useState<any>(null)
  const [swapShift,   setSwapShift]   = useState<any>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const loadAll = useCallback(async () => {
    if (!selectedHome) return
    setLoading(true)
    try {
      const dateParam = view === 'week'
        ? { weekStart: format(weekStart, 'yyyy-MM-dd') }
        : { date: format(dayDate, 'yyyy-MM-dd') }
      const [shiftRes, leaveRes] = await Promise.all([
        api.get('/shifts', { params: { homeId: selectedHome, ...dateParam } }),
        api.get('/shifts/leave', { params: { homeId: selectedHome, weekStart: format(weekStart, 'yyyy-MM-dd') } }),
      ])
      setShifts(shiftRes.data.data || [])
      setLeaves(leaveRes.data.data || [])
    } catch { } finally { setLoading(false) }
  }, [selectedHome, weekStart, dayDate, view])

  useEffect(() => {
    if (!selectedHome) return
    Promise.all([staffApi.list({ homeId: selectedHome }), suApi.list(selectedHome, { status: 'live' })])
      .then(([sRes, suRes]) => { setStaffList(sRes.data.data || []); setSuList(suRes.data.data || []) })
    loadAll()
  }, [selectedHome, weekStart, dayDate, view])

  // ── Actions ───────────────────────────────────────────────────────────────

  const deleteShift = async (id: string) => {
    if (!confirm('Remove this shift?')) return
    try {
      await api.delete(`/shifts/${id}`)
      setShifts(prev => prev.filter(s => s.id !== id))
      setDetailShift(null)
      toast.success('Shift removed')
    } catch { toast.error('Failed') }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const days = view === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [dayDate]

  const getDayShifts = (day: Date) => {
    let r = shifts.filter(s => { try { return isSameDay(parseISO(s.shift_date), day) } catch { return false } })
    if (filterSu)    r = r.filter(s => s.su_id    === filterSu)
    if (filterStaff) r = r.filter(s => s.staff_id === filterStaff)
    if (filterType)  r = r.filter(s => s.shift_type === filterType)
    return r
  }
  const getDayLeaves = (day: Date) =>
    leaves.filter(l => { try { return isSameDay(parseISO(l.leave_date), day) } catch { return false } })

  const nav = (dir: 1 | -1) => {
    if (view === 'week') setWeekStart(d => addDays(d, dir * 7))
    else setDayDate(d => addDays(d, dir))
  }

  const navLabel = view === 'week'
    ? `${format(weekStart, 'd MMM')} — ${format(addDays(weekStart, 6), 'd MMM yyyy')}`
    : format(dayDate, 'EEEE, d MMMM yyyy')

  const today = new Date()
  const todayShifts = getDayShifts(today)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-wrap bg-white">
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                Create shift
              </Button>
              <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setStandbyOpen(true)}>
                Create Standby Shift
              </Button>
              <Button variant="outline" icon={<Filter className="w-4 h-4" />} onClick={() => setBulkOpen(true)}>
                Bulk Operations
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {homes.length > 1 && (
            <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700"
              value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}

          {/* Week / Day toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {(['week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 font-medium transition-colors ${view === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {v === 'week' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => nav(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[190px] text-center">{navLabel}</span>
            <button onClick={() => nav(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {canManage && (
            <button onClick={() => setLeaveOpen(true)} title="Mark absence"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <CalendarX className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => window.print()} title="Print"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 flex-wrap bg-slate-50/80">
        <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterSu} onChange={e => setFilterSu(e.target.value)}>
          <option value="">All Service Users</option>
          {suList.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
          <option value="">All Staff</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Shift Types</option>
          {SHIFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(filterSu || filterStaff || filterType) && (
          <button onClick={() => { setFilterSu(''); setFilterStaff(''); setFilterType('') }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="ml-auto text-xs text-slate-400">
          {todayShifts.length} shift{todayShifts.length !== 1 ? 's' : ''} today
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {/* Day headers — sticky */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="w-14 flex-shrink-0 border-r border-slate-100" />
          {days.map(day => {
            const isToday = isSameDay(day, today)
            const count = getDayShifts(day).length + getDayLeaves(day).length
            return (
              <div key={day.toString()}
                className={`flex-1 text-center py-2 border-l border-slate-100 ${isToday ? 'bg-blue-50/60' : ''}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{format(day, 'EEE')}</p>
                <p className={`text-xl font-bold leading-tight ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </p>
                <p className="text-[10px] text-slate-400">{format(day, 'MMM')}</p>
                {count > 0 && (
                  <div className={`mx-auto mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="flex">

            {/* Time labels */}
            <div className="w-14 flex-shrink-0 border-r border-slate-100">
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end pr-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const isToday  = isSameDay(day, today)
              const dayShifts = getDayShifts(day)
              const dayLeaves = getDayLeaves(day)

              return (
                <div key={day.toString()}
                  className={`flex-1 relative border-l border-slate-100 ${isToday ? 'bg-blue-50/20' : ''}`}
                  style={{ height: TOTAL_HEIGHT }}>

                  {/* Hour gridlines */}
                  {HOURS.map((h, i) => (
                    <div key={h}
                      className={`absolute left-0 right-0 border-t ${i % 2 === 0 ? 'border-slate-100' : 'border-slate-50'}`}
                      style={{ top: i * HOUR_HEIGHT }} />
                  ))}

                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now  = new Date()
                    const mins = now.getHours() * 60 + now.getMinutes()
                    const top  = (mins - START_HOUR * 60) / 60 * HOUR_HEIGHT
                    if (top < 0 || top > TOTAL_HEIGHT) return null
                    return (
                      <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
                        <div className="relative h-0">
                          <div className="absolute left-0 w-2 h-2 rounded-full bg-red-500 -translate-y-1" />
                          <div className="absolute left-2 right-0 h-px bg-red-400" />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Leave blocks */}
                  {dayLeaves.map((l: any) => (
                    <div key={l.id}
                      className="absolute left-0.5 right-0.5 rounded border bg-rose-50 border-rose-200 px-1.5 py-1 overflow-hidden"
                      style={{ top: shiftTopPx('08:00'), height: shiftHeightPx('08:00', '20:00') }}>
                      <p className="text-[11px] font-bold text-rose-700 truncate">{l.staff_name?.split(' ')[0]}</p>
                      <p className="text-[10px] text-rose-500">{LEAVE_LABELS[l.leave_type] || l.leave_type}</p>
                    </div>
                  ))}

                  {/* Shift blocks */}
                  {dayShifts.map((shift: any) => {
                    const st = shift.start_time?.substring(0, 5) || '08:00'
                    const et = shift.end_time?.substring(0, 5)   || '09:00'
                    const top    = shiftTopPx(st)
                    const height = shiftHeightPx(st, et)
                    const isUnfilled = !shift.staff_id
                    const colors = isUnfilled ? UNFILLED_COLORS : (SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.regular)

                    return (
                      <button key={shift.id} onClick={() => setDetailShift(shift)}
                        className="absolute left-0.5 right-0.5 rounded border text-left overflow-hidden hover:z-10 hover:shadow-lg hover:scale-[1.01] transition-all duration-100"
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 28),
                          backgroundColor: colors.bg,
                          borderColor:     colors.border,
                          borderStyle:     isUnfilled ? 'dashed' : 'solid',
                          color:           colors.text,
                        }}>
                        <div className="px-1.5 py-1">
                          {isUnfilled ? (
                            <p className="text-[11px] font-semibold">Unfilled</p>
                          ) : (
                            <p className="text-[11px] font-bold leading-tight truncate">
                              {ROLE_ABBR[shift.staff_role] || 'ST'}{' '}
                              {shift.staff_name?.split(' ')[0] || ''}{' '}
                              {(shift.staff_name?.split(' ')[1] || '')[0] || ''}
                            </p>
                          )}
                          {height > 40 && shift.su_name && (
                            <p className="text-[10px] leading-tight truncate opacity-70">{shift.su_name}</p>
                          )}
                          {height > 54 && (
                            <p className="text-[10px] leading-tight opacity-60">{st}–{et}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}

                  {/* Quick-add dot (today only, empty day) */}
                  {canManage && dayShifts.length === 0 && dayLeaves.length === 0 && isToday && (
                    <button onClick={() => setCreateOpen(true)}
                      className="absolute left-1 right-1 border border-dashed border-slate-200 rounded-lg text-xs text-slate-300 hover:text-slate-500 hover:border-slate-300 flex items-center justify-center gap-1 transition-colors"
                      style={{ top: shiftTopPx('08:00'), height: 38 }}>
                      <Plus className="w-3 h-3" /> Add shift
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex-wrap bg-slate-50 no-print">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-dashed border-slate-300 bg-slate-50" />Unfilled
        </span>
        {Object.entries(SHIFT_COLORS).map(([type, c]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border flex-shrink-0" style={{ backgroundColor: c.bg, borderColor: c.border }} />
            {SHIFT_TYPES.find(t => t.value === type)?.label || type}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-rose-200 bg-rose-50" />Leave
        </span>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {createOpen && (
        <CreateShiftModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          suList={suList}
          staffList={staffList}
          homeId={selectedHome}
          defaultDate={format(view === 'week' ? weekStart : dayDate, 'yyyy-MM-dd')}
          onSaved={() => { setCreateOpen(false); loadAll(); toast.success('Shift created and staff allocated') }}
        />
      )}

      {standbyOpen && (
        <CreateStandbyModal
          open={standbyOpen}
          onClose={() => setStandbyOpen(false)}
          staffList={staffList}
          homeId={selectedHome}
          defaultDate={format(view === 'week' ? weekStart : dayDate, 'yyyy-MM-dd')}
          onSaved={() => { setStandbyOpen(false); loadAll(); toast.success('Standby shift created') }}
        />
      )}

      {leaveOpen && (
        <MarkLeaveModal
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          staffList={staffList}
          homeId={selectedHome}
          defaultDate={format(today, 'yyyy-MM-dd')}
          onSaved={() => { setLeaveOpen(false); loadAll(); toast.success('Absence recorded') }}
        />
      )}

      {detailShift && (
        <ShiftDetailModal
          shift={detailShift}
          canManage={canManage}
          onClose={() => setDetailShift(null)}
          onDelete={() => deleteShift(detailShift.id)}
          onSwap={() => { setSwapShift(detailShift); setDetailShift(null) }}
          staffList={staffList}
        />
      )}

      {swapShift && (
        <SwapModal
          shift={swapShift}
          staffList={staffList}
          homeId={selectedHome}
          onClose={() => setSwapShift(null)}
          onSaved={() => { setSwapShift(null); toast.success('Swap requested') }}
        />
      )}

      {bulkOpen && (
        <BulkOperationsModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          staffList={staffList}
          homeId={selectedHome}
          defaultDate={format(view === 'week' ? weekStart : dayDate, 'yyyy-MM-dd')}
          onSaved={() => { setBulkOpen(false); loadAll(); toast.success('Bulk shifts created') }}
        />
      )}

      <style>{`
        @media print {
          .no-print { display: none !important }
          body { background: #fff !important }
          @page { margin: 1.5cm }
        }
      `}</style>
    </div>
  )
}

// ── Create Shift Modal ────────────────────────────────────────────────────────

function CreateShiftModal({ open, onClose, suList, staffList, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void
  suList: any[]; staffList: any[]; homeId: string
  defaultDate: string; onSaved: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    suId: '', startDate: defaultDate, isOngoing: true, endDate: '',
    recurrence: 'daily', daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '08:00', endTime: '20:00',
    shiftType: 'regular', totalStaffRequired: '1',
    breakMins: '30',
    notesForCarers: '', notesForManagers: '',
  })
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [staffSearch,   setStaffSearch]   = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) { setStep(1); setSelectedStaff([]); setStaffSearch(''); setForm(f => ({ ...f, startDate: defaultDate })) }
  }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setForm(p => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d].sort() }))

  const toggleStaff = (id: string) =>
    setSelectedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.suId) { toast.error('Select a service user'); return }
    if (form.recurrence !== 'daily' && form.daysOfWeek.length === 0) { toast.error('Select at least one day'); return }
    setStep(2)
  }

  const save = async () => {
    if (selectedStaff.length === 0) { toast.error('Allocate at least one staff member'); return }
    setSaving(true)
    try {
      const daysOfWeek = form.recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.daysOfWeek
      await api.post('/shifts/service-shift', {
        homeId, ...form,
        staffIds: selectedStaff,
        daysOfWeek,
        totalStaffRequired: parseInt(form.totalStaffRequired) || 1,
        breakMins: parseInt(form.breakMins) || 0,
      })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create shift') }
    finally { setSaving(false) }
  }

  const filteredStaff = staffList.filter(s =>
    getName(s).toLowerCase().includes(staffSearch.toLowerCase())
  )

  const required = parseInt(form.totalStaffRequired) || 1

  return (
    <Modal open={open} onClose={onClose} title="Create Shift" size="md">
      {step === 1 ? (
        <form onSubmit={next} className="space-y-4">
          {/* Service User */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Service User *</label>
            <select required className="input" value={form.suId} onChange={e => set('suId', e.target.value)}>
              <option value="">Select service user...</option>
              {suList.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">From *</label>
              <input type="date" required className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Until</label>
              <div className="flex items-center gap-2">
                {form.isOngoing ? (
                  <div className="input flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <RefreshCw className="w-3.5 h-3.5" /> Ongoing
                  </div>
                ) : (
                  <input type="date" className="input flex-1" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                )}
              </div>
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={form.isOngoing} onChange={e => set('isOngoing', e.target.checked)}
                  className="rounded border-slate-300 text-blue-600" />
                <span className="text-xs text-slate-500">Ongoing (no end date)</span>
              </label>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Every</label>
            <div className="flex gap-2 mb-2">
              {[{ value: 'daily', label: 'Every Day' }, { value: 'weekly', label: 'Specific Days' }].map(o => (
                <button key={o.value} type="button" onClick={() => set('recurrence', o.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.recurrence === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {form.recurrence !== 'daily' && (
              <div className="flex gap-1">
                {DAY_LETTERS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex-1 h-9 rounded-full text-xs font-bold border transition-colors ${form.daysOfWeek.includes(i) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start Time *</label>
              <input type="time" required className="input" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">End Time *</label>
              <input type="time" required className="input" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>

          {/* Shift type + staff required */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Shift Type</label>
              <select className="input" value={form.shiftType} onChange={e => set('shiftType', e.target.value)}>
                {SHIFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Total Staff Required</label>
              <input type="number" min="1" max="20" className="input" value={form.totalStaffRequired} onChange={e => set('totalStaffRequired', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Break (mins)</label>
              <input type="number" min="0" max="120" step="5" className="input" value={form.breakMins} onChange={e => set('breakMins', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Notes for carers</label>
            <textarea className="input" rows={2} value={form.notesForCarers} onChange={e => set('notesForCarers', e.target.value)} placeholder="Instructions visible to care staff..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Notes for managers</label>
            <textarea className="input" rows={2} value={form.notesForManagers} onChange={e => set('notesForManagers', e.target.value)} placeholder="Manager-only notes..." />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Next: Allocate Staff →</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <p className="font-semibold">{suList.find(s => s.id === form.suId) ? getName(suList.find(s => s.id === form.suId)) : 'Service User'}</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {form.startDate} · {form.isOngoing ? 'Ongoing' : form.endDate} · {form.startTime}–{form.endTime} ·{' '}
              {form.recurrence === 'daily' ? 'Every day' : form.daysOfWeek.map(d => DAY_SHORT[d]).join(', ')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">
                Allocate staff <span className="text-slate-400 font-normal">({selectedStaff.length} of {required} required)</span>
              </p>
            </div>

            {/* Staff search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="input pl-8 text-sm" placeholder="Search staff..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No staff found</p>
              ) : (
                filteredStaff.map((s: any) => {
                  const selected = selectedStaff.includes(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStaff(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {selected ? <Check className="w-4 h-4" /> : (getName(s).split(' ').map((n: string) => n[0]).join('').substring(0, 2))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selected ? 'text-blue-800' : 'text-slate-800'}`}>{getName(s)}</p>
                        <p className="text-xs text-slate-400 capitalize">{(s.role || '').replace(/_/g, ' ')}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button loading={saving} onClick={save} icon={<Check className="w-4 h-4" />}>
                Create Shift {selectedStaff.length > 0 && `(${selectedStaff.length} staff)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Create Standby Shift Modal ────────────────────────────────────────────────

function CreateStandbyModal({ open, onClose, staffList, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; homeId: string
  defaultDate: string; onSaved: () => void
}) {
  const [form, setForm] = useState({
    staffId: '', startDate: defaultDate, isOngoing: false, endDate: defaultDate,
    recurrence: 'daily', daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '08:00', endTime: '20:00',
    workDetails: '', carerPayRegular: '', carerPayBankHoliday: '', carerPayBy: 'hour',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setForm(f => ({ ...f, startDate: defaultDate, endDate: defaultDate })) }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setForm(p => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d].sort() }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId) { toast.error('Select a staff member'); return }
    setSaving(true)
    try {
      const daysOfWeek = form.recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.daysOfWeek
      await api.post('/shifts/service-shift', {
        homeId,
        suId: null,
        startDate: form.startDate,
        isOngoing: form.isOngoing,
        endDate: form.isOngoing ? null : form.endDate,
        recurrence: form.recurrence,
        daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        shiftType: 'standby',
        staffIds: [form.staffId],
        totalStaffRequired: 1,
        isStandby: true,
        standbyWorkDetails: form.workDetails,
        notesForCarers: form.workDetails,
      })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` }))

  return (
    <Modal open={open} onClose={onClose} title="Create Standby Shift" size="md">
      <form onSubmit={save} className="space-y-4">

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date *</label>
            <input type="date" required className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Until</label>
            {form.isOngoing ? (
              <div className="input flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <RefreshCw className="w-3.5 h-3.5" /> Ongoing
              </div>
            ) : (
              <input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            )}
            <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
              <input type="checkbox" checked={form.isOngoing} onChange={e => set('isOngoing', e.target.checked)} className="rounded" />
              <span className="text-xs text-slate-500">Ongoing</span>
            </label>
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Every</label>
          <div className="flex gap-2 mb-2">
            {[{ value: 'daily', label: 'Every Day' }, { value: 'weekly', label: 'Specific Days' }].map(o => (
              <button key={o.value} type="button" onClick={() => set('recurrence', o.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.recurrence === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
          {form.recurrence !== 'daily' && (
            <div className="flex gap-1">
              {DAY_LETTERS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 h-9 rounded-full text-xs font-bold border transition-colors ${form.daysOfWeek.includes(i) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start Time *</label>
            <input type="time" required className="input" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">End Time *</label>
            <input type="time" required className="input" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Work details</label>
          <textarea className="input" rows={2} value={form.workDetails} onChange={e => set('workDetails', e.target.value)} placeholder="Details of standby duties..." />
        </div>

        <Select label="Staff *" required value={form.staffId} onChange={e => set('staffId', e.target.value)}
          options={staffOptions} placeholder="Select staff member..." />

        <div className="grid grid-cols-3 gap-3">
          <Input label="Carer Pay Regular (£)" type="number" step="0.01" min="0"
            value={form.carerPayRegular} onChange={e => set('carerPayRegular', e.target.value)} />
          <Input label="Carer Pay Bank Hol (£)" type="number" step="0.01" min="0"
            value={form.carerPayBankHoliday} onChange={e => set('carerPayBankHoliday', e.target.value)} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Carer Pay By</label>
            <select className="input" value={form.carerPayBy} onChange={e => set('carerPayBy', e.target.value)}>
              <option value="hour">Per hour</option>
              <option value="shift">Per shift</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create Standby Shift</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Shift Detail Modal ────────────────────────────────────────────────────────

function ShiftDetailModal({ shift, canManage, onClose, onDelete, onSwap, staffList }: {
  shift: any; canManage: boolean; onClose: () => void
  onDelete: () => void; onSwap: () => void; staffList: any[]
}) {
  const colors = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.regular
  return (
    <Modal open={true} onClose={onClose} title="Shift details">
      <div className="space-y-4">
        {/* Color stripe */}
        <div className="rounded-xl p-3 border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
          <p className="font-bold text-sm">
            {shift.staff_id
              ? `${ROLE_ABBR[shift.staff_role] || 'ST'} ${shift.staff_name || 'Unknown'}`
              : 'Unfilled shift'}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {shift.start_time?.substring(0, 5)}–{shift.end_time?.substring(0, 5)}
            {shift.break_minutes > 0 && ` · ${shift.break_minutes}m break`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Date</p>
            <p className="text-slate-800 font-medium">
              {shift.shift_date ? format(parseISO(shift.shift_date), 'EEE d MMM yyyy') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Shift type</p>
            <p className="text-slate-800 font-medium capitalize">{shift.shift_type?.replace(/_/g, ' ')}</p>
          </div>
          {shift.su_name && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Service User</p>
              <p className="text-slate-800 font-medium">{shift.su_name}</p>
            </div>
          )}
          {shift.is_standby && (
            <div className="col-span-2">
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Standby shift</p>
            </div>
          )}
        </div>

        {shift.notes_for_carers && (
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Notes for carers</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{shift.notes_for_carers}</p>
          </div>
        )}
        {shift.notes_for_managers && (
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Manager notes</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{shift.notes_for_managers}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          {shift.staff_id && (
            <button onClick={onSwap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Request swap
            </button>
          )}
          {canManage && (
            <button onClick={onDelete}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-600 border border-rose-100 hover:bg-rose-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Mark Leave Modal ──────────────────────────────────────────────────────────

function MarkLeaveModal({ open, onClose, staffList, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; homeId: string; defaultDate: string; onSaved: () => void
}) {
  const [form, setForm] = useState({ staffId: '', leaveDate: defaultDate, leaveType: 'annual', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setForm(f => ({ ...f, leaveDate: defaultDate })) }, [open, defaultDate])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId) { toast.error('Select a staff member'); return }
    setSaving(true)
    try {
      await api.post('/shifts/leave', { homeId, ...form })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const staffOptions = staffList.map(s => ({ value: s.id, label: getName(s) }))

  return (
    <Modal open={open} onClose={onClose} title="Record absence / leave">
      <form onSubmit={save} className="space-y-4">
        <Select label="Staff member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={staffOptions} placeholder="Select staff..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.leaveDate} onChange={e => set('leaveDate', e.target.value)} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
            <select className="input" value={form.leaveType} onChange={e => set('leaveType', e.target.value)}>
              <option value="annual">Annual leave</option>
              <option value="sick">Sick leave</option>
              <option value="other">Other absence</option>
            </select>
          </div>
        </div>
        <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Record absence</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Swap Request Modal ────────────────────────────────────────────────────────

function SwapModal({ shift, staffList, homeId, onClose, onSaved }: {
  shift: any; staffList: any[]; homeId: string
  onClose: () => void; onSaved: () => void
}) {
  const [targetStaffId, setTargetStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/shifts/swaps', { homeId, shiftId: shift.id, targetStaffId: targetStaffId || null, notes })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const staffOptions = staffList.filter(s => s.id !== shift.staff_id).map(s => ({ value: s.id, label: getName(s) }))

  return (
    <Modal open={true} onClose={onClose} title="Request shift swap">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-slate-600">
          Requesting swap for{' '}
          <strong>{shift.staff_name}</strong> on{' '}
          <strong>{shift.shift_date ? format(parseISO(shift.shift_date), 'EEE d MMM') : ''}</strong>{' '}
          {shift.start_time?.substring(0, 5)}–{shift.end_time?.substring(0, 5)}
        </p>
        <Select label="Swap with (optional)" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)}
          options={staffOptions} placeholder="Any available staff" />
        <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for swap..." />
        </div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} icon={<ArrowLeftRight className="w-4 h-4" />}>Send request</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Bulk Operations Modal ─────────────────────────────────────────────────────

function BulkOperationsModal({ open, onClose, staffList, homeId, defaultDate, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; homeId: string; defaultDate: string; onSaved: () => void
}) {
  const [form, setForm] = useState({
    staffId: '', startDate: defaultDate,
    pattern: 'weekly',          // weekly | biweekly | daily
    daysOfWeek: [1] as number[],
    startTime: '08:00', endTime: '20:00',
    breakMins: '30',
    shiftType: 'regular', weeks: '12',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setForm(f => ({ ...f, startDate: defaultDate })) }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setForm(p => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d].sort() }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId) { toast.error('Select a staff member'); return }
    if (form.daysOfWeek.length === 0) { toast.error('Select at least one day'); return }
    setSaving(true)
    try {
      const recurrenceMap: Record<string, string> = { weekly: 'weekly', biweekly: 'every_other_week', daily: 'daily' }
      const daysOfWeek = form.pattern === 'daily' ? [0,1,2,3,4,5,6] : form.daysOfWeek
      await api.post('/shifts/service-shift', {
        homeId,
        suId: null,
        startDate: form.startDate,
        isOngoing: false,
        endDate: null,
        recurrence: recurrenceMap[form.pattern] || 'weekly',
        daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        shiftType: form.shiftType,
        staffIds: [form.staffId],
        totalStaffRequired: 1,
        breakMins: parseInt(form.breakMins) || 0,
        weeks: parseInt(form.weeks) || 12,
      })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` }))

  return (
    <Modal open={open} onClose={onClose} title="Bulk Operations — Recurring Shifts" size="md">
      <form onSubmit={save} className="space-y-4">
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
          Assign a staff member to work on a recurring schedule. This generates individual shifts for the selected period.
        </p>

        <Select label="Staff member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)}
          options={staffOptions} placeholder="Select staff..." />

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Recurrence Pattern</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'daily', label: 'Every Day' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 Weeks' }].map(o => (
              <button key={o.value} type="button" onClick={() => set('pattern', o.value)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${form.pattern === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {form.pattern !== 'daily' && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Day{form.pattern === 'biweekly' ? ' (every other week)' : 's'}
            </label>
            <div className="flex gap-1">
              {DAY_LETTERS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 h-9 rounded-full text-xs font-bold border transition-colors ${form.daysOfWeek.includes(i) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date *" type="date" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Generate for (weeks)</label>
            <input type="number" min="1" max="52" className="input" value={form.weeks} onChange={e => set('weeks', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Start time *" type="time" required value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          <Input label="End time *" type="time" required value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Break (mins)</label>
            <input type="number" min="0" max="120" step="5" className="input" value={form.breakMins} onChange={e => set('breakMins', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Shift Type</label>
          <select className="input" value={form.shiftType} onChange={e => set('shiftType', e.target.value)}>
            {SHIFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
            Apply Bulk Schedule
          </Button>
        </div>
      </form>
    </Modal>
  )
}
