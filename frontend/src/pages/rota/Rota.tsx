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
  Brain, UserX, AlertTriangle, CheckCircle, Phone,
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

// Shift STATUS drives the block colour on the rota grid (RoundSys-style), independent
// of shift_type. Large, solid pastel blocks — colour is the primary at-a-glance signal.
const SHIFT_STATUSES = [
  { value: 'unfilled',  label: 'Unfilled' },
  { value: 'filled',    label: 'Filled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold',   label: 'On Hold / Hospital' },
  { value: 'completed', label: 'Complete' },
]
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  unfilled:  { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' },
  filled:    { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', dot: '#34d399' },
  cancelled: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', dot: '#f87171' },
  on_hold:   { bg: '#fef3c7', border: '#fbbf24', text: '#92400e', dot: '#f59e0b' },
  completed: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: '#60a5fa' },
}
const SHIFT_RELATIONS: Record<string, { label: string; bg: string; text: string }> = {
  shadow:     { label: 'Shadow shift',     bg: '#ede9fe', text: '#5b21b6' },
  double_up:  { label: 'Double-up shift',  bg: '#fce7f3', text: '#9d174d' },
}

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
  // Financial fields (wage/charge rates, funder billing) are only for management/admin roles —
  // must match the backend's FINANCIAL_ROLES gate in shifts.routes.ts.
  const canSeeFinancials = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')

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

  // swap requests
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [swapActing, setSwapActing] = useState<string | null>(null)

  // modals
  const [createOpen,  setCreateOpen]  = useState(false)
  const [standbyOpen, setStandbyOpen] = useState(false)
  const [leaveOpen,   setLeaveOpen]   = useState(false)
  const [bulkOpen,    setBulkOpen]    = useState(false)
  const [detailShift, setDetailShift] = useState<any>(null)
  const [swapShift,   setSwapShift]   = useState<any>(null)
  const [coverOpen,   setCoverOpen]   = useState(false)

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

  const loadSwaps = useCallback(async () => {
    if (!selectedHome) return
    try {
      const res = await api.get('/shifts/swaps', { params: { homeId: selectedHome } })
      setSwapRequests(res.data.data || [])
    } catch { }
  }, [selectedHome])

  useEffect(() => {
    if (!selectedHome) return
    Promise.all([staffApi.list({ homeId: selectedHome }), suApi.list(selectedHome, { status: 'live' })])
      .then(([sRes, suRes]) => { setStaffList(sRes.data.data || []); setSuList(suRes.data.data || []) })
    loadAll()
    loadSwaps()
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

  const actOnSwap = async (swapId: string, action: 'agree' | 'decline' | 'approved' | 'rejected') => {
    setSwapActing(swapId)
    try {
      if (action === 'agree' || action === 'decline') {
        await api.put(`/shifts/swaps/${swapId}/agree`, { agreed: action === 'agree' })
        toast.success(action === 'agree' ? 'Swap agreed — manager will be notified' : 'Swap declined')
      } else {
        await api.put(`/shifts/swaps/${swapId}`, { status: action })
        toast.success(action === 'approved' ? 'Swap approved and applied' : 'Swap rejected')
        loadAll()
      }
      loadSwaps()
    } catch { toast.error('Failed') }
    finally { setSwapActing(null) }
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
              <Button variant="outline" icon={<Brain className="w-4 h-4" />} onClick={() => setCoverOpen(true)}>
                Report Absence + Find Cover
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

      {/* ── Swap Requests Inbox ─────────────────────────────────────────── */}
      {swapRequests.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Shift Swap Requests ({swapRequests.length})
          </p>
          <div className="space-y-1.5">
            {swapRequests.map((swap: any) => (
              <div key={swap.id} className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">
                  {swap.requesting_name} wants to swap their {swap.shift_date ? format(parseISO(swap.shift_date), 'd MMM') : ''} {swap.start_time?.substring(0,5)}–{swap.end_time?.substring(0,5)} shift
                  {swap.target_name ? <> with <span className="font-semibold">{swap.target_name}</span></> : ''}
                </span>
                {swap.notes && <span className="text-slate-400 italic">"{swap.notes}"</span>}
                {/* Target staff sees agree/decline */}
                {swap.is_my_inbox && (
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      disabled={swapActing === swap.id}
                      onClick={() => actOnSwap(swap.id, 'agree')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      disabled={swapActing === swap.id}
                      onClick={() => actOnSwap(swap.id, 'decline')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200 transition-colors disabled:opacity-50">
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                )}
                {/* Manager sees approve/reject (after target has agreed) */}
                {canManage && !swap.is_my_inbox && swap.status === 'pending_manager' && (
                  <div className="flex gap-1.5 ml-auto items-center">
                    <span className="text-emerald-600 font-semibold text-xs">Both agreed —</span>
                    <button
                      disabled={swapActing === swap.id}
                      onClick={() => actOnSwap(swap.id, 'approved')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      disabled={swapActing === swap.id}
                      onClick={() => actOnSwap(swap.id, 'rejected')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200 transition-colors disabled:opacity-50">
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
                {canManage && !swap.is_my_inbox && swap.status === 'pending' && (
                  <span className="ml-auto text-slate-400 italic text-xs">Awaiting target staff response…</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

                  {/* Shift blocks — large, solid pastel blocks; colour reflects STATUS */}
                  {dayShifts.map((shift: any) => {
                    const st = shift.start_time?.substring(0, 5) || '08:00'
                    const et = shift.end_time?.substring(0, 5)   || '09:00'
                    const top    = shiftTopPx(st)
                    const height = shiftHeightPx(st, et)
                    const status = shift.status || (shift.staff_id ? 'filled' : 'unfilled')
                    const colors = STATUS_COLORS[status] || STATUS_COLORS.unfilled
                    const relation = SHIFT_RELATIONS[shift.shift_relation]

                    return (
                      <button key={shift.id} onClick={() => setDetailShift(shift)}
                        className="absolute left-1 right-1 rounded-xl border-2 text-left overflow-hidden hover:z-10 hover:shadow-lg hover:scale-[1.01] transition-all duration-100 shadow-sm"
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 32),
                          backgroundColor: colors.bg,
                          borderColor:     colors.border,
                          color:           colors.text,
                        }}>
                        <div className="px-2 py-1.5 h-full flex flex-col">
                          <p className="text-[12px] font-extrabold leading-tight truncate">
                            {status === 'unfilled'
                              ? 'Unfilled'
                              : `${ROLE_ABBR[shift.staff_role] || 'ST'} ${shift.staff_name?.split(' ')[0] || ''} ${(shift.staff_name?.split(' ')[1] || '')[0] || ''}`}
                          </p>
                          {height > 40 && shift.su_name && (
                            <p className="text-[10.5px] leading-tight truncate font-medium opacity-80">{shift.su_name}</p>
                          )}
                          {height > 54 && (
                            <p className="text-[10px] leading-tight opacity-70">{st}–{et}</p>
                          )}
                          {relation && height > 68 && (
                            <span className="mt-auto inline-block w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: relation.bg, color: relation.text }}>
                              {relation.label}
                            </span>
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
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500 flex-wrap bg-slate-50 no-print">
        {SHIFT_STATUSES.map(s => (
          <span key={s.value} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.value].dot }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#fb7185' }} />Leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#fcd34d' }} />Standby
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
          canSeeFinancials={canSeeFinancials}
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
          canSeeFinancials={canSeeFinancials}
          onClose={() => setDetailShift(null)}
          onDelete={() => deleteShift(detailShift.id)}
          onSwap={() => { setSwapShift(detailShift); setDetailShift(null) }}
          onUpdated={(updated) => {
            setDetailShift(updated)
            setShifts(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
          }}
          onLinked={() => { setDetailShift(null); loadAll() }}
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

      {coverOpen && (
        <FindCoverModal
          open={coverOpen}
          onClose={() => setCoverOpen(false)}
          staffList={staffList}
          homeId={selectedHome}
          defaultDate={format(today, 'yyyy-MM-dd')}
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

function CreateShiftModal({ open, onClose, suList, staffList, homeId, defaultDate, onSaved, canSeeFinancials }: {
  open: boolean; onClose: () => void
  suList: any[]; staffList: any[]; homeId: string
  defaultDate: string; onSaved: () => void; canSeeFinancials: boolean
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    suId: '', startDate: defaultDate, isOngoing: true, endDate: '',
    recurrence: 'daily', daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '08:00', endTime: '20:00',
    shiftType: 'regular', totalStaffRequired: '1',
    breakMins: '30',
    notesForCarers: '', notesForManagers: '',
    // Wage Rates / billing — only ever shown/submitted for privileged roles (canSeeFinancials)
    funderName: '', funderCostNotes: '',
    wageRate: '', chargeRate: '', chargeBankHolidayRate: '',
    timeCritical: false, shiftRun: '',
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

          {/* Time critical + shift run */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Time Critical?</label>
              <div className="flex gap-2">
                {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(o => (
                  <button key={String(o.v)} type="button" onClick={() => set('timeCritical', o.v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.timeCritical === o.v ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Shift Run" value={form.shiftRun} onChange={e => set('shiftRun', e.target.value)} placeholder="e.g. Route A" />
          </div>

          {/* Wage Rates / billing — financial fields, privileged roles only */}
          {canSeeFinancials && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wage Rates</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Funder" value={form.funderName} onChange={e => set('funderName', e.target.value)} placeholder="Funder name..." />
                <Input label="Wage Rate (£/hr)" type="number" step="0.01" min="0" value={form.wageRate} onChange={e => set('wageRate', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Funder Cost Notes</label>
                <textarea className="input" rows={2} value={form.funderCostNotes} onChange={e => set('funderCostNotes', e.target.value)} placeholder="Notes on funder cost arrangement..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Charge (£/hr)" type="number" step="0.01" min="0" value={form.chargeRate} onChange={e => set('chargeRate', e.target.value)} />
                <Input label="Charge as Bank Holidays (£/hr)" type="number" step="0.01" min="0" value={form.chargeBankHolidayRate} onChange={e => set('chargeBankHolidayRate', e.target.value)} />
              </div>
            </div>
          )}

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

function ShiftDetailModal({ shift, canManage, canSeeFinancials, onClose, onDelete, onSwap, onUpdated, onLinked, staffList }: {
  shift: any; canManage: boolean; canSeeFinancials: boolean; onClose: () => void
  onDelete: () => void; onSwap: () => void
  onUpdated: (updated: any) => void; onLinked: () => void
  staffList: any[]
}) {
  const status = shift.status || (shift.staff_id ? 'filled' : 'unfilled')
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unfilled
  const [savingStatus, setSavingStatus] = useState(false)
  const [linking, setLinking] = useState<'shadow' | 'double_up' | null>(null)
  const [showBlockDetails, setShowBlockDetails] = useState(false)

  const changeStatus = async (newStatus: string) => {
    if (newStatus === status) return
    setSavingStatus(true)
    try {
      const res = await api.put(`/shifts/${shift.id}/status`, { status: newStatus })
      onUpdated(res.data.data)
      toast.success('Shift status updated')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to update status') }
    finally { setSavingStatus(false) }
  }

  const createLinked = async (relation: 'shadow' | 'double_up') => {
    setLinking(relation)
    try {
      await api.post(`/shifts/${shift.id}/link`, { relation })
      toast.success(relation === 'shadow' ? 'Shadow shift created' : 'Double-up shift created')
      onLinked()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create linked shift') }
    finally { setLinking(null) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Shift details">
      <div className="space-y-4">
        {/* Color stripe */}
        <div className="rounded-xl p-3 border-2" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
          <p className="font-bold text-sm">
            {shift.staff_id
              ? `${ROLE_ABBR[shift.staff_role] || 'ST'} ${shift.staff_name || 'Unknown'}`
              : 'Unfilled shift'}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {shift.start_time?.substring(0, 5)}–{shift.end_time?.substring(0, 5)}
            {shift.break_minutes > 0 && ` · ${shift.break_minutes}m break`}
            {shift.total_staff_required > 1 && ` · Shift Size ${shift.total_staff_required}`}
          </p>
          {SHIFT_RELATIONS[shift.shift_relation] && (
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60">
              {SHIFT_RELATIONS[shift.shift_relation].label}
            </span>
          )}
        </div>

        {/* Status changer */}
        {canManage && (
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {SHIFT_STATUSES.map(s => (
                <button key={s.value} disabled={savingStatus} onClick={() => changeStatus(s.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${
                    status === s.value ? 'text-white' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                  style={status === s.value ? { backgroundColor: STATUS_COLORS[s.value].dot, borderColor: STATUS_COLORS[s.value].dot } : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
          {shift.time_critical && (
            <div className="col-span-2">
              <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">⚠ Time Critical</p>
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

        {/* Block details / more info toggle */}
        <button type="button" onClick={() => setShowBlockDetails(v => !v)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          {showBlockDetails ? 'Hide block details' : 'More info / Block Details'}
        </button>
        {showBlockDetails && (
          <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1">
            <p><span className="text-slate-400">Shift ID:</span> {shift.id}</p>
            {shift.shift_run && <p><span className="text-slate-400">Shift Run:</span> {shift.shift_run}</p>}
            {canSeeFinancials && shift.funder_name && <p><span className="text-slate-400">Funder:</span> {shift.funder_name}</p>}
            {canSeeFinancials && shift.wage_rate && <p><span className="text-slate-400">Wage Rate:</span> £{shift.wage_rate}/hr</p>}
            {canSeeFinancials && shift.charge_rate && <p><span className="text-slate-400">Charge Rate:</span> £{shift.charge_rate}/hr</p>}
            {canSeeFinancials && shift.charge_bank_holiday_rate && <p><span className="text-slate-400">Bank Holiday Charge:</span> £{shift.charge_bank_holiday_rate}/hr</p>}
            {canSeeFinancials && shift.funder_cost_notes && <p><span className="text-slate-400">Funder Cost Notes:</span> {shift.funder_cost_notes}</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {shift.staff_id && (
            <button onClick={onSwap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Request swap
            </button>
          )}
          {canManage && !shift.parent_shift_id && (
            <>
              <button onClick={() => createLinked('shadow')} disabled={linking !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-violet-600 border border-violet-200 hover:bg-violet-50 transition-colors disabled:opacity-50">
                {linking === 'shadow' ? 'Creating…' : 'Create shadow shift'}
              </button>
              <button onClick={() => createLinked('double_up')} disabled={linking !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-pink-600 border border-pink-200 hover:bg-pink-50 transition-colors disabled:opacity-50">
                {linking === 'double_up' ? 'Creating…' : 'Create double-up shift'}
              </button>
            </>
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

// ── Find Cover Modal ──────────────────────────────────────────────────────────

interface Replacement {
  staffId: string
  name: string
  role: string
  phone: string | null
  shiftsThisWeek: number
  overtimeRisk: 'low' | 'medium' | 'high'
  aiReason: string
  recommended: boolean
}

interface FindReplacementResult {
  absent: { name: string; role: string }
  replacements: Replacement[]
  aiSummary: string
}

function FindCoverModal({ open, onClose, staffList, homeId, defaultDate }: {
  open: boolean; onClose: () => void
  staffList: any[]; homeId: string; defaultDate: string
}) {
  const [form, setForm] = useState({
    absentStaffId: '',
    shiftDate: defaultDate,
    shiftType: 'early' as 'early' | 'late' | 'night',
    reason: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FindReplacementResult | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, shiftDate: defaultDate, absentStaffId: '', reason: '' }))
      setResult(null)
      setNotifiedIds(new Set())
    }
  }, [open, defaultDate])

  const findReplacement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.absentStaffId) { toast.error('Select the absent staff member'); return }
    if (!form.reason.trim()) { toast.error('Enter a reason for absence'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/ai/find-replacement', { homeId, ...form })
      setResult(res.data.data as FindReplacementResult)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to find replacements')
    } finally {
      setLoading(false)
    }
  }

  const notify = async (r: Replacement) => {
    setNotifyingId(r.staffId)
    try {
      const message = `You are requested to cover the ${form.shiftType} shift on ${form.shiftDate}. Reason: ${form.reason}`
      await api.post('/ai/notify-replacement', {
        homeId,
        staffId: r.staffId,
        shiftDate: form.shiftDate,
        shiftType: form.shiftType,
        message,
      })
      setNotifiedIds(prev => new Set(prev).add(r.staffId))
      toast.success(`Notification sent to ${r.name}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send notification')
    } finally {
      setNotifyingId(null)
    }
  }

  const overtimeBadge = (risk: Replacement['overtimeRisk']) => {
    if (risk === 'high') return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> High OT
      </span>
    )
    if (risk === 'medium') return (
      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Med OT
      </span>
    )
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Low OT
      </span>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Report Absence + Find Cover" size="lg">
      <div className="space-y-5">
        {/* Form */}
        <form onSubmit={findReplacement} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Absent Staff Member *
              </label>
              <select
                required
                className="input"
                value={form.absentStaffId}
                onChange={e => set('absentStaffId', e.target.value)}
              >
                <option value="">Select staff...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{getName(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Shift Date *
              </label>
              <input
                type="date"
                required
                className="input"
                value={form.shiftDate}
                onChange={e => set('shiftDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Shift Type *
            </label>
            <div className="flex gap-2">
              {(['early', 'late', 'night'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, shiftType: st }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                    form.shiftType === st
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Reason for Absence *
            </label>
            <textarea
              required
              className="input"
              rows={2}
              placeholder="e.g. Sick leave — flu symptoms reported this morning"
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            icon={<Brain className="w-4 h-4" />}
          >
            Find AI Replacement
          </Button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-slate-800">
                  {result.absent.name}
                  <span className="ml-2 text-xs font-normal text-slate-500 capitalize">
                    {(result.absent.role || '').replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
              <p className="text-sm text-slate-600 ml-6">{result.aiSummary}</p>
            </div>

            {result.replacements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No available staff found.</p>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {result.replacements.map((r) => (
                  <div
                    key={r.staffId}
                    className={`bg-white border rounded-xl p-4 transition-colors ${
                      r.recommended
                        ? 'border-emerald-300'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-bold text-slate-800">{r.name}</p>
                          <span className="text-xs text-slate-500 capitalize">
                            {(r.role || '').replace(/_/g, ' ')}
                          </span>
                          {r.recommended && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Recommended
                            </span>
                          )}
                          {overtimeBadge(r.overtimeRisk)}
                        </div>
                        <p className="text-xs text-slate-500 mb-1">
                          {r.shiftsThisWeek} shift{r.shiftsThisWeek !== 1 ? 's' : ''} this week
                          {r.phone && (
                            <span className="ml-3 inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {r.phone}
                            </span>
                          )}
                        </p>
                        {r.aiReason && (
                          <p className="text-xs text-slate-500 italic">{r.aiReason}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {notifiedIds.has(r.staffId) ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Notified
                          </span>
                        ) : (
                          <button
                            disabled={notifyingId === r.staffId}
                            onClick={() => notify(r)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {notifyingId === r.staffId ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Phone className="w-3.5 h-3.5" />
                            )}
                            Notify
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
