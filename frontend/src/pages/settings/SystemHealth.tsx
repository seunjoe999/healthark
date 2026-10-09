import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner, Button } from '../../components/ui'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

// System Health — the issue log. Every action the system refused or failed
// (a blocked clock-out, a form that would not save, a screen that crashed on
// someone's phone) is recorded automatically with who, where and the exact
// message they saw, so it is seen here first rather than reported days later.
export default function SystemHealth() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState('')
  const [area, setArea] = useState('')
  const [kind, setKind] = useState<'' | 'error' | 'refused'>('')

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
  const KindBadge = ({ k }: { k: string }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${k === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
      {k === 'error' ? 'Fault' : 'Refused'}
    </span>
  )

  const markFixed = async (messages: string[]) => {
    if (!messages.length) return
    try { await api.post('/system/resolve', { messages }); await load() }
    catch (err: any) { setFailed(err?.response?.data?.error || 'Could not mark as fixed') }
  }
  const match = (r: any) => (!area || r.area === area) && (!kind || r.kind === kind)
  const copyIssues = () => {
    const lines = (data?.topIssues || []).filter(match).map((t: any) => `[${t.area}] x${t.times} (${t.people} people, last ${t.last_seen}) — ${t.message}`)
    navigator.clipboard?.writeText(lines.join('\n')).then(() => alert('Copied — paste it to your developer.')).catch(() => {})
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-slate-800">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500">Everything the system refused or failed to do, recorded automatically. "Fault" means the system broke; "Refused" means it stopped someone on purpose (a rule) and told them why.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
      </div>

      {loading ? <Spinner /> : failed ? <p className="text-rose-600 text-sm">{failed}</p> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Faults, last 7 days" value={data.errors.faults7d ?? 0} tone={(data.errors.faults7d ?? 0) === 0 ? 'good' : 'bad'}
              hint={`Times the system broke. Separately, it refused ${Math.max(0, data.errors.last7d - (data.errors.faults7d ?? 0))} actions on purpose (rules), ${data.errors.last24h} of everything in the last 24 hours`} />
            <Tile label="Staff left clocked in" value={data.stuckClockIns.length} tone={data.stuckClockIns.length === 0 ? 'good' : 'warn'} hint="Clocked in over 16 hours ago" />
            <Tile label="Requests waiting" value={data.db.waiting} tone={data.db.waiting === 0 ? 'good' : 'bad'}
              hint={`${data.db.connections} database connections open`} />
            <Tile label="Running since" value={format(new Date(data.startedAt), 'd MMM HH:mm')} tone="plain" hint={`${data.uptimeHours} hours · ${data.memoryMb} MB memory`} />
          </div>

          {data.rota && (
            <div className={`rounded-2xl border p-4 ${data.rota.unexplained7d > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <h2 className="font-bold text-slate-900">Rota allocations changed by the system on its own</h2>
              <p className={`text-2xl font-bold mt-1 ${data.rota.unexplained7d > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{data.rota.unexplained7d}</p>
              <p className="text-xs text-slate-600 mt-1">
                The database records every change to who is on a shift. {data.rota.changes7d} change{data.rota.changes7d !== 1 ? 's' : ''} in the last 7 days;
                this number is how many had no manager's rota action in the minute before them. It should be 0. Open any shift to see its full allocation history.
              </p>
              {data.rota.unexplained.length > 0 && (
                <ul className="mt-2 text-xs divide-y divide-rose-100">
                  {data.rota.unexplained.map((r: any, i: number) => (
                    <li key={i} className="py-1">{r.at} — {r.service} {r.shift}: {r.from_staff} → {r.to_staff}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h2 className="font-bold text-slate-900">Top issues, last 7 days</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="input py-1 text-sm w-auto" value={area} onChange={e => setArea(e.target.value)}>
                  <option value="">All areas</option>
                  {(data.byArea || []).map((a: any) => <option key={a.area} value={a.area}>{a.area} ({a.times})</option>)}
                </select>
                <select className="input py-1 text-sm w-auto" value={kind} onChange={e => setKind(e.target.value as any)}>
                  <option value="">Faults and refusals</option>
                  <option value="error">Faults only</option>
                  <option value="refused">Refusals only</option>
                </select>
                <button onClick={copyIssues} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50">Copy for developer</button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-2">The same message repeated is one issue. Sorted by how often it happened. "Mark fixed" removes an issue from this page; if it ever happens again it comes back.</p>
            {(data.topIssues || []).filter(match).length === 0 ? <p className="text-sm text-slate-500">Nothing recorded.</p> : (
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">Area</th><th className="py-1 pr-3">Times</th><th className="py-1 pr-3">People</th><th className="py-1 pr-3">Last seen</th><th className="py-1">What they were told</th><th className="py-1" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topIssues.filter(match).map((t: any, i: number) => (
                    <tr key={i} className="align-top">
                      <td className="py-1.5 pr-3 whitespace-nowrap font-medium text-slate-800">{t.area} <KindBadge k={t.kind} /></td>
                      <td className="py-1.5 pr-3 font-bold">{t.times}</td>
                      <td className="py-1.5 pr-3">{t.people}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{t.last_seen}</td>
                      <td className="py-1.5 text-slate-700">{t.message}</td>
                      <td className="py-1.5 pl-2 whitespace-nowrap text-right">
                        <button onClick={() => markFixed([t.message])} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-500">Mark fixed</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="font-bold text-slate-900 mb-1">Staff left clocked in</h2>
              {data.stuckClockIns.length === 0 ? <p className="text-sm text-slate-500">Nobody. Anyone still clocked in after 16 hours is clocked out automatically.</p> : (
                <ul className="text-sm divide-y divide-slate-100">
                  {data.stuckClockIns.map((s: any, i: number) => (
                    <li key={i} className="py-1.5 flex justify-between"><span className="font-medium text-slate-800">{s.staff}</span><span className="text-slate-500">since {s.clocked_in_at} ({s.hours_ago} hours)</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="font-bold text-slate-900 mb-1">Clocked out automatically, last 7 days</h2>
              {(data.autoClockedOut || []).length === 0 ? <p className="text-sm text-slate-500">Nobody.</p> : (
                <>
                  <p className="text-xs text-slate-500 mb-1">Their real finish time is unknown — check their timesheets.</p>
                  <ul className="text-sm divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {data.autoClockedOut.map((s: any, i: number) => (
                      <li key={i} className="py-1.5 flex justify-between"><span className="font-medium text-slate-800">{s.staff}</span><span className="text-slate-500">{s.at}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
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
            <h2 className="font-bold text-slate-900 mb-1">Every issue, newest first</h2>
            {data.errors.recent.filter(match).length === 0 ? <p className="text-sm text-slate-500">Nothing recorded.</p> : (
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">When</th><th className="py-1 pr-3">Who</th><th className="py-1 pr-3">Area</th><th className="py-1 pr-3">Where</th><th className="py-1">What they were told</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.errors.recent.filter(match).map((e: any, i: number) => (
                    <tr key={i} className="align-top">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.at}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.staff}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.area} <KindBadge k={e.kind} /></td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-slate-500">{e.method} {String(e.path).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '…')}</td>
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
