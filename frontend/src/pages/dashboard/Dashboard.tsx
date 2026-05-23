import StaffDashboard from './StaffDashboard'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import api from '../../api'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'

export default function Dashboard() {
  const { user, isRole } = useAuth()
  const [homes, setHomes]               = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [data, setData]                 = useState<any>(null)
  const [extraStats, setExtraStats]     = useState({
    unassignedShifts: 0,
    lateClockIns: 0,
    reviewsDueSoon: 0,
    rotaHoursWeek: 0,
  })
  const [loading, setLoading] = useState(true)

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

    const today     = format(new Date(), 'yyyy-MM-dd')
    const in7days   = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    Promise.all([
      homesApi.dashboard(selectedHome),
      // shifts next 7 days (for unassigned count + rota hours)
      api.get('/shifts', { params: { homeId: selectedHome, from: today, to: in7days } })
         .catch(() => ({ data: { data: [] } })),
      // shifts this week for rota hours
      api.get('/shifts', { params: { homeId: selectedHome, from: weekStart, to: weekEnd } })
         .catch(() => ({ data: { data: [] } })),
      // reviews due soon
      api.get('/reviews', { params: { homeId: selectedHome, dueSoon: '7' } })
         .catch(() => ({ data: { data: [] } })),
      // clockin sessions today (to count late arrivals)
      api.get('/clockin/sessions', { params: { homeId: selectedHome, date: today } })
         .catch(() => ({ data: { data: [] } })),
    ]).then(([dashRes, shifts7Res, shiftsWeekRes, reviewsRes, clockinRes]) => {
      setData(dashRes.data.data)

      const shifts7: any[]     = shifts7Res.data.data     || []
      const shiftsWeek: any[]  = shiftsWeekRes.data.data  || []
      const reviews: any[]     = reviewsRes.data.data     || []
      const sessions: any[]    = clockinRes.data.data     || []

      // unassigned = shifts with no staff_id assigned
      const unassigned = shifts7.filter((s: any) => !s.staff_id || !s.staff_name).length

      // rota hours = sum of (end - start) for each shift this week
      const rotaHours = shiftsWeek.reduce((acc: number, s: any) => {
        if (!s.start_time || !s.end_time) return acc
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        const hrs = (eh * 60 + em - (sh * 60 + sm)) / 60
        return acc + (hrs > 0 ? hrs : 0)
      }, 0)

      // late clock-ins: sessions where actual start > scheduled start
      const late = sessions.filter((s: any) => s.is_late || s.late_minutes > 0).length

      // reviews due in 7 days
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
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const stats     = data?.stats     || {}
  const birthdays = data?.birthdays || []

  const tasksOverdue = stats.tasksOverdue ?? 0
  const totalTasks   = stats.totalTasks   ?? 0
  const taskPct      = totalTasks > 0
    ? Math.round((tasksOverdue / totalTasks) * 100) + '%'
    : tasksOverdue

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="text-2xl font-bold text-white">
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
        /* 4 × 2 stat card grid */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          <StatCard
            label="Unassigned shifts in the next 7 days"
            value={extraStats.unassignedShifts}
            color="#b08af5"
            to="/rota"
          />

          <StatCard
            label="No of late clock ins today"
            value={extraStats.lateClockIns}
            color="#4ade80"
            to="/clockin-analytics"
          />

          <StatCard
            label="Tasks overdue today"
            value={taskPct}
            color="#2dd4bf"
            to="/tasks"
          />

          <StatCard
            label="Birthdays in the next 7 days"
            value={birthdays.length}
            color="#f87171"
            to="/service-users"
          />

          <StatCard
            label="Reviews in the next 7 days"
            value={extraStats.reviewsDueSoon}
            color="#fbbf24"
            to="/reviews"
          />

          <StatCard
            label={`Rota'd Hours This Week`}
            value={extraStats.rotaHoursWeek}
            color="#c084fc"
            to="/rota"
            sub="(Unbilled cancellations are excluded)"
          />

          <StatCard
            label="Staff"
            value={stats.staffActive ?? 0}
            color="#22d3ee"
            to="/staff"
            highlight
          />

          <StatCard
            label="Service Users"
            value={stats.suLive ?? 0}
            color="#4ade80"
            to="/service-users"
          />

        </div>
      )}
    </div>
  )
}

/* ── Stat card — matches RoundSys style ────────────────────────────────────── */
function StatCard({
  label, value, color, to, sub, highlight,
}: {
  label: string
  value: number | string
  color: string
  to: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center rounded-2xl p-8 text-center transition-all duration-200 min-h-[200px]"
      style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#161616'
        e.currentTarget.style.borderColor = color + '40'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#111111'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
      }}
    >
      {/* Label */}
      <p
        className="text-sm font-semibold leading-snug mb-6"
        style={{ color }}
      >
        {label}
        {sub && (
          <span className="block text-xs font-normal mt-1" style={{ color: color + 'aa' }}>
            {sub}
          </span>
        )}
      </p>

      {/* Value */}
      {highlight ? (
        <div
          className="flex items-center justify-center rounded-xl px-6 py-3"
          style={{ background: color + '22', border: `2px solid ${color}` }}
        >
          <span className="text-6xl font-black leading-none" style={{ color }}>
            {value}
          </span>
        </div>
      ) : (
        <span className="text-7xl font-black leading-none" style={{ color }}>
          {value}
        </span>
      )}
    </Link>
  )
}
