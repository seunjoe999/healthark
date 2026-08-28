import StaffDashboard from './StaffDashboard'
import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import api from '../../api'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format, addDays, startOfWeek, endOfWeek, subDays } from 'date-fns'
import TaskPopup from '../../components/TaskPopup'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, Pill, AlertTriangle, Calendar,
  Clock, CheckSquare, Cake, Bell, ClipboardList,
  FileText, Zap, ChevronRight, TrendingUp, CalendarClock,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface ExtraStats {
  unassignedShifts: number
  lateClockIns: number
  reviewsDueSoon: number
  rotaHoursWeek: number
}

interface NewStats {
  marDue: number
  marGiven: number
  openIncidents: number
  unreadAlerts: number
  complianceScore: number | null
  alertsList: any[]
  dailyRecordsByDay: Record<string, number>
}

/* ── Card animation variants ─────────────────────────────────────────────────*/
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const },
  }),
}

/* ── Compliance ring ─────────────────────────────────────────────────────────*/
function ComplianceRing({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
          {score}%
        </text>
      </svg>
      <p className="text-xs text-slate-400 font-medium tracking-wide">Compliance</p>
    </div>
  )
}

/* ── Sparkline ───────────────────────────────────────────────────────────────*/
function Sparkline({ data }: { data: Record<string, number> }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { label: format(d, 'EEE'), key: format(d, 'yyyy-MM-dd') }
  })
  const values = days.map(d => data[d.key] || 0)
  const max = Math.max(...values, 1)

  return (
    <div>
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
        Daily Records — Last 7 Days
      </p>
      <div className="flex items-end gap-2 h-16">
        {days.map((d, i) => {
          const pct = (values[i] / max) * 100
          return (
            <div key={d.key} className="flex flex-col items-center flex-1 gap-1">
              <span className="text-xs text-slate-400 font-medium">{values[i] > 0 ? values[i] : ''}</span>
              <div
                className="w-full rounded-sm transition-all duration-700"
                style={{
                  height: `${Math.max(pct, 6)}%`,
                  background: pct > 60 ? '#4ade80' : pct > 30 ? '#e8b130' : 'rgba(255,255,255,0.15)',
                  minHeight: '4px',
                }}
              />
              <span className="text-xs text-slate-600">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────────────────────*/
export default function Dashboard() {
  const { user, isRole } = useAuth()
  const [homes, setHomes]               = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [data, setData]                 = useState<any>(null)
  const [extraStats, setExtraStats]     = useState<ExtraStats>({
    unassignedShifts: 0,
    lateClockIns: 0,
    reviewsDueSoon: 0,
    rotaHoursWeek: 0,
  })
  const [newStats, setNewStats] = useState<NewStats>({
    marDue: 0,
    marGiven: 0,
    openIncidents: 0,
    unreadAlerts: 0,
    complianceScore: null,
    alertsList: [],
    dailyRecordsByDay: {},
  })
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([])
  const [todaysTasks, setTodaysTasks] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showBirthdays, setShowBirthdays] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const [showTaskPopup, setShowTaskPopup] = useState(() => {
    return localStorage.getItem('taskPopupDismissed') !== today
  })
  const bdRef = useRef<HTMLDivElement>(null)

  if (!isRole('home_manager', 'group_admin', 'senior_carer', 'auditor')) return <StaffDashboard />

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)

    const todayStr   = format(new Date(), 'yyyy-MM-dd')
    const in7days    = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    const weekStart  = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd    = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const sevenAgo   = format(subDays(new Date(), 6), 'yyyy-MM-dd')

    Promise.allSettled([
      /* 0 */ homesApi.dashboard(selectedHome),
      /* 1 */ api.get('/shifts', { params: { homeId: selectedHome, from: todayStr, to: in7days } }),
      /* 2 */ api.get('/shifts', { params: { homeId: selectedHome, from: weekStart, to: weekEnd } }),
      /* 3 */ api.get('/reviews', { params: { homeId: selectedHome, dueSoon: '7' } }),
      /* 4 */ api.get('/clockin/sessions', { params: { homeId: selectedHome, date: todayStr } }),
      /* 5 */ api.get('/mar/records/today', { params: { homeId: selectedHome } }),
      /* 6 */ api.get('/incidents', { params: { homeId: selectedHome, status: 'open' } }),
      /* 7 */ api.get('/alerts', { params: { homeId: selectedHome, unread: 'true' } }),
      /* 8 */ api.get('/compliance', { params: { homeId: selectedHome } }),
      /* 9 */ api.get('/daily-records', { params: { homeId: selectedHome, from: sevenAgo, to: todayStr } }),
      /* 10 */ api.get('/calendar', { params: { homeId: selectedHome, from: todayStr, to: todayStr } }),
      /* 11 */ api.get('/tasks', { params: { homeId: selectedHome, date: todayStr } }),
    ]).then(results => {
      /* ── Existing stats ── */
      const dashRes     = results[0].status === 'fulfilled' ? results[0].value : null
      const shifts7Res  = results[1].status === 'fulfilled' ? results[1].value : null
      const shiftsWkRes = results[2].status === 'fulfilled' ? results[2].value : null
      const reviewsRes  = results[3].status === 'fulfilled' ? results[3].value : null
      const clockinRes  = results[4].status === 'fulfilled' ? results[4].value : null

      if (dashRes) setData(dashRes.data.data)

      const shifts7: any[]    = shifts7Res?.data?.data    || []
      const shiftsWeek: any[] = shiftsWkRes?.data?.data   || []
      const reviews: any[]    = reviewsRes?.data?.data    || []
      const sessions: any[]   = clockinRes?.data?.data    || []

      const unassigned = shifts7.filter((s: any) => !s.staff_id || !s.staff_name).length
      const rotaHours  = shiftsWeek.reduce((acc: number, s: any) => {
        if (!s.start_time || !s.end_time) return acc
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        const hrs = (eh * 60 + em - (sh * 60 + sm)) / 60
        return acc + (hrs > 0 ? hrs : 0)
      }, 0)
      const late = sessions.filter((s: any) => s.is_late || s.late_minutes > 0).length
      const reviewsDue = reviews.filter((r: any) => {
        if (!r.next_review_date) return false
        const d = new Date(r.next_review_date)
        return d >= new Date() && d <= addDays(new Date(), 7)
      }).length

      setExtraStats({
        unassignedShifts: unassigned,
        lateClockIns: late,
        reviewsDueSoon: reviewsDue || reviews.length,
        rotaHoursWeek: Math.round(rotaHours * 10) / 10,
      })

      /* ── New stats ── */
      const marRes       = results[5].status === 'fulfilled' ? results[5].value : null
      const incidentsRes = results[6].status === 'fulfilled' ? results[6].value : null
      const alertsRes    = results[7].status === 'fulfilled' ? results[7].value : null
      const compRes      = results[8].status === 'fulfilled' ? results[8].value : null
      const drRes        = results[9].status === 'fulfilled' ? results[9].value : null

      // MAR — expect { due: number, given: number } or array of records
      let marDue = 0, marGiven = 0
      if (marRes?.data?.data) {
        const md = marRes.data.data
        if (typeof md === 'object' && !Array.isArray(md)) {
          marDue   = md.due   ?? md.total    ?? 0
          marGiven = md.given ?? md.administered ?? 0
        } else if (Array.isArray(md)) {
          marDue   = md.length
          marGiven = md.filter((r: any) => r.status === 'given' || r.administered).length
        }
      }

      const incidents: any[] = incidentsRes?.data?.data || []
      const openIncidents    = Array.isArray(incidents) ? incidents.length : (incidentsRes?.data?.data?.total ?? 0)

      const alertsData: any[] = alertsRes?.data?.data || []
      const unreadAlerts = Array.isArray(alertsData) ? alertsData.length : 0
      const alertsList   = Array.isArray(alertsData) ? alertsData.slice(0, 5) : []

      let complianceScore: number | null = null
      if (compRes?.data?.data) {
        const cd = compRes.data.data
        const raw: unknown = cd.score ?? cd.complianceScore ?? cd.percentage ?? null
        if (typeof raw === 'number') {
          complianceScore = isNaN(raw) ? null : raw
        } else if (typeof raw === 'string') {
          const parsed = parseFloat(raw)
          complianceScore = isNaN(parsed) ? null : parsed
        }
      }

      // Daily records grouped by date
      const drList: any[] = drRes?.data?.data || []
      const byDay: Record<string, number> = {}
      drList.forEach((r: any) => {
        const d = r.date || r.created_at?.slice(0, 10) || r.record_date?.slice(0, 10)
        if (d) byDay[d] = (byDay[d] || 0) + 1
      })

      setNewStats({
        marDue,
        marGiven,
        openIncidents,
        unreadAlerts,
        complianceScore,
        alertsList,
        dailyRecordsByDay: byDay,
      })

      /* ── Today's appointments & tasks (so they're visible on login, not just under Tasks) ── */
      const calendarRes = results[10].status === 'fulfilled' ? results[10].value : null
      const tasksRes     = results[11].status === 'fulfilled' ? results[11].value : null
      const calendarEvents: any[] = calendarRes?.data?.data || []
      setTodaysAppointments(calendarEvents.filter((e: any) => e.event_type === 'appointment'))
      const allTasks: any[] = tasksRes?.data?.data || []
      setTodaysTasks(allTasks.filter((t: any) => t.status === 'pending'))
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const stats     = data?.stats     || {}
  const birthdays = data?.birthdays || []

  const tasksOverdue = stats.tasksOverdue ?? 0
  const marPct = newStats.marDue > 0
    ? Math.round((newStats.marGiven / newStats.marDue) * 100)
    : null

  /* ── KPI card definitions ── */
  type KpiCard = {
    icon: React.ElementType
    label: string
    value: number | string
    color: string
    to: string | null
    urgent: boolean
    isBirthday?: boolean
  }
  const kpiCards: KpiCard[] = [
    {
      icon: Users, label: 'Active Residents', value: stats.suLive ?? 0,
      color: '#4ade80', to: '/service-users', urgent: false,
    },
    {
      icon: UserCheck, label: 'Staff on Duty',
      value: stats.staffActive ?? stats.staffOnDuty ?? 0,
      color: '#22d3ee', to: '/staff', urgent: false,
    },
    {
      icon: Pill,
      label: 'MAR Adherence',
      value: marPct !== null ? `${marPct}%` : '—',
      color: marPct !== null && marPct < 80 ? '#f87171' : '#a3e635',
      to: '/mar', urgent: marPct !== null && marPct < 80,
    },
    {
      icon: AlertTriangle, label: 'Open Incidents',
      value: newStats.openIncidents,
      color: newStats.openIncidents > 0 ? '#f87171' : '#4ade80',
      to: '/incidents', urgent: newStats.openIncidents > 0,
    },
    {
      icon: Calendar, label: 'Unassigned Shifts',
      value: extraStats.unassignedShifts,
      color: '#b08af5', to: '/rota',
      urgent: extraStats.unassignedShifts > 0,
    },
    {
      icon: Clock, label: 'Late Clock-ins Today',
      value: extraStats.lateClockIns,
      color: extraStats.lateClockIns > 0 ? '#fbbf24' : '#4ade80',
      to: '/clockin-analytics', urgent: extraStats.lateClockIns > 0,
    },
    {
      icon: CheckSquare, label: 'Overdue Tasks',
      value: tasksOverdue,
      color: tasksOverdue > 0 ? '#fb923c' : '#4ade80',
      to: '/tasks', urgent: tasksOverdue > 0,
    },
    {
      icon: Cake, label: 'Birthdays This Week',
      value: birthdays.length,
      color: '#f87171', to: null, urgent: false,
      isBirthday: true,
    },
  ]

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 lg:mb-10">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="text-xl lg:text-2xl font-bold text-white">
            Welcome back, <span style={{ color: '#e8b130' }}>{user?.firstName}</span>
          </h1>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome}
            onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner /></div>
      ) : (
        <>
          {/* ── 8 KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                {card.isBirthday ? (
                  /* Birthday card — toggle popup */
                  <div ref={bdRef} className="relative h-full">
                    <button
                      onClick={() => setShowBirthdays(s => !s)}
                      className="w-full h-full flex flex-col items-center justify-center rounded-2xl p-4 lg:p-6 text-center transition-all duration-200 min-h-[140px] lg:min-h-[180px]"
                      style={{
                        background: '#111111',
                        border: `1px solid ${showBirthdays ? card.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = card.color + '40'; e.currentTarget.style.background = '#161616' }}
                      onMouseLeave={e => { if (!showBirthdays) { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' } }}
                    >
                      <card.icon size={22} style={{ color: card.color }} className="mb-3 opacity-80" />
                      <p className="text-xs font-semibold leading-snug mb-3" style={{ color: card.color }}>
                        {card.label}
                      </p>
                      <span className="text-4xl lg:text-6xl font-black leading-none" style={{ color: card.color }}>
                        {card.value}
                      </span>
                    </button>

                    {showBirthdays && (
                      <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl z-50 shadow-2xl overflow-hidden"
                        style={{ background: '#1a1a1a', border: '1px solid rgba(248,113,113,0.3)' }}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>
                            Upcoming Birthdays
                          </p>
                        </div>
                        {birthdays.length === 0 ? (
                          <p className="text-slate-400 text-sm px-4 py-4">No birthdays in the next 7 days</p>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {birthdays.map((b: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-white font-semibold text-sm">{b.first_name} {b.last_name}</p>
                                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                                    {(b.type || '').replace('_', ' ')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
                                    {b.date_of_birth ? format(new Date(new Date().getFullYear() + '-' + b.date_of_birth.slice(5)), 'd MMM') : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => setShowBirthdays(false)}
                          className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors">
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={card.to as string}
                    className="flex flex-col items-center justify-center rounded-2xl p-4 lg:p-6 text-center transition-all duration-200 min-h-[140px] lg:min-h-[180px] h-full"
                    style={{ background: '#111111', border: `1px solid ${card.urgent ? card.color + '30' : 'rgba(255,255,255,0.06)'}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = card.color + '40' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = card.urgent ? card.color + '30' : 'rgba(255,255,255,0.06)' }}
                  >
                    <card.icon size={22} style={{ color: card.color }} className="mb-3 opacity-80" />
                    <p className="text-xs font-semibold leading-snug mb-3" style={{ color: card.color }}>
                      {card.label}
                    </p>
                    <span className="text-4xl lg:text-6xl font-black leading-none" style={{ color: card.color }}>
                      {card.value}
                    </span>
                    {card.urgent && (
                      <span className="mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: card.color + '20', color: card.color }}>
                        Needs attention
                      </span>
                    )}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          {/* ── Today's Appointments & Tasks ────────────────────────────── */}
          {(todaysAppointments.length > 0 || todaysTasks.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="rounded-2xl p-5 mb-6"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} style={{ color: '#e8b130' }} />
                  <p className="text-sm font-bold text-white">Due Today</p>
                </div>
                <Link to="/tasks" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {todaysAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                    <CalendarClock size={14} className="flex-shrink-0" style={{ color: '#60a5fa' }} />
                    <p className="text-sm text-white flex-1 truncate">{a.title}{a.su_name ? ` — ${a.su_name}` : ''}</p>
                    {a.start_time && <span className="text-xs" style={{ color: '#60a5fa' }}>{a.start_time.slice(0, 5)}</span>}
                  </div>
                ))}
                {todaysTasks.slice(0, 6).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#fbbf24' }} />
                    <p className="text-sm text-white flex-1 truncate">{t.title}</p>
                    {t.due_time && <span className="text-xs text-slate-500">{t.due_time}</span>}
                  </div>
                ))}
                {todaysTasks.length > 6 && (
                  <p className="text-xs text-slate-500 text-center pt-1">+ {todaysTasks.length - 6} more pending tasks today</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Today at a Glance ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mb-6"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <TrendingUp size={14} /> Today at a Glance
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* LEFT — Recent Alerts */}
              <div className="rounded-2xl p-5" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell size={16} style={{ color: '#fbbf24' }} />
                    <p className="text-sm font-bold text-white">Recent Alerts</p>
                    {newStats.unreadAlerts > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#fbbf2420', color: '#fbbf24' }}>
                        {newStats.unreadAlerts} unread
                      </span>
                    )}
                  </div>
                  <Link to="/alerts" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </Link>
                </div>

                {newStats.alertsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Bell size={28} className="text-slate-700" />
                    <p className="text-slate-500 text-sm">No unread alerts</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newStats.alertsList.map((alert: any, i: number) => (
                      <div key={alert.id || i}
                        className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-2"
                          style={{ background: '#fbbf24' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-snug truncate">
                            {alert.message || alert.title || alert.description || 'Alert'}
                          </p>
                          {(alert.created_at || alert.timestamp) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {format(new Date(alert.created_at || alert.timestamp), 'HH:mm, d MMM')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT — Sparkline + Quick Actions */}
              <div className="flex flex-col gap-4">

                {/* Sparkline + optional compliance ring */}
                <div className="rounded-2xl p-5 flex gap-4 items-end" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1">
                    <Sparkline data={newStats.dailyRecordsByDay} />
                  </div>
                  {newStats.complianceScore !== null && (
                    <ComplianceRing score={Math.round(newStats.complianceScore)} />
                  )}
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl p-5" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={16} style={{ color: '#e8b130' }} />
                    <p className="text-sm font-bold text-white">Quick Actions</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: ClipboardList, label: 'Add Daily Record',       to: '/daily-records',  color: '#4ade80' },
                      { icon: Pill,          label: 'Administer Medication',   to: '/mar',            color: '#a3e635' },
                      { icon: AlertTriangle, label: 'Log Incident',            to: '/incidents',      color: '#f87171' },
                      { icon: FileText,      label: 'View Rota',               to: '/rota',           color: '#b08af5' },
                    ].map(action => (
                      <Link
                        key={action.to}
                        to={action.to}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center transition-all duration-200 min-h-[80px]"
                        style={{ background: action.color + '10', border: `1px solid ${action.color}25` }}
                        onMouseEnter={e => { e.currentTarget.style.background = action.color + '1e'; e.currentTarget.style.borderColor = action.color + '50' }}
                        onMouseLeave={e => { e.currentTarget.style.background = action.color + '10'; e.currentTarget.style.borderColor = action.color + '25' }}
                      >
                        <action.icon size={20} style={{ color: action.color }} />
                        <span className="text-xs font-semibold leading-tight" style={{ color: action.color }}>
                          {action.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <TaskPopup open={showTaskPopup} onClose={() => {
        localStorage.setItem('taskPopupDismissed', today)
        setShowTaskPopup(false)
      }} />
    </div>
  )
}
