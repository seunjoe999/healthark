import React, { useEffect, useState, useMemo } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns'
import { Spinner, EmptyState } from '../../components/ui'
import { Clock, Users, AlertCircle, BarChart2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

function formatTime(isoString: string): string {
  try { return format(parseISO(isoString), 'HH:mm d MMM') } catch { return isoString }
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 font-display">{value}</div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Bar chart (plain divs) ────────────────────────────────────────

function DayBar({ label, clockIns, clockOuts, maxVal }: { label: string; clockIns: number; clockOuts: number; maxVal: number }) {
  const inPct = maxVal > 0 ? Math.round((clockIns / maxVal) * 100) : 0
  const outPct = maxVal > 0 ? Math.round((clockOuts / maxVal) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="w-full flex flex-col gap-0.5" style={{ height: 80 }}>
        {/* Clock-outs bar (behind, lighter) */}
        <div className="w-full flex items-end justify-center gap-1 h-full">
          <div className="flex flex-col items-center justify-end h-full w-4">
            {clockOuts > 0 && (
              <div
                className="w-full rounded-t bg-blue-200 transition-all duration-300"
                style={{ height: `${outPct}%`, minHeight: clockOuts > 0 ? 4 : 0 }}
                title={`Clock-outs: ${clockOuts}`}
              />
            )}
          </div>
          {/* Clock-ins bar */}
          <div className="flex flex-col items-center justify-end h-full w-4">
            {clockIns > 0 && (
              <div
                className="w-full rounded-t bg-indigo-500 transition-all duration-300"
                style={{ height: `${inPct}%`, minHeight: clockIns > 0 ? 4 : 0 }}
                title={`Clock-ins: ${clockIns}`}
              />
            )}
          </div>
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-semibold text-slate-700">{clockIns}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function ClockInAnalytics() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Default to current Mon–Sun week
  const now = new Date()
  const [startDate, setStartDate] = useState(format(getMonday(now), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))

  // Load homes
  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(console.error)
  }, [user])

  // Load analytics
  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    api.get('/clockin/analytics', { params: { homeId: selectedHome, startDate, endDate } })
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [selectedHome, startDate, endDate])

  // Build a full week of day labels so we always show Mon–Sun even if no data
  const weekDays = useMemo(() => {
    const start = parseISO(startDate)
    const days: { date: string; label: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i)
      days.push({ date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') })
    }
    return days
  }, [startDate])

  // Map byDay results to a lookup by date string
  const dayMap = useMemo(() => {
    const m: Record<string, { clock_ins: number; clock_outs: number }> = {}
    if (data?.byDay) {
      for (const row of data.byDay) {
        m[String(row.date).split('T')[0]] = {
          clock_ins: parseInt(row.clock_ins || '0'),
          clock_outs: parseInt(row.clock_outs || '0'),
        }
      }
    }
    return m
  }, [data])

  const maxDayValue = useMemo(() => {
    let max = 0
    for (const d of weekDays) {
      const row = dayMap[d.date]
      if (row) max = Math.max(max, row.clock_ins, row.clock_outs)
    }
    return max || 1
  }, [weekDays, dayMap])

  // Avg clock-ins per day
  const avgPerDay = useMemo(() => {
    if (!data?.byDay?.length) return 0
    const total = data.byDay.reduce((s: number, r: any) => s + parseInt(r.clock_ins || '0'), 0)
    return (total / data.byDay.length).toFixed(1)
  }, [data])

  const homeName = homes.find(h => h.id === selectedHome)?.name || ''

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Clock-in Analytics
          </h1>
          {homeName && <p className="text-slate-500 text-sm mt-0.5">{homeName}</p>}
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap gap-2 items-end">
          {homes.length > 1 && (
            <div>
              <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Home</label>
              <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1 block">From</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1 block">To</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {/* Quick presets */}
          <button
            className="text-xs text-indigo-600 hover:underline self-end pb-2"
            onClick={() => {
              setStartDate(format(getMonday(new Date()), 'yyyy-MM-dd'))
              setEndDate(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
            }}
          >
            This week
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : !data ? (
        <EmptyState title="No analytics data" description="No clock events found for the selected range." />
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total clock-ins"
              value={data.totalClockIns}
              icon={<Clock className="w-5 h-5 text-indigo-600" />}
              color="bg-indigo-50"
            />
            <StatCard
              label="Unique staff"
              value={data.uniqueStaff}
              icon={<Users className="w-5 h-5 text-green-600" />}
              color="bg-green-50"
            />
            <StatCard
              label="Not clocked in"
              value={data.neverClockedIn?.length ?? 0}
              sub={data.neverClockedIn?.length > 0 ? 'in selected period' : 'All staff clocked in'}
              icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
              color="bg-orange-50"
            />
            <StatCard
              label="Avg clock-ins / day"
              value={avgPerDay}
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              color="bg-purple-50"
            />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Clock-ins by day</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Clock-ins</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> Clock-outs</span>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              {weekDays.map(d => {
                const row = dayMap[d.date] || { clock_ins: 0, clock_outs: 0 }
                return (
                  <DayBar
                    key={d.date}
                    label={d.label}
                    clockIns={row.clock_ins}
                    clockOuts={row.clock_outs}
                    maxVal={maxDayValue}
                  />
                )
              })}
            </div>
          </div>

          {/* Staff table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-slate-700">Staff breakdown</h2>
            </div>
            {data.byStaff?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No clock events in this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Staff member</th>
                      <th className="text-center px-4 py-3">Clock-ins</th>
                      <th className="text-center px-4 py-3">Clock-outs</th>
                      <th className="text-left px-4 py-3">Last event</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.byStaff.map((row: any) => {
                      const isActiveToday = row.last_event
                        ? new Date(row.last_event).toDateString() === new Date().toDateString()
                        : false
                      return (
                        <tr key={row.staff_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-900">{row.staff_name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block min-w-[2rem] text-center font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5 text-xs">
                              {parseInt(row.clock_ins || '0')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block min-w-[2rem] text-center font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 text-xs">
                              {parseInt(row.clock_outs || '0')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {row.last_event ? formatTime(row.last_event) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isActiveToday ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active today</span>
                            ) : (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Not today</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Staff who never clocked in */}
          {data.neverClockedIn?.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-orange-50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-semibold text-orange-700">
                  Staff with no clock events this period ({data.neverClockedIn.length})
                </h2>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {data.neverClockedIn.map((s: any) => (
                  <span
                    key={s.staff_id}
                    className="text-sm bg-orange-50 border border-orange-200 text-orange-800 px-3 py-1 rounded-full"
                  >
                    {s.staff_name}
                    {s.role && <span className="text-orange-500 ml-1 text-xs">({s.role.replace('_', ' ')})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Late arrivals */}
          {data.lateArrivals?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-semibold text-slate-700">
                  Late arrivals — clocked in after 08:00 ({data.lateArrivals.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Staff member</th>
                      <th className="text-left px-4 py-3">Clock-in time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.lateArrivals.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{row.staff_name}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                          {row.event_time ? format(new Date(row.event_time), 'HH:mm, d MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
