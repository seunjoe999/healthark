import React, { useEffect, useState, useCallback, useRef } from 'react'
import api from '../../api'
import { homesApi, staffApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Button, Modal, Input, Select } from '../../components/ui'
import clsx from 'clsx'
import {
  Plus, ChevronLeft, ChevronRight, ChevronDown, Trash2,
  Filter, RefreshCw, X, Check, Search,
  Printer, CalendarX, ArrowLeftRight,
  Brain, UserX, UserMinus, AlertTriangle, CheckCircle, Phone, Users, MapPin, Calendar, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ────────────────────────────────────────────────────────────────

// Touch capability doesn't change during a session, so this is computed once at
// module load rather than re-checked per render. Used to switch shift-tile
// interaction: desktop keeps single-click-highlights/double-click-opens, touch
// gets single-tap-opens (double-tap isn't reliable on a touchscreen) with an
// always-visible checkbox as the only way to multi-select there.
const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const HOUR_HEIGHT = 64
const START_HOUR = 6
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT

// ── Shift-clash confirm gate ────────────────────────────────────────────────
// The shift endpoints answer 409 + warnings (instead of saving) the first
// time an assignment would clash with an existing shift or leave too little
// rest between shifts. This hook intercepts that 409, shows a CENTERED
// confirm dialog ("...do you want me to continue?"), and only retries the
// same request with confirmConflicts=true if the manager explicitly picks
// "Assign anyway" — Cancel leaves everything unsaved.
function useConflictGate() {
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const retryRef = useRef<((confirmed: boolean) => Promise<void>) | null>(null)

  const run = async (attempt: (confirmed: boolean) => Promise<void>) => {
    try {
      await attempt(false)
    } catch (err: any) {
      const w = err?.response?.status === 409 ? (err.response.data?.warnings || []) : []
      if (w.length) { retryRef.current = attempt; setWarnings(w); return }
      throw err
    }
  }
  const confirm = async () => {
    const a = retryRef.current
    setWarnings(null); retryRef.current = null
    // Retry runs outside the original try/catch, so surface any hard failure
    // here instead of letting it become an unhandled rejection.
    if (a) {
      try { await a(true) }
      catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    }
  }
  const cancel = () => { setWarnings(null); retryRef.current = null }
  const dialog = warnings ? (
    <Modal open onClose={cancel} title="Shift clash — assign anyway?" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          This person is already on a shift that overlaps this one, or wouldn't get the rest
          required between shifts. Nothing has been saved yet — do you want to continue?
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          {warnings.map(w => (
            <p key={w} className="text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </p>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={cancel}>Cancel — don't assign</Button>
          <Button variant="gold" onClick={confirm}>Yes, assign anyway</Button>
        </div>
      </div>
    </Modal>
  ) : null
  return { run, dialog }
}

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
// "17 min late" / "1h 10m late" for a shift whose staff clocked in after the
// grace period. Empty when on time, not clocked in, or unassigned.
function lateLabel(shift: any): string {
  if (!shift?.staff_id || !shift.clock_in_time) return ''
  const st = shift.start_time?.substring(0, 5) || '08:00'
  const start = new Date(`${String(shift.shift_date).substring(0, 10)}T${st}:00`)
  const mins = Math.round((new Date(shift.clock_in_time).getTime() - start.getTime()) / 60000)
  // Over 12h "late" means the first clock-in of the day belonged to another shift.
  if (!(mins > LATE_GRACE_MINS) || mins > 720) return ''
  return mins < 60 ? `${mins} min late` : `${Math.floor(mins / 60)}h ${mins % 60}m late`
}
const SHIFT_RELATIONS: Record<string, { label: string; bg: string; text: string }> = {
  shadow:     { label: 'Shadow shift',     bg: '#ede9fe', text: '#5b21b6' },
  double_up:  { label: 'Double-up shift',  bg: '#fce7f3', text: '#9d174d' },
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Shared across CreateShiftModal / CreateServiceRotaModal / CreateStandbyModal —
// 'weekly' already covers "once a week" (pick a single day, repeats every week);
// the rest pick which week(s) a "Specific Days" pattern repeats on. 'monthly' is
// its own thing (same day-of-month as the start date, not day-of-week based), so
// it hides the day picker rather than requiring a day selection.
const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Specific Days' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'every_3_weeks', label: 'Every 3 Weeks' },
  { value: 'every_4_weeks', label: 'Every 4 Weeks' },
  { value: 'every_6_weeks', label: 'Every 6 Weeks' },
  { value: 'every_8_weeks', label: 'Every 8 Weeks' },
  { value: 'monthly', label: 'Monthly' },
]
const NEEDS_DAY_PICKER = (r: string) => r !== 'daily' && r !== 'monthly'
function summarizeRecurrence(recurrence: string, daysOfWeek: number[]): string {
  if (recurrence === 'daily') return 'Every day'
  if (recurrence === 'monthly') return 'Monthly (same date)'
  const days = daysOfWeek.map(d => DAY_SHORT[d]).join(', ')
  if (recurrence === 'fortnightly') return `${days} — fortnightly`
  if (recurrence === 'every_3_weeks') return `${days} — every 3 weeks`
  const everyN = /^every_(d+)_weeks$/.exec(recurrence)
  if (everyN) return `${days} — every ${everyN[1]} weeks`
  return days
}

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
    // Shifts starting together sit side by side — order those lanes by staff
    // name (unfilled last) so a multi-staff service reads alphabetically.
    if (as !== bs) return as - bs
    if (!a.staff_name !== !b.staff_name) return a.staff_name ? -1 : 1
    return String(a.staff_name || '').localeCompare(String(b.staff_name || ''), undefined, { sensitivity: 'base' })
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
  // "Only show unassigned shifts" — lets a manager see just the gaps left to fill.
  const [filterUnfilled, setFilterUnfilled] = useState(false)
  // Individual = each resident's own rota (no service label). Service = shared-service
  // rota entries created via "Create Rota for Service" (has a label). "All" shows both
  // mixed together, which is how the grid behaved before this switch existed.
  const [rotaMode, setRotaMode] = useState<'all' | 'individual' | 'service'>('all')

  // swap requests
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [swapActing, setSwapActing] = useState<string | null>(null)
  // Toggled by the "Swap Requests" button in the filter bar. Used to force the
  // panel open when there's nothing pending, OR force it closed when there IS —
  // a manager needs to be able to collapse it to see the calendar underneath
  // without losing the pending count on the button itself. This used to be
  // OR'd with "requests.length > 0" to auto-show the panel, which meant the
  // button had literally no visible effect while anything was pending — every
  // click toggled this state correctly, but the panel stayed visible either
  // way, which looked exactly like the button doing nothing.
  const [swapPanelOpen, setSwapPanelOpen] = useState(false)
  const prevSwapCount = React.useRef(0)

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
  const [hoverTip, setHoverTip] = useState<{ shift: any; x: number; y: number } | null>(null)
  const [swapShift,   setSwapShift]   = useState<any>(null)
  const [adjustPickerOpen, setAdjustPickerOpen] = useState(false)
  const [auditorOpen, setAuditorOpen] = useState(false)
  const [openShiftsOpen, setOpenShiftsOpen] = useState(false)
  // Bulk changes to every highlighted shift: time slot, shift type, cancel, reinstate.
  const [bulkBusy, setBulkBusy] = useState(false)
  const runBulkChange = async (kind: string) => {
    const ids = Array.from(selectedShiftIds)
    if (!ids.length || !kind) return
    const isTime = (v: string | null) => !!v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim())
    let build: (s: any) => Promise<any>
    let label = ''
    if (kind === 'time') {
      const st = window.prompt(`New START time for ${ids.length} shift${ids.length !== 1 ? 's' : ''} (24-hour, e.g. 08:00)`)
      if (st === null) return
      const et = window.prompt('New END time (24-hour, e.g. 20:00)')
      if (et === null) return
      if (!isTime(st) || !isTime(et)) { toast.error('Enter times as HH:MM, e.g. 08:00'); return }
      build = (s) => api.put(`/shifts/${s.id}`, { startTime: st.trim(), endTime: et.trim() })
      label = `moved to ${st.trim()}–${et.trim()}`
    } else if (kind.startsWith('type:')) {
      const t = kind.slice(5)
      build = (s) => api.put(`/shifts/${s.id}`, { shiftType: t })
      label = `changed to ${SHIFT_TYPES.find(x => x.value === t)?.label || t}`
    } else if (kind === 'cancel') {
      const reason = window.prompt(`Why are these ${ids.length} shift${ids.length !== 1 ? 's' : ''} being cancelled?`)
      if (reason === null) return
      const billable = window.confirm('Are these cancelled shifts still BILLABLE to the funder?\n\nOK = Yes, still billable\nCancel = No, not billable')
      build = (s) => api.put(`/shifts/${s.id}/status`, { status: 'cancelled', cancelReason: reason.trim() || undefined, cancelBillable: billable })
      label = 'cancelled'
    } else if (kind === 'advertise') {
      setBulkBusy(true)
      try {
        const res = await api.post('/shifts/advertise', { ids })
        const n = res.data?.data?.count ?? 0
        if (n) toast.success(`${n} unfilled shift${n !== 1 ? 's' : ''} advertised to staff`)
        else toast.error('None of the highlighted shifts are unfilled — only shifts with no staff can be advertised')
        clearSelection(); loadAll()
      } catch (err: any) { toast.error(err?.response?.data?.error || 'Could not advertise') }
      finally { setBulkBusy(false) }
      return
    } else if (kind === 'reinstate') {
      build = (s) => s.status === 'cancelled'
        ? api.put(`/shifts/${s.id}/status`, { status: s.staff_id ? 'filled' : 'unfilled' })
        : Promise.resolve(null)
      label = 'reinstated'
    } else return
    setBulkBusy(true)
    try {
      const targets = shifts.filter(s => selectedShiftIds.has(s.id))
      const results = await Promise.allSettled(targets.map(build))
      const failed = results.filter(r => r.status === 'rejected').length
      const done = results.length - failed
      if (done) toast.success(`${done} shift${done !== 1 ? 's' : ''} ${label}`)
      if (failed) toast.error(`${failed} shift${failed !== 1 ? 's' : ''} could not be changed (e.g. the new time clashes with another shift for that staff member)`)
      clearSelection()
      loadAll()
    } finally { setBulkBusy(false) }
  }
  const [coverOpen,   setCoverOpen]   = useState(false)
  const [patternAssignOpen, setPatternAssignOpen] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  // Pre-fills Bulk Assign — Recurring Pattern when opened from a specific shift's
  // detail modal ("Bulk assign like this"), so staff don't have to re-pick the
  // resident/day-or-night that's already obvious from the shift they clicked.
  const [patternSeed, setPatternSeed] = useState<{ suId?: string; dayOrNight?: 'any' | 'day' | 'night'; daysOfWeek?: number[];
    startTime?: string; endTime?: string; label?: string; replaceStaffId?: string; replaceStaffName?: string; startDate?: string } | null>(null)

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
      const next = res.data.data || []
      // Auto-open the panel when the pending count genuinely goes up (a new
      // request came in), not on every poll — otherwise a manager who just
      // closed it after dealing with the current batch would have it forced
      // back open immediately by the very next refresh.
      if (next.length > prevSwapCount.current) setSwapPanelOpen(true)
      prevSwapCount.current = next.length
      setSwapRequests(next)
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
      .then(([sRes, suRes]) => {
        // Sorted once here so EVERY staff list on the rota (filter, assign, bulk
        // assign, reallocate, create rota...) is alphabetical, not in database order.
        setStaffList([...(sRes.data.data || [])].sort((a: any, b: any) => getName(a).localeCompare(getName(b), undefined, { sensitivity: 'base' }))); setSuList(suRes.data.data || []) })
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

  const conflictGate = useConflictGate()
  const bulkConflictIds = useRef<string[]>([])

  const bulkAssignStaff = async (staffId: string) => {
    if (selectedShiftIds.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedShiftIds)
      await conflictGate.run(async (confirmed) => {
        // First pass sends everything unconfirmed; clashes come back as 409
        // (unwritten) while the rest save normally. On "assign anyway" only
        // the clash-flagged shifts are retried, with confirmConflicts=true —
        // re-sending the already-saved ones could clash against shifts THIS
        // very request just wrote.
        const toSend = confirmed ? bulkConflictIds.current : ids
        const results = await Promise.allSettled(
          toSend.map(id => api.put(`/shifts/${id}`, { staffId, confirmConflicts: confirmed }))
        )
        const conflicted: string[] = []
        let hardFailed = 0
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            if (r.reason?.response?.status === 409) conflicted.push(toSend[i])
            else hardFailed++
          }
        })
        bulkConflictIds.current = conflicted
        const saved = toSend.length - conflicted.length - hardFailed
        if (hardFailed > 0) toast.error(`${hardFailed} shift${hardFailed !== 1 ? 's' : ''} failed to save`)
        if (saved > 0) toast.success(`Assigned to ${saved} shift${saved !== 1 ? 's' : ''}`)
      })
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

  const cancelSwap = async (swapId: string) => {
    setSwapActing(swapId)
    try {
      await api.delete(`/shifts/swaps/${swapId}`)
      toast.success('Swap request cancelled')
      loadSwaps()
    } catch { toast.error('Failed to cancel') }
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
    if (filterUnfilled) r = r.filter(s => !s.staff_id)
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
        {/* Services (leftmost filter), then service users, then staff. */}
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterLabel} onChange={e => { setFilterLabel(e.target.value); setFilterStaff('') }}>
          <option value="">All Services</option>
          {serviceLabels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterSu} onChange={e => setFilterSu(e.target.value)}>
          <option value="">All Service Users</option>
          {suList.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
        </select>
        <StaffFilterCombobox staffList={staffList} value={filterStaff}
          onChange={id => { setFilterStaff(id); setFilterLabel('') }} />
        {filterStaff && (() => {
          const selectedStaff = staffList.find((s: any) => s.id === filterStaff)
          const contractedHours = selectedStaff?.contracted_hours ?? 36
          const rotaHours = dayData.reduce((sum, d) => sum + d.dayShifts.reduce((s: number, sh: any) => {
            const start = timeToMins(sh.start_time?.substring(0, 5) || '00:00')
            let end = timeToMins(sh.end_time?.substring(0, 5) || '00:00')
            if (end <= start) end += 1440
            return s + (end - start) / 60
          }, 0), 0)
          return (
            <span className="flex items-center gap-3 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 flex-shrink-0">
              <span>Contracted: <span className="text-slate-900">{contractedHours}h</span></span>
              <span className="text-slate-300">|</span>
              <span>Rota: <span className={rotaHours > contractedHours ? 'text-amber-600' : 'text-slate-900'}>{rotaHours % 1 === 0 ? rotaHours : rotaHours.toFixed(1)}h</span></span>
            </span>
          )
        })()}
        {canManage && serviceLabels.length > 0 && (
          <button onClick={() => setManageServicesOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="View and delete services — e.g. remove accidental duplicates">
            <Trash2 className="w-3 h-3" /> Manage Services
          </button>
        )}
        <button onClick={() => setOpenShiftsOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
          title="Shifts that need cover — staff can offer to work them">
          <Users className="w-3 h-3" /> Open shifts{shifts.filter(s => s.advertised_at && !s.staff_id && s.status !== 'cancelled').length > 0 ? ` (${shifts.filter(s => s.advertised_at && !s.staff_id && s.status !== 'cancelled').length})` : ''}
        </button>
        <button onClick={() => setSwapPanelOpen(v => !v)}
          className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
          title="View shift swap requests">
          <ArrowLeftRight className="w-3 h-3" /> Swap Requests{swapRequests.length > 0 ? ` (${swapRequests.length})` : ''}
        </button>
        {canManage && (
          <button onClick={() => setAuditorOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Tick off finished shifts as reviewed — checks who worked, when they clocked in and out">
            <CheckCircle className="w-3 h-3" /> Shift Auditor
          </button>
        )}
        {canManage && (
          <button onClick={() => setAdjustPickerOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Find a shift to change its start/finish time or reassign it, without hunting through the calendar">
            <Pencil className="w-3 h-3" /> Adjust Shift
          </button>
        )}
        <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Shift Types</option>
          {SHIFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => setFilterUnfilled(v => !v)}
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${filterUnfilled ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-200 text-slate-800 hover:bg-slate-50'}`}
          title="Show only shifts with no staff assigned yet">
          Unfilled only
        </button>
        {(filterSu || filterStaff || filterLabel || filterType || filterUnfilled) && (
          <button onClick={() => { setFilterSu(''); setFilterStaff(''); setFilterLabel(''); setFilterType(''); setFilterUnfilled(false) }}
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
            <select disabled={bulkBusy || bulkDeleting} value=""
              onChange={e => { const v = e.target.value; e.target.value = ''; runBulkChange(v) }}
              className="border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-800 bg-white"
              title="Change every highlighted shift at once">
              <option value="">{bulkBusy ? 'Working…' : 'More bulk actions…'}</option>
              <option value="time">Change time slot</option>
              <optgroup label="Change shift type to">
                {SHIFT_TYPES.map(t => <option key={t.value} value={`type:${t.value}`}>{t.label}</option>)}
              </optgroup>
              <option value="advertise">Advertise to staff as open shifts</option>
              <option value="cancel">Cancel shifts (keep on rota with a reason)</option>
              <option value="reinstate">Reinstate cancelled shifts</option>
            </select>
            <Button size="sm" variant="danger" loading={bulkDeleting}
              icon={<Trash2 className="w-3.5 h-3.5" />} onClick={bulkDeleteShifts}>
              Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Swap Requests Inbox ─────────────────────────────────────────── */}
      {swapPanelOpen && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Shift Swap Requests ({swapRequests.length})
            <button onClick={() => setSwapPanelOpen(false)} className="ml-auto text-amber-400 hover:text-amber-600 normal-case font-normal">
              <X className="w-3.5 h-3.5" />
            </button>
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
                {/* Manager sees approve/reject any time the swap isn't already resolved —
                    for an "open" request (no specific target picked), once a specific
                    target has agreed, or even while still awaiting that target's response
                    (a manager can force the swap through immediately without waiting). */}
                {canManage && !swap.is_my_inbox && (swap.status === 'pending_manager' || swap.status === 'pending') && (
                  <div className="flex gap-1.5 ml-auto items-center">
                    <span className="text-emerald-600 font-semibold text-xs">
                      {swap.status === 'pending_manager' ? 'Both agreed —' : (swap.target_staff_id ? 'Awaiting staff response —' : 'Open request —')}
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
                {/* The person who requested the swap can withdraw it themselves —
                    e.g. it got sorted out directly with a colleague outside the
                    app — without waiting on a manager or the target staff member. */}
                {!canManage && !swap.is_my_inbox && swap.requesting_staff_id === user?.id && (
                  <button
                    disabled={swapActing === swap.id}
                    onClick={() => cancelSwap(swap.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold hover:bg-rose-100 hover:text-rose-700 transition-colors disabled:opacity-50 ml-auto">
                    <X className="w-3 h-3" /> Cancel request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hoverTip && !detailShift && (() => {
        const s = hoverTip.shift
        const st = s.start_time?.substring(0, 5) || ''
        const et = s.end_time?.substring(0, 5) || ''
        let mins = timeToMins(et || '00:00') - timeToMins(st || '00:00')
        if (mins <= 0) mins += 1440
        const dur = `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
        let dateLabel = ''
        try { dateLabel = format(parseISO(String(s.shift_date).substring(0, 10)), 'EEE d MMM yyyy') } catch { }
        const where = s.label || s.su_names || s.su_name
        return (
          <div className="fixed z-[60] w-[260px] pointer-events-none rounded-xl border border-slate-200 bg-white shadow-xl p-3 text-xs text-slate-700"
            style={{ left: hoverTip.x, top: Math.max(8, hoverTip.y) }}>
            <p className="font-bold text-slate-900 text-sm mb-1">{where || 'Shift'}</p>
            <p><span className="font-semibold">Date:</span> {dateLabel}</p>
            <p><span className="font-semibold">Time:</span> {st} – {et} ({dur})</p>
            <p><span className="font-semibold">Staff:</span> {s.staff_name || 'Unfilled — no one assigned'}</p>
            {s.label && (s.su_names || s.su_name) && <p><span className="font-semibold">Service users:</span> {s.su_names || s.su_name}</p>}
            {s.shift_type && <p className="capitalize"><span className="font-semibold">Type:</span> {String(s.shift_type).replace(/_/g, ' ')}</p>}
            <p className="mt-1 text-slate-400">Double-click to open</p>
          </div>
        )
      })()}

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {/* Day headers — sticky. isolate forces this onto its own stacking
            context — without it, a busy day's many shift cards (each already
            promoted to its own GPU compositing layer by rounded-xl +
            overflow-hidden + the hover transform/scale) can end up painted
            above a `position: sticky` element during scroll despite its
            explicit z-20, a known WebKit/Chrome compositing quirk that gets
            worse the more cards are stacked up (hence "only at this end of
            the rota", the busier days). isolate guarantees this header's
            z-index is compared fresh, not against however many layers its
            siblings happened to get promoted to. */}
        {/* w-max: the header row must be as wide as ALL the day columns, not
            just the visible area. As a plain block it stopped at the edge of the
            screen, so the last days' headers (and their white background) ran
            past the end of the bar — shift cards then showed through and over
            those dates when scrolled to the top. Each day cell also carries its
            own white background for the same reason. */}
        <div className="flex sticky top-0 z-20 isolate bg-white border-b border-slate-200 shadow-sm w-max min-w-full">
          <div className="w-14 flex-shrink-0 border-r-2 border-slate-300 sticky left-0 z-10 bg-white" />
          {dayData.map(({ day, dayShifts, dayLeaves, width }) => {
            const isToday = isSameDay(day, today)
            const count = dayShifts.length + dayLeaves.length
            return (
              <div key={day.toString()} style={{ width, minWidth: width, flexShrink: 0 }}
                className={`py-2 border-l-2 border-slate-300 ${isToday ? 'bg-indigo-600' : 'bg-white'}`}>
                {/* A busy day's column is thousands of pixels wide. Centred in that,
                    the day name was off-screen at almost every scroll position — the
                    rota showed shifts with no visible date above them. Pinning the
                    label to the left edge of the visible area keeps the current
                    day's name on screen for as long as any of its column is. */}
                <div className="sticky left-16 inline-block text-center px-3">
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
              </div>
            )
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="flex w-max min-w-full">

            {/* Time labels — pinned so the hours stay readable while scrolling across a wide day */}
            <div className="w-14 flex-shrink-0 border-r-2 border-slate-300 sticky left-0 z-[15] bg-white">
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end pr-2 pt-1 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500">{String(h).padStart(2, '0')}:00</span>
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
                  className={`relative border-l-2 ${isToday ? 'bg-indigo-50 border-indigo-300' : 'border-slate-300'}`}>

                  {/* Hour gridlines */}
                  {HOURS.map((h, i) => (
                    <div key={h}
                      className={`absolute left-0 right-0 border-t ${i % 2 === 0 ? 'border-slate-200' : 'border-slate-100'}`}
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
                      <div key={shift.id} role="button" tabIndex={0}
                        // Was a <button> wrapping the checkbox and delete-icon <div role="button">/
                        // <span role="button"> below it — nested interactive elements inside a
                        // native <button> are invalid HTML, and browsers handle the click dispatch
                        // for that inconsistently (confirmed report: the checkbox visibly toggles
                        // but a single click doesn't register with the parent's selection state,
                        // only a double-click does). Plain <div> with the same handlers removes the
                        // invalid nesting while keeping identical click/dblclick/keyboard behaviour.
                        onClick={() => { if (selectedShiftIds.size === 0 && IS_TOUCH_DEVICE) setDetailShift(shift); else toggleShiftSelected(shift.id) }}
                        onDoubleClick={() => setDetailShift(shift)}
                        // Hover summary — who, where, when and how long, without opening the shift.
                        onMouseEnter={e => {
                          if (IS_TOUCH_DEVICE) return
                          const r = e.currentTarget.getBoundingClientRect()
                          const toRight = r.right + 270 < window.innerWidth
                          setHoverTip({ shift, x: toRight ? r.right + 8 : Math.max(8, r.left - 268), y: Math.min(r.top, window.innerHeight - 190) })
                        }}
                        onMouseLeave={() => setHoverTip(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleShiftSelected(shift.id) } }}
                        className="group absolute rounded-xl border-2 text-left overflow-hidden hover:z-10 hover:shadow-lg hover:scale-[1.01] transition-all duration-100 shadow-sm cursor-pointer"
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 32),
                          left: `calc(${laneLeft}% + 4px)`,
                          width: `calc(${laneWidth}% - 8px)`,
                          backgroundColor: colors.bg,
                          borderColor:     selected ? '#e8b130' : colors.border,
                          color:           colors.text,
                          boxShadow: selected ? '0 0 0 2px #e8b130' : undefined,
                        }}>
                        {/* Click-to-highlight (RoundSys-style) on desktop, where a real
                            double-click opens details. Touch devices can't fire double-tap
                            reliably ("it keeps highlighting and not allowing me to double
                            click... just like on the laptop"), so on touch a single tap opens
                            details directly instead — this checkbox becomes the only way to
                            select for bulk actions there, always visible (no hover needed),
                            with stopPropagation so tapping it doesn't also open the shift. */}
                        <div role="button" title="Select this shift"
                          onClick={(e) => { e.stopPropagation(); toggleShiftSelected(shift.id) }}
                          className={`absolute top-1 right-1 flex items-center justify-center rounded border cursor-pointer ${IS_TOUCH_DEVICE ? 'w-5 h-5' : 'w-4 h-4'} ${selected ? 'bg-amber-500 border-amber-500' : 'bg-white/80 border-slate-300'}`}>
                          {selected && <Check className={IS_TOUCH_DEVICE ? 'w-3.5 h-3.5 text-white' : 'w-3 h-3 text-white'} />}
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
                          {/* How late they actually clocked in — the colour alone doesn't say by how much. */}
                          {lateLabel(shift) && (
                            <p className="text-[10px] leading-tight font-bold truncate">{lateLabel(shift)}</p>
                          )}
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
                      </div>
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

      {openShiftsOpen && (
        <OpenShiftsModal homeId={selectedHome} myId={user?.id || ''} canManage={canManage}
          onClose={() => { setOpenShiftsOpen(false); loadAll() }} />
      )}
      {auditorOpen && (
        <ShiftAuditorModal shifts={shifts} onClose={() => setAuditorOpen(false)}
          onReviewed={(id, data) => setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))} />
      )}
      {adjustPickerOpen && (
        <AdjustShiftPicker
          shifts={shifts}
          onClose={() => setAdjustPickerOpen(false)}
          onPick={(shift) => { setAdjustPickerOpen(false); setDetailShift(shift) }}
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
            setPatternSeed({
              suId: detailShift.su_id || undefined, dayOrNight, daysOfWeek: [dow],
              // The exact shift this was started from — bulk assign then only
              // touches shifts with these times on this service.
              startTime: st, endTime: detailShift.end_time?.substring(0, 5) || '',
              label: detailShift.label || '',
              replaceStaffId: detailShift.staff_id || undefined,
              replaceStaffName: detailShift.staff_name || undefined,
              startDate: String(detailShift.shift_date).substring(0, 10),
            })
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

      {conflictGate.dialog}

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
          shifts={shifts}
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
    if (NEEDS_DAY_PICKER(form.recurrence) && form.daysOfWeek.length === 0) { toast.error('Select at least one day'); return }
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
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {RECURRENCE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => set('recurrence', o.value)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-colors ${form.recurrence === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {NEEDS_DAY_PICKER(form.recurrence) && (
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
              {summarizeRecurrence(form.recurrence, form.daysOfWeek)}
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
    if (NEEDS_DAY_PICKER(form.recurrence) && form.daysOfWeek.length === 0) { toast.error('Select at least one day'); return }
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
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {RECURRENCE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => set('recurrence', o.value)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-colors ${form.recurrence === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {NEEDS_DAY_PICKER(form.recurrence) && (
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
              {summarizeRecurrence(form.recurrence, form.daysOfWeek)}
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

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` })).sort((a, b) => a.label.localeCompare(b.label))

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
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {RECURRENCE_OPTIONS.map(o => (
              <button key={o.value} type="button" onClick={() => set('recurrence', o.value)}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-colors ${form.recurrence === o.value ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
          {NEEDS_DAY_PICKER(form.recurrence) && (
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

// ── Adjust Shift Picker ─────────────────────────────────────────────────────────
// A manager can already change a shift's start/finish time or reassign it once
// they've opened it — but finding the right one meant hunting through the
// calendar grid by eye. This is just a faster way in: search by service or
// staff name across the shifts already loaded for the visible week/day, pick
// one, and it opens straight into the same detail view (with its existing
// edit-time and reassign controls) rather than duplicating that UI here.
function AdjustShiftPicker({ shifts, onClose, onPick }: {
  shifts: any[]; onClose: () => void; onPick: (shift: any) => void
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = (q
    ? shifts.filter((s: any) =>
        (s.label || '').toLowerCase().includes(q) ||
        (s.staff_name || '').toLowerCase().includes(q) ||
        (s.su_names || s.su_name || '').toLowerCase().includes(q))
    : shifts
  ).slice(0, 100)

  return (
    <Modal open={true} onClose={onClose} title="Adjust Shift" size="md">
      <p className="text-sm text-slate-500 mb-3">
        Find a shift in the currently loaded week/day to change its start or finish time, or reassign it to someone else.
      </p>
      <Input placeholder="Search by service or staff name…" value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No shifts match — try a different search, or change the week/day first.</p>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {filtered.map((s: any) => (
            <button key={s.id} onClick={() => onPick(s)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-left transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{s.label || s.su_names || s.su_name || 'Individual shift'}</p>
                <p className="text-xs text-slate-500">
                  {s.shift_date ? format(parseISO(s.shift_date), 'EEE d MMM') : ''} · {(s.start_time || '').slice(0, 5)}–{(s.end_time || '').slice(0, 5)}
                  {s.staff_name ? ` · ${s.staff_name}` : ' · Unfilled'}
                </p>
              </div>
              <Pencil className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

// ── Shift Detail Modal ────────────────────────────────────────────────────────

// Open shifts — unfilled shifts a manager has advertised. Staff tap "I can cover
// this"; managers see who offered and assign from the shift itself.
function OpenShiftsModal({ homeId, myId, canManage, onClose }: { homeId: string; myId: string; canManage: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const load = () => {
    setLoading(true)
    api.get('/shifts/open', { params: { homeId } })
      .then(res => setRows(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [homeId])
  const offer = async (s: any, withdraw: boolean) => {
    setBusy(s.id)
    try {
      const res = await api.post(`/shifts/${s.id}/offer`, { withdraw })
      setRows(prev => prev.map(r => r.id === s.id ? { ...r, cover_offers: res.data.data.cover_offers } : r))
      toast.success(withdraw ? 'Offer withdrawn' : 'Offer sent — a manager will confirm')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Could not update'); load() }
    finally { setBusy(null) }
  }
  return (
    <Modal open={true} onClose={onClose} title={`Open shifts (${rows.length})`} size="lg">
      {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          No open shifts right now.{canManage ? ' To advertise one, highlight unfilled shifts on the rota and choose "Advertise to staff" under More bulk actions.' : ''}
        </p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {rows.map(s => {
            const offers: any[] = Array.isArray(s.cover_offers) ? s.cover_offers : []
            const mine = offers.some(o => o.staffId === myId)
            return (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {format(parseISO(String(s.shift_date).substring(0, 10)), 'EEE d MMM')} · {s.start_time?.substring(0, 5)}–{s.end_time?.substring(0, 5)}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{s.label || s.su_names || 'Shift'}</p>
                  {offers.length > 0 && <p className="text-xs text-emerald-700 mt-0.5">Offered: {offers.map(o => o.name).join(', ')}</p>}
                </div>
                <Button size="sm" variant={mine ? 'outline' : 'gold'} loading={busy === s.id} onClick={() => offer(s, mine)}>
                  {mine ? 'Withdraw offer' : 'I can cover this'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// Shift Auditor — every finished, staffed shift in the period on screen, with
// when the staff member actually clocked in/out, for a manager to tick as reviewed.
function ShiftAuditorModal({ shifts, onClose, onReviewed }: {
  shifts: any[]; onClose: () => void; onReviewed: (id: string, data: any) => void
}) {
  const [show, setShow] = useState<'not_reviewed' | 'reviewed' | 'all'>('not_reviewed')
  const [busy, setBusy] = useState<string | null>(null)
  const now = Date.now()
  const endOf = (s: any) => {
    const st = s.start_time?.substring(0, 5) || '00:00'
    const et = s.end_time?.substring(0, 5) || '00:00'
    const d = String(s.shift_date).substring(0, 10)
    let end = new Date(`${d}T${et}:00`).getTime()
    if (end <= new Date(`${d}T${st}:00`).getTime()) end += 86400000
    return end
  }
  const finished = shifts
    .filter(s => s.staff_id && s.status !== 'cancelled' && endOf(s) < now)
    .sort((a, b) => endOf(b) - endOf(a))
  const rows = finished.filter(s => show === 'all' ? true : show === 'reviewed' ? !!s.reviewed_at : !s.reviewed_at)
  const hhmm = (v: any) => { try { return v ? format(new Date(v), 'HH:mm') : '—' } catch { return '—' } }
  // Opens a clean printable copy of the list; the browser's print dialog can save it as a PDF.
  const printAudit = () => {
    const e = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const body = rows.map(s => `<tr>
      <td>${e(format(parseISO(String(s.shift_date).substring(0, 10)), 'EEE d MMM yyyy'))}<br>${e(s.start_time?.substring(0, 5))} – ${e(s.end_time?.substring(0, 5))}</td>
      <td>${e(s.label || s.su_names || s.su_name || '—')}</td>
      <td>${e(s.staff_name || '—')}</td>
      <td>${s.clock_in_time ? e(hhmm(s.clock_in_time) + ' / ' + hhmm(s.clock_out_time)) : 'Did not clock in'}</td>
      <td>${s.reviewed_at ? 'Reviewed ' + e(format(new Date(s.reviewed_at), 'd MMM yyyy HH:mm')) : 'Not reviewed'}</td>
    </tr>`).join('')
    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow pop-ups for this site to print'); return }
    w.document.write(`<!doctype html><html><head><title>Shift Auditor</title><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:24px}
      h1{font-size:18px;margin:0 0 4px} p{margin:0 0 12px;color:#555}
      table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f1f5f9}
    </style></head><body><h1>Shift Auditor</h1><p>Printed ${e(format(new Date(), 'd MMM yyyy HH:mm'))} · ${rows.length} shift${rows.length !== 1 ? 's' : ''}</p>
    <table><thead><tr><th>Date</th><th>Service / service user</th><th>Staff</th><th>Clocked in / out</th><th>Review</th></tr></thead><tbody>${body}</tbody></table>
    </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }
  const toggle = async (s: any) => {
    setBusy(s.id)
    try {
      const res = await api.put(`/shifts/${s.id}/review`, { reviewed: !s.reviewed_at })
      onReviewed(s.id, res.data.data)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Could not update') }
    finally { setBusy(null) }
  }
  return (
    <Modal open={true} onClose={onClose} title={`Shift Auditor (${rows.length})`} size="lg">
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {([['not_reviewed', 'Not reviewed'], ['reviewed', 'Reviewed'], ['all', 'All']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setShow(v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${show === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
          ))}
          <span className="text-xs text-slate-500 ml-auto">Finished shifts in the period shown on the rota</span>
          <button onClick={printAudit} disabled={!rows.length}
            className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Print / save as PDF
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">Nothing to show.</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 font-bold">Date</th>
                  <th className="px-3 py-2 font-bold">Service / service user</th>
                  <th className="px-3 py-2 font-bold">Staff</th>
                  <th className="px-3 py-2 font-bold">Clocked in / out</th>
                  <th className="px-3 py-2 font-bold text-center">Reviewed?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {format(parseISO(String(s.shift_date).substring(0, 10)), 'EEE d MMM')}<br />
                      <span className="text-slate-500">{s.start_time?.substring(0, 5)} – {s.end_time?.substring(0, 5)}</span>
                    </td>
                    <td className="px-3 py-2">{s.label || s.su_names || s.su_name || '—'}</td>
                    <td className="px-3 py-2">{s.staff_name || '—'}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${s.clock_in_time ? '' : 'text-rose-600 font-semibold'}`}>
                      {s.clock_in_time ? `${hhmm(s.clock_in_time)} / ${hhmm(s.clock_out_time)}` : 'Did not clock in'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" className="w-4 h-4" checked={!!s.reviewed_at} disabled={busy === s.id} onChange={() => toggle(s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

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
  const conflictGate = useConflictGate()
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
      await conflictGate.run(async (confirmed) => {
        const res = await api.put(`/shifts/${shift.id}`, {
          shiftDate: editDate, startTime: editStart, endTime: editEnd,
          applyToFuture, confirmConflicts: confirmed,
        })
        onUpdated(res.data.data)
        toast.success(applyToFuture ? 'Shift times updated for this and every future occurrence' : 'Shift times updated')
        setEditingTimes(false)
        setApplyToFuture(false)
      })
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to update shift times') }
    finally { setSavingTimes(false) }
  }

  const saveReallocate = async () => {
    if (!reallocateTo) { toast.error('Select a staff member'); return }
    setSavingReallocate(true)
    try {
      await conflictGate.run(async (confirmed) => {
        const res = await api.put(`/shifts/${shift.id}`, { staffId: reallocateTo, confirmConflicts: confirmed })
        toast.success('Shift reallocated')
        setReallocating(false)
        setReallocateTo('')
        onLinked() // closes the modal and reloads shifts so the new staff name/role join comes through
      })
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

  // Totals for the repeating series this shift belongs to.
  const [seriesStats, setSeriesStats] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    if (!shift.template_id) { setSeriesStats(null); return }
    api.get(`/shifts/${shift.id}/series-stats`)
      .then(res => { if (!cancelled) setSeriesStats(res.data?.data || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [shift.id, shift.template_id])

  const changeStatus = async (newStatus: string) => {
    if (newStatus === status) return
    // Cancelling keeps the shift on the rota (greyed out) with the reason, so
    // there is a record of what was cancelled and why — unlike deleting it.
    let cancelReason: string | undefined
    let cancelBillable: boolean | undefined
    if (newStatus === 'cancelled') {
      const r = window.prompt('Why is this shift being cancelled? (e.g. service user in hospital, family visiting)')
      if (r === null) return
      cancelReason = r.trim() || undefined
      cancelBillable = window.confirm('Is this cancelled shift still BILLABLE to the funder?\n\nOK = Yes, still billable\nCancel = No, not billable')
    }
    setSavingStatus(true)
    try {
      const res = await api.put(`/shifts/${shift.id}/status`, { status: newStatus, cancelReason, cancelBillable })
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

  // Clocked in for this shift and hasn't clocked out yet — the manager can see
  // this directly on the shift they're looking at (the rota's own "Clocked in"
  // indicator), not just by separately digging into Clock-in Analytics, which
  // is where this same force-clockout action previously lived exclusively.
  const stillClockedIn = !!shift.clock_in_time && !shift.clock_out_time
  const [forcingOut, setForcingOut] = useState(false)
  const forceClockOut = async () => {
    if (!window.confirm(`Clock ${shift.staff_name || 'this staff member'} out now? Use this when they're stuck clocked in and can't clock out themselves.`)) return
    setForcingOut(true)
    try {
      await api.post(`/clockin/force-clockout/${shift.staff_id}`)
      toast.success(`${shift.staff_name || 'Staff member'} clocked out`)
      onLinked() // closes the modal and reloads shifts
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to clock out') }
    finally { setForcingOut(false) }
  }

  return (
    <>
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
          {canManage && stillClockedIn && (
            <button onClick={forceClockOut} disabled={forcingOut}
              className="mt-2 w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-colors">
              {forcingOut ? 'Clocking out…' : 'Force clock out — stuck clocked in'}
            </button>
          )}
        </div>

        {!shift.staff_id && Array.isArray(shift.cover_offers) && shift.cover_offers.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <span className="font-bold">Offered to cover:</span> {shift.cover_offers.map((o: any) => o.name).join(', ')}
            {canManage && <span className="block text-emerald-700 mt-0.5">Use Assign / Reallocate below to give them the shift.</span>}
          </div>
        )}
        {seriesStats && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900 mb-0.5">This shift is part of a repeating series</p>
            <p>{seriesStats.total} shifts from {seriesStats.first_date} to {seriesStats.last_date}</p>
            <p>
              <span className="text-emerald-700 font-semibold">{seriesStats.assigned} assigned</span> ·{' '}
              <span className={Number(seriesStats.unassigned) > 0 ? 'text-rose-600 font-semibold' : ''}>{seriesStats.unassigned} unassigned</span>
              {Number(seriesStats.cancelled) > 0 && <> · {seriesStats.cancelled} cancelled</>}
              {Number(seriesStats.upcoming_unassigned) > 0 && <> · {seriesStats.upcoming_unassigned} still to fill from today</>}
            </p>
          </div>
        )}

        {shift.status === 'cancelled' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-bold">Cancelled</span>
            {shift.cancelled_at && <> on {format(new Date(shift.cancelled_at), 'd MMM yyyy, HH:mm')}</>}
            {shift.cancel_reason ? <> — {shift.cancel_reason}</> : <> — no reason recorded</>}
            {shift.cancel_billable === true && <> · still billable</>}
            {shift.cancel_billable === false && <> · not billable</>}
            {canManage && <span className="block text-slate-500 mt-0.5">Pick another status below to reinstate it.</span>}
          </div>
        )}

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
    {conflictGate.dialog}
    </>
  )
}

// ── Staff Filter Combobox ──────────────────────────────────────────────────────
// A searchable, scrollable replacement for the toolbar "All Staff" plain <select>.
// Staff homes can have 60+ people in the list, which is awkward to hunt through
// on a native mobile select popup — this lets staff type a few letters of their
// own name to find themselves instead of scrolling a long unfiltered list.

function StaffFilterCombobox({ staffList, value, onChange }: {
  staffList: any[]; value: string; onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = staffList.find(s => s.id === value)
  const filtered = staffList.filter(s => getName(s).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-600 bg-white flex items-center gap-1.5 max-w-[160px]">
        <span className="truncate">{selected ? getName(selected) : 'All Staff'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="relative p-2 border-b border-slate-100">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input autoFocus className="input pl-8 text-sm" placeholder="Search staff..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button type="button" onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 font-medium text-slate-600">
              All Staff
            </button>
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No staff found</p>
            ) : (
              filtered.map((s: any) => (
                <button key={s.id} type="button" onClick={() => { onChange(s.id); setOpen(false); setSearch('') }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0',
                    s.id === value ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-700',
                  )}>
                  {getName(s)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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

function PatternAssignModal({ open, onClose, staffList, shifts = [], suList, homeId, defaultDate, seed, onSaved }: {
  open: boolean; onClose: () => void
  staffList: any[]; shifts?: any[]; suList: any[]; homeId: string; defaultDate: string
  seed?: { suId?: string; dayOrNight?: 'any' | 'day' | 'night'; daysOfWeek?: number[];
    startTime?: string; endTime?: string; label?: string; replaceStaffId?: string; replaceStaffName?: string; startDate?: string } | null
  onSaved: () => void
}) {
  // Multiple staff, not just one — most services run with 2+ staff on at once, and
  // bulk-assigning used to only ever let you pick a single person for the whole
  // pattern, so a second run for a different staff member just overwrote the first
  // (or found nothing left to fill). Each selected staff member now gets their own
  // shift on every matching date, so the rota ends up genuinely multi-staffed.
  const [staffIds, setStaffIds] = useState<string[]>([])
  // Started from one specific shift: only that timing is allocated, one staff
  // member at a time (tick a person, save, then do the next shift the same way).
  const seededTiming = !!(seed?.startTime && seed?.endTime)
  const [thisTimingOnly, setThisTimingOnly] = useState(seededTiming)
  const toggleStaffId = (id: string) => setStaffIds(prev =>
    thisTimingOnly ? (prev.includes(id) ? [] : [id])
      : (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  const [suId, setSuId] = useState(seed?.suId || '')
  // Defaults to "Day" rather than "Any" when opened without a seed (i.e. straight
  // from the toolbar button, not "Bulk assign like this" off a specific shift) —
  // "Any" silently matched night shifts too unless the manager remembered to
  // narrow it, which is exactly the "it assigns at night where I didn't tell it
  // to" report. Explicitly choosing "Any" is still one click away if that's
  // really what's wanted.
  const [dayOrNight, setDayOrNight] = useState<'any' | 'day' | 'night'>(seed?.dayOrNight || 'day')
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
  const conflictGate = useConflictGate()

  useEffect(() => { if (open) setStartDate(seed?.startDate || defaultDate) }, [open, defaultDate])

  const toggleDay = (d: number) =>
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const suOptions = suList.map(su => ({ value: su.id, label: getName(su) }))
  // Alphabetical so a long staff list is easy to scan/select from, instead
  // of whatever order the API happened to return.
  const sortedStaffList = [...staffList].sort((a, b) => getName(a).localeCompare(getName(b)))

  const save = async () => {
    if (!staffIds.length) { toast.error('Select at least one staff member'); return }
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
      await conflictGate.run(async (confirmed) => {
        const res = await api.post('/shifts/bulk-assign-pattern', {
          homeId, staffIds, suId: suId || null,
          dayOrNight, daysOfWeek: effectiveDaysOfWeek,
          fortnightly: repeatMode === 'fortnightly', monthly: repeatMode === 'monthly',
          startDate, endDate: effectiveEndDate,
          onlyUnfilled,
          ...(thisTimingOnly && seededTiming ? {
            startTime: seed!.startTime, endTime: seed!.endTime, label: seed!.label || '',
            replaceStaffId: seed!.replaceStaffId || undefined,
          } : {}),
          confirmConflicts: confirmed,
        })
        const assigned = res.data.data?.assigned || 0
        toast.success(assigned > 0 ? `Allocated ${assigned} shift${assigned !== 1 ? 's' : ''}` : 'No matching shifts found for this pattern')
        onSaved()
      })
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to bulk allocate') }
    finally { setSaving(false) }
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Bulk Allocate — Recurring Pattern" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Assign one or more staff members to every unfilled shift on the days you pick, over a date range — e.g. every Monday, Tuesday and Saturday, every other week, until you stop it. Pick several staff to cover the same slots together. Reallocate an individual shift instead by clicking it directly on the grid.
        </p>

        {seededTiming && (
          <div className={`rounded-xl border px-3 py-2.5 text-sm ${thisTimingOnly ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded" checked={thisTimingOnly}
                onChange={e => { setThisTimingOnly(e.target.checked); setStaffIds([]) }} />
              <span>
                <span className="font-bold">Only the {seed!.startTime}–{seed!.endTime} shift{seed!.label ? ` at ${seed!.label}` : ''}</span>
                <span className="block text-xs mt-0.5">
                  {thisTimingOnly
                    ? (seed!.replaceStaffName
                        ? `Hands over ${seed!.replaceStaffName}'s ${seed!.startTime}–${seed!.endTime} shifts on the days below to the person you pick. Other shifts on those days are not touched.`
                        : `Fills the unfilled ${seed!.startTime}–${seed!.endTime} shifts on the days below. Other shifts on those days (longer or shorter) are not touched. Pick one person, save, then do the next shift.`)
                    : 'Unticked: every daytime or night shift on those days can be allocated, including shifts with different times.'}
                </span>
              </span>
            </label>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">{thisTimingOnly ? 'Staff member *' : 'Staff member(s) *'}</label>
          {/* overscroll-contain stops scroll chaining into the modal's own
              overflow-y-auto body — without it, scrolling to the end of this
              list bled straight into scrolling the whole modal, which is
              what made the list feel broken/unresponsive to scroll. Taller
              max-h (56 vs the old 40) also means fewer staff need scrolling
              to reach in the first place. */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto overscroll-contain">
            {sortedStaffList.map((s: any) => {
              // Shown in the order staff were CLICKED (staffIds), not the
              // alphabetical order the list displays in — on a date with
              // several shift slots, the 1st person clicked fills the
              // earliest slot, the 2nd fills the next, and so on. The
              // number makes that order visible/confirmable before saving,
              // instead of it being an invisible side effect of click order.
              const order = staffIds.indexOf(s.id)
              // Hours already on the rota in the period on screen vs contracted
              // hours — so it's clear who has room before assigning more.
              const rotaHrs = shifts.filter((sh: any) => sh.staff_id === s.id && sh.status !== 'cancelled').reduce((sum: number, sh: any) => {
                let m = timeToMins(sh.end_time?.substring(0, 5) || '00:00') - timeToMins(sh.start_time?.substring(0, 5) || '00:00')
                if (m <= 0) m += 1440
                return sum + m / 60
              }, 0)
              const contracted = Number(s.contracted_hours) || 0
              const over = contracted > 0 && rotaHrs > contracted
              return (
                <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm">
                  <input type="checkbox" checked={staffIds.includes(s.id)} onChange={() => toggleStaffId(s.id)} className="rounded" />
                  {order !== -1 && (
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">{order + 1}</span>
                  )}
                  <span className="text-slate-700">{getName(s)}</span>
                  <span className="text-xs text-slate-400 capitalize">{(s.role || '').replace(/_/g, ' ')}</span>
                  <span className={`ml-auto text-xs font-semibold whitespace-nowrap ${over ? 'text-amber-600' : rotaHrs === 0 ? 'text-emerald-600' : 'text-slate-500'}`}
                    title="Hours on the rota in the period currently shown, against contracted hours">
                    {rotaHrs === 0 ? 'Free' : `${rotaHrs % 1 === 0 ? rotaHrs : rotaHrs.toFixed(1)}h on rota`}{contracted > 0 ? ` / ${contracted}h` : ''}
                  </span>
                </label>
              )
            })}
          </div>
          {staffIds.length > 1 && (
            <p className="text-xs text-slate-400 mt-1">Each selected staff member gets their own shift on every matching date, in the order you picked them (1st pick → earliest shift that day) — {staffIds.length} shifts per date.</p>
          )}
        </div>
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
    {conflictGate.dialog}
    </>
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

  const staffOptions = staffList.map(s => ({ value: s.id, label: `${getName(s)} (${(s.role || '').replace(/_/g, ' ')})` })).sort((a, b) => a.label.localeCompare(b.label))
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

  const staffOptions = staffList.map(s => ({ value: s.id, label: getName(s) })).sort((a, b) => a.label.localeCompare(b.label))

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

  const staffOptions = staffList.filter(s => s.id !== shift.staff_id).map(s => ({ value: s.id, label: getName(s) })).sort((a, b) => a.label.localeCompare(b.label))

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
  // A service could only ever get a stop date at the moment it was first created —
  // there was no way to add or change one afterwards, and no bounded alternative to
  // "delete every future shift" when someone just wanted future shifts trimmed back
  // to a specific date. This sets shift_templates.end_date for the service going
  // forward AND removes any already-generated shifts past the new cutoff.
  const [editingStopDateFor, setEditingStopDateFor] = useState<string | null>(null)
  const [stopDateInput, setStopDateInput] = useState('')
  const [savingStopDate, setSavingStopDate] = useState(false)

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

  const openStopDateEditor = (label: string) => {
    setStopDateInput('')
    setEditingStopDateFor(label)
  }

  const saveStopDate = async () => {
    if (!editingStopDateFor) return
    setSavingStopDate(true)
    try {
      const res = await api.patch(`/shifts/service-label/${encodeURIComponent(editingStopDateFor)}/end-date`,
        { endDate: stopDateInput || null }, { params: { homeId } })
      const trimmed = res.data.data?.trimmed ?? 0
      toast.success(stopDateInput
        ? `Stop date set for "${editingStopDateFor}"${trimmed ? ` — removed ${trimmed} shift(s) already past it` : ''}`
        : `Stop date cleared for "${editingStopDateFor}"`)
      setEditingStopDateFor(null)
      load()
      onDeleted() // refresh the rota grid too, since shifts may have been trimmed
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to set stop date') }
    finally { setSavingStopDate(false) }
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
                    <button onClick={() => openStopDateEditor(s.label)} disabled={deleting !== null}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <Calendar className="w-3.5 h-3.5" /> Stop date
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
                {editingStopDateFor === s.label && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="date" value={stopDateInput} onChange={e => setStopDateInput(e.target.value)} className="flex-1" />
                    <Button size="sm" loading={savingStopDate} onClick={saveStopDate}>
                      {stopDateInput ? 'Save' : 'Clear (make ongoing)'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingStopDateFor(null)}>Cancel</Button>
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
                {[...staffList].sort((a, b) => getName(a).localeCompare(getName(b))).map(s => (
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
