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
  Brain, UserX, UserMinus, AlertTriangle, CheckCircle, Phone, Users, MapPin,
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
  clocked_in: { bg: '#4ade80', border: '#15803d', text: '#052e16', dot: '#15803d' },
  late:       { bg: '#fed7aa', border: '#f97316', text: '#7c2d12', dot: '#ea580c' },
  missed:     { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d', dot: '#b91c1c' },
}

// Grace period before a not-yet-clocked-in shift is flagged late.
const LATE_GRACE_MINS = 10

// Derives an at-a-glance display status from the shift's clock-in/out events —
// RoundSys-style: staff who clocked in show green, late clock-ins show amber,
// and shifts nobody ever clocked into (once their end time has passed) show red.
// Only overrides the manager-set 'filled' status — cancelled/on_hold/completed/
// unfilled are left exactly as the manager set them.
function getDisplayStatus(shift: any, now: Date): string {
  const status = shift.status || (shift.staff_id ? 'filled' : 'unfilled')
  // A shift with a staff member assigned is eligible for the clock-in colour
  // override whenever its status isn't one of the terminal, manager-set ones —
  // not only when status is the exact literal 'filled'. Some shifts (older
  // rows, or ones generated through a path that never explicitly wrote
  // 'filled') keep staff_id set but status stuck at the 'unfilled' default,
  // which silently disabled clock-in colouring for that shift forever even
  // though someone was clearly assigned and on shift.
  const TERMINAL_STATUSES = ['cancelled', 'on_hold', 'completed']
  if (!shift.staff_id || TERMINAL_STATUSES.includes(status)) return status

  const st = shift.start_time?.substring(0, 5) || '08:00'
  const et = shift.end_time?.substring(0, 5) || '09:00'
  const shiftStart = new Date(`${shift.shift_date}T${st}:00`)
  let shiftEnd = new Date(`${shift.shift_date}T${et}:00`)
  if (shiftEnd <= shiftStart) shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000)

  if (shift.clock_in_time) {
    const lateByMins = (new Date(shift.clock_in_time).getTime() - shiftStart.getTime()) / 60000
    return lateByMins > LATE_GRACE_MINS ? 'late' : 'clocked_in'
  }
  if (now.getTime() > shiftEnd.getTime()) return 'missed'
  if (now.getTime() > shiftStart.getTime() + LATE_GRACE_MINS * 60000) return 'late'
  return 'filled'
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

// Assigns each shift a lane (col) and lane count (cols) so overlapping shifts on the
// same day render side-by-side instead of stacking on top of each other full-width —
// without this, two shifts at the same time hide one another entirely. Also returns
// the day's overall max simultaneous lane count, so the day column can be sized wide
// enough that a multi-staff shift (e.g. 3 people on at once) doesn't get squeezed down
// to an unreadable sliver — RoundSys keeps every lane a fixed, legible width and lets
// the whole rota scroll horizontally instead of shrinking blocks to fit.
function layoutShiftLanes(dayShifts: any[]): { layout: Map<string, { col: number; cols: number }>; maxCols: number } {
  const layout = new Map<string, { col: number; cols: number }>()
  const sorted = [...dayShifts].sort((a, b) => {
    const as = timeToMins(a.start_time?.substring(0, 5) || '08:00')
    const bs = timeToMins(b.start_time?.substring(0, 5) || '08:00')
    return as - bs
  })
  let open: { id: string; end: number; col: number }[] = []
  let cluster: string[] = []
  let clusterMaxCols = 0
  let dayMaxCols = 1

  const finalizeCluster = () => {
    for (const id of cluster) {
      const entry = layout.get(id)
      if (entry) entry.cols = clusterMaxCols
    }
    dayMaxCols = Math.max(dayMaxCols, clusterMaxCols)
    cluster = []
    clusterMaxCols = 0
  }

  for (const shift of sorted) {
    const start = timeToMins(shift.start_time?.substring(0, 5) || '08:00')
    let end = timeToMins(shift.end_time?.substring(0, 5) || '09:00')
    if (end <= start) end += 1440

    open = open.filter(o => o.end > start)
    if (open.length === 0 && cluster.length > 0) finalizeCluster()

    const usedCols = new Set(open.map(o => o.col))
    let col = 0
    while (usedCols.has(col)) col++

    open.push({ id: shift.id, end, col })
    cluster.push(shift.id)
    clusterMaxCols = Math.max(clusterMaxCols, open.length)
    layout.set(shift.id, { col, cols: 1 })
  }
  finalizeCluster()
  return { layout, maxCols: dayMaxCols }
}

// Minimum pixel width per simultaneous shift lane, and per day column overall — fixed
// regardless of how many staff are on at once, so blocks stay readable; the grid
// scrolls horizontally instead (see layoutShiftLanes above).
const LANE_MIN_WIDTH = 130
const DAY_MIN_WIDTH = 210

// ── Main Component ────────────────────────────────────────────────────────────

export default function Rota() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'senior_carer', 'deputy_manager', 'admin')
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
  const [filterLabel, setFilterLabel] = useState('')
  const [filterType,  setFilterType]  = useState('')
  // Individual = each resident's own rota (no service label). Service = shared-service
  // rota entries created via "Create Rota for Service" (has a label). "All" shows both
  // mixed together, which is how the grid behaved before this switch existed.
  const [rotaMode, setRotaMode] = useState<'all' | 'individual' | 'service'>('all')

  // swap requests
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [swapActing, setSwapActing] = useState<string | null>(null)
  // Manually toggled open via the "Swap Requests" button in the filter bar, so
  // there's always a way to check even when there's nothing pending (the panel
  // auto-shows on its own whenever there ARE pending requests, regardless of this).
  const [swapPanelOpen, setSwapPanelOpen] = useState(false)

  // Bulk shift selection — clicking a shift tile always toggles its highlight
  // (RoundSys-style), no separate "select mode" to switch into first. Once
  // anything's highlighted, the action bar below the filters offers assign/delete.
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set())
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // modals
  const [standbyOpen, setStandbyOpen] = useState(false)
  const [serviceRotaOpen, setServiceRotaOpen] = useState(false)
  const [leaveOpen,   setLeaveOpen]   = useState(false)
  const [detailShift, setDetailShift] = useState<any>(null)
  const [swapShift,   setSwapShift]   = useState<any>(null)
  const [coverOpen,   setCoverOpen]   = useState(false)
  const [patternAssignOpen, setPatternAssignOpen] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  // Pre-fills Bulk Assign — Recurring Pattern when opened from a specific shift's
  // detail modal ("Bulk assign like this"), so staff don't have to re-pick the
  // resident/day-or-night that's already obvious from the shift they clicked.
  const [patternSeed, setPatternSeed] = useState<{ suId?: string; dayOrNight?: 'any' | 'day' | 'night'; daysOfWeek?: number[] } | null>(null)

  // Drives clock-in/late/missed shift colouring — re-evaluated every minute so a
  // shift flips from "on time" to "late" (and a green block flips to red once its
  // end time passes with no clock-in) without needing a page reload.
  const [nowTick, setNowTick] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

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

  // Every service name ever used at this home, independent of the visible
  // week/day — deriving this from just the currently-loaded shifts made the
  // Services list look empty when the visible date range had no service
  // shifts on it, even though services existed on other weeks.
  const [allServiceLabels, setAllServiceLabels] = useState<string[]>([])
  const loadServiceLabels = useCallback(async () => {
    if (!selectedHome) return
    try {
      const res = await api.get('/shifts/service-labels', { params: { homeId: selectedHome } })
      setAllServiceLabels(res.data.data || [])
    } catch { }
  }, [selectedHome])
  useEffect(() => { loadServiceLabels() }, [loadServiceLabels])
  const [manageServicesOpen, setManageServicesOpen] = useState(false)

  useEffect(() => {
    if (!selectedHome) return
    Promise.all([staffApi.list({ homeId: selectedHome }), suApi.list(selectedHome, { status: 'live' })])
      .then(([sRes, suRes]) => { setStaffList(sRes.data.data || []); setSuList(suRes.data.data || []) })
    loadAll()
    loadSwaps()
  }, [selectedHome, weekStart, dayDate, view])

  // ── Actions ───────────────────────────────────────────────────────────────

  // In-app confirm dialog for anything destructive below — a native
  // window.confirm() blocks automated/assistive click-through and is
  // inconsistent with the confirm-modal pattern Manage Services already uses.
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  const deleteShift = (id: string) => {
    setPendingConfirm({
      title: 'Remove this shift?',
      message: 'Remove this shift?',
      onConfirm: async () => {
        setPendingConfirm(null)
        try {
          await api.delete(`/shifts/${id}`)
          setShifts(prev => prev.filter(s => s.id !== id))
          setDetailShift(null)
          toast.success('Shift removed')
        } catch { toast.error('Failed') }
      },
    })
  }

  // Removes the recurring template plus every future occurrence generated
  // from it (past shifts stay, for the record) — for an "ongoing"/recurring
  // shift, deleting just today's occurrence via deleteShift() leaves every
  // future day still scheduled.
  const deleteShiftSeries = (shift: any) => {
    if (!shift.template_id) return deleteShift(shift.id)
    setPendingConfirm({
      title: 'Remove this recurring shift?',
      message: 'Remove this AND all future occurrences of this recurring shift? Past shifts are kept for the record.',
      onConfirm: async () => {
        setPendingConfirm(null)
        try {
          await api.delete(`/shifts/templates/${shift.template_id}`)
          setShifts(prev => prev.filter(s => !(s.template_id === shift.template_id && s.shift_date >= format(new Date(), 'yyyy-MM-dd'))))
          setDetailShift(null)
          toast.success('Recurring shift removed from today onwards')
        } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to remove recurring shift') }
      },
    })
  }

  // ── Bulk selection ───────────────────────────────────────────────────────

  const toggleShiftSelected = (id: string) => {
    setSelectedShiftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedShiftIds(new Set())

  const bulkDeleteShifts = () => {
    if (selectedShiftIds.size === 0) return
    const n = selectedShiftIds.size
    setPendingConfirm({
      title: 'Delete selected shifts?',
      message: `Delete ${n} selected shift${n !== 1 ? 's' : ''}? This cannot be undone.`,
      onConfirm: async () => {
        setPendingConfirm(null)
        setBulkDeleting(true)
        try {
          const ids = Array.from(selectedShiftIds)
          const results = await Promise.allSettled(ids.map(id => api.delete(`/shifts/${id}`)))
          const okIds = ids.filter((_, i) => results[i].status === 'fulfilled')
          const failed = ids.length - okIds.length
          setShifts(prev => prev.filter(s => !okIds.includes(s.id)))
          if (failed === 0) toast.success(`${okIds.length} shift${okIds.length !== 1 ? 's' : ''} deleted`)
          else toast.error(`Deleted ${okIds.length}, ${failed} failed`)
          clearSelection()
        } finally { setBulkDeleting(false) }
      },
    })
  }

  const bulkAssignStaff = async (staffId: string) => {
    if (selectedShiftIds.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedShiftIds)
      const results = await Promise.allSettled(ids.map(id => api.put(`/shifts/${id}`, { staffId })))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed === 0) toast.success(`Assigned to ${ids.length} shift${ids.length !== 1 ? 's' : ''}`)
      else toast.error(`Assigned ${ids.length - failed}, ${failed} failed`)
      setBulkAssignOpen(false)
      clearSelection()
      loadAll()
    } finally { setBulkDeleting(false) }
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

  // Distinct service names for the unified staff/service filter dropdown below —
  // sourced from allServiceLabels (every label ever used at this home), not just
  // the shifts currently loaded for the visible week/day.
  const serviceLabels = allServiceLabels

  const getDayShifts = (day: Date) => {
    let r = shifts.filter(s => { try { return isSameDay(parseISO(s.shift_date), day) } catch { return false } })
    if (rotaMode === 'individual') r = r.filter(s => !s.label)
    if (rotaMode === 'service')    r = r.filter(s => !!s.label)
    if (filterSu)    r = r.filter(s => s.su_id === filterSu || (Array.isArray(s.su_ids) && s.su_ids.includes(filterSu)))
    if (filterStaff) r = r.filter(s => s.staff_id === filterStaff)
    if (filterLabel) r = r.filter(s => s.label === filterLabel)
    if (filterType)  r = r.filter(s => s.shift_type === filterType)
    return r
  }
  const getDayLeaves = (day: Date) =>
    leaves.filter(l => { try { return isSameDay(parseISO(l.leave_date), day) } catch { return false } })

  // Computed once per render and shared by both the sticky day headers and the grid
  // columns below, so a day's width (driven by how many staff are on at once) stays
  // identical in both places instead of drifting out of alignment.
  const dayData = days.map(day => {
    const dayShifts = getDayShifts(day)
    const dayLeaves = getDayLeaves(day)
    const { layout: shiftLanes, maxCols } = layoutShiftLanes(dayShifts)
    const width = Math.max(DAY_MIN_WIDTH, maxCols * LANE_MIN_WIDTH)
    return { day, dayShifts, dayLeaves, shiftLanes, width }
  })

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
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setServiceRotaOpen(true)}
                title="Staff is optional — creates an unfilled rota for a service that you can assign staff to later">
                Create shift <span className="ml-1 font-normal opacity-70">(staff optional)</span>
              </Button>
              <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setStandbyOpen(true)}>
                Create Standby Shift
              </Button>
              <Button variant="outline" icon={<Users className="w-4 h-4" />} onClick={() => setPatternAssignOpen(true)}
                title="Assign an existing staff member to shifts that already exist on the rota, across a day-of-week pattern — use this to fill in a rota someone already created">
                Bulk Assign Staff to Shifts
              </Button>
              <Button variant="outline" icon={<UserMinus className="w-4 h-4" />} onClick={() => setUnassignOpen(true)}
                title="Remove a staff member from all of their current and future shifts (today onwards) — the shifts stay on the rota as unfilled, ready to reassign">
                Unassign
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
        {/* Rota is service-only now (every new shift requires a Service + a
            resident), so the old All/Individual/Service switch collapsed down
            to a single always-on "Service" label — nothing left to switch
            between. rotaMode stays 'all' under the hood so any older,
            pre-redesign individual shifts remain visible rather than getting
            silently hidden. */}
        <span className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-800 text-white text-sm font-bold flex-shrink-0">
          Service
        </span>
        <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterSu} onChange={e => setFilterSu(e.target.value)}>
          <option value="">All Service Users</option>
          {suList.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
        </select>
        {/* Unified staff + service filter — one dropdown so the user can jump
            straight to a single service (instead of every service lumped
            together) or a single staff member, without hunting through two
            separate lists. */}
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterStaff ? `staff:${filterStaff}` : filterLabel ? `service:${filterLabel}` : ''}
          onChange={e => {
            const v = e.target.value
            if (v.startsWith('staff:')) { setFilterStaff(v.slice(6)); setFilterLabel('') }
            else if (v.startsWith('service:')) { setFilterLabel(v.slice(8)); setFilterStaff('') }
            else { setFilterStaff(''); setFilterLabel('') }
          }}>
          <option value="">All Staff</option>
          {serviceLabels.length > 0 && (
            <optgroup label="Services">
              {serviceLabels.map(l => <option key={l} value={`service:${l}`}>{l}</option>)}
            </optgroup>
          )}
          <optgroup label="Staff">
            {staffList.map(s => <option key={s.id} value={`staff:${s.id}`}>{getName(s)}</option>)}
          </optgroup>
        </select>
        {canManage && serviceLabels.length > 0 && (
          <button onClick={() => setManageServicesOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="View and delete services — e.g. remove accidental duplicates">
            <Trash2 className="w-3 h-3" /> Manage Services
          </button>
        )}
        <button onClick={() => setSwapPanelOpen(v => !v)}
          className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
          title="View shift swap requests">
          <ArrowLeftRight className="w-3 h-3" /> Swap Requests{swapRequests.length > 0 ? ` (${swapRequests.length})` : ''}
        </button>
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Shift Types</option>
          {SHIFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(filterSu || filterStaff || filterLabel || filterType) && (
          <button onClick={() => { setFilterSu(''); setFilterStaff(''); setFilterLabel(''); setFilterType('') }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="ml-auto text-xs font-bold text-slate-600">
          {todayShifts.length} shift{todayShifts.length !== 1 ? 's' : ''} today
        </div>
      </div>

      {/* ── Bulk selection action bar — appears the moment anything's highlighted ── */}
      {selectedShiftIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-100 bg-blue-50 flex-wrap">
          <p className="text-sm font-bold text-blue-800">
            {`${selectedShiftIds.size} shift${selectedShiftIds.size !== 1 ? 's' : ''} selected — assign staff to all of them, or delete them`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={bulkDeleting}
              icon={<Users className="w-3.5 h-3.5" />} onClick={() => setBulkAssignOpen(true)}>
              Bulk assign staff
            </Button>
            <Button size="sm" variant="danger" loading={bulkDeleting}
              icon={<Trash2 className="w-3.5 h-3.5" />} onClick={bulkDeleteShifts}>
              Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Swap Requests Inbox ─────────────────────────────────────────── */}
      {(swapRequests.length > 0 || swapPanelOpen) && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Shift Swap Requests ({swapRequests.length})
            {swapRequests.length === 0 && (
              <button onClick={() => setSwapPanelOpen(false)} className="ml-auto text-amber-400 hover:text-amber-600 normal-case font-normal">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </p>
          {swapRequests.length === 0 && (
            <p className="text-xs text-amber-600 italic">No pending swap requests right now.</p>
          )}
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
                {/* Manager sees approve/reject: immediately for an "open" request (no
                    specific target was picked, so there's nobody who could ever click
                    Agree — waiting for that response would leave it stuck forever), or
                    once a specific target has agreed. */}
                {canManage && !swap.is_my_inbox && (swap.status === 'pending_manager' || (swap.status === 'pending' && !swap.target_staff_id)) && (
                  <div className="flex gap-1.5 ml-auto items-center">
                    <span className="text-emerald-600 font-semibold text-xs">
                      {swap.status === 'pending_manager' ? 'Both agreed —' : 'Open request —'}
                    </span>
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
                {canManage && !swap.is_my_inbox && swap.status === 'pending' && !!swap.target_staff_id && (
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
          {dayData.map(({ day, dayShifts, dayLeaves, width }) => {
            const isToday = isSameDay(day, today)
            const count = dayShifts.length + dayLeaves.length
            return (
              <div key={day.toString()} style={{ width, minWidth: width, flexShrink: 0 }}
                className={`text-center py-2 border-l border-slate-100 ${isToday ? 'bg-indigo-600' : ''}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-indigo-100' : 'text-slate-700'}`}>{format(day, 'EEE')}</p>
                <p className={`text-xl font-bold leading-tight ${isToday ? 'text-white' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </p>
                <p className={`text-[10px] font-bold ${isToday ? 'text-indigo-100' : 'text-slate-600'}`}>{format(day, 'MMM')}</p>
                {count > 0 && (
                  <div className={`mx-auto mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isToday ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
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

            {/* Day columns — fixed width driven by the day's busiest overlap (see
                LANE_MIN_WIDTH/DAY_MIN_WIDTH above), not shrunk to fit; the outer
                Timeline container scrolls horizontally when the total width of all
                days exceeds the viewport. */}
            {dayData.map(({ day, dayShifts, dayLeaves, shiftLanes, width }) => {
              const isToday  = isSameDay(day, today)

              return (
                <div key={day.toString()} style={{ width, minWidth: width, flexShrink: 0, height: TOTAL_HEIGHT }}
                  className={`relative border-l ${isToday ? 'bg-indigo-50 border-l-2 border-indigo-300' : 'border-slate-100'}`}>

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
                    const status = getDisplayStatus(shift, nowTick)
                    const colors = STATUS_COLORS[status] || STATUS_COLORS.unfilled
                    const relation = SHIFT_RELATIONS[shift.shift_relation]
                    const selected = selectedShiftIds.has(shift.id)
                    const lane = shiftLanes.get(shift.id) || { col: 0, cols: 1 }
                    const laneWidth = 100 / lane.cols
                    const laneLeft = lane.col * laneWidth

                    return (
                      <button key={shift.id} onClick={() => toggleShiftSelected(shift.id)}
                        onDoubleClick={() => setDetailShift(shift)}
                        className="group absolute rounded-xl border-2 text-left overflow-hidden hover:z-10 hover:shadow-lg hover:scale-[1.01] transition-all duration-100 shadow-sm"
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 32),
                          left: `calc(${laneLeft}% + 2px)`,
                          width: `calc(${laneWidth}% - 4px)`,
                          backgroundColor: colors.bg,
                          borderColor:     selected ? '#e8b130' : colors.border,
                          color:           colors.text,
                          boxShadow: selected ? '0 0 0 2px #e8b130' : undefined,
                        }}>
                        {/* Click-to-highlight (RoundSys-style) — every tile is always
                            selectable, no separate "select mode" needed. This small
                            checkbox just confirms the tile's selected state; the amber
                            border above is the primary at-a-glance signal. */}
                        <div className={`absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center border ${selected ? 'bg-amber-500 border-amber-500' : 'bg-white/80 border-slate-300'}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {canManage && (
                          <span
                            role="button"
                            title="Delete this shift"
                            onClick={(e) => { e.stopPropagation(); deleteShift(shift.id) }}
                            className="absolute bottom-1 right-1 w-5 h-5 rounded-md flex items-center justify-center bg-white/80 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-opacity cursor-pointer">
                            <Trash2 className="w-3 h-3" />
                          </span>
                        )}
                        <div className="px-2 py-1.5 h-full flex flex-col">
                          <p className="text-[12px] font-extrabold leading-tight truncate flex items-center gap-1">
                            {status === 'clocked_in' && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                            {(status === 'late' || status === 'missed') && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                            {status === 'unfilled'
                              ? 'Unfilled'
                              : `${ROLE_ABBR[shift.staff_role] || 'ST'} ${shift.staff_name?.split(' ')[0] || ''} ${(shift.staff_name?.split(' ')[1] || '')[0] || ''}`}
                          </p>
                          {height > 40 && (shift.label || shift.su_names || shift.su_name) && (
                            <p className="text-[10.5px] leading-tight truncate font-bold" title={shift.label || shift.su_names || shift.su_name}>
                              {shift.label || shift.su_names || shift.su_name}
                            </p>
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
                    <button onClick={() => setServiceRotaOpen(true)}
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
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[11px] font-semibold text-slate-600 flex-wrap bg-slate-50 no-print">
        {SHIFT_STATUSES.map(s => (
          <span key={s.value} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.value].dot }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.clocked_in.dot }} />Clocked in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.late.dot }} />Late clock-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.missed.dot }} />Missed clock-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#fb7185' }} />Leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#fcd34d' }} />Standby
        </span>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {standbyOpen && (
        <CreateStandbyModal
          open={standbyOpen}
          onClose={() => setStandbyOpen(false)}
          staffList={staffList}
          homeId={selectedHome}
          serviceLabels={serviceLabels}
          defaultDate={format(view === 'week' ? weekStart : dayDate, 'yyyy-MM-dd')}
          onSaved={() => { setStandbyOpen(false); loadAll(); toast.success('Standby shift created') }}
        />
      )}

      {serviceRotaOpen && (
        <CreateServiceRotaModal
          open={serviceRotaOpen}
          onClose={() => setServiceRotaOpen(false)}
          suList={suList}
          staffList={staffList}
          homeId={selectedHome}
          canSeeFinancials={canSeeFinancials}
          defaultDate={format(view === 'week' ? weekStart : dayDate, 'yyyy-MM-dd')}
          existingLabels={allServiceLabels}
          onSaved={() => { setServiceRotaOpen(false); loadAll(); loadServiceLabels() }}
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
          onDeleteSeries={() => deleteShiftSeries(detailShift)}
          onSwap={() => { setSwapShift(detailShift); setDetailShift(null) }}
          onUpdated={(updated) => {
            setDetailShift(updated)
            setShifts(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
          }}
          onLinked={() => { setDetailShift(null); loadAll() }}
          onBulkAssign={() => {
            const st = detailShift.start_time?.substring(0, 5) || '08:00'
            const dayOrNight: 'day' | 'night' = st >= '06:00' && st < '20:00' ? 'day' : 'night'
            const dow = parseISO(detailShift.shift_date).getDay()
            setPatternSeed({ suId: detailShift.su_id || undefined, dayOrNight, daysOfWeek: [dow] })
            setDetailShift(null)
            setPatternAssignOpen(true)
          }}
          staffList={staffList}
        />
      )}

      {bulkAssignOpen && (
        <BulkAssignStaffModal
          open={bulkAssignOpen}
          onClose={() => setBulkAssignOpen(false)}
          staffList={staffList}
          count={selectedShiftIds.size}
          assigning={bulkDeleting}
          onAssign={bulkAssignStaff}
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

      {pendingConfirm && (
        <Modal open={true} onClose={() => setPendingConfirm(null)} title={pendingConfirm.title} size="sm">
          <p className="text-sm text-slate-600 mb-5">{pendingConfirm.message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPendingConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={pendingConfirm.onConfirm}>Delete</Button>
          </div>
        </Modal>
      )}

      {manageServicesOpen && (
        <ManageServicesModal
          homeId={selectedHome}
          onClose={() => setManageServicesOpen(false)}
          onDeleted={() => { loadServiceLabels(); loadAll() }}
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

      {patternAssignOpen && (
        <PatternAssignModal
          open={patternAssignOpen}
          onClose={() => { setPatternAssignOpen(false); setPatternSeed(null) }}
          staffList={staffList}
          suList={suList}
          homeId={selectedHome}
          defaultDate={format(weekStart, 'yyyy-MM-dd')}
          seed={patternSeed}
          onSaved={() => { setPatternAssignOpen(false); setPatternSeed(null); loadAll() }}
        />
      )}

      {unassignOpen && (
        <UnassignModal
          open={unassignOpen}
          onClose={() => setUnassignOpen(false)}
          staffList={staffList}
          suList={suList}
          homeId={selectedHome}
          onSaved={() => { setUnassignOpen(false); loadAll() }}
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
    // Staff is optional here on purpose — leaving it unallocated creates open/unfilled shifts
    // across the whole pattern, so allocation can be done afterwards per-day via Bulk Allocate
    // or by reallocating individual shifts, rather than forcing one staff member onto every day.
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Funder & Billing</p>
              <Input label="Funder" value={form.funderName} onChange={e => set('funderName', e.target.value)} placeholder="Funder name..." />
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
                Allocate staff (optional) <span className="text-slate-400 font-normal">({selectedStaff.length} of {required})</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Leave this blank to create open/unfilled shifts across every day above — you can then use "Bulk Allocate" to spread different staff across specific days, or reallocate individual shifts later.
            </p>

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

// ── Create Rota for Service Modal ─────────────────────────────────────────────
// Same shift/times/staff shared across every selected resident in the home —
// creates one shift per resident (via the existing /shifts/service-shift
// endpoint) instead of repeating "Create Shift" once per resident by hand.

function CreateServiceRotaModal({ open, onClose, suList, staffList, homeId, defaultDate, onSaved, canSeeFinancials, existingLabels }: {
  open: boolean; onClose: () => void
  suList: any[]; staffList: any[]; homeId: string
  defaultDate: string; onSaved: () => void; canSeeFinancials: boolean
  existingLabels: string[]
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    label: '',
    startDate: defaultDate, isOngoing: true, endDate: '',
    recurrence: 'daily', daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '08:00', endTime: '20:00',
    shiftType: 'regular', totalStaffRequired: '1',
    breakMins: '30',
    notesForCarers: '', notesForManagers: '',
    funderName: '', funderCostNotes: '',
    wageRate: '', chargeRate: '', chargeBankHolidayRate: '',
    timeCritical: false, shiftRun: '',
  })
  const [selectedSus, setSelectedSus] = useState<string[]>([])
  const [suSearch, setSuSearch] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [staffSearch, setStaffSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) { setStep(1); setSelectedSus([]); setSelectedStaff([]); setSuSearch(''); setStaffSearch(''); setForm(f => ({ ...f, startDate: defaultDate })) }
  }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setForm(p => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d].sort() }))

  const toggleSu = (id: string) =>
    setSelectedSus(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleStaff = (id: string) =>
    setSelectedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) { toast.error('Enter a name for this service'); return }
    // Required (not just offered) so clock-in geofencing has a resident's
    // postcode to check against — a service with no resident attached has no
    // location for the app to verify staff are actually there.
    if (selectedSus.length === 0) { toast.error('Select at least one resident'); return }
    if (form.recurrence !== 'daily' && form.daysOfWeek.length === 0) { toast.error('Select at least one day'); return }
    setStep(2)
  }

  const save = async () => {
    // Staff is optional here on purpose — see note in CreateShiftModal above.
    // One request for every selected resident together — the number of shift
    // LINES created is driven by totalStaffRequired (one per staff slot), not
    // by how many residents are selected, so 2 residents needing 1 staff member
    // produces a single shared shift line, not one duplicate line per resident.
    setSaving(true)
    try {
      const daysOfWeek = form.recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.daysOfWeek
      const res = await api.post('/shifts/service-shift', {
        homeId, ...form, suIds: selectedSus,
        staffIds: selectedStaff,
        daysOfWeek,
        totalStaffRequired: parseInt(form.totalStaffRequired) || 1,
        breakMins: parseInt(form.breakMins) || 0,
      })
      // Report what was actually generated, not just that the request succeeded —
      // a request can come back 201 having created the template but generated zero
      // shifts (e.g. every candidate date already had a matching shift), which used
      // to show a plain "success" message while nothing appeared on the grid.
      const generated = res.data.data?.generated ?? 0
      if (generated > 0) {
        const residentPart = selectedSus.length > 0 ? ` for ${selectedSus.length} resident${selectedSus.length !== 1 ? 's' : ''}` : ''
        toast.success(`Rota created — ${generated} shift${generated !== 1 ? 's' : ''} added${residentPart}`)
      } else {
        toast.error('No shifts were generated — check the dates and recurrence, then try again')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create rota')
    } finally { setSaving(false) }
  }

  const filteredSus = suList.filter(s => getName(s).toLowerCase().includes(suSearch.toLowerCase()))
  const filteredStaff = staffList.filter(s => getName(s).toLowerCase().includes(staffSearch.toLowerCase()))
  const required = parseInt(form.totalStaffRequired) || 1

  return (
    <Modal open={open} onClose={onClose} title="Create Rota for Service" size="md">
      {step === 1 ? (
        <form onSubmit={next} className="space-y-4">
          {/* Service name — shown on the rota grid instead of the residents' names,
              e.g. "12 Kennedy Avenue" — a rota entry covering a house/service, rather
              than one resident's own individual rota. Backed by a datalist of every
              service ever created at this home, so picking the same name again reuses
              it instead of silently creating a near-duplicate through a typo. */}
          <Input label="Service name *" required value={form.label} onChange={e => set('label', e.target.value)}
            placeholder="e.g. 12 Kennedy Avenue, Day Centre..." list="existing-service-labels" />
          {existingLabels.length > 0 && (
            <datalist id="existing-service-labels">
              {existingLabels.map(l => <option key={l} value={l} />)}
            </datalist>
          )}
          {existingLabels.length > 0 && (
            <p className="text-xs text-slate-400 -mt-2">
              Existing services: {existingLabels.slice(0, 6).join(', ')}{existingLabels.length > 6 ? ', …' : ''} — start typing to reuse one.
            </p>
          )}

          {/* Residents (multi-select, required) — needed so clock-in geofencing
              has a real address (the resident's own postcode) to check against. */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Residents * <span className="text-slate-400 font-normal normal-case">({selectedSus.length} selected)</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="input pl-8 text-sm" placeholder="Search residents..." value={suSearch} onChange={e => setSuSearch(e.target.value)} />
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredSus.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No residents found</p>
              ) : (
                filteredSus.map((s: any) => {
                  const selected = selectedSus.includes(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSu(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 border-b border-slate-50 last:border-0 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <div className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <p className={`text-sm truncate ${selected ? 'font-medium text-blue-800' : 'text-slate-700'}`}>{getName(s)}</p>
                    </button>
                  )
                })
              )}
            </div>
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

          {/* Wage Rates / billing — financial fields, privileged roles only */}
          {canSeeFinancials && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Funder & Billing</p>
              <Input label="Funder" value={form.funderName} onChange={e => set('funderName', e.target.value)} placeholder="Funder name..." />
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

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Next: Allocate Staff →</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <p className="font-semibold">{form.label} — {selectedSus.length} resident{selectedSus.length !== 1 ? 's' : ''} selected</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {form.startDate} · {form.isOngoing ? 'Ongoing' : form.endDate} · {form.startTime}–{form.endTime} ·{' '}
              {form.recurrence === 'daily' ? 'Every day' : form.daysOfWeek.map(d => DAY_SHORT[d]).join(', ')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">
                Allocate staff (optional) <span className="text-slate-400 font-normal">({selectedStaff.length} of {required}, shared across all selected residents)</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Leave this blank to create open/unfilled shifts for every selected resident — use "Bulk Allocate" afterwards to spread staff across specific days.
            </p>

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
                Create Rota {selectedStaff.length > 0 && `(${selectedStaff.length} staff × ${selectedSus.length} residents)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Create Standby Shift Modal ────────────────────────────────────────────────

function CreateStandbyModal({ open, onClose, staffList, homeId, serviceLabels, defaultDate, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; homeId: string; serviceLabels: string[]
  defaultDate: string; onSaved: () => void
}) {
  const [form, setForm] = useState({
    label: '', staffId: '', startDate: defaultDate, isOngoing: false, endDate: defaultDate,
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
    if (!form.label.trim()) { toast.error('Enter a service'); return }
    if (!form.staffId) { toast.error('Select a staff member'); return }
    setSaving(true)
    try {
      const daysOfWeek = form.recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.daysOfWeek
      await api.post('/shifts/service-shift', {
        homeId,
        label: form.label.trim(),
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

        <Input label="Service *" required value={form.label} onChange={e => set('label', e.target.value)}
          placeholder="e.g. 12 Kennedy Avenue, Day Centre..." list="existing-service-labels-standby" />
        {serviceLabels.length > 0 && (
          <datalist id="existing-service-labels-standby">
            {serviceLabels.map(l => <option key={l} value={l} />)}
          </datalist>
        )}

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

function ShiftDetailModal({ shift, canManage, canSeeFinancials, onClose, onDelete, onDeleteSeries, onSwap, onUpdated, onLinked, onBulkAssign, staffList }: {
  shift: any; canManage: boolean; canSeeFinancials: boolean; onClose: () => void
  onDelete: () => void; onDeleteSeries: () => void; onSwap: () => void
  onUpdated: (updated: any) => void; onLinked: () => void; onBulkAssign: () => void
  staffList: any[]
}) {
  const status = shift.status || (shift.staff_id ? 'filled' : 'unfilled')
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unfilled
  const [savingStatus, setSavingStatus] = useState(false)
  const [linking, setLinking] = useState<'shadow' | 'double_up' | null>(null)
  const [showBlockDetails, setShowBlockDetails] = useState(false)
  const [editingTimes, setEditingTimes] = useState(false)
  const [editDate, setEditDate] = useState(shift.shift_date ? shift.shift_date.substring(0, 10) : '')
  const [editStart, setEditStart] = useState(shift.start_time?.substring(0, 5) || '')
  const [editEnd, setEditEnd] = useState(shift.end_time?.substring(0, 5) || '')
  const [applyToFuture, setApplyToFuture] = useState(false)
  const [savingTimes, setSavingTimes] = useState(false)
  const [reallocating, setReallocating] = useState(false)
  const [reallocateTo, setReallocateTo] = useState('')
  const [savingReallocate, setSavingReallocate] = useState(false)
  const [unassigning, setUnassigning] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [editNotesForCarers, setEditNotesForCarers] = useState(shift.notes_for_carers || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState(shift.label || '')
  const [savingLabel, setSavingLabel] = useState(false)

  const saveLabel = async () => {
    setSavingLabel(true)
    try {
      const res = await api.put(`/shifts/${shift.id}`, { label: editLabel.trim() })
      onUpdated(res.data.data)
      toast.success(editLabel.trim() ? 'Reclassified as a Service' : 'Reclassified as Individual')
      setEditingLabel(false)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to update') }
    finally { setSavingLabel(false) }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await api.put(`/shifts/${shift.id}`, { notesForCarers: editNotesForCarers })
      onUpdated(res.data.data)
      toast.success('Notes updated')
      setEditingNotes(false)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to update notes') }
    finally { setSavingNotes(false) }
  }

  const saveTimes = async () => {
    if (!editDate || !editStart || !editEnd) { toast.error('Date, start and finish times are required'); return }
    setSavingTimes(true)
    try {
      const res = await api.put(`/shifts/${shift.id}`, {
        shiftDate: editDate, startTime: editStart, endTime: editEnd,
        applyToFuture,
      })
      onUpdated(res.data.data)
      toast.success(applyToFuture ? 'Shift times updated for this and every future occurrence' : 'Shift times updated')
      setEditingTimes(false)
      setApplyToFuture(false)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to update shift times') }
    finally { setSavingTimes(false) }
  }

  const saveReallocate = async () => {
    if (!reallocateTo) { toast.error('Select a staff member'); return }
    setSavingReallocate(true)
    try {
      await api.put(`/shifts/${shift.id}`, { staffId: reallocateTo })
      toast.success('Shift reallocated')
      setReallocating(false)
      setReallocateTo('')
      onLinked() // closes the modal and reloads shifts so the new staff name/role join comes through
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to reallocate shift') }
    finally { setSavingReallocate(false) }
  }

  const unassignStaff = async () => {
    if (!window.confirm('Unassign this staff member? The shift will go back to unfilled.')) return
    setUnassigning(true)
    try {
      await api.put(`/shifts/${shift.id}`, { staffId: null })
      toast.success('Staff unassigned — shift is unfilled')
      onLinked() // closes the modal and reloads shifts
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to unassign') }
    finally { setUnassigning(false) }
  }

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
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-1.5">Status</p>
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

        {canManage && editingTimes ? (
          <div className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-slate-50">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Date</label>
                <input type="date" className="input text-sm" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Start</label>
                <input type="time" className="input text-sm" value={editStart} onChange={e => setEditStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Finish</label>
                <input type="time" className="input text-sm" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
              </div>
            </div>
            {shift.template_id && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={applyToFuture} onChange={e => setApplyToFuture(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 mt-0.5" />
                <span className="text-xs text-slate-600">
                  Apply changes to future shifts <span className="text-slate-400">— also update the start/finish time on every later occurrence of this recurring shift. Leave unticked to change only this one.</span>
                </span>
              </label>
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setEditingTimes(false); setApplyToFuture(false) }}>Cancel</Button>
              <Button size="sm" loading={savingTimes} onClick={saveTimes}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-0.5">Date / Times</p>
              <div className="flex items-center gap-2">
                <p className="text-slate-800 font-bold">
                  {shift.shift_date ? format(parseISO(shift.shift_date), 'EEE d MMM yyyy') : '—'}
                  {' · '}{shift.start_time?.substring(0, 5)}–{shift.end_time?.substring(0, 5)}
                </p>
                {canManage && (
                  <button type="button" onClick={() => setEditingTimes(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-0.5">Shift type</p>
              <p className="text-slate-800 font-bold capitalize">{shift.shift_type?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-0.5">Service</p>
            {editingLabel ? (
              <div className="flex items-center gap-2">
                <input className="input text-sm" value={editLabel} onChange={e => setEditLabel(e.target.value)}
                  placeholder="Leave blank for an Individual shift" />
                <Button size="sm" loading={savingLabel} onClick={saveLabel}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingLabel(false); setEditLabel(shift.label || '') }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-slate-800 font-bold">{shift.label || 'Individual (not a Service)'}</p>
                {canManage && (
                  <button type="button" onClick={() => setEditingLabel(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    {shift.label ? 'Edit' : 'Make this a Service'}
                  </button>
                )}
              </div>
            )}
          </div>
          {(shift.su_names || shift.su_name) && (
            <div className="col-span-2">
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-0.5">
                {shift.label ? 'Covers' : shift.su_ids && shift.su_ids.length > 1 ? 'Service Users' : 'Service User'}
              </p>
              <p className="text-slate-800 font-bold">{shift.su_names || shift.su_name}</p>
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

        {(shift.notes_for_carers || canManage) && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Notes for carers</p>
              {canManage && !editingNotes && (
                <button type="button" onClick={() => { setEditNotesForCarers(shift.notes_for_carers || ''); setEditingNotes(true) }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea className="input text-sm" rows={2} value={editNotesForCarers} onChange={e => setEditNotesForCarers(e.target.value)}
                  placeholder="Instructions visible to care staff..." />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  <Button size="sm" loading={savingNotes} onClick={saveNotes}>Save</Button>
                </div>
              </div>
            ) : (
              shift.notes_for_carers
                ? <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{shift.notes_for_carers}</p>
                : <p className="text-sm text-slate-400 italic">No notes</p>
            )}
          </div>
        )}
        {shift.notes_for_managers && (
          <div>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-1">Manager notes</p>
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
            {canSeeFinancials && shift.charge_rate && <p><span className="text-slate-400">Charge Rate:</span> £{shift.charge_rate}/hr</p>}
            {canSeeFinancials && shift.charge_bank_holiday_rate && <p><span className="text-slate-400">Bank Holiday Charge:</span> £{shift.charge_bank_holiday_rate}/hr</p>}
            {canSeeFinancials && shift.funder_cost_notes && <p><span className="text-slate-400">Funder Cost Notes:</span> {shift.funder_cost_notes}</p>}
          </div>
        )}

        {canManage && reallocating && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-slate-50">
            <Select label="Reallocate to" value={reallocateTo} onChange={e => setReallocateTo(e.target.value)}
              options={staffList.filter(s => s.id !== shift.staff_id).map(s => ({ value: s.id, label: getName(s) }))}
              placeholder="Select staff member" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setReallocating(false); setReallocateTo('') }}>Cancel</Button>
              <Button size="sm" loading={savingReallocate} onClick={saveReallocate}>Reallocate</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {canManage && (
            <button onClick={() => setReallocating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Reallocate shift
            </button>
          )}
          {canManage && (
            <button onClick={onBulkAssign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors"
              title="Open Bulk Assign pre-filled with this shift's resident and day/night — pick which days of the week to repeat it on">
              <Users className="w-3.5 h-3.5" /> Bulk assign like this
            </button>
          )}
          {canManage && shift.staff_id && (
            <button onClick={unassignStaff} disabled={unassigning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-amber-600 border border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-50">
              <X className="w-3.5 h-3.5" /> {unassigning ? 'Unassigning…' : 'Unassign staff'}
            </button>
          )}
          {shift.staff_id && (
            <button onClick={onSwap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-slate-800 border border-slate-800 hover:bg-slate-900 transition-colors">
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
            <div className="ml-auto flex items-center gap-2">
              {shift.template_id && (
                <button onClick={onDeleteSeries}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Remove this + all future
                </button>
              )}
              <button onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-600 border border-rose-100 hover:bg-rose-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Bulk Assign Staff Modal ────────────────────────────────────────────────────
// Assigns one staff member to every currently-selected shift on the grid.

function BulkAssignStaffModal({ open, onClose, staffList, count, onAssign, assigning }: {
  open: boolean; onClose: () => void
  staffList: any[]; count: number
  onAssign: (staffId: string) => void; assigning: boolean
}) {
  const [search, setSearch] = useState('')
  const filtered = staffList.filter(s => getName(s).toLowerCase().includes(search.toLowerCase()))

  return (
    <Modal open={open} onClose={onClose} title={`Assign staff to ${count} selected shift${count !== 1 ? 's' : ''}`} size="sm">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">This replaces any staff currently assigned to the selected shifts.</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="input pl-8 text-sm" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No staff found</p>
          ) : (
            filtered.map((s: any) => (
              <button key={s.id} type="button" disabled={assigning} onClick={() => onAssign(s.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 transition-colors disabled:opacity-50">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getName(s).split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{getName(s)}</p>
                  <p className="text-xs text-slate-400 capitalize">{(s.role || '').replace(/_/g, ' ')}</p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Pattern Bulk Allocate Modal ────────────────────────────────────────────────
// Allocates one staff member to every unfilled shift matching a recurring pattern
// (specific days of the week, optionally alternating fortnightly, day or night, over
// a date range) — so a rota created with open/unfilled shifts can be staffed up by
// pattern instead of clicking every single day, and different staff can cover
// different days of the same rota rather than one person getting the whole week.

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' },
]

function PatternAssignModal({ open, onClose, staffList, suList, homeId, defaultDate, seed, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; suList: any[]; homeId: string; defaultDate: string
  seed?: { suId?: string; dayOrNight?: 'any' | 'day' | 'night'; daysOfWeek?: number[] } | null
  onSaved: () => void
}) {
  const [staffId, setStaffId] = useState('')
  const [suId, setSuId] = useState(seed?.suId || '')
  const [dayOrNight, setDayOrNight] = useState<'any' | 'day' | 'night'>(seed?.dayOrNight || 'any')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(seed?.daysOfWeek?.length ? seed.daysOfWeek : [1, 2, 3, 4, 5])
  // Weekly/fortnightly still match by the days-of-week picker below; daily is just
  // weekly with every day selected (same backend logic, no special case needed);
  // monthly is a different mechanic entirely — same day-of-month as the start date,
  // handled server-side since it doesn't use daysOfWeek at all.
  const [repeatMode, setRepeatMode] = useState<'weekly' | 'fortnightly' | 'daily' | 'monthly'>('weekly')
  const [startDate, setStartDate] = useState(defaultDate)
  const [endPreset, setEndPreset] = useState<'1w' | '2w' | '4w' | 'ongoing' | 'custom'>('ongoing')
  const [endDate, setEndDate] = useState('')
  const [onlyUnfilled, setOnlyUnfilled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setStartDate(defaultDate) }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` }))
  const suOptions = suList.map(su => ({ value: su.id, label: getName(su) }))

  const save = async () => {
    if (!staffId) { toast.error('Select a staff member'); return }
    // Resident used to be optional and, left blank, matched EVERY resident's shifts
    // in the date range — a staff member picked for one resident's pattern could
    // silently get allocated onto other residents' shifts too. Now required so a
    // bulk allocation only ever touches the resident it was meant for.
    if (!suId) { toast.error('Select a resident — bulk allocation only applies to that resident\'s shifts'); return }
    if (repeatMode !== 'monthly' && daysOfWeek.length === 0) { toast.error('Select at least one day of the week'); return }
    if (endPreset === 'custom' && !endDate) { toast.error('Set an end date, or pick one of the quick options'); return }
    // "This week / 2 weeks / 4 weeks" are counted from the start date, not the calendar
    // week — e.g. starting Wednesday + "2 weeks" covers 14 days from that Wednesday,
    // which is what "the week I assigned and the next week" means in practice.
    const presetDays: Record<string, number> = { '1w': 6, '2w': 13, '4w': 27 }
    const effectiveEndDate = endPreset === 'ongoing' ? format(addDays(parseISO(startDate), 365), 'yyyy-MM-dd')
      : endPreset === 'custom' ? endDate
      : format(addDays(parseISO(startDate), presetDays[endPreset]), 'yyyy-MM-dd')
    const effectiveDaysOfWeek = repeatMode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek
    setSaving(true)
    try {
      const res = await api.post('/shifts/bulk-assign-pattern', {
        homeId, staffId, suId: suId || null,
        dayOrNight, daysOfWeek: effectiveDaysOfWeek,
        fortnightly: repeatMode === 'fortnightly', monthly: repeatMode === 'monthly',
        startDate, endDate: effectiveEndDate,
        onlyUnfilled,
      })
      const assigned = res.data.data?.assigned || 0
      toast.success(assigned > 0 ? `Allocated ${assigned} shift${assigned !== 1 ? 's' : ''}` : 'No matching shifts found for this pattern')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to bulk allocate') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bulk Allocate — Recurring Pattern" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Assign one staff member to every unfilled shift on the days you pick, over a date range — e.g. every Monday, Tuesday and Saturday, every other week, until you stop it. Reallocate an individual shift instead by clicking it directly on the grid.
        </p>

        <Select label="Staff member *" value={staffId} onChange={e => setStaffId(e.target.value)} options={staffOptions} placeholder="Select staff member" />
        <Select label="Resident *" value={suId} onChange={e => setSuId(e.target.value)} options={suOptions} placeholder="Select resident" />

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Day or Night</label>
          <div className="flex gap-2">
            {[{ v: 'any', l: 'Any' }, { v: 'day', l: 'Day' }, { v: 'night', l: 'Night' }].map(o => (
              <button key={o.v} type="button" onClick={() => setDayOrNight(o.v as any)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${dayOrNight === o.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Repeat</label>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { v: 'weekly', l: 'Weekly' }, { v: 'fortnightly', l: 'Fortnightly' },
              { v: 'daily', l: 'Daily' }, { v: 'monthly', l: 'Monthly' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setRepeatMode(o.v as any)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${repeatMode === o.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {repeatMode === 'monthly' ? (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            Assigns the same day-of-month as the start date below, once a month — e.g. starting 15 September assigns the 15th of every month in range.
          </p>
        ) : repeatMode === 'daily' ? (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">Assigns every day in the date range below.</p>
        ) : (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Days of the week *</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_OPTIONS.map(d => (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                  className={`w-11 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${daysOfWeek.includes(d.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            {repeatMode === 'fortnightly' && <p className="text-xs text-slate-400 mt-1">Only the alternating week starting from the start date below.</p>}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start date *</label>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Until</label>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { v: '1w', l: 'This week' }, { v: '2w', l: '2 weeks' }, { v: '4w', l: '4 weeks' },
              { v: 'ongoing', l: 'Until I stop it' }, { v: 'custom', l: 'Pick a date' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setEndPreset(o.v as any)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${endPreset === o.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                {o.l}
              </button>
            ))}
          </div>
          {/* "2 weeks" = the week containing the start date, plus the following week —
              i.e. 14 days from wherever the start date falls, not aligned to a calendar
              week boundary. This is what staff meant by "the week I assigned and the
              next week" when a single week's worth of manual selection was tedious to
              repeat for a second week. */}
        </div>
        {endPreset === 'custom' && (
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        )}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="onlyUnfilled" checked={onlyUnfilled} onChange={e => setOnlyUnfilled(e.target.checked)} className="rounded" />
          <label htmlFor="onlyUnfilled" className="text-sm text-slate-700">Only fill currently-unfilled shifts (leave unticked to overwrite existing allocations too)</label>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} icon={<Check className="w-4 h-4" />}>Allocate</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Unassign Modal ────────────────────────────────────────────────────────────
// The counterpart to "Bulk Assign Staff to Shifts" — removes a staff member from
// all of their shifts from today onwards in one action, instead of opening every
// shift individually. Un-fills the shift (goes back to unfilled) rather than
// deleting it, so the rota slot is still there to cover.

function UnassignModal({ open, onClose, staffList, suList, homeId, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; suList: any[]; homeId: string; onSaved: () => void
}) {
  const [staffId, setStaffId] = useState('')
  const [suId, setSuId] = useState('')
  const [saving, setSaving] = useState(false)

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` }))
  const suOptions = suList.map(su => ({ value: su.id, label: getName(su) }))
  const staffName = staffList.find(s => s.id === staffId) ? getName(staffList.find(s => s.id === staffId)) : ''

  const save = async () => {
    if (!staffId) { toast.error('Select a staff member'); return }
    if (!window.confirm(`Remove ${staffName} from all their current and future shifts${suId ? ' for this resident' : ''}? Past shifts are kept for the record. This cannot be undone.`)) return
    setSaving(true)
    try {
      const res = await api.post('/shifts/bulk-unassign', { homeId, staffId, suId: suId || null })
      const unassigned = res.data.data?.unassigned || 0
      toast.success(unassigned > 0 ? `Unassigned from ${unassigned} shift${unassigned !== 1 ? 's' : ''}` : 'No current or future shifts found for this staff member')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to unassign') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Unassign Staff from Shifts" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Removes this staff member from every shift they're on today or in the future — the shifts stay on the rota as unfilled, ready to reassign. Past shifts are left alone.
        </p>

        <Select label="Staff member *" value={staffId} onChange={e => setStaffId(e.target.value)} options={staffOptions} placeholder="Select staff member" />
        <Select label="Resident (optional)" value={suId} onChange={e => setSuId(e.target.value)} options={suOptions} placeholder="All residents — every shift, not just one" />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={saving} onClick={save} icon={<UserMinus className="w-4 h-4" />}>Unassign</Button>
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

// ── Manage Services Modal ──────────────────────────────────────────────────────
// Lets a manager see every service label at this home with how many shifts sit
// under it, and delete a whole service (every shift + its recurring template)
// in one click — for cleaning up accidental duplicates like the same service
// created several times over ("Kennedy" x4) without hunting down and deleting
// every individual shift tile by hand.

// Same "trim + collapse whitespace + case-insensitive" normalization the backend
// uses when matching a shift's service label to a saved geofence postcode — has to
// survive the same near-identical-label messiness ("KENNEDY ROAD" vs "KENNEDY  ROAD ")
// that was already found and fixed for duplicate services themselves.
const normalizeServiceLabel = (l?: string | null) => (l || '').trim().replace(/\s+/g, ' ').toUpperCase()

function ManageServicesModal({ homeId, onClose, onDeleted }: {
  homeId: string; onClose: () => void; onDeleted: () => void
}) {
  const [services, setServices] = useState<any[]>([])
  const [postcodes, setPostcodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  // In-app confirm instead of window.confirm — a native browser dialog here blocks
  // any automated/assistive click-through and is inconsistent with how every other
  // destructive action in this app confirms (see the danger-styled Modal pattern
  // used elsewhere, e.g. FinanceTracking's delete confirm).
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null)
  const [editingPostcodeFor, setEditingPostcodeFor] = useState<string | null>(null)
  const [postcodeInput, setPostcodeInput] = useState('')
  const [savingPostcode, setSavingPostcode] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [svcRes, pcRes] = await Promise.all([
        api.get('/shifts/service-labels-detail', { params: { homeId } }),
        api.get(`/clockin/postcodes/${homeId}`),
      ])
      setServices(svcRes.data.data || [])
      setPostcodes(pcRes.data.data || [])
    } catch { toast.error('Failed to load services') }
    finally { setLoading(false) }
  }, [homeId])
  useEffect(() => { load() }, [load])

  const postcodeForLabel = (label: string) =>
    postcodes.find(pc => normalizeServiceLabel(pc.label) === normalizeServiceLabel(label))

  const remove = async (label: string) => {
    setConfirmLabel(null)
    setDeleting(label)
    try {
      const res = await api.delete(`/shifts/service-label/${encodeURIComponent(label)}`, { params: { homeId } })
      toast.success(`Deleted ${res.data.data?.deleted ?? 0} shift(s) for "${label}"`)
      setServices(prev => prev.filter(s => s.label !== label))
      onDeleted()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to delete') }
    finally { setDeleting(null) }
  }

  const openPostcodeEditor = (label: string) => {
    setPostcodeInput(postcodeForLabel(label)?.postcode || '')
    setEditingPostcodeFor(label)
  }

  const savePostcode = async () => {
    if (!editingPostcodeFor || !postcodeInput.trim()) return
    setSavingPostcode(true)
    try {
      await api.post('/clockin/postcodes', { homeId, postcode: postcodeInput.trim(), label: editingPostcodeFor, radius: 200 })
      toast.success(`Postcode saved for "${editingPostcodeFor}" — clock-in will now check staff are actually there`)
      setEditingPostcodeFor(null)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save postcode') }
    finally { setSavingPostcode(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Manage Services" size="md">
      <p className="text-sm text-slate-500 mb-4">
        Every service currently on the rota, with how many shifts sit under it. Set a postcode so clock-in geofencing checks staff are actually at that service — without one, clock-in falls back to checking against the office. Delete a service to remove all of its shifts (past and future) at once — useful for cleaning up accidental duplicates.
      </p>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-slate-400">No services found.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {services.map(s => {
            const pc = postcodeForLabel(s.label)
            return (
              <div key={s.label} className="px-3 py-2 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-400">{s.shift_count} shift{s.shift_count !== '1' ? 's' : ''} total · {s.future_count} upcoming</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openPostcodeEditor(s.label)} disabled={deleting !== null}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <MapPin className="w-3.5 h-3.5" /> {pc ? 'Edit postcode' : 'Set postcode'}
                    </button>
                    <button onClick={() => setConfirmLabel(s.label)} disabled={deleting !== null}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> {deleting === s.label ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
                {pc && editingPostcodeFor !== s.label && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {pc.postcode}
                  </p>
                )}
                {editingPostcodeFor === s.label && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={postcodeInput} onChange={e => setPostcodeInput(e.target.value)}
                      placeholder="e.g. M35 9BG" className="flex-1" />
                    <Button size="sm" loading={savingPostcode} onClick={savePostcode}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPostcodeFor(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      {confirmLabel && (
        <Modal open={true} onClose={() => setConfirmLabel(null)} title="Delete this service?" size="sm">
          <p className="text-sm text-slate-600 mb-5">
            Delete the service "{confirmLabel}"? This removes every shift under it (past and future) and cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmLabel(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => remove(confirmLabel)}>Delete</Button>
          </div>
        </Modal>
      )}
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
