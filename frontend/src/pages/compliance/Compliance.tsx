import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner } from '../../components/ui'
import {
  ShieldCheck, AlertTriangle, Activity, BookOpen,
  Package, Bell, ClipboardList, RefreshCw, X, Zap,
  CheckCircle, ArrowRight, ChevronRight, Circle, Clock, CheckSquare, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

type ActionStatus = 'todo' | 'in_progress' | 'done'
function getCFStatuses(homeId: string): Record<string, ActionStatus> {
  try { return JSON.parse(localStorage.getItem(`cfix_${homeId}`) || '{}') } catch { return {} }
}
function saveCFStatuses(homeId: string, s: Record<string, ActionStatus>) {
  localStorage.setItem(`cfix_${homeId}`, JSON.stringify(s))
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AreaData {
  score: number
  label: string
  metric: string
  [key: string]: any
}

interface DashboardData {
  overallScore: number
  lastUpdated: string
  areas: {
    training: AreaData
    safeguarding: AreaData
    incidents: AreaData
    carePlans: AreaData
    ppe: AreaData
    alerts: AreaData
    audits: AreaData
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRAG(score: number): { label: string; colour: string; bg: string; bar: string } {
  if (score >= 80) return { label: 'Compliant', colour: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500' }
  if (score >= 60) return { label: 'Needs Attention', colour: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', bar: 'bg-amber-500' }
  return { label: 'At Risk', colour: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' }
}

function getOverallColour(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-600'
}

const AREA_ICONS: Record<string, React.ElementType> = {
  training: ShieldCheck,
  safeguarding: AlertTriangle,
  incidents: Activity,
  carePlans: BookOpen,
  ppe: Package,
  alerts: Bell,
  audits: ClipboardList,
}

const AREA_LINKS: Record<string, string> = {
  training: '/training',
  safeguarding: '/safeguarding',
  incidents: '/daily-records',
  carePlans: '/care-plans',
  ppe: '/ppe',
  alerts: '/alerts',
  audits: '/audits',
}

const AREA_TIPS: Record<string, string[]> = {
  training: ['Ensure all staff have completed mandatory training modules', 'Check for expiring training certificates within 60 days', 'Complete the in-system training modules in Staff Training'],
  safeguarding: ['Review and close any open safeguarding concerns', 'Ensure all concerns have manager sign-off', 'Document outcomes for all completed cases'],
  incidents: ['Review all unreviewed incidents', 'Ensure incident reports are completed within 24 hours', 'Check for patterns that may require a risk assessment'],
  carePlans: ['Review all care plans due for review', 'Ensure all active residents have a current care plan', 'Update plans after any significant change in need'],
  ppe: ['Complete PPE compliance checks', 'Ensure all staff have access to required PPE', 'Document any shortages immediately'],
  alerts: ['Resolve or acknowledge all open alerts', 'Check critical alerts first', 'Add resolution notes when closing alerts'],
  audits: ['Generate and complete outstanding audit reports', 'Review last audit recommendations', 'Schedule follow-up audits for flagged areas'],
}

// ─── Area card ────────────────────────────────────────────────────────────────

function AreaCard({ areaKey, data, onClick }: { areaKey: string; data: AreaData; onClick: () => void }) {
  const rag = getRAG(data.score)
  const Icon = AREA_ICONS[areaKey] || ShieldCheck
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-5 flex flex-col gap-3 ${rag.bg} hover:shadow-md transition-all text-left w-full`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${rag.colour}`} />
          <span className="font-semibold text-slate-800 text-sm">{data.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rag.colour} ${rag.bg}`}>
            {rag.label}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 ${rag.colour} opacity-60`} />
        </div>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <span className={`text-3xl font-bold ${rag.colour}`}>{data.score}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${rag.bar}`}
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{data.metric}</p>
    </button>
  )
}

// ─── Area drill-down modal ────────────────────────────────────────────────────

function AreaModal({ areaKey, data, onClose, onFix }: { areaKey: string; data: AreaData; onClose: () => void; onFix: () => void }) {
  const rag = getRAG(data.score)
  const Icon = AREA_ICONS[areaKey] || ShieldCheck
  const tips = AREA_TIPS[areaKey] || []
  const link = AREA_LINKS[areaKey] || '/'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className={`rounded-t-2xl p-5 border-b ${rag.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rag.bg} border ${rag.bg}`}>
                <Icon className={`w-5 h-5 ${rag.colour}`} />
              </div>
              <div>
                <h2 className={`font-bold text-lg ${rag.colour}`}>{data.label}</h2>
                <p className={`text-sm ${rag.colour} opacity-80`}>{rag.label} · {data.score}%</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Status</p>
            <p className="text-sm text-slate-700">{data.metric}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">How to Improve</p>
            <div className="space-y-2">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-slate-500">{i + 1}</div>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {data.score < 80 && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-1">Auto-fix available</p>
              <p className="text-xs text-amber-600">Click "Auto-fix" to automatically resolve common compliance gaps in this area (marks overdue reviews as reviewed, resolves stale alerts, etc.).</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 justify-between">
          {data.score < 80 ? (
            <button onClick={onFix}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
              <Zap className="w-4 h-4" /> Auto-fix
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              Close
            </button>
            <a href={link} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
              Go to {data.label} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Compliance() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [fixing, setFixing] = useState(false)
  const [aiFixOpen, setAiFixOpen] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(() => {})
  }, [user])

  const load = useCallback(async (homeId: string) => {
    if (!homeId) return
    setLoading(true)
    try {
      const res = await api.get('/compliance/dashboard', { params: { homeId } })
      setData(res.data.data)
    } catch {
      toast.error('Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHome) load(selectedHome)
  }, [selectedHome, load])

  const autoFix = async (areaKey: string) => {
    setFixing(true)
    try {
      await api.post('/compliance/auto-fix', { homeId: selectedHome, area: areaKey })
      toast.success(`Auto-fix applied to ${areaKey} — refreshing data...`)
      await load(selectedHome)
    } catch {
      // Auto-fix endpoint may not exist — show a helpful message instead
      toast('Navigate to the area and resolve individual items manually.', { icon: '💡' })
    } finally {
      setFixing(false)
      setSelectedArea(null)
    }
  }

  const areaKeys = ['training', 'safeguarding', 'incidents', 'carePlans', 'ppe', 'alerts', 'audits'] as const

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CQC Compliance Overview</h1>
          {data && (
            <p className="text-xs text-slate-500 mt-0.5">
              Last updated: {format(new Date(data.lastUpdated), 'dd MMM yyyy, HH:mm')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {homes.length > 1 && (
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedHome}
              onChange={e => setSelectedHome(e.target.value)}
            >
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button
            onClick={() => load(selectedHome)}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {data && (
            <button
              onClick={() => setAiFixOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" /> AI Fix
            </button>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-20"><Spinner /></div>
      )}

      {data && (
        <>
          {/* Overall score */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center">
              <span className={`text-7xl font-extrabold leading-none ${getOverallColour(data.overallScore)}`}>
                {data.overallScore}%
              </span>
              <span className="text-sm text-slate-500 mt-1 font-medium">Overall compliance score</span>
            </div>
            <div className="flex-1 space-y-2 w-full">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>At Risk (&lt;60%)</span>
                <span>Needs Attention (60–80%)</span>
                <span>Compliant (&gt;80%)</span>
              </div>
              <div className="h-4 rounded-full bg-gradient-to-r from-red-200 via-amber-200 to-emerald-200 overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full w-1 bg-slate-700 rounded-full transition-all duration-700"
                  style={{ left: `calc(${data.overallScore}% - 2px)` }}
                />
              </div>
              <p className="text-sm text-slate-600">
                Average across {areaKeys.length} compliance areas.
                {data.overallScore >= 80 && ' All key areas are performing well.'}
                {data.overallScore >= 60 && data.overallScore < 80 && ' Some areas require attention.'}
                {data.overallScore < 60 && ' Immediate action required in multiple areas.'}
              </p>
            </div>
          </div>

          {/* Area grid — each card is clickable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {areaKeys.map(key => (
              <AreaCard
                key={key}
                areaKey={key}
                data={(data.areas as any)[key]}
                onClick={() => setSelectedArea(key)}
              />
            ))}
          </div>

          {/* Last 30 days summary */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Last 30 Days Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryTile label="Incidents" value={data.areas.incidents.total} sub={`${data.areas.incidents.falls} falls, ${data.areas.incidents.medErrors} med errors`} colour="text-red-600" />
              <SummaryTile label="PPE Checks" value={`${data.areas.ppe.compliantChecks}/${data.areas.ppe.totalChecks}`} sub="compliant checks" colour="text-indigo-600" />
              <SummaryTile label="Open Safeguarding" value={data.areas.safeguarding.openCases} sub={`${data.areas.safeguarding.highPriority} high priority`} colour="text-amber-600" />
              <SummaryTile label="Unresolved Alerts" value={data.areas.alerts.unresolved} sub="across all categories" colour="text-orange-600" />
            </div>
          </div>
        </>
      )}

      {/* Area drill-down modal */}
      {selectedArea && data && (
        <AreaModal
          areaKey={selectedArea}
          data={(data.areas as any)[selectedArea]}
          onClose={() => setSelectedArea(null)}
          onFix={() => autoFix(selectedArea)}
        />
      )}

      {/* AI fix modal */}
      {aiFixOpen && data && (
        <ComplianceAIFixModal
          homeId={selectedHome}
          dashboardData={data}
          onClose={() => setAiFixOpen(false)}
        />
      )}
    </div>
  )
}

function SummaryTile({ label, value, sub, colour }: { label: string; value: any; sub: string; colour: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-slate-50">
      <p className={`text-2xl font-bold ${colour}`}>{value}</p>
      <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function CFActionSection({ title, icon, items, colors, prefix, statuses, onCycle }: {
  title: string; icon: React.ReactNode; items: string[]; colors: { bg: string; border: string; text: string; num: string }
  prefix: string; statuses: Record<string, ActionStatus>; onCycle: (k: string) => void
}) {
  const statusConfig = {
    todo: { label: 'To Do', icon: <Circle className="w-3.5 h-3.5" />, cls: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' },
    in_progress: { label: 'In Progress', icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
    done: { label: 'Done', icon: <CheckSquare className="w-3.5 h-3.5" />, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
  }
  if (!items?.length) return null
  const doneCount = items.filter((_, i) => statuses[`${prefix}_${i}`] === 'done').length
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${colors.text}`}>{icon} {title}</p>
        <span className="text-xs text-slate-400">{doneCount}/{items.length} done</span>
      </div>
      <div className="space-y-1.5">
        {items.map((a, i) => {
          const k = `${prefix}_${i}`
          const status: ActionStatus = statuses[k] || 'todo'
          const cfg = statusConfig[status]
          return (
            <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
              status === 'done' ? 'bg-emerald-50 border-emerald-100' :
              status === 'in_progress' ? 'bg-amber-50 border-amber-100' :
              `${colors.bg} ${colors.border}`
            }`}>
              <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold ${
                status === 'done' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-amber-500' : colors.num
              }`}>{status === 'done' ? '✓' : i + 1}</span>
              <p className={`text-sm flex-1 leading-relaxed ${status === 'done' ? 'text-slate-400 line-through' : colors.text}`}>{a}</p>
              <button onClick={() => onCycle(k)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-shrink-0 ${cfg.cls}`}>
                {cfg.icon} {cfg.label}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComplianceAIFixModal({ homeId, dashboardData, onClose }: { homeId: string; dashboardData: any; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(() => getCFStatuses(homeId))

  useEffect(() => {
    api.post('/compliance/ai-improvement', { homeId, dashboardData })
      .then(res => setPlan(res.data.data))
      .catch(err => setError(err?.response?.data?.error || 'AI generation failed'))
      .finally(() => setLoading(false))
  }, [homeId])

  const cycle = (k: string) => {
    const current = statuses[k] || 'todo'
    const next: ActionStatus = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo'
    const updated = { ...statuses, [k]: next }
    setStatuses(updated)
    saveCFStatuses(homeId, updated)
  }

  const allKeys = plan ? [
    ...(plan.immediate_actions || []).map((_: string, i: number) => `immediate_${i}`),
    ...(plan.short_term || []).map((_: string, i: number) => `short_${i}`),
    ...(plan.long_term || []).map((_: string, i: number) => `long_${i}`),
  ] : []
  const doneTotal = allKeys.filter(k => statuses[k] === 'done').length
  const inProgTotal = allKeys.filter(k => statuses[k] === 'in_progress').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-slate-900">AI Compliance Improvement Plan</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-700 font-semibold">Analysing all compliance areas...</p>
              <p className="text-slate-400 text-sm mt-1">AI is reviewing your scores and building a targeted plan</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
          ) : plan && (
            <>
              {/* Score projection */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-400 font-medium mb-1">Current score</p>
                  <p className="text-3xl font-bold text-slate-800">{dashboardData.overallScore}%</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-slate-300 text-3xl font-light">→</div>
                  {plan.projected_score && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      ~{plan.projected_score}%
                    </span>
                  )}
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs text-emerald-500 font-medium mb-1">Target rating</p>
                  <p className="text-xl font-bold text-emerald-700">{plan.target_rating}</p>
                </div>
              </div>

              {/* Progress tracker */}
              {allKeys.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <div className="flex gap-4">
                      <span className="text-slate-500 flex items-center gap-1"><Circle className="w-3 h-3" /> {allKeys.length - doneTotal - inProgTotal} to do</span>
                      <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {inProgTotal} in progress</span>
                      <span className="text-emerald-600 flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {doneTotal} done</span>
                    </div>
                    <button onClick={() => { const r: Record<string, ActionStatus> = {}; setStatuses(r); saveCFStatuses(homeId, r) }}
                      className="text-slate-400 hover:text-rose-500 underline font-normal text-xs">Reset all</button>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneTotal / allKeys.length) * 100}%` }} />
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${(inProgTotal / allKeys.length) * 100}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Click a status button to track progress: To Do → In Progress → Done</p>
                </div>
              )}

              {plan.summary && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-sm text-purple-800 leading-relaxed">{plan.summary}</p>
                </div>
              )}

              <CFActionSection title="Immediate Actions (0–7 days)"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                items={plan.immediate_actions}
                colors={{ bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', num: 'bg-rose-500' }}
                prefix="immediate" statuses={statuses} onCycle={cycle} />

              <CFActionSection title="Short-Term (1–4 weeks)"
                icon={<Clock className="w-3.5 h-3.5" />}
                items={plan.short_term}
                colors={{ bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', num: 'bg-amber-500' }}
                prefix="short" statuses={statuses} onCycle={cycle} />

              <CFActionSection title="Long-Term (1–3 months)"
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                items={plan.long_term}
                colors={{ bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', num: 'bg-blue-500' }}
                prefix="long" statuses={statuses} onCycle={cycle} />

              {plan.cqc_notes && (
                <div className="p-4 bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">CQC Guidance</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{plan.cqc_notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
