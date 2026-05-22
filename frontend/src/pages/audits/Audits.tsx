import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import {
  Activity, Plus, CheckCircle, XCircle, AlertTriangle,
  ClipboardList, Shield, Pill, Users, FileText,
  Flame, Zap, Heart, Home, RefreshCw, Trash2, TrendingUp,
  Calendar, User, Award, ChevronRight, Printer, Building2
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

function parseFindings(text: string) {
  if (!text) return []
  const sections: Array<{ type: string; content: string; heading?: string }> = []
  let currentHeading = ''
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('## ') || line.startsWith('# ')) {
      currentHeading = line.replace(/^#+\s*/, '')
      sections.push({ type: 'heading', content: currentHeading })
    } else if (line.startsWith('### ')) {
      sections.push({ type: 'subheading', content: line.replace('### ', '') })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      sections.push({ type: 'bullet', content: line.replace(/^[-*] /, ''), heading: currentHeading })
    } else if (line.startsWith('✅')) {
      sections.push({ type: 'pass', content: line.replace('✅', '').trim() })
    } else if (line.startsWith('⚠️')) {
      sections.push({ type: 'warn', content: line.replace('⚠️', '').trim() })
    } else if (line.startsWith('❌')) {
      sections.push({ type: 'fail', content: line.replace('❌', '').trim() })
    } else if (line.startsWith('**Period:**')) {
      sections.push({ type: 'meta', content: line.replace('**Period:**', '').trim() })
    } else {
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

function ComplianceRating({ score }: { score: number }) {
  const label = score >= 90 ? 'Outstanding' : score >= 75 ? 'Good' : score >= 60 ? 'Requires Improvement' : 'Inadequate'
  const color = score >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : score >= 75 ? 'text-blue-700 bg-blue-50 border-blue-200'
    : score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-rose-700 bg-rose-50 border-rose-200'
  const barColor = score >= 90 ? '#059669' : score >= 75 ? '#2563eb' : score >= 60 ? '#d97706' : '#dc2626'
  return { label, color, barColor }
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

  const selectedHome_obj = homes.find(h => h.id === selectedHome)

  return (
    <div className="flex h-full">
      {/* Left panel — audit list */}
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
            return (
              <button key={audit.id} onClick={() => setSelectedAudit(audit)}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {audit.status === 'completed'
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : audit.status === 'failed'
                      ? <XCircle className="w-4 h-4 text-rose-400" />
                      : <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                      {audit.custom_name || typeInfo?.label || audit.audit_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {audit.generated_at
                        ? format(new Date(audit.generated_at), 'd MMM yyyy')
                        : audit.created_at ? format(new Date(audit.created_at), 'd MMM yyyy') : ''}
                    </p>
                    {score !== null && (
                      <div className="mt-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-1">
                          <div className="h-1 rounded-full transition-all"
                            style={{ width: `${score}%`, background: score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }} />
                        </div>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }}>
                          {score}% compliance
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel — audit detail */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selectedAudit ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Select an audit report</p>
              <p className="text-slate-300 text-sm mt-1">Or generate a new compliance audit above</p>
            </div>
          </div>
        ) : (
          <AuditReport
            audit={selectedAudit}
            homeName={selectedHome_obj?.name}
            homeAddress={selectedHome_obj?.address1}
            onDelete={isRole('home_manager', 'group_admin') ? deleteAudit : undefined}
          />
        )}
      </div>

      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} onGenerate={generate} loading={generating} />
    </div>
  )
}

function AuditReport({ audit, homeName, homeAddress, onDelete }: {
  audit: any; homeName?: string; homeAddress?: string; onDelete?: (id: string) => void
}) {
  const typeInfo = AUDIT_TYPES.find(t => t.value === audit.audit_type)
  const score = audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : null
  const rating = score !== null ? ComplianceRating({ score }) : null
  const findings = parseFindings(audit.findings || '')
  const recommendations = (audit.recommendations || '').split('\n').filter((l: string) => l.trim()).map((l: string) => l.replace(/^[-*•] /, '').trim())

  const isGenerating = audit.status === 'generating'

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* Report cover header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ background: typeInfo?.accent ? `linear-gradient(90deg, ${typeInfo.accent}, ${typeInfo.accent}80)` : 'linear-gradient(90deg, #9333ea, #9333ea80)' }} />

        <div className="p-6">
          {/* Report meta */}
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
              <p className="text-slate-400 text-sm mt-0.5">Internal Audit Report</p>
            </div>
            {onDelete && (
              <button onClick={() => onDelete(audit.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors flex-shrink-0 ml-4">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>

          {/* Report info grid */}
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
                    {' to '}
                    {audit.period_to ? format(new Date(audit.period_to), 'd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Compliance score */}
          {audit.status === 'completed' && score !== null && rating && (
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Overall Compliance Score
                </p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${rating.color}`}>
                  {rating.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, background: rating.barColor }} />
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

      {/* Audit Findings */}
      {audit.findings && !isGenerating && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50">
            <ClipboardList className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Audit Findings</h2>
          </div>
          <div className="p-6 space-y-2">
            {findings.map((item, i) => {
              if (item.type === 'meta') return null
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

      {/* Recommendations / Action Plan */}
      {audit.recommendations && !isGenerating && recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">Recommendations & Action Plan</h2>
          </div>
          <div className="p-6 space-y-3">
            {recommendations.map((line: string, i: number) => {
              const isPositive = line.toLowerCase().includes('no immediate') || line.toLowerCase().includes('no action')
              return (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${isPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPositive ? '✓' : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isPositive ? 'text-emerald-700' : 'text-slate-800'}`}>{line}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Report footer */}
      {audit.status === 'completed' && (
        <div className="bg-slate-800 rounded-2xl p-5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-white text-sm font-semibold">Audit complete</p>
              <p className="text-slate-400 text-xs">Report generated by CompCare Hub AI audit engine</p>
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
