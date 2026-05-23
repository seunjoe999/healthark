import StaffDashboard from './StaffDashboard'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import api from '../../api'
import {
  Users, UserSquare, Bell, FileText, Clock, AlertTriangle,
  CheckCircle, ArrowRight, CalendarDays, Pill,
  ClipboardList, Wrench, Droplets, Target, ShieldCheck,
  MessageSquare, ChevronRight, Stethoscope, UserCheck, Calendar,
  Star, History, Activity, Search, Gift, BookOpen
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [data, setData] = useState<any>(null)
  const [todayShifts, setTodayShifts] = useState<any[]>([])
  const [pendingHolidays, setPendingHolidays] = useState<any[]>([])
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null)
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
    Promise.all([
      homesApi.dashboard(selectedHome),
      api.get('/shifts', { params: { homeId: selectedHome, date: format(new Date(), 'yyyy-MM-dd') } }),
      api.get('/staff-hr/leave/all', { params: { homeId: selectedHome, from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') } }).catch(() => ({ data: { data: [] } })),
      api.get('/maintenance/stats', { params: { homeId: selectedHome } }).catch(() => ({ data: { data: null } })),
    ]).then(([dashRes, shiftsRes, leavesRes, maintRes]) => {
      setData(dashRes.data.data)
      setTodayShifts(shiftsRes.data.data || [])
      setPendingHolidays((leavesRes.data.data || []).filter((l: any) => l.status === 'pending'))
      setMaintenanceStats(maintRes.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = data?.stats || {}
  const alerts = data?.alerts || []
  const birthdays = data?.birthdays || []

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, <span style={{ color: '#e8b130' }}>{user?.firstName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Link to="/search"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.25)' }} title="Search">
            <Search className="w-4 h-4 text-amber-400" />
          </Link>
        </div>
      </div>

      {loading ? <Spinner /> : !data ? null : (
        <>
          {/* ── BIG STAT CARDS (RoundSys style) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <BigStatCard
              label="Service Users"
              value={stats.suLive ?? 0}
              sub={stats.suPreAdmission ? `${stats.suPreAdmission} pre-admission` : undefined}
              color="#e8b130"
              to="/service-users"
            />
            <BigStatCard
              label="Staff Active"
              value={stats.staffActive ?? 0}
              sub={`${todayShifts.length} on shift today`}
              color="#3b82f6"
              to="/staff"
            />
            <BigStatCard
              label="Tasks Overdue"
              value={stats.tasksOverdue ?? 0}
              color={stats.tasksOverdue > 0 ? '#ef4444' : '#10b981'}
              to="/tasks"
              urgent={stats.tasksOverdue > 0}
            />
            <BigStatCard
              label="Unread Messages"
              value={stats.unreadMessages ?? 0}
              color="#06b6d4"
              to="/messages"
            />
            <BigStatCard
              label="Unresolved Alerts"
              value={stats.alertsUnresolved ?? 0}
              color={stats.alertsUnresolved > 0 ? '#ef4444' : '#10b981'}
              to="/alerts"
              urgent={stats.alertsUnresolved > 0}
            />
            <BigStatCard
              label="Support Plans Due"
              value={stats.carePlansOverdue ?? 0}
              color={stats.carePlansOverdue > 0 ? '#f59e0b' : '#10b981'}
              to="/care-plans"
              urgent={stats.carePlansOverdue > 0}
            />
            <BigStatCard
              label="Open Maintenance"
              value={maintenanceStats?.open_count ?? 0}
              sub={maintenanceStats?.urgent_count > 0 ? `${maintenanceStats.urgent_count} urgent` : undefined}
              color={maintenanceStats?.urgent_count > 0 ? '#ef4444' : '#8b5cf6'}
              to="/maintenance"
              urgent={maintenanceStats?.urgent_count > 0}
            />
            <BigStatCard
              label={`Birthdays (7 days)`}
              value={birthdays.length}
              color="#f472b6"
              to="/service-users"
            />
          </div>

          {/* ── Action banners ── */}
          {(pendingHolidays.length > 0 || stats.alertsUnresolved > 0 || maintenanceStats?.urgent_count > 0) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {pendingHolidays.length > 0 && (
                <Link to="/holidays"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                  <CalendarDays className="w-4 h-4" />
                  {pendingHolidays.length} holiday request{pendingHolidays.length > 1 ? 's' : ''} awaiting approval
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {stats.alertsUnresolved > 0 && (
                <Link to="/alerts"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <AlertTriangle className="w-4 h-4" />
                  {stats.alertsUnresolved} unresolved alert{stats.alertsUnresolved > 1 ? 's' : ''}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {maintenanceStats?.urgent_count > 0 && (
                <Link to="/maintenance"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <Wrench className="w-4 h-4" />
                  {maintenanceStats.urgent_count} urgent maintenance
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {/* ── Bottom grid: Alerts + Shifts | Quick Actions ── */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">

              {/* Active Alerts */}
              <DashSection title="Active Alerts" to="/alerts" toLabel="View all">
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">All clear</p>
                      <p className="text-xs text-slate-400">No active alerts</p>
                    </div>
                  </div>
                ) : alerts.slice(0, 6).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
                    style={{ borderColor: 'rgba(232,177,48,0.08)' }}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </DashSection>

              {/* Today's Shifts */}
              <DashSection title="On Shift Today" to="/rota" toLabel="Full rota">
                {todayShifts.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-4">No shifts scheduled today</p>
                ) : todayShifts.slice(0, 8).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                    style={{ borderColor: 'rgba(232,177,48,0.08)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                      {(s.staff_name || '?').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.staff_name}</p>
                      <p className="text-xs text-slate-400">{s.start_time?.substring(0, 5)} – {s.end_time?.substring(0, 5)}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize text-amber-300"
                      style={{ background: 'rgba(232,177,48,0.12)', border: '1px solid rgba(232,177,48,0.2)' }}>
                      {(s.shift_type || 'regular').replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </DashSection>

              {/* Birthdays */}
              {birthdays.length > 0 && (
                <DashSection title="🎂 Birthdays This Week" to="" toLabel="">
                  <div className="flex flex-wrap gap-3 p-4">
                    {birthdays.map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                        style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.25)' }}>
                        <Gift className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-white font-medium">{b.first_name} {b.last_name}</span>
                        <span className="text-slate-400 text-xs capitalize">{(b.type || '').replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </DashSection>
              )}
            </div>

            {/* RIGHT: Quick Actions + Modules */}
            <div className="space-y-5">
              <DashSection title="Quick Actions" to="" toLabel="">
                <div className="p-3 space-y-1">
                  {[
                    { label: 'Add Daily Record',       to: '/daily-records',       icon: <ClipboardList className="w-4 h-4" />, color: '#8b5cf6' },
                    { label: 'Log Medication (MAR)',    to: '/mar',                 icon: <Pill className="w-4 h-4" />,          color: '#3b82f6' },
                    { label: 'Log Bath / Shower',      to: '/bath-chart',          icon: <Droplets className="w-4 h-4" />,      color: '#06b6d4' },
                    { label: 'New Diary Entry',        to: '/diary',               icon: <BookOpen className="w-4 h-4" />,      color: '#a78bfa' },
                    { label: 'Log Professional Visit', to: '/professional-visits', icon: <Stethoscope className="w-4 h-4" />,   color: '#34d399' },
                    { label: 'Report Maintenance',     to: '/maintenance',         icon: <Wrench className="w-4 h-4" />,        color: '#f59e0b' },
                    { label: 'Record Incident',        to: '/incidents',           icon: <AlertTriangle className="w-4 h-4" />, color: '#ef4444' },
                    { label: 'Run Audit',              to: '/audits',              icon: <Activity className="w-4 h-4" />,      color: '#e8b130' },
                  ].map(qa => (
                    <Link key={qa.to} to={qa.to}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all group"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,177,48,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${qa.color}15`, color: qa.color }}>
                        {qa.icon}
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white flex-1 transition-colors">{qa.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              </DashSection>

              <DashSection title="Module Overview" to="" toLabel="">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Compliance', to: '/compliance',   icon: <ShieldCheck className="w-4 h-4" />, color: '#10b981' },
                    { label: 'DBS',        to: '/dbs',          icon: <UserCheck className="w-4 h-4" />,   color: '#3b82f6' },
                    { label: 'Timesheets', to: '/timesheets',   icon: <Clock className="w-4 h-4" />,       color: '#8b5cf6' },
                    { label: 'Training',   to: '/training',     icon: <Star className="w-4 h-4" />,        color: '#f59e0b' },
                    { label: 'Calendar',   to: '/calendar',     icon: <Calendar className="w-4 h-4" />,    color: '#06b6d4' },
                    { label: 'Audit Trail',to: '/audit-trail',  icon: <History className="w-4 h-4" />,     color: '#6b7280' },
                  ].map(m => (
                    <Link key={m.to} to={m.to}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,177,48,0.1)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,177,48,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(232,177,48,0.1)')}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${m.color}15`, color: m.color }}>
                        {m.icon}
                      </div>
                      <span className="text-xs text-slate-400">{m.label}</span>
                    </Link>
                  ))}
                </div>
              </DashSection>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Big stat card (RoundSys-style) ──────────────────────────────────────────
function BigStatCard({ label, value, sub, color, to, urgent }: {
  label: string; value: number | string; sub?: string; color: string; to: string; urgent?: boolean
}) {
  return (
    <Link to={to}
      className="block rounded-2xl p-6 transition-all duration-200 group relative overflow-hidden"
      style={{
        background: '#111111',
        border: `1px solid ${urgent ? color + '50' : 'rgba(255,255,255,0.06)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.background = '#161616' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = urgent ? color + '50' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#111111' }}>
      {/* Subtle glow blob */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-8 translate-x-8 pointer-events-none"
        style={{ background: color, filter: 'blur(24px)' }} />
      <p className="text-xs font-semibold uppercase tracking-widest mb-3 leading-tight"
        style={{ color: color + 'cc' }}>
        {label}
      </p>
      <p className="text-5xl font-black leading-none" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-2 font-medium" style={{ color: color + '99' }}>{sub}</p>
      )}
      {urgent && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      )}
    </Link>
  )
}

function DashSection({ title, to, toLabel, children }: {
  title: string; to: string; toLabel: string; children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(232,177,48,0.1)' }}>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {to && toLabel && (
          <Link to={to} className="text-xs font-semibold flex items-center gap-1 transition-colors"
            style={{ color: '#e8b130' }}>
            {toLabel} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}
