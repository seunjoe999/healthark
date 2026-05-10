import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi, alertsApi } from '../../api'
import { Users, UserSquare, Bell, FileText, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { Spinner, EmptyState, AlertSeverityBadge } from '../../components/ui'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

interface DashboardData {
  stats: {
    suLive: number
    staffActive: number
    alertsUnresolved: number
    carePlansOverdue: number
    leaveRequests: number
  }
  recentClockIns: any[]
  birthdays: any[]
  alerts: any[]
}

export default function Dashboard() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      if (h.length > 0) setSelectedHome(h[0].id)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    homesApi.dashboard(selectedHome).then(res => {
      setData(res.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {greeting()}, {user?.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        {homes.length > 1 && (
          <select
            className="input w-auto"
            value={selectedHome}
            onChange={e => setSelectedHome(e.target.value)}
          >
            {homes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? <Spinner /> : !data ? (
        <EmptyState title="No data available" description="Select a care home to view the dashboard" />
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Residents" value={data.stats.suLive} icon={<Users className="w-5 h-5" />} color="blue" to="/service-users" />
            <StatCard label="Staff active" value={data.stats.staffActive} icon={<UserSquare className="w-5 h-5" />} color="teal" to="/staff" />
            <StatCard label="Alerts" value={data.stats.alertsUnresolved} icon={<Bell className="w-5 h-5" />} color={data.stats.alertsUnresolved > 0 ? 'red' : 'green'} to="/alerts" />
            <StatCard label="Plans overdue" value={data.stats.carePlansOverdue} icon={<FileText className="w-5 h-5" />} color={data.stats.carePlansOverdue > 0 ? 'orange' : 'green'} to="/care-plans" />
            <StatCard label="Leave pending" value={data.stats.leaveRequests} icon={<Clock className="w-5 h-5" />} color="purple" to="/staff" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Active alerts */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-navy-900">Business Alerts</h2>
                <Link to="/alerts" className="text-sm text-teal-500 hover:text-teal-600 font-medium">View all</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {data.alerts.length === 0 ? (
                  <div className="flex items-center gap-3 p-6 text-green-700">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-sm font-medium">No active alerts — all clear</p>
                  </div>
                ) : data.alerts.slice(0, 6).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 px-6 py-4">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'text-red-500' :
                      alert.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{alert.description}</p>
                    </div>
                    <AlertSeverityBadge severity={alert.severity} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Birthdays */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-navy-900">Birthdays this week</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.birthdays.length === 0 ? (
                    <p className="text-sm text-gray-400 px-6 py-4">No birthdays this week</p>
                  ) : data.birthdays.slice(0, 5).map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-8 h-8 bg-gold-400/20 rounded-full flex items-center justify-center text-sm">
                        🎂
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.first_name} {b.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{b.type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent clock-ins */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-navy-900">Recent clock-ins</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.recentClockIns.length === 0 ? (
                    <p className="text-sm text-gray-400 px-6 py-4">No clock-ins today</p>
                  ) : data.recentClockIns.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-xs font-bold text-teal-600">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(c.event_time), 'HH:mm')} · {c.event_type === 'clock_in' ? 'Clocked in' : 'Clocked out'}
                        </p>
                      </div>
                      {c.punctuality && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.punctuality === 'on_time' ? 'bg-green-100 text-green-700' :
                          c.punctuality === 'early' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
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

function StatCard({ label, value, icon, color, to }: {
  label: string; value: number; icon: React.ReactNode; color: string; to: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Link to={to} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </Link>
  )
}
