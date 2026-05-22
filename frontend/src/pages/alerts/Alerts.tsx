import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button } from '../../components/ui'
import { Bell, CheckCircle, AlertTriangle, Info, RefreshCw, Eye, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [previewAlert, setPreviewAlert] = useState<any>(null)

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
      setPreviewAlert(null)
      await load()
    } catch { toast.error('Failed to resolve') }
    finally { setResolvingId(null) }
  }

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="w-4 h-4 text-red-600" />
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-500" />
    return <Info className="w-4 h-4 text-blue-500" />
  }

  const severityBg = (s: string) => {
    if (s === 'critical') return 'border-l-red-500 bg-red-50/30'
    if (s === 'warning') return 'border-l-orange-400 bg-orange-50/30'
    return 'border-l-blue-400 bg-blue-50/30'
  }

  const severityModalBg = (s: string) => {
    if (s === 'critical') return 'bg-red-50 border-red-200'
    if (s === 'warning') return 'bg-orange-50 border-orange-200'
    return 'bg-blue-50 border-blue-200'
  }

  const severityTextColor = (s: string) => {
    if (s === 'critical') return 'text-red-700'
    if (s === 'warning') return 'text-orange-700'
    return 'text-blue-700'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-600" /> Business Alerts
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
          <button onClick={() => setShowResolved(!showResolved)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showResolved ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {showResolved ? 'Show active' : 'Show resolved'}
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : alerts.length === 0 ? (
        <EmptyState
          title={showResolved ? 'No resolved alerts' : 'No active alerts — all clear'}
          description={showResolved ? 'No resolved alerts to show' : 'The system is monitoring everything. No issues detected.'}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <div key={alert.id} className={`bg-white rounded-xl border-l-4 border border-slate-100 shadow-sm p-5 ${severityBg(alert.severity)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5 flex-shrink-0">{severityIcon(alert.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{alert.severity}</span>
                      {alert.su_name && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{alert.su_name}</span>}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{alert.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{format(new Date(alert.created_at), 'd MMM yyyy, HH:mm')}</p>
                    {alert.resolution_notes && (
                      <p className="text-xs text-green-700 bg-green-50 rounded p-2 mt-2">✓ {alert.resolution_notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="secondary" icon={<Eye className="w-4 h-4" />} onClick={() => setPreviewAlert(alert)}>
                    View
                  </Button>
                  {!alert.is_resolved && (
                    <Button size="sm" variant="secondary" loading={resolvingId === alert.id}
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={() => resolve(alert.id)}>
                      Resolve
                    </Button>
                  )}
                  {alert.is_resolved && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Resolved</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert detail modal */}
      {previewAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`rounded-t-2xl p-5 border-b ${severityModalBg(previewAlert.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {severityIcon(previewAlert.severity)}
                  <div>
                    <h2 className={`font-bold text-lg ${severityTextColor(previewAlert.severity)}`}>{previewAlert.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${severityModalBg(previewAlert.severity)} ${severityTextColor(previewAlert.severity)}`}>
                        {previewAlert.severity}
                      </span>
                      {previewAlert.alert_type && (
                        <span className="text-xs text-slate-500 capitalize">{previewAlert.alert_type.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setPreviewAlert(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed">{previewAlert.description}</p>
              </div>

              {previewAlert.su_name && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Resident</p>
                  <p className="text-sm text-slate-700">{previewAlert.su_name}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(previewAlert.created_at), 'd MMMM yyyy, HH:mm')}</span>
                {previewAlert.is_resolved && <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Resolved</span>}
              </div>

              {previewAlert.resolution_notes && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs font-semibold text-green-700 mb-0.5">Resolution</p>
                  <p className="text-sm text-green-700">{previewAlert.resolution_notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setPreviewAlert(null)}>Close</Button>
              {!previewAlert.is_resolved && (
                <Button loading={resolvingId === previewAlert.id} icon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => resolve(previewAlert.id)}>
                  Resolve alert
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
