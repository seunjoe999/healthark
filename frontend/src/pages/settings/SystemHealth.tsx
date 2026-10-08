import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner, Button } from '../../components/ui'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

// System Health — shows whether anything is quietly going wrong (server
// errors, staff left clocked in, alerts building up) so it is seen here first
// rather than reported by staff days later.
export default function SystemHealth() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState('')

  const load = async () => {
    setLoading(true); setFailed('')
    try {
      const res = await api.get('/system/health', { params: { homeId: user?.homeId } })
      setData(res.data.data)
    } catch (err: any) { setFailed(err?.response?.data?.error || 'Could not load system health') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const Tile = ({ label, value, tone, hint }: { label: string; value: React.ReactNode; tone: 'good' | 'warn' | 'bad' | 'plain'; hint?: string }) => (
    <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'bg-emerald-50 border-emerald-200' : tone === 'warn' ? 'bg-amber-50 border-amber-200' : tone === 'bad' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500">What the system has run into on its own. Check this weekly, or when staff report a problem.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
      </div>

      {loading ? <Spinner /> : failed ? <p className="text-rose-600 text-sm">{failed}</p> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Errors, last 24 hours" value={data.errors.last24h} tone={data.errors.last24h === 0 ? 'good' : data.errors.last24h < 10 ? 'warn' : 'bad'}
              hint={`${data.errors.last7d} in the last 7 days`} />
            <Tile label="Staff left clocked in" value={data.stuckClockIns.length} tone={data.stuckClockIns.length === 0 ? 'good' : 'warn'} hint="Clocked in over 16 hours ago" />
            <Tile label="Requests waiting" value={data.db.waiting} tone={data.db.waiting === 0 ? 'good' : 'bad'}
              hint={`${data.db.connections} database connections in use or ready`} />
            <Tile label="Running since" value={format(new Date(data.startedAt), 'd MMM HH:mm')} tone="plain" hint={`${data.uptimeHours} hours · ${data.memoryMb} MB memory`} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-1">Staff left clocked in</h2>
            {data.stuckClockIns.length === 0 ? <p className="text-sm text-slate-500">Nobody.</p> : (
              <>
                <p className="text-xs text-slate-500 mb-2">They will not be able to clock in for their next shift until this is cleared. Open their shift on the rota and use "Force clock out".</p>
                <ul className="text-sm divide-y divide-slate-100">
                  {data.stuckClockIns.map((s: any, i: number) => (
                    <li key={i} className="py-1.5 flex justify-between"><span className="font-medium text-slate-800">{s.staff}</span><span className="text-slate-500">since {s.clocked_in_at} ({s.hours_ago} hours)</span></li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-1">Open alerts by type</h2>
            {data.openAlerts.length === 0 ? <p className="text-sm text-slate-500">None open.</p> : (
              <div className="flex flex-wrap gap-2">
                {data.openAlerts.map((a: any) => (
                  <span key={a.type} className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${a.open > 50 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{a.type}: {a.open}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">{data.tasksNotCompletedLast7Days} tasks from the last 7 days were never completed.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
            <h2 className="font-bold text-slate-900 mb-1">Recent errors</h2>
            <p className="text-xs text-slate-500 mb-2">Every time a screen failed to save or load, with the reason. Send these to your developer.</p>
            {data.errors.recent.length === 0 ? <p className="text-sm text-slate-500">No errors recorded.</p> : (
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">When</th><th className="py-1 pr-3">Who</th><th className="py-1 pr-3">Action</th><th className="py-1">Reason</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.errors.recent.map((e: any, i: number) => (
                    <tr key={i} className="align-top">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.at}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.staff}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.method} {e.path}</td>
                      <td className="py-1.5 text-slate-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
