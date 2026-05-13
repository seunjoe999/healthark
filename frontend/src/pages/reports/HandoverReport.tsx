import React, { useEffect, useState } from 'react'
import { homesApi, suApi, dailyRecordsApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Select } from '../../components/ui'
import { FileText, Printer } from 'lucide-react'

export default function HandoverReport() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [sus, setSus] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [shift, setShift] = useState<'early' | 'late' | 'night'>('early')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || []))
  }, [selectedHome])

  const generate = async () => {
    setLoading(true)
    try {
      const [alertsRes, tasksRes] = await Promise.all([
        api.get('/alerts', { params: { homeId: selectedHome, resolved: false } }),
        api.get('/tasks', { params: { homeId: selectedHome, date: today } }),
      ])

      // Fetch records per resident
      const recordsBySu: Record<string, any[]> = {}
      for (const su of sus) {
        try {
          const res = await api.get('/daily-records', { params: { suId: su.id, date: today } })
          recordsBySu[su.id] = res.data.data || []
        } catch { recordsBySu[su.id] = [] }
      }

      setReport({
        date: today,
        shift,
        alerts: alertsRes.data.data || [],
        tasks: tasksRes.data.data || [],
        recordsBySu,
        sus,
        generatedAt: new Date().toISOString(),
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const SHIFT_TIMES: Record<string, string> = {
    early: '07:00 – 14:00',
    late: '14:00 – 22:00',
    night: '22:00 – 07:00',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" /> Handover Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">End of shift summary for {format(new Date(), 'EEEE d MMMM yyyy')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {homes.length > 1 && (
            <Select label="Care home" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}
              options={homes.map(h => ({ value: h.id, label: h.name }))} />
          )}
          <Select label="Shift" value={shift} onChange={e => setShift(e.target.value as any)}
            options={[{ value: 'early', label: 'Early (07:00–14:00)' }, { value: 'late', label: 'Late (14:00–22:00)' }, { value: 'night', label: 'Night (22:00–07:00)' }]} />
          <Button icon={<FileText className="w-4 h-4" />} loading={loading} onClick={generate}>Generate handover</Button>
          {report && <Button variant="outline" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>}
        </div>
      </div>

      {loading ? <Spinner /> : !report ? null : (
        <div id="handover-print" className="space-y-5">
          {/* Header */}
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <h2 className="font-display text-2xl mb-1">Shift Handover Report</h2>
            <p className="text-slate-300">{format(new Date(report.date), 'd MMMM yyyy')} · {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} shift · {SHIFT_TIMES[report.shift]}</p>
            <p className="text-slate-400 text-sm mt-1">Generated {format(new Date(report.generatedAt), 'HH:mm')} by {user?.firstName} {user?.lastName}</p>
          </div>

          {/* Active alerts */}
          {report.alerts.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-card p-5">
              <h3 className="font-bold text-rose-800 mb-3 flex items-center gap-2">
                ⚠️ Active Alerts ({report.alerts.length})
              </h3>
              <div className="space-y-2">
                {report.alerts.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${a.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-800 mb-3">Tasks ({report.tasks.length})</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-slate-900">{report.tasks.length}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-xl font-bold text-emerald-700">{report.tasks.filter((t: any) => t.status === 'completed').length}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-xl font-bold text-amber-700">{report.tasks.filter((t: any) => t.status === 'pending').length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
            {report.tasks.filter((t: any) => t.status === 'pending').length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Outstanding tasks to hand over:</p>
                {report.tasks.filter((t: any) => t.status === 'pending').map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-sm text-slate-700">{t.title}</p>
                    {t.su_name && <span className="text-xs text-slate-400 ml-auto">{t.su_name}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per resident summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-800 mb-4">Resident Summary</h3>
            <div className="space-y-4">
              {report.sus.map((su: any) => {
                const name = `${su.first_name || su.firstName} ${su.last_name || su.lastName}`
                const records = report.recordsBySu[su.id] || []
                const fluidRecords = records.filter((r: any) => r.record_type === 'fluid_intake')
                const totalFluid = fluidRecords.reduce((sum: number, r: any) => sum + (r.amount_ml || 0), 0)
                const incidents = records.filter((r: any) => r.record_type === 'incident')
                const hasRecords = records.length > 0

                return (
                  <div key={su.id} className={`p-4 rounded-xl border ${incidents.length > 0 ? 'border-rose-200 bg-rose-50' : hasRecords ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-900">{name}</p>
                      <div className="flex gap-2">
                        {incidents.length > 0 && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">⚠ {incidents.length} incident{incidents.length > 1 ? 's' : ''}</span>}
                        {!hasRecords && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">No records today</span>}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                      <span>📋 {records.length} records</span>
                      {totalFluid > 0 && <span className={`font-medium ${totalFluid < (su.min_fluid_ml || 1500) ? 'text-amber-600' : 'text-emerald-600'}`}>💧 {totalFluid}ml fluid</span>}
                      {incidents.length > 0 && incidents.map((inc: any, i: number) => (
                        <span key={i} className="text-rose-600 font-medium">⚠ {inc.notes?.substring(0, 50)}...</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sign off section */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4">Handover Sign-off</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-3">Handing over (outgoing)</p>
                <div className="border-b-2 border-slate-400 h-12 mb-2" />
                <p className="text-xs text-slate-400">Signature: ____________________</p>
                <p className="text-xs text-slate-400 mt-1">Name: ________________________ Time: _______</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-3">Taking over (incoming)</p>
                <div className="border-b-2 border-slate-400 h-12 mb-2" />
                <p className="text-xs text-slate-400">Signature: ____________________</p>
                <p className="text-xs text-slate-400 mt-1">Name: ________________________ Time: _______</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@media print { .no-print { display: none } @page { margin: 1.5cm } }`}</style>
    </div>
  )
}
