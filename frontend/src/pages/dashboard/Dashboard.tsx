import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import { Users, UserSquare, Bell, FileText, Clock, AlertTriangle, CheckCircle, Activity, TrendingUp, ArrowRight } from 'lucide-react'
import { Spinner, AlertSeverityBadge } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      if (h.length > 0) setSelectedHome(user?.homeId || h[0].id)
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    homesApi.dashboard(selectedHome).then(res => setData(res.data.data))
      .catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          <h1 className="font-display text-3xl text-slate-900">
            {greeting}, {user?.firstName}
          </h1>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Residents" value={data.stats.suLive} icon={<Users className="w-5 h-5" />} accent="#10b981" to="/service-users" />
            <StatCard label="Staff active" value={data.stats.staffActive} icon={<UserSquare className="w-5 h-5" />} accent="#3b82f6" to="/staff" />
            <StatCard label="Alerts" value={data.stats.alertsUnresolved} icon={<Bell className="w-5 h-5" />} accent={data.stats.alertsUnresolved > 0 ? '#ef4444' : '#10b981'} to="/alerts" highlight={data.stats.alertsUnresolved > 0} />
            <StatCard label="Plans overdue" value={data.stats.carePlansOverdue} icon={<FileText className="w-5 h-5" />} accent={data.stats.carePlansOverdue > 0 ? '#f59e0b' : '#10b981'} to="/care-plans" highlight={data.stats.carePlansOverdue > 0} />
            <StatCard label="Leave pending" value={data.stats.leaveRequests} icon={<Clock className="w-5 h-5" />} accent="#8b5cf6" to="/staff" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Alerts */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Business Alerts</h2>
                <Link to="/alerts" className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 uppercase tracking-wider">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="card overflow-hidden">
                {data.alerts.length === 0 ? (
                  <div className="flex items-center gap-3 p-6 text-emerald-700">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">All clear</p>
                      <p className="text-xs text-slate-400">No active alerts at this time</p>
                    </div>
                  </div>
                ) : data.alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
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

            {/* Right column */}
            <div className="space-y-6">
              {/* Birthdays */}
              <div>
                <h2 className="font-semibold text-slate-800 mb-4">Birthdays this week</h2>
                <div className="card overflow-hidden">
                  {data.birthdays.length === 0 ? (
                    <p className="text-sm text-slate-400 px-5 py-4">No birthdays this week</p>
                  ) : data.birthdays.slice(0, 4).map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                      <span className="text-lg">🎂</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{b.first_name} {b.last_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{b.type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent clock-ins */}
              <div>
                <h2 className="font-semibold text-slate-800 mb-4">Recent clock-ins</h2>
                <div className="card overflow-hidden">
                  {data.recentClockIns.length === 0 ? (
                    <p className="text-sm text-slate-400 px-5 py-4">No clock-ins today</p>
                  ) : data.recentClockIns.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-slate-400">{c.event_time ? format(new Date(c.event_time), 'HH:mm') : ''} · {c.event_type === 'clock_in' ? 'In' : 'Out'}</p>
                      </div>
                      {c.punctuality && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.punctuality === 'on_time' ? 'bg-emerald-500/10 text-emerald-600' : c.punctuality === 'early' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {c.punctuality.replace('_', ' ')}
                        </span>
                      )}
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
    <Link to={to} className={clsx_import('card-hover p-5 group block', highlight && 'ring-1 ring-rose-200')}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}15`, color: accent }}>
          {icon}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-slate-900 font-display">{value}</p>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
    </Link>
  )
}

function clsx_import(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}
