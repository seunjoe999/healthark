import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { staffApi, suApi } from '../../api'
import { format, addDays, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import TaskPopup from '../../components/TaskPopup'
import { shouldShowTaskPopup, isTimePastDue } from '../../utils/taskReminder'
import { getServerTodayStr } from '../../utils/serverTime'
import toast from 'react-hot-toast'
import {
  ClipboardList, Pill, Calendar, Clock, Bell, BookOpen,
  CheckCircle, AlertTriangle, Users, ArrowRight, MessageSquare, LogIn, CalendarClock
} from 'lucide-react'

export default function StaffDashboard() {
  const { user, isRole } = useAuth()
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [myLeave, setMyLeave] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [myProfile, setMyProfile] = useState<any>(null)
  const [personalEmail, setPersonalEmail] = useState('')
  const [emailEditing, setEmailEditing] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const savePersonalEmail = async () => {
    const v = personalEmail.trim()
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { toast.error('That does not look like an email address'); return }
    setEmailSaving(true)
    try {
      await api.put('/staff/me/personal-email', { personalEmail: v })
      setMyProfile((p: any) => ({ ...(p || {}), personal_email: v || null }))
      setEmailEditing(false)
      toast.success(v ? 'Personal email saved' : 'Personal email removed')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Could not save your email') }
    finally { setEmailSaving(false) }
  }
  const [residents, setResidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskPopup, setShowTaskPopup] = useState(false)
  const [clockedIn, setClockedIn] = useState(false)
  const [clockInUrl, setClockInUrl] = useState<string | null>(null)
  const [clockingOut, setClockingOut] = useState(false)
  // Clocking out never needs a QR code or location — the dedicated clock-in
  // page only existed as a route to scan into, so a staff member whose home
  // has no QR provisioned yet (clockInUrl stayed null) was sent to the
  // Clock In Analytics report instead, which has no clock-out control at
  // all — once clocked in, their "Clock out" tile silently did nothing.
  // This calls the same clock-out endpoint directly, with no QR dependency.
  //
  // The server treats clock-out as automatic: one INSERT, then success, no
  // matter the crowd size or what is outstanding. But no network call is
  // literally unfailable — the phone can still lose signal mid-tap. So the
  // tile retries by itself (up to 3 attempts with a short pause), and only
  // after every attempt AND a status re-check still shows them clocked in
  // does it admit failure — and even then with the real reason when the
  // server gave one, never the empty "Failed to clock out".
  const clockOutNow = async (overrideReason?: string) => {
    const cleanReason = typeof overrideReason === 'string' && overrideReason.trim().length >= 5
      ? overrideReason.trim()
      : undefined
    setClockingOut(true)
    try {
      let lastErr: any = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await api.post('/clockin/event', {
            ...(user?.homeId ? { homeId: user.homeId } : {}),
            eventType: 'clock_out',
            ...(cleanReason ? { overrideReason: cleanReason } : {}),
          })
          lastErr = null
          break
        } catch (attemptErr: any) {
          lastErr = attemptErr
          // A real refusal from the server (a message attached) is an answer,
          // not a lost request — retrying won't change it, so stop at once.
          if (attemptErr?.response?.data?.error) break
          if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
        }
      }
      if (!lastErr) {
        setClockedIn(false)
        toast.success('Clocked out')
        return
      }
      const err = lastErr
      const reason = err?.response?.data?.reason
      // The clock-out may have gone through on the server even though this
      // request reported failure — e.g. it timed out after the record was
      // already stored. Before telling staff it failed, ask the server what
      // their actual state is: if they are no longer clocked in, the job is
      // done and the tile must flip to match, rather than staying stuck on
      // "Clock out" (which reads as "keeps saying failed to clock out" on
      // every retry). Only when they are still clocked in is this a genuine
      // failure worth reporting.
      try {
        const st = await api.get('/clockin/status')
        if (st?.data?.data?.clockedIn === false) {
          setClockedIn(false)
          toast.success('Clocked out')
          return
        }
      } catch { /* status check failed too — report the original error below */ }
      if ((reason === 'medication_incomplete' || reason === 'tasks_incomplete') && !cleanReason) {
        const why = window.prompt(`${err?.response?.data?.error || 'Something is still outstanding.'}\n\nYou can still clock out — enter a reason (at least 5 characters):`)
        if (why && why.trim().length >= 5) { setClockingOut(false); await clockOutNow(why.trim()); return }
        if (why !== null) toast.error('Reason must be at least 5 characters')
      } else {
        toast.error(err?.response?.data?.error || 'Could not clock out — check your signal and try again. If it keeps happening, tell your manager the time you finished.')
      }
    } finally { setClockingOut(false) }
  }
  const [medDueToday, setMedDueToday] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 })
  const [myMeds, setMyMeds] = useState<any[]>([])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Task reminder pop-up — management landing on this dashboard (deputy/service/
  // registered manager, director, home_manager, group_admin, admin) don't get
  // nagged about tasks that aren't theirs to complete. Everyone else who can land
  // on the staff dashboard (care_staff, team_leader, senior_carer, nurse, etc.)
  // still gets reminded — this was previously allowlisted to just care_staff/
  // team_leader, which accidentally silenced reminders for every other staff role.
  const wantsTaskReminders = !isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager')

  useEffect(() => {
    if (user?.id && wantsTaskReminders) setShowTaskPopup(shouldShowTaskPopup(user.id))
  }, [user?.id, wantsTaskReminders])

  // Refetch due-today tasks AND medications every 2 minutes + whenever the app
  // returns to foreground, and detect midnight rollover automatically. Without
  // refreshing tasks here, a staff member already logged in before midnight
  // kept holding only yesterday's completed tasks in `myTasks`, so the new day's
  // tasks generated at 00:00 never popped up after midnight.
  const activeDayRef = React.useRef<string>('')
  const overdueNotifiedRef = React.useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!user?.homeId) return
    const refreshLiveWork = async () => {
      try {
        const todayStr = await getServerTodayStr()
        const dayRolledOver = Boolean(activeDayRef.current && activeDayRef.current !== todayStr)
        activeDayRef.current = todayStr
        if (dayRolledOver) {
          overdueNotifiedRef.current.clear()
        }
        const prevDayStr = format(addDays(new Date(todayStr), -1), 'yyyy-MM-dd')
        const weekAheadStr = format(addDays(new Date(todayStr), 6), 'yyyy-MM-dd')
        const [tasksR, medsR, shiftsR] = await Promise.allSettled([
          api.get('/tasks', { params: { homeId: user.homeId, date: todayStr, shift: 'current' } }),
          api.get('/mar/due-today', { params: { homeId: user.homeId, shift: 'current' } }),
          api.get('/shifts', { params: { homeId: user.homeId, from: prevDayStr, to: weekAheadStr } }),
        ])
        if (tasksR.status === 'fulfilled') {
          const freshTasks = tasksR.value.data?.data || []
          setMyTasks(freshTasks)
          if (dayRolledOver && wantsTaskReminders && freshTasks.some((t: any) => t.status === 'pending')) {
            setShowTaskPopup(true)
          }
        }
        if (medsR.status === 'fulfilled') {
          const medTasks = medsR.value.data?.data || []
          setMyMeds(medTasks)
          setMedDueToday({ total: medTasks.length, pending: medTasks.filter((t: any) => t.status === 'pending').length })
        }
        if (shiftsR.status === 'fulfilled') {
          const allShifts = shiftsR.value.data?.data || []
          setMyShifts(allShifts.filter((s: any) => s.staff_id === user.id))
        }
      } catch { /* keep last known state on a transient failure */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refreshLiveWork() }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(refreshLiveWork, 2 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [user?.id, user?.homeId, wantsTaskReminders])

  // Time-based due check — on top of the frequency-based pop-up above, poll every
  // 2 minutes for tasks AND medications whose due time has now passed and are
  // still pending, so nothing just sits silently on a list once it's overdue.
  // Medications must be included here (not just regular tasks) so a later dose
  // (e.g. an evening one after a morning dose already popped up) still triggers
  // a fresh pop-up instead of staying silent for the rest of the shift.
  useEffect(() => {
    if (!wantsTaskReminders) return
    const checkOverdue = () => {
      const overdueTasks = myTasks.filter(t => t.status === 'pending' && isTimePastDue(t.due_time))
      const overdueMeds = myMeds.filter((m: any) => m.status === 'pending' && isTimePastDue(m.scheduledTime))
      const newlyOverdueTasks = overdueTasks.filter(t => !overdueNotifiedRef.current.has(t.id))
      const newlyOverdueMeds = overdueMeds.filter((m: any) => !overdueNotifiedRef.current.has(`med-${m.medicationId}-${m.scheduledTime}`))
      const newlyOverdueCount = newlyOverdueTasks.length + newlyOverdueMeds.length
      if (newlyOverdueCount > 0) {
        newlyOverdueTasks.forEach(t => overdueNotifiedRef.current.add(t.id))
        newlyOverdueMeds.forEach((m: any) => overdueNotifiedRef.current.add(`med-${m.medicationId}-${m.scheduledTime}`))
        toast(`${newlyOverdueCount} task${newlyOverdueCount > 1 ? 's are' : ' is'} now overdue`, { icon: '⏰' })
        setShowTaskPopup(true)
      }
    }
    checkOverdue()
    const interval = setInterval(checkOverdue, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [myTasks, myMeds, wantsTaskReminders])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const todayStr = await getServerTodayStr()
        activeDayRef.current = todayStr
        const prevDayStr = format(addDays(new Date(todayStr), -1), 'yyyy-MM-dd')
        const weekAheadStr = format(addDays(new Date(todayStr), 6), 'yyyy-MM-dd')
        const [shiftsR, tasksR, leaveR, notifR, profileR, suR, clockStatusR, homeQrR, medDueR] = await Promise.allSettled([
          // Include yesterday too so overnight shifts crossing midnight (e.g.
          // 20:00–08:00 started last night) still appear under "Today's shift".
          api.get('/shifts', { params: { homeId: user.homeId, from: prevDayStr, to: weekAheadStr } }),
          // Current shift's tasks only (day or night) — RoundSys-style, each
          // shift sees its own list rather than the whole day's at once.
          api.get('/tasks', { params: { homeId: user.homeId, date: todayStr, shift: 'current' } }),
          api.get('/staff-hr/leave', { params: { staffId: user.id } }),
          api.get('/notifications'),
          staffApi.get(user.id),
          suApi.list(user.homeId || '', { status: 'live' }),
          api.get('/clockin/status'),
          user.homeId ? api.get(`/clockin/home-qr/${user.homeId}`) : Promise.resolve(null),
          // Same per-shift scoping for the medication list below.
          api.get('/mar/due-today', { params: { homeId: user.homeId, shift: 'current' } }),
        ])
        const v = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
        const profileData = v(profileR)?.data.data
        const allShifts = v(shiftsR)?.data.data || []
        setMyShifts(allShifts.filter((s: any) => s.staff_id === user.id))
        // GET /api/tasks already does full visibility filtering server-side for
        // the authenticated staff member (creator / assigned_staff_id / assigned_role
        // / team / general, plus resident-restriction for care roles) — this used to
        // re-filter on just assigned_role here too, which silently hid any task the
        // backend correctly showed via assigned_staff_id or team targeting instead
        // (a task assigned directly to this staff member, with no assigned_role set
        // to something else, could still vanish from their own dashboard).
        setMyTasks(v(tasksR)?.data.data || [])
        setMyLeave(v(leaveR)?.data.data || [])
        setNotifications((v(notifR)?.data.data || []).filter((n: any) => !n.is_read).slice(0, 5))
        setMyProfile(profileData)
        setPersonalEmail(profileData?.personal_email || '')
        setResidents(v(suR)?.data.data || [])
        setClockedIn(!!v(clockStatusR)?.data.data?.clockedIn)
        const qrToken = v(homeQrR)?.data.data?.qrToken
        setClockInUrl(qrToken ? `/clockin/home/${qrToken}` : null)
        const medTasks = v(medDueR)?.data.data || []
        setMyMeds(medTasks)
        setMedDueToday({ total: medTasks.length, pending: medTasks.filter((t: any) => t.status === 'pending').length })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const pendingTasks = myTasks.filter(t => t.status === 'pending')
  const completedTasks = myTasks.filter(t => t.status === 'completed')
  const todayStr0 = format(new Date(), 'yyyy-MM-dd')
  // A staff member can have more than one shift on the same date (e.g. a
  // short day shift, then a night shift) — picking "whichever comes first"
  // always showed the day shift, even hours after it ended and the night
  // shift was the one actually relevant (and the one they needed to clock
  // into). Pick whichever shift is in progress right now, else the next
  // one still to come today, else fall back to the last one of the day.
  const now = new Date()
  const shiftWindow = (s: any) => {
    const baseDate = String(s.shift_date).substring(0, 10)
    const [sh, sm] = String(s.start_time || '00:00').split(':').map(Number)
    const [eh, em] = String(s.end_time || '00:00').split(':').map(Number)
    const start = new Date(`${baseDate}T00:00:00`); start.setHours(sh || 0, sm || 0, 0, 0)
    const end = new Date(`${baseDate}T00:00:00`); end.setHours(eh || 0, em || 0, 0, 0)
    if (end <= start) end.setDate(end.getDate() + 1) // overnight shift crossing midnight
    return { start, end }
  }
  const prevStr0 = format(addDays(now, -1), 'yyyy-MM-dd')
  const todaysShiftsWithWindows = myShifts
    .filter((s: any) => {
      const d = String(s.shift_date).substring(0, 10)
      if (d === todayStr0) return true
      if (d === prevStr0) {
        const w = shiftWindow(s)
        return now >= w.start && now <= w.end
      }
      return false
    })
    .map((s: any) => ({ s, ...shiftWindow(s) }))
  const myTodayShift = (
    todaysShiftsWithWindows.find(w => now >= w.start && now <= w.end)
    || todaysShiftsWithWindows.filter(w => w.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())[0]
    || todaysShiftsWithWindows.sort((a, b) => b.start.getTime() - a.start.getTime())[0]
  )?.s
  const myUpcomingShifts = myShifts
    .filter((s: any) => String(s.shift_date).substring(0, 10) !== todayStr0)
    .sort((a: any, b: any) => String(a.shift_date).localeCompare(String(b.shift_date)))
  const pendingLeave = myLeave.filter(l => l.status === 'pending')

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-slate-400 text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        <h1 className="font-display text-2xl text-slate-900 mt-0.5">{greeting}, {user?.firstName} 👋</h1>
        {myProfile?.role && <p className="text-sm text-slate-400 capitalize mt-0.5">{myProfile.role.replace(/_/g, ' ')} · {myProfile.home_name || ''}</p>}
      </div>

      {/* Personal email — every member of staff adds their own */}
      {myProfile && (
        <div className={`rounded-2xl border p-4 mb-4 ${myProfile.personal_email ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-300'}`}>
          <p className="font-bold text-slate-900 text-sm">Your personal email</p>
          {myProfile.personal_email && !emailEditing ? (
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-sm text-slate-700 break-all">{myProfile.personal_email}</p>
              <button onClick={() => setEmailEditing(true)} className="text-sm font-bold text-indigo-700 hover:underline flex-shrink-0">Change</button>
            </div>
          ) : (
            <>
              {!myProfile.personal_email && <p className="text-xs text-slate-700 mt-0.5">Please add your own email address (for example Gmail) so we can contact you.</p>}
              <div className="flex gap-2 mt-2">
                <input type="email" inputMode="email" autoComplete="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
                <button onClick={savePersonalEmail} disabled={emailSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">{emailSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Clock in first — before anything else */}
      {!clockedIn && (
        <Link to={clockInUrl || '/staff'} className="block rounded-2xl p-5 mb-4 text-white"
          style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Clock in to start your shift</p>
              <p className="text-white/80 text-xs mt-0.5">Clock in before you can see today's tasks or clock out later.</p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Today's shift */}
      <div className={`rounded-2xl p-5 mb-4 ${myTodayShift ? 'text-white' : 'bg-slate-50 border border-slate-200'}`}
        style={myTodayShift ? { background: 'linear-gradient(135deg, #1e2d4a, #2d4270)' } : {}}>
        <div className="flex items-center gap-3 mb-1">
          <Clock className={`w-5 h-5 ${myTodayShift ? 'text-gold-400' : 'text-slate-400'}`} style={myTodayShift ? { color: '#e8b130' } : {}} />
          <p className={`text-sm font-extrabold uppercase tracking-wide ${myTodayShift ? 'text-white' : 'text-slate-700'}`}>Today's shift</p>
        </div>
        {myTodayShift ? (
          <div>
            <p className="text-xl font-bold">{myTodayShift.start_time?.substring(0,5)} – {myTodayShift.end_time?.substring(0,5)}</p>
            <p className="text-white/70 text-sm capitalize mt-0.5">{(myTodayShift.shift_type || 'Regular').replace('_', ' ')}{myTodayShift.su_name ? ` · ${myTodayShift.su_name}` : ''}</p>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No shift scheduled today</p>
        )}
      </div>

      {/* Upcoming shifts — rest of the week, so a reassignment or a shift
          further out never gets missed just because it isn't today's. */}
      {myUpcomingShifts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-500" /> Upcoming shifts
            </h2>
            <Link to="/rota" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
              View rota <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div>
            {myUpcomingShifts.slice(0, 6).map((s: any) => {
              let dateLabel = String(s.shift_date).substring(0, 10)
              try { dateLabel = format(parseISO(String(s.shift_date).substring(0, 10)), 'EEE d MMM') } catch {}
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                  <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{dateLabel}</p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{(s.shift_type || 'Regular').replace('_', ' ')}{s.su_name ? ` · ${s.su_name}` : ''}</p>
                  </div>
                  <p className="text-xs text-slate-500 flex-shrink-0">{s.start_time?.substring(0, 5)}–{s.end_time?.substring(0, 5)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unread notifications */}
      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" /> {notifications.length} unread notification{notifications.length > 1 ? 's' : ''}
          </p>
          {notifications.map((n: any) => (
            <p key={n.id} className="text-xs text-amber-700 py-1 border-t border-amber-100 first:border-0">{n.title}</p>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Daily records', to: '/daily-records', icon: <ClipboardList className="w-5 h-5" />, color: '#8b5cf6', desc: 'Log care activities' },
          { label: 'Medication Administration Record', to: '/mar', icon: <Pill className="w-5 h-5" />, color: '#3b82f6', desc: medDueToday.total > 0 ? `${medDueToday.pending}/${medDueToday.total} due today` : 'Log medications' },
          { label: 'Request leave', to: '/holidays', icon: <Calendar className="w-5 h-5" />, color: '#10b981', desc: `${pendingLeave.length} pending` },
          { label: 'My training', to: '/training', icon: <BookOpen className="w-5 h-5" />, color: '#f59e0b', desc: 'Complete modules' },
          { label: 'Clock in/out', to: clockInUrl || '/clockin-analytics', icon: <Clock className="w-5 h-5" />, color: '#6366f1', desc: clockedIn ? 'Clock out' : 'Clock in', isClockTile: true },
          { label: 'Messages', to: '/messages', icon: <MessageSquare className="w-5 h-5" />, color: '#ec4899', desc: 'Team messages' },
        ].map(qa => {
          const tileInner = (
            <>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${qa.color}15`, color: qa.color }}>{qa.icon}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{qa.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{clockingOut ? 'Clocking out…' : qa.desc}</p>
              </div>
            </>
          )
          // Clocked-in state performs the clock-out directly rather than linking
          // anywhere — see clockOutNow above for why.
          if (qa.isClockTile && clockedIn) {
            return (
              <button key={qa.to} type="button" onClick={() => clockOutNow()} disabled={clockingOut}
                className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-start gap-3 hover:shadow-card-hover hover:border-slate-200 transition-all text-left disabled:opacity-60">
                {tileInner}
              </button>
            )
          }
          return (
            <Link key={qa.to} to={qa.to}
              className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-start gap-3 hover:shadow-card-hover hover:border-slate-200 transition-all">
              {tileInner}
            </Link>
          )
        })}
      </div>

      {/* Medication due today — a dedicated list, not just a count buried in the
          MAR quick-action tile's subtitle, so setting up a medication is visibly
          reflected on the dashboard the same way a task is. */}
      {myMeds.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">Medication due today</h2>
            <Link to="/mar" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div>
            {myMeds.filter((m: any) => m.status === 'pending').slice(0, 4).map((m: any) => (
              <div key={`${m.medicationId}-${m.scheduledTime}`} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                <Pill className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{m.medicationName}{m.suName ? ` · ${m.suName}` : ''}</p>
                </div>
                {m.scheduledTime && <p className="text-xs text-slate-400 flex-shrink-0">{m.scheduledTime}</p>}
              </div>
            ))}
            {myMeds.filter((m: any) => m.status === 'pending').length === 0 && (
              <p className="text-sm text-slate-400 px-5 py-4">All medications given for today</p>
            )}
          </div>
        </div>
      )}

      {/* My tasks today */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">My tasks today</h2>
          <Link to="/tasks" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-4">No tasks assigned for today</p>
        ) : (
          <div>
            {pendingTasks.slice(0, 4).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 flex-1">{t.title}</p>
                {t.due_time && <p className="text-xs text-slate-400">{t.due_time}</p>}
              </div>
            ))}
            {completedTasks.length > 0 && (
              <div className="px-5 py-2 bg-emerald-50">
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {completedTasks.length} task{completedTasks.length > 1 ? 's' : ''} completed today
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* My residents */}
      {residents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" /> Residents in your home
            </h2>
            <Link to="/service-users" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {residents.slice(0, 6).map((r: any) => {
              const initials = `${(r.first_name || '?')[0]}${(r.last_name || '?')[0]}`
              return (
                <Link key={r.id} to={`/service-users/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all">
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                    {r.photo_url && (
                      <img src={r.photo_url} alt={`${r.first_name} ${r.last_name}`}
                        className="absolute inset-0 w-9 h-9 rounded-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.first_name} {r.last_name}</p>
                    {r.room_number && <p className="text-xs text-slate-400">Room {r.room_number}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
          {residents.length > 6 && (
            <div className="px-5 pb-4 text-center">
              <Link to="/service-users" className="text-xs text-purple-600 font-semibold">
                + {residents.length - 6} more residents
              </Link>
            </div>
          )}
        </div>
      )}

      {/* My leave */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">My leave requests</h2>
          <Link to="/holidays" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
            Request leave <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myLeave.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-4">No leave requests yet</p>
        ) : myLeave.slice(0, 3).map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.status === 'approved' ? 'bg-emerald-500' : l.status === 'declined' ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 capitalize">{(l.leave_type || '').replace('_', ' ')}</p>
              <p className="text-xs text-slate-400">{l.start_date ? format(new Date(l.start_date), 'd MMM') : ''} – {l.end_date ? format(new Date(l.end_date), 'd MMM yyyy') : ''}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'declined' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {l.status}
            </span>
          </div>
        ))}
      </div>

      <TaskPopup open={showTaskPopup} onClose={() => setShowTaskPopup(false)} />
    </div>
  )
}
