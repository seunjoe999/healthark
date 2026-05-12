import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi, suApi, staffApi } from '../../api'
import api from '../../api'
import {
  Users, UserSquare, Bell, FileText, Clock, AlertTriangle,
  CheckCircle, Activity, ArrowRight, CalendarDays, Pill,
  ClipboardList, TrendingUp, Shield
} from 'lucide-react'
import { Spinner, AlertSeverityBadge } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format, isToday } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [data, setData] = useState<any>(null)
  const [todayShifts, setTodayShifts] = useState<any[]>([])
  const [pendingHolidays, setPendingHolidays] = useState<any[]>([])
  const [overdueCarePlans, setOverdueCarePlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      api.get('/staff-hr/leave/all', { params: { homeId: selectedHome, from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') } }),
      api.get('/care-plans', { params: { homeId: selectedHome, overdue: true } }).catch(() => ({ data: { data: [] } })),
    ]).then(([dashRes, shiftsRes, leavesRes, cpRes]) => {
      setData(dashRes.data.data)
      setTodayShifts(shiftsRes.data.data || [])
      setPendingHolidays((leavesRes.data.data || []).filter((l: any) => l.status === 'pending'))
      setOverdueCarePlans((cpRes.data.data || []).slice(0, 5))
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const SHIFT_COLORS: Record<string, string> = {
    early: 'bg-blue-100 text-blue-800',
    late: 'bg-purple-100 text-purple-800',
    night: 'bg-slate-700 text-white',
    regular: 'bg-emerald-100 text-emerald-800',
    waking_night: 'bg-indigo-100 text-indigo-800',
    sleep_in: 'bg-teal-100 text-teal-800',
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          <h1 className="font-display text-3xl text-slate-900">{greeting}, {user?.firstName}</h1>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {loading ? <Spinner /> : !data ? null : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Residents" value={data.stats?.suLive ?? 0} icon={<Users className="w-5 h-5" />} accent="#10b981" to="/service-users" />
            <StatCard label="Staff active" value={data.stats?.staffActive ?? 0} icon={<UserSquare className="w-5 h-5" />} accent="#3b82f6" to="/staff" />
            <StatCard label="Alerts" value={data.stats?.alertsUnresolved ?? 0} icon={<Bell className="w-5 h-5" />} accent={data.stats?.alertsUnresolved > 0 ? '#ef4444' : '#10b981'} to="/alerts" highlight={data.stats?.alertsUnresolved > 0} />
            <StatCard label="Plans overdue" value={data.stats?.carePlansOverdue ?? 0} icon={<FileText className="w-5 h-5" />} accent={data.stats?.carePlansOverdue > 0 ? '#f59e0b' : '#10b981'} to="/care-plans" highlight={data.stats?.carePlansOverdue > 0} />
            <StatCard label="On shift today" value={todayShifts.length} icon={<Clock className="w-5 h-5" />} accent="#8b5cf6" to="/rota" />
          </div>

          {/* Pending actions banner */}
          {(pendingHolidays.length > 0 || (data.stats?.alertsUnresolved ?? 0) > 0) && (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {pendingHolidays.length > 0 && (
                <Link to="/holidays" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors">
                  <CalendarDays className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{pendingHolidays.length} holiday request{pendingHolidays.length > 1 ? 's' : ''} need approval</p>
                    <p className="text-xs text-amber-600">Click to review and approve</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500 ml-auto" />
                </Link>
              )}
              {(data.stats?.alertsUnresolved ?? 0) > 0 && (
                <Link to="/alerts" className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl hover:bg-rose-100 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-rose-800">{data.stats.alertsUnresolved} unresolved alert{data.stats.alertsUnresolved > 1 ? 's' : ''}</p>
                    <p className="text-xs text-rose-600">Click to view and resolve</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-500 ml-auto" />
                </Link>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left col — alerts + shifts */}
            <div className="lg:col-span-2 space-y-6">

              {/* Today's shifts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800">On shift today</h2>
                  <Link to="/rota" className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 uppercase tracking-wider">
                    Full rota <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="card overflow-hidden">
                  {todayShifts.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-slate-400">No shifts scheduled today</div>
                  ) : todayShifts.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {(s.staff_name || '?').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.staff_name}</p>
                        <p className="text-xs text-slate-400">{s.start_time?.substring(0,5)}–{s.end_time?.substring(0,5)}{s.su_name ? ` · ${s.su_name}` : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.regular}`}>
                        {(s.shift_type || 'regular').replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business alerts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800">Business Alerts</h2>
                  <Link to="/alerts" className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 uppercase tracking-wider">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="card overflow-hidden">
                  {(data.alerts || []).length === 0 ? (
                    <div className="flex items-center gap-3 p-5 text-emerald-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                      <div><p className="text-sm font-semibold">All clear</p><p className="text-xs text-slate-400">No active alerts</p></div>
                    </div>
                  ) : (data.alerts || []).slice(0, 5).map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{alert.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{alert.description}</p>
                      </div>
                      <AlertSeverityBadge severity={alert.severity} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-6">
              {/* Quick actions */}
              <div>
                <h2 className="font-semibold text-slate-800 mb-3">Quick actions</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Add daily record', to: '/daily-records', icon: <ClipboardList className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Log medication (MAR)', to: '/mar', icon: <Pill className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'View care plans', to: '/care-plans', icon: <FileText className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
                    { label: 'Run AI audit', to: '/audits', icon: <Activity className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Safeguarding', to: '/safeguarding', icon: <Shield className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
                  ].map(qa => (
                    <Link key={qa.to} to={qa.to} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover hover:border-slate-200 transition-all group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${qa.color}`}>{qa.icon}</div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{qa.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Birthdays */}
              <div>
                <h2 className="font-semibold text-slate-800 mb-3">Birthdays this week</h2>
                <div className="card overflow-hidden">
                  {(data.birthdays || []).length === 0 ? (
                    <p className="text-sm text-slate-400 px-5 py-4">No birthdays this week</p>
                  ) : (data.birthdays || []).slice(0, 4).map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                      <span className="text-lg">🎂</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{b.first_name} {b.last_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{(b.type || '').replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, accent, to, highlight }: {
  label: string; value: number; icon: React.ReactNode; accent: string; to: string; highlight?: boolean
}) {
  return (
    <Link to={to} className={`card p-5 group block transition-all duration-200 hover:shadow-card-hover hover:border-slate-200 cursor-pointer ${highlight ? 'ring-1 ring-rose-200' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-slate-900 font-display">{value}</p>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
    </Link>
  )
}
