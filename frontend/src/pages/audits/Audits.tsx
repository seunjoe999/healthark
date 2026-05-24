import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import {
  Activity, Plus, CheckCircle, XCircle, AlertTriangle,
  ClipboardList, Shield, Pill, Users, FileText,
  Flame, Zap, Heart, Home, RefreshCw, Trash2, TrendingUp,
  Calendar, User, Award, ChevronRight, Building2,
  ListChecks, Circle, Clock, CheckSquare, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

const AUDIT_TYPES = [
  { value: 'care_plan', label: 'Care Plan Audit', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700', accent: '#9333ea' },
  { value: 'documentation', label: 'Documentation Audit', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700', accent: '#2563eb' },
  { value: 'medication', label: 'Medication Audit', icon: <Pill className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700', accent: '#e11d48' },
  { value: 'mar_chart', label: 'MAR Chart Audit', icon: <Pill className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700', accent: '#db2777' },
  { value: 'incident_analysis', label: 'Incident Analysis', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700', accent: '#d97706' },
  { value: 'nutrition_hydration', label: 'Nutrition & Hydration', icon: <Heart className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700', accent: '#059669' },
  { value: 'safeguarding', label: 'Safeguarding Audit', icon: <Shield className="w-4 h-4" />, color: 'bg-red-100 text-red-700', accent: '#dc2626' },
  { value: 'falls_prevention', label: 'Falls Prevention', icon: <Users className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700', accent: '#ea580c' },
  { value: 'infection_control', label: 'Infection Control', icon: <Zap className="w-4 h-4" />, color: 'bg-teal-100 text-teal-700', accent: '#0d9488' },
  { value: 'fire_safety', label: 'Fire Safety Audit', icon: <Flame className="w-4 h-4" />, color: 'bg-red-100 text-red-700', accent: '#dc2626' },
  { value: 'activity', label: 'Activity Audit', icon: <Activity className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700', accent: '#4f46e5' },
  { value: 'pressure_sore', label: 'Pressure Sore / Skin', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700', accent: '#e11d48' },
  { value: 'one_to_one', label: 'One-to-One Audit', icon: <Users className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700', accent: '#2563eb' },
  { value: 'equipment', label: 'Equipment Audit', icon: <Home className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700', accent: '#475569' },
  { value: 'premises', label: 'Premises Audit', icon: <Home className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700', accent: '#475569' },
  { value: 'mandatory_safety', label: 'Mandatory Safety', icon: <Shield className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700', accent: '#d97706' },
  { value: 'free_template', label: 'Free Template', icon: <FileText className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700', accent: '#475569' },
]

type ActionStatus = 'todo' | 'in_progress' | 'done'

function getActionPlan(auditId: string): Record<number, ActionStatus> {
  try { return JSON.parse(localStorage.getItem(`audit_ap_${auditId}`) || '{}') } catch { return {} }
}
function saveActionPlan(auditId: string, plan: Record<number, ActionStatus>) {
  localStorage.setItem(`audit_ap_${auditId}`, JSON.stringify(plan))
}
function getAIPlan(auditId: string): any[] {
  try { return JSON.parse(localStorage.getItem(`audit_ai_plan_${auditId}`) || '[]') } catch { return [] }
}
function saveAIPlan(auditId: string, items: any[]) {
  localStorage.setItem(`audit_ai_plan_${auditId}`, JSON.stringify(items))
}

function parseRecommendations(text: string): string[] {
  return (text || '').split('\n').map(l => l.replace(/^[-*•] /, '').trim()).filter(Boolean)
}

function parseFindings(text: string) {
  if (!text) return []
  const sections: Array<{ type: string; content: string }> = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('## ') || line.startsWith('# ')) {
      sections.push({ type: 'heading', content: line.replace(/^#+\s*/, '') })
    } else if (line.startsWith('### ')) {
      sections.push({ type: 'subheading', content: line.replace('### ', '') })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      sections.push({ type: 'bullet', content: line.replace(/^[-*] /, '') })
    } else if (line.startsWith('✅')) {
      sections.push({ type: 'pass', content: line.replace('✅', '').trim() })
    } else if (line.startsWith('⚠️')) {
      sections.push({ type: 'warn', content: line.replace('⚠️', '').trim() })
    } else if (line.startsWith('❌')) {
      sections.push({ type: 'fail', content: line.replace('❌', '').trim() })
    } else if (!line.startsWith('**Period:**')) {
      sections.push({ type: 'text', content: line })
    }
  }
  return sections
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => i % 2 === 1
    ? <strong key={i} className="font-semibold text-slate-900">{part}</strong>
    : <span key={i}>{part}</span>)
}

function ratingFromScore(score: number) {
  if (score >= 90) return { label: 'Outstanding', bar: '#059669', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  if (score >= 75) return { label: 'Good', bar: '#2563eb', badge: 'text-blue-700 bg-blue-50 border-blue-200' }
  if (score >= 60) return { label: 'Requires Improvement', bar: '#d97706', badge: 'text-amber-700 bg-amber-50 border-amber-200' }
  return { label: 'Inadequate', bar: '#dc2626', badge: 'text-rose-700 bg-rose-50 border-rose-200' }
}

export default function Audits() {
  const { user, isRole } = useAuth()
  const [audits, setAudits] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [polling, setPolling] = useState<string | null>(null)
  const [actionPlanOpen, setActionPlanOpen] = useState(false)
  const [actionPlanAutoAI, setActionPlanAutoAI] = useState(false)
  const [complianceFixOpen, setComplianceFixOpen] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      await load()
      const audit = (await api.get(`/audits/${polling}`)).data.data
      if (audit.status !== 'generating') {
        setPolling(null)
        setSelectedAudit(audit)
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [polling])

  const load = async () => {
    try {
      const res = await api.get('/audits', { params: { homeId: selectedHome } })
      setAudits(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const generate = async (auditType: string, customName: string) => {
    setGenerating(true)
    try {
      const res = await api.post('/audits/generate', { homeId: selectedHome, auditType, customName })
      const auditId = res.data.data.id
      toast.success('Audit started — generating report...')
      setGenerateOpen(false)
      setPolling(auditId)
      await load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setGenerating(false) }
  }

  const deleteAudit = async (id: string) => {
    if (!window.confirm('Delete this audit report?')) return
    try {
      await api.delete(`/audits/${id}`)
      setAudits(prev => prev.filter(a => a.id !== id))
      if (selectedAudit?.id === id) setSelectedAudit(null)
      toast.success('Audit deleted')
    } catch { toast.error('Failed to delete') }
  }

  const completedCount = audits.filter(a => a.status === 'completed').length
  const selectedHomeObj = homes.find(h => h.id === selectedHome)

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-purple-600" /> Audit Reports
            </h2>
            <button onClick={load} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {homes.length > 1 && (
            <select className="input mb-3 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button size="sm" className="w-full" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setGenerateOpen(true)}>
            Generate audit
          </Button>
          <p className="text-xs text-slate-400 mt-2">{completedCount} completed report{completedCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <Spinner size="sm" /> : audits.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No audits yet — generate your first report above</p>
            </div>
          ) : audits.map((audit: any) => {
            const typeInfo = AUDIT_TYPES.find(t => t.value === audit.audit_type)
            const isSelected = selectedAudit?.id === audit.id
            const score = audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : null
            const ap = audit.id ? getActionPlan(audit.id) : {}
            const apDone = Object.values(ap).filter(s => s === 'done').length
            const recs = parseRecommendations(audit.recommendations || '')
            return (
              <button key={audit.id} onClick={() => setSelectedAudit(audit)}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {audit.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : audit.status === 'failed' ? <XCircle className="w-4 h-4 text-rose-400" />
                      : <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                      {audit.custom_name || typeInfo?.label || audit.audit_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {audit.generated_at ? format(new Date(audit.generated_at), 'd MMM yyyy')
                        : audit.created_at ? format(new Date(audit.created_at), 'd MMM yyyy') : ''}
                    </p>
                    {score !== null && (
                      <div className="mt-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-1">
                          <div className="h-1 rounded-full transition-all"
                            style={{ width: `${score}%`, background: score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }} />
                        </div>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }}>
                          {score}%
                        </p>
                      </div>
                    )}
                    {recs.length > 0 && apDone > 0 && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">{apDone}/{recs.length} actions done</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selectedAudit ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Select an audit report</p>
              <p className="text-slate-300 text-sm mt-1">Or generate a new compliance audit</p>
            </div>
          </div>
        ) : (
          <AuditReport
            audit={selectedAudit}
            homeName={selectedHomeObj?.name}
            homeAddress={selectedHomeObj?.address1}
            canDelete={isRole('home_manager', 'group_admin')}
            onDelete={deleteAudit}
            onOpenActionPlan={() => { setActionPlanAutoAI(false); setActionPlanOpen(true) }}
            onAIActionPlan={() => { setActionPlanAutoAI(true); setActionPlanOpen(true) }}
            onAIComplianceFix={() => setComplianceFixOpen(true)}
          />
        )}
      </div>

      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} onGenerate={generate} loading={generating} />

      {selectedAudit && actionPlanOpen && (
        <ActionPlanModal
          audit={selectedAudit}
          autoGenerate={actionPlanAutoAI}
          onClose={() => { setActionPlanOpen(false); setActionPlanAutoAI(false) }}
        />
      )}
      {selectedAudit && complianceFixOpen && (
        <AIComplianceFixModal
          audit={selectedAudit}
          onClose={() => setComplianceFixOpen(false)}
          onGenerateNew={() => setGenerateOpen(true)}
        />
      )}
    </div>
  )
}

function AuditReport({ audit, homeName, homeAddress, canDelete, onDelete, onOpenActionPlan, onAIActionPlan, onAIComplianceFix }: {
  audit: any; homeName?: string; homeAddress?: string
  canDelete?: boolean; onDelete: (id: string) => void; onOpenActionPlan: () => void
  onAIActionPlan?: () => void; onAIComplianceFix?: () => void
}) {
  const typeInfo = AUDIT_TYPES.find(t => t.value === audit.audit_type)
  const score = audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : null
  const rating = score !== null ? ratingFromScore(score) : null
  const findings = parseFindings(audit.findings || '')
  const recommendations = parseRecommendations(audit.recommendations || '')
  const actionPlan = audit.id ? getActionPlan(audit.id) : {}
  const apDone = Object.values(actionPlan).filter(s => s === 'done').length
  const apInProgress = Object.values(actionPlan).filter(s => s === 'in_progress').length
  const isGenerating = audit.status === 'generating'

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* Cover card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="h-1.5 w-full" style={{ background: typeInfo?.accent ? `linear-gradient(90deg, ${typeInfo.accent}, ${typeInfo.accent}80)` : 'linear-gradient(90deg, #9333ea, #9333ea50)' }} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {typeInfo && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeInfo.color}`}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                )}
                {isGenerating ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Generating...
                  </span>
                ) : audit.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl text-slate-900 font-bold leading-tight">
                {audit.custom_name || typeInfo?.label || audit.audit_type?.replace(/_/g, ' ')}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">Internal Compliance Audit Report</p>
            </div>
            {canDelete && (
              <button onClick={() => onDelete(audit.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors flex-shrink-0 ml-4">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {homeName && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Care Home</p>
                  <p className="text-sm text-slate-800 font-semibold">{homeName}</p>
                  {homeAddress && <p className="text-xs text-slate-400 mt-0.5">{homeAddress}</p>}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Generated</p>
                <p className="text-sm text-slate-800 font-semibold">
                  {audit.generated_at
                    ? format(new Date(audit.generated_at), 'd MMM yyyy, HH:mm')
                    : format(new Date(audit.created_at), 'd MMM yyyy, HH:mm')}
                </p>
              </div>
            </div>
            {audit.generated_by_name && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Auditor</p>
                  <p className="text-sm text-slate-800 font-semibold">{audit.generated_by_name}</p>
                </div>
              </div>
            )}
            {(audit.period_from || audit.period_to) && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Audit Period</p>
                  <p className="text-sm text-slate-800 font-semibold">
                    {audit.period_from ? format(new Date(audit.period_from), 'd MMM yyyy') : '—'}
                    {' – '}
                    {audit.period_to ? format(new Date(audit.period_to), 'd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {audit.status === 'completed' && score !== null && rating && (
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Compliance Score
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${rating.badge}`}>
                    {rating.label}
                  </span>
                  {onAIComplianceFix && (
                    <button onClick={onAIComplianceFix}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                      <Zap className="w-3 h-3" /> AI Fix
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, background: rating.bar }} />
                  </div>
                </div>
                <p className="text-2xl font-bold font-display text-slate-900 w-16 text-right">{score}%</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xl font-bold text-slate-800 font-display">{audit.total_checks}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Total checks</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xl font-bold text-emerald-700 font-display">{audit.checks_passed}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Passed</p>
                </div>
                <div className={`text-center p-3 rounded-xl border ${audit.checks_failed > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-xl font-bold font-display ${audit.checks_failed > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {audit.checks_failed}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${audit.checks_failed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {audit.checks_failed > 0 ? 'Flagged' : 'No issues'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-5 text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-slate-800">Generating audit report...</p>
          <p className="text-slate-400 text-sm mt-1">The AI is analysing your care data. This may take a moment.</p>
        </div>
      )}

      {/* Findings */}
      {audit.findings && !isGenerating && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <ClipboardList className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Audit Findings</h2>
          </div>
          <div className="p-6 space-y-2">
            {findings.map((item, i) => {
              if (item.type === 'heading') return (
                <div key={i} className="pt-4 first:pt-0">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: typeInfo?.accent || '#9333ea' }} />
                    <h3 className="font-bold text-slate-800 text-sm">{item.content}</h3>
                  </div>
                </div>
              )
              if (item.type === 'subheading') return (
                <div key={i} className="pt-2">
                  <p className="font-semibold text-slate-700 text-sm">{item.content}</p>
                </div>
              )
              if (item.type === 'bullet') return (
                <div key={i} className="flex items-start gap-2.5 pl-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 mt-2" />
                  <p className="text-sm text-slate-600 leading-relaxed">{renderBold(item.content)}</p>
                </div>
              )
              if (item.type === 'pass') return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 font-medium">{item.content}</p>
                </div>
              )
              if (item.type === 'warn') return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 font-medium">{item.content}</p>
                </div>
              )
              if (item.type === 'fail') return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 font-medium">{item.content}</p>
                </div>
              )
              if (item.type === 'text') return (
                <p key={i} className="text-sm text-slate-600 leading-relaxed pl-3">{renderBold(item.content)}</p>
              )
              return null
            })}
          </div>
        </div>
      )}

      {/* Recommendations & Action Plan button */}
      {recommendations.length > 0 && !isGenerating && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/60">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Recommendations & Action Plan
              </h2>
              <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {recommendations.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onAIActionPlan && (
                <button onClick={onAIActionPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                  <Zap className="w-3 h-3" /> AI Plan
                </button>
              )}
              <Button
                size="sm"
                icon={<ListChecks className="w-3.5 h-3.5" />}
                onClick={onOpenActionPlan}
              >
                Manage action plan
              </Button>
            </div>
          </div>

          {/* Action plan summary bar */}
          {Object.keys(actionPlan).length > 0 && (
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Circle className="w-3.5 h-3.5" /> {recommendations.length - apDone - apInProgress} to do
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> {apInProgress} in progress
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckSquare className="w-3.5 h-3.5" /> {apDone} done
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(apDone / recommendations.length) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${(apInProgress / recommendations.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="p-6 pt-4 space-y-2">
            {recommendations.map((line, i) => {
              const status: ActionStatus = actionPlan[i] || 'todo'
              const isPositive = line.toLowerCase().includes('no immediate') || line.toLowerCase().includes('no action')
              return (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  status === 'done' ? 'bg-emerald-50 border-emerald-100'
                  : status === 'in_progress' ? 'bg-amber-50 border-amber-100'
                  : isPositive ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-white border-slate-200'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold flex-shrink-0 ${
                    status === 'done' ? 'bg-emerald-500 text-white'
                    : status === 'in_progress' ? 'bg-amber-500 text-white'
                    : isPositive ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {status === 'done' ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <p className={`text-sm font-medium flex-1 ${
                    status === 'done' ? 'text-emerald-700 line-through decoration-emerald-400'
                    : status === 'in_progress' ? 'text-amber-800'
                    : isPositive ? 'text-emerald-700' : 'text-slate-800'
                  }`}>{line}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {audit.status === 'completed' && (
        <div className="bg-slate-800 rounded-2xl p-5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-white text-sm font-semibold">Audit complete</p>
              <p className="text-slate-400 text-xs">Generated by CompCare Hub AI audit engine</p>
            </div>
          </div>
          {score !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold font-display text-white">{score}%</p>
              <p className="text-slate-400 text-xs">{rating?.label}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function ActionPlanModal({ audit, onClose, autoGenerate = false }: {
  audit: any; onClose: () => void; autoGenerate?: boolean
}) {
  const recommendations = parseRecommendations(audit.recommendations || '')
  const [plan, setPlan] = useState<Record<number, ActionStatus>>(() => getActionPlan(audit.id))
  const [aiItems, setAiItems] = useState<any[]>(() => getAIPlan(audit.id))
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const hasAI = aiItems.length > 0
  const displayItems: any[] = hasAI ? aiItems : recommendations.map(r => ({ recommendation: r }))

  useEffect(() => {
    if (autoGenerate && !hasAI && recommendations.length > 0) generateAIPlan()
  }, [])

  const generateAIPlan = async () => {
    setAiLoading(true)
    setAiError('')
    try {
      const res = await api.post(`/audits/${audit.id}/ai-action-plan`)
      const items: any[] = res.data.data || []
      setAiItems(items)
      saveAIPlan(audit.id, items)
      const updated = { ...plan }
      items.forEach((_: any, i: number) => { if (!updated[i]) updated[i] = 'todo' })
      setPlan(updated)
      saveActionPlan(audit.id, updated)
    } catch (err: any) {
      setAiError(err?.response?.data?.error || 'AI generation failed — please try again')
    } finally {
      setAiLoading(false)
    }
  }

  const cycle = (idx: number) => {
    const current = plan[idx] || 'todo'
    const next: ActionStatus = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo'
    const updated = { ...plan, [idx]: next }
    setPlan(updated)
    saveActionPlan(audit.id, updated)
  }

  const reset = () => { setPlan({}); saveActionPlan(audit.id, {}) }
  const clearAndRegenerate = () => { setAiItems([]); saveAIPlan(audit.id, []); generateAIPlan() }

  const done = Object.values(plan).filter(s => s === 'done').length
  const inProgress = Object.values(plan).filter(s => s === 'in_progress').length
  const todo = displayItems.length - done - inProgress

  const statusConfig = {
    todo: { label: 'To Do', icon: <Circle className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' },
    in_progress: { label: 'In Progress', icon: <Clock className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
    done: { label: 'Done', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
  }

  return (
    <Modal open={true} onClose={onClose} title="Action Plan" size="lg">
      <div className="space-y-4">

        {/* AI banner */}
        {!hasAI && !aiLoading && (
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-sm text-purple-800 font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600 flex-shrink-0" />
              Let AI build a detailed plan with deadlines, who's responsible, and expected outcomes
            </p>
            <button onClick={generateAIPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors ml-3 flex-shrink-0">
              <Zap className="w-3 h-3" /> Generate with AI
            </button>
          </div>
        )}

        {aiLoading && (
          <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-purple-800 font-medium">AI is building your action plan...</p>
          </div>
        )}

        {aiError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between gap-3">
            <span>{aiError}</span>
            <button onClick={generateAIPlan} className="text-xs font-semibold underline flex-shrink-0">Retry</button>
          </div>
        )}

        {hasAI && (
          <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
            <span className="text-xs text-purple-700 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> AI-generated · {aiItems.length} items
            </span>
            <button onClick={clearAndRegenerate} className="text-xs text-purple-500 hover:text-purple-700 underline">Regenerate</button>
          </div>
        )}

        {/* Stats + progress */}
        {!aiLoading && displayItems.length > 0 && (
          <>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl text-sm font-semibold">
              <span className="text-slate-500 flex items-center gap-1.5"><Circle className="w-4 h-4" /> {todo} to do</span>
              <span className="text-amber-600 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {inProgress} in progress</span>
              <span className="text-emerald-600 flex items-center gap-1.5"><CheckSquare className="w-4 h-4" /> {done} done</span>
              <div className="flex-1" />
              <button onClick={reset} className="text-xs text-slate-400 hover:text-rose-500 underline font-normal">Reset all</button>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / displayItems.length) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${(inProgress / displayItems.length) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-400">Click a status to cycle: To Do → In Progress → Done</p>
          </>
        )}

        {/* Items */}
        {!aiLoading && (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {displayItems.map((item: any, i: number) => {
              const status: ActionStatus = plan[i] || 'todo'
              const cfg = statusConfig[status]
              return (
                <div key={i} className={`rounded-xl border transition-colors ${
                  status === 'done' ? 'bg-emerald-50 border-emerald-100'
                  : status === 'in_progress' ? 'bg-amber-50 border-amber-100'
                  : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start gap-3 p-3">
                    <span className="text-slate-400 text-xs font-bold w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}>
                        {item.recommendation}
                      </p>
                      {hasAI && (
                        <div className="mt-2 space-y-1.5">
                          {item.action && (
                            <p className="text-xs text-slate-600 border-l-2 border-purple-300 pl-2 leading-relaxed">{item.action}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.priority && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border capitalize ${PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.medium}`}>
                                {item.priority}
                              </span>
                            )}
                            {item.who && <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{item.who}</span>}
                            {item.deadline && <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{item.deadline}</span>}
                          </div>
                          {item.expected_outcome && (
                            <p className="text-xs text-emerald-700 font-medium">{item.expected_outcome}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => cycle(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-shrink-0 ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

const FIX_LABELS: Record<string, string> = {
  care_plans_review: 'Mark overdue care plans as reviewed',
  alerts_resolve: 'Resolve all open alerts',
  safeguarding_ack: 'Acknowledge all safeguarding concerns',
  training_extend: 'Extend expiring training by 1 year',
  incidents_acknowledge: 'Mark incidents as manager reviewed',
  fluid_alerts_create: 'Create alerts for low fluid intake',
  ppe_restock_alerts: 'Create alerts for low PPE stock',
  care_plans_create: 'Create missing care plans for residents',
  daily_records_create: 'Create daily records for residents with no entries today',
}

function FixSection({ title, icon, items, color, bg, border, num, allDone }: {
  title: string; icon: React.ReactNode; items: string[]
  color: string; bg: string; border: string; num: string; allDone: boolean
}) {
  if (!items?.length) return null
  return (
    <div>
      <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 ${color}`}>{icon} {title}</p>
      <div className="space-y-1.5">
        {items.map((a, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${allDone ? 'bg-emerald-50 border-emerald-100' : `${bg} ${border}`}`}>
            <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold ${allDone ? 'bg-emerald-500' : num}`}>
              {allDone ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <p className={`text-sm flex-1 leading-relaxed ${allDone ? 'text-slate-400 line-through' : color}`}>{a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIComplianceFixModal({ audit, onClose, onGenerateNew }: { audit: any; onClose: () => void; onGenerateNew?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execResults, setExecResults] = useState<Array<{ fix: string; status: string; detail: string }> | null>(null)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    api.post(`/audits/${audit.id}/ai-compliance-fix`)
      .then(res => setPlan(res.data.data))
      .catch(err => setError(err?.response?.data?.error || 'AI generation failed'))
      .finally(() => setLoading(false))
  }, [audit.id])

  const executeFixes = async () => {
    if (!plan?.available_fixes?.length) return
    setExecuting(true)
    try {
      const homeId = plan.home_id || audit.home_id
      const res = await api.post('/compliance/execute-fix', { homeId, fixes: plan.available_fixes })
      setExecResults(res.data.data?.results || [])
      setAllDone(true)
      toast.success('All fixes applied successfully!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fix execution failed')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="AI Compliance Improvement Plan" size="lg">
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Analysing compliance gaps...</p>
            <p className="text-slate-400 text-sm mt-1">AI is building your improvement plan</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
        ) : plan ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Score projection */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 font-medium mb-1">Current</p>
                <p className="text-lg font-bold text-slate-800">{plan.current_rating}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-slate-300 text-2xl">→</div>
                {plan.projected_score && (
                  <span className="text-xs text-emerald-600 font-semibold">~{plan.projected_score}%</span>
                )}
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-xs text-emerald-500 font-medium mb-1">Target</p>
                <p className="text-lg font-bold text-emerald-700">{plan.target_rating}</p>
              </div>
            </div>

            {/* Auto-fix banner */}
            {plan.available_fixes?.length > 0 && !execResults && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> {plan.available_fixes.length} issue{plan.available_fixes.length !== 1 ? 's' : ''} can be auto-fixed by AI right now
                    </p>
                    <ul className="space-y-0.5">
                      {plan.available_fixes.map((f: string) => (
                        <li key={f} className="text-xs text-purple-700 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" /> {FIX_LABELS[f] || f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={executeFixes} disabled={executing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 transition-colors flex-shrink-0 shadow-sm">
                    {executing
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Fixing...</>
                      : <><Zap className="w-4 h-4" /> Execute All Fixes</>}
                  </button>
                </div>
              </div>
            )}

            {/* Execution results */}
            {execResults && (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                  <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                    <CheckCircle className="w-4 h-4" /> Auto-fix complete
                  </p>
                  {execResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${r.status === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {r.status === 'ok' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {r.detail}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
                  <p className="text-sm text-purple-800 font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    Fixes applied! Generate a new audit to see your updated compliance score.
                  </p>
                  {onGenerateNew && (
                    <button onClick={() => { onClose(); onGenerateNew() }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors flex-shrink-0">
                      <Activity className="w-3.5 h-3.5" /> New Audit
                    </button>
                  )}
                </div>
              </div>
            )}

            {plan.summary && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-sm text-purple-800 leading-relaxed">{plan.summary}</p>
              </div>
            )}

            <FixSection title="Immediate Actions (0–7 days)" icon={<AlertTriangle className="w-3.5 h-3.5" />}
              items={plan.immediate_actions} color="text-rose-700" bg="bg-rose-50" border="border-rose-100" num="bg-rose-500" allDone={allDone} />

            <FixSection title="Short-Term (1–4 weeks)" icon={<Clock className="w-3.5 h-3.5" />}
              items={plan.short_term} color="text-amber-700" bg="bg-amber-50" border="border-amber-100" num="bg-amber-500" allDone={allDone} />

            <FixSection title="Long-Term (1–3 months)" icon={<TrendingUp className="w-3.5 h-3.5" />}
              items={plan.long_term} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" num="bg-blue-500" allDone={allDone} />

            {plan.cqc_notes && (
              <div className="p-4 bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">CQC Guidance</p>
                <p className="text-sm text-slate-200 leading-relaxed">{plan.cqc_notes}</p>
              </div>
            )}
          </div>
        ) : null}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

function GenerateModal({ open, onClose, onGenerate, loading }: {
  open: boolean; onClose: () => void; onGenerate: (type: string, name: string) => void; loading: boolean
}) {
  const [auditType, setAuditType] = useState('care_plan')
  const [customName, setCustomName] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Generate audit report" size="md">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">
          Select an audit type. The AI will analyse your live care data and produce a detailed compliance report.
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {AUDIT_TYPES.map(t => (
            <button key={t.value} onClick={() => setAuditType(t.value)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${auditType === t.value ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <span className={`p-1.5 rounded-lg ${t.color} flex-shrink-0`}>{t.icon}</span>
              <span className={`text-xs font-semibold leading-tight ${auditType === t.value ? 'text-purple-900' : 'text-slate-700'}`}>{t.label}</span>
            </button>
          ))}
        </div>
        {auditType === 'free_template' && (
          <div>
            <label className="label">Custom audit name</label>
            <input className="input" placeholder="e.g. End of Year Compliance Review" value={customName} onChange={e => setCustomName(e.target.value)} />
          </div>
        )}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} icon={<Activity className="w-4 h-4" />} onClick={() => onGenerate(auditType, customName)}>
            Generate report
          </Button>
        </div>
      </div>
    </Modal>
  )
}
