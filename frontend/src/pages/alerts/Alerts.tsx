import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button } from '../../components/ui'
import { Bell, CheckCircle, AlertTriangle, Info, RefreshCw, Clock, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<any[]>([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const openSettings = async () => {
    setSettingsOpen(true); setSettingsLoading(true)
    try { const res = await api.get('/alerts/settings', { params: { homeId: selectedHome } }); setSettings(res.data.data || []) }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Could not load alert settings'); setSettingsOpen(false) }
    finally { setSettingsLoading(false) }
  }
  const saveSetting = async (row: any, change: any) => {
    const next = { ...row, ...change }
    setSettings(prev => prev.map(s => s.alertType === row.alertType ? next : s))
    try {
      await api.put('/alerts/settings', { homeId: selectedHome, alertType: row.alertType, enabled: next.enabled, autoClearHours: next.autoClearHours })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save')
      setSettings(prev => prev.map(s => s.alertType === row.alertType ? row : s))
    }
  }
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const toggleSelected = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allSelected = alerts.length > 0 && alerts.every(a => selectedIds.has(a.id))
  const bulk = async (action: 'resolve' | 'delete') => {
    const ids = alerts.filter(a => selectedIds.has(a.id)).map(a => a.id)
    if (!ids.length) return
    if (action === 'delete' && !window.confirm(`Permanently delete ${ids.length} alert${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      const res = await api.post('/alerts/bulk', { ids, action })
      const n = res.data?.data?.count ?? ids.length
      toast.success(`${n} alert${n !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : 'resolved'}`)
      setSelectedIds(new Set())
      await load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Bulk action failed') }
    finally { setBulkBusy(false) }
  }

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome, showResolved])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/alerts', { params: { homeId: selectedHome, resolved: showResolved } })
      setAlerts(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const resolve = async (id: string) => {
    setResolvingId(id)
    try {
      await api.put(`/alerts/${id}/resolve`, { resolutionNotes: 'Resolved via alerts dashboard' })
      toast.success('Alert resolved')
      await load()
    } catch { toast.error('Failed to resolve') }
    finally { setResolvingId(null) }
  }

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-500" />
    return <Info className="w-4 h-4 text-blue-500" />
  }

  const severityDot = (s: string) =>
    s === 'critical' ? 'bg-red-500' : s === 'warning' ? 'bg-orange-500' : 'bg-blue-500'

  const severityBadge = (s: string) =>
    s === 'critical' ? 'bg-red-100 text-red-700' : s === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-500" /> Business Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{alerts.length} {showResolved ? 'resolved' : 'active'} alert{alerts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && (
            <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
          <Button variant="secondary" size="sm" icon={<Bell className="w-4 h-4" />} onClick={openSettings}>Alert settings</Button>
          <button onClick={() => setShowResolved(!showResolved)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showResolved ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {showResolved ? 'Show active' : 'Show resolved'}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSettingsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Alert settings</h2>
                <p className="text-xs text-slate-500">Switch an alert off, or have it clear itself after a set time. Changes save straight away.</p>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
            </div>
            <div className="overflow-y-auto p-5">
              {settingsLoading ? <Spinner /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-2 font-semibold">Alert</th>
                      <th className="pb-2 font-semibold text-center">Open now</th>
                      <th className="pb-2 font-semibold text-center">On</th>
                      <th className="pb-2 font-semibold">Clear automatically</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settings.map(s => (
                      <tr key={s.alertType}>
                        <td className="py-2 pr-2 font-medium text-slate-800">{s.label}</td>
                        <td className="py-2 text-center text-slate-600">{s.open}</td>
                        <td className="py-2 text-center">
                          <input type="checkbox" className="w-4 h-4" checked={!!s.enabled} onChange={e => saveSetting(s, { enabled: e.target.checked })} />
                        </td>
                        <td className="py-2">
                          <select className="input py-1 text-sm w-auto" value={s.autoClearHours ?? ''}
                            onChange={e => saveSetting(s, { autoClearHours: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">Never — until resolved</option>
                            <option value="24">After 24 hours</option>
                            <option value="48">After 48 hours</option>
                            <option value="168">After 7 days</option>
                            <option value="720">After 30 days</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : alerts.length === 0 ? (
        <EmptyState
          title={showResolved ? 'No resolved alerts' : 'No active alerts — all clear'}
          description={showResolved ? 'No resolved alerts to show' : 'The system is monitoring everything. No issues detected.'}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={allSelected}
                onChange={() => setSelectedIds(allSelected ? new Set() : new Set(alerts.map(a => a.id)))} />
              Select all
            </label>
            <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
            <div className="ml-auto flex gap-2">
              {!showResolved && (
                <Button size="sm" variant="secondary" disabled={!selectedIds.size} loading={bulkBusy}
                  icon={<CheckCircle className="w-4 h-4" />} onClick={() => bulk('resolve')}>
                  Resolve selected
                </Button>
              )}
              <button type="button" disabled={!selectedIds.size || bulkBusy} onClick={() => bulk('delete')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed">
                Delete selected
              </button>
            </div>
          </div>
          {alerts.map((alert: any) => {
            const isExpanded = expandedId === alert.id
            return (
              <div key={alert.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-stretch">
                <label className="flex items-start pt-5 pl-4 cursor-pointer" title="Select this alert">
                  <input type="checkbox" className="w-4 h-4" checked={selectedIds.has(alert.id)} onChange={() => toggleSelected(alert.id)} />
                </label>
                <button onClick={() => setExpandedId(p => p === alert.id ? null : alert.id)}
                  className="flex-1 min-w-0 p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${severityDot(alert.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-slate-900 text-sm">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${severityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        {alert.su_name && <span className="text-xs text-slate-500">{alert.su_name}</span>}
                        {alert.is_resolved && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3 h-3" />Resolved</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                        <span>{format(new Date(alert.created_at), 'd MMM yyyy, HH:mm')}</span>
                        {alert.alert_type && <span className="capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>}
                      </div>
                      {alert.description && <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{alert.description}</p>}
                    </div>
                    <div className="flex-shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 pt-2">
                      {severityIcon(alert.severity)}
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(alert.created_at), 'd MMMM yyyy, HH:mm')}</span>
                    </div>
                    <Field label="Description" value={alert.description} />
                    <Field label="Resident" value={alert.su_name} />
                    {alert.resolution_notes && (
                      <p className="text-sm text-emerald-700 flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{alert.resolution_notes}
                      </p>
                    )}
                    {!alert.is_resolved && (
                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <Button size="sm" loading={resolvingId === alert.id}
                          icon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => resolve(alert.id)}>
                          Resolve alert
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
