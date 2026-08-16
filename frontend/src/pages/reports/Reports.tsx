import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button } from '../../components/ui'
import { BarChart3, Search, AlertTriangle, CheckCircle, User, Brain, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { value: 'daily-records', label: 'Daily Records', description: 'All care records for a date range' },
  { value: 'fluid', label: 'Fluid Intake', description: 'Fluid totals and threshold alerts' },
  { value: 'incidents', label: 'Incidents', description: 'All incident reports' },
  { value: 'care-plan-compliance', label: 'Care Plan Compliance', description: 'Review status and overdue plans' },
  { value: 'staff-attendance', label: 'Staff Attendance', description: 'Clock in/out history' },
  { value: 'training-compliance', label: 'Training Compliance', description: 'Expiring and expired certificates' },
  { value: 'mar-report', label: 'MAR Report', description: 'Medication administration records' },
  { value: 'medication-report', label: 'Medication Report', description: 'All medications by resident' },
  { value: 'care-plan-reviews', label: 'Care Plan Reviews', description: 'Overdue and upcoming reviews' },
  { value: 'safeguarding', label: 'Safeguarding', description: 'All safeguarding concerns' },
  { value: 'incident-analysis', label: 'Incident Analysis', description: 'Analysis of incident patterns' },
  { value: 'medication-stock', label: 'Medication Stock', description: 'Stock counts, home-wide or per resident' },
  { value: 'calendar', label: 'Calendar & Appointments', description: 'Everything added to the calendar' },
  { value: 'system-activity', label: 'System Activity', description: 'Anything done on the system, by any staff member' },
]

const DAILY_RECORD_TYPES = [
  { value: '', label: 'All types' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'oral_care', label: 'Oral Care' },
  { value: 'food_intake', label: 'Food Intake' },
  { value: 'fluid_intake', label: 'Fluid Intake' },
  { value: 'medication', label: 'Medication' },
  { value: 'prn_medication', label: 'PRN Medication' },
  { value: 'incident', label: 'Incident' },
  { value: 'behaviour', label: 'Behaviour' },
  { value: 'observation', label: 'Observation' },
  { value: 'bowel', label: 'Bowel' },
  { value: 'bath', label: 'Bath/Shower' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'activity', label: 'Activity' },
  { value: 'mood', label: 'Mood' },
  { value: 'visit', label: 'Visit' },
  { value: 'other', label: 'Other' },
]

export default function Reports() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [searchParams] = window.location.search ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()];
  const [reportType, setReportType] = useState(searchParams.get('type') || 'daily-records')
  const [from, setFrom] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [suList, setSuList] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [dailyRecordType, setDailyRecordType] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome).then(res => setSuList(res.data.data || [])).catch(() => {})
  }, [selectedHome])

  const runReport = async () => {
    setLoading(true)
    setData(null)
    try {
      const params: any = { homeId: selectedHome, from, to }
      if (selectedSu) params.suId = selectedSu
      if (reportType === 'daily-records' && dailyRecordType) params.recordType = dailyRecordType
      const endpoint = reportType === 'system-activity' ? '/audit-trail' : `/reports/${reportType}`
      const res = await api.get(endpoint, { params })
      setData(reportType === 'incident-analysis' ? res.data : res.data.data)
    } catch (err: any) { console.error('Report error:', err?.response?.data); toast.error(err?.response?.data?.error || 'Failed to load report') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" /> Reports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Generate and view operational reports</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {REPORT_TYPES.map(rt => (
          <button key={rt.value} onClick={() => setReportType(rt.value)}
            className={`p-4 rounded-xl border-2 text-left transition-colors ${reportType === rt.value ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
            <p className={`text-sm font-semibold ${reportType === rt.value ? 'text-purple-900' : 'text-slate-800'}`}>{rt.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From date</label>
            <input type="date" className="input w-auto" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To date</label>
            <input type="date" className="input w-auto" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          {reportType === 'daily-records' && (
            <div>
              <label className="label">Record type</label>
              <select className="input w-auto" value={dailyRecordType} onChange={e => setDailyRecordType(e.target.value)}>
                {DAILY_RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label flex items-center gap-1"><User className="w-3.5 h-3.5" /> Filter by resident</label>
            <select className="input w-auto" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
              <option value="">All residents</option>
              {suList.map(s => <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>)}
            </select>
          </div>
          <Button icon={<Search className="w-4 h-4" />} onClick={runReport} loading={loading}>
            Run report
          </Button>
        </div>
      </div>

      {/* Results */}
      {loading ? <Spinner /> : !data ? (
        <EmptyState title="Select a report type and click Run" description="Reports will appear here" />
      ) : reportType === 'care-plan-compliance' ? (
        <CarePlanCompliance data={data} />
      ) : reportType === 'fluid' ? (
        <FluidReport data={data} />
      ) : reportType === 'training-compliance' ? (
        <TrainingCompliance data={data} />
      ) : reportType === 'incident-analysis' ? (
        <IncidentAnalysis data={data} />
      ) : (
        <GenericTable data={Array.isArray(data) ? data : []} reportType={reportType} />
      )}
    </div>
  )
}

function CarePlanCompliance({ data }: { data: any }) {
  const plans: any[] = data?.plans || []
  const summary = data?.summary || { total: 0, current: 0, dueSoon: 0, overdue: 0 }
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-slate-900">{summary.total ?? 0}</p><p className="text-sm text-slate-500">Total plans</p></div>
        <div className="bg-green-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-green-700">{summary.current ?? 0}</p><p className="text-sm text-slate-500">Current</p></div>
        <div className="bg-orange-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-orange-700">{summary.dueSoon ?? 0}</p><p className="text-sm text-slate-500">Due soon</p></div>
        <div className="bg-red-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-red-700">{summary.overdue ?? 0}</p><p className="text-sm text-slate-500">Overdue</p></div>
      </div>
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No care plans found for this home</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Resident','Plan type','Review frequency','Next review','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {plans.map((p: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.su_name}</td>
                  <td className="px-4 py-3 capitalize">{(p.plan_type || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 capitalize">{(p.review_frequency || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{p.next_review_date ? format(new Date(p.next_review_date), 'd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.review_status === 'overdue' ? 'bg-red-100 text-red-700' : p.review_status === 'due_soon' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {(p.review_status || '').replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FluidReport({ data }: { data: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>{['Resident','Date','Total (ml)','Target (ml)','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 text-xs">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((r: any, i: number) => (
            <tr key={i} className={r.below_threshold ? 'bg-red-50/30' : ''}>
              <td className="px-4 py-3 font-medium">{r.su_name}</td>
              <td className="px-4 py-3">{r.record_date ? format(new Date(r.record_date), 'd MMM yyyy') : '—'}</td>
              <td className="px-4 py-3 font-bold">{r.total_ml}ml</td>
              <td className="px-4 py-3">{r.min_fluid_ml}ml</td>
              <td className="px-4 py-3">
                {r.below_threshold
                  ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Below target</span>
                  : <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" />On target</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="text-center text-slate-400 p-8 text-sm">No fluid records in this date range</p>}
    </div>
  )
}

function TrainingCompliance({ data }: { data: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>{['Staff member','Role','Course','Completed','Expiry','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 text-xs">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((r: any, i: number) => (
            <tr key={i}>
              <td className="px-4 py-3 font-medium">{r.staff_name}</td>
              <td className="px-4 py-3 capitalize text-xs text-slate-500">{(r.role || '').replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">{r.course_name}</td>
              <td className="px-4 py-3">{r.completed_date ? format(new Date(r.completed_date), 'd MMM yyyy') : '—'}</td>
              <td className="px-4 py-3">{r.expiry_date ? format(new Date(r.expiry_date), 'd MMM yyyy') : 'No expiry'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.expiry_status === 'expired' ? 'bg-red-100 text-red-700' : r.expiry_status === 'expiring' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {r.expiry_status || 'current'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="text-center text-slate-400 p-8 text-sm">No training records found</p>}
    </div>
  )
}

function IncidentAnalysis({ data }: { data: any }) {
  if (!data) return <EmptyState title="No analysis available" description="Run the report to generate an analysis of incidents" />

  const { analysis, incidents, count, period } = data

  const formatAnalysis = (text: string) => {
    if (!text) return []
    return text.split(/\n\n+/).filter(Boolean)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <Brain className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-purple-900 text-sm">Incident Analysis</p>
          <p className="text-xs text-purple-600 mt-0.5">{count} incident{count !== 1 ? 's' : ''} analysed · Period: {period}</p>
        </div>
      </div>

      {/* Analysis text */}
      {analysis ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-700 text-sm">Analysis</span>
          </div>
          <div className="px-5 py-4 space-y-4">
            {formatAnalysis(analysis).map((para: string, i: number) => {
              const isHeader = para.startsWith('**') || para.startsWith('#')
              if (isHeader) {
                const clean = para.replace(/^#+\s*/, '').replace(/\*\*/g, '')
                return <h3 key={i} className="font-semibold text-slate-800 text-sm mt-2">{clean}</h3>
              }
              return (
                <p key={i} className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {para.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Analysis not available — {count} incidents found in this period.</p>
        </div>
      )}

      {/* Incident table */}
      {incidents && incidents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <p className="font-semibold text-slate-700 text-sm">Incidents in period ({incidents.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Date', 'Resident', 'Type', 'Description', 'Outcome'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {incidents.map((inc: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {inc.record_date ? format(new Date(inc.record_date), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{inc.su_name || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium capitalize">
                        {(inc.incident_type || 'incident').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">{inc.description || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{inc.outcome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function GenericTable({ data, reportType }: { data: any[]; reportType: string }) {
  if (!data.length) return <EmptyState title="No data found" description="No records found for this date range" />
  const cols = Object.keys(data[0]).filter(k => !['id','home_id','su_id','staff_id'].includes(k)).slice(0, 8)
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{data.length} records</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>{cols.map(c => <th key={c} className="px-4 py-3 text-left font-medium text-slate-600 text-xs capitalize">{c.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.slice(0, 100).map((row: any, i: number) => (
            <tr key={i} className="hover:bg-slate-50">
              {cols.map(c => (
                <td key={c} className="px-4 py-3 text-slate-700 max-w-xs truncate">
                  {row[c] instanceof Date ? format(new Date(row[c]), 'd MMM yyyy') :
                   typeof row[c] === 'boolean' ? (row[c] ? 'Yes' : 'No') :
                   String(row[c] ?? '—').substring(0, 80)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
