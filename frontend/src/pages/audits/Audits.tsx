import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import {
  Activity, Plus, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  ChevronDown, ClipboardList, Shield, Pill, Users, FileText,
  Flame, Zap, Heart, Home, RefreshCw, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const AUDIT_TYPES = [
  { value: 'care_plan', label: 'Care Plan Audit', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'documentation', label: 'Documentation Audit', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'medication', label: 'Medication Audit', icon: <Pill className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
  { value: 'mar_chart', label: 'MAR Chart Audit', icon: <Pill className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
  { value: 'incident_analysis', label: 'Incident Analysis', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  { value: 'nutrition_hydration', label: 'Nutrition & Hydration', icon: <Heart className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'safeguarding', label: 'Safeguarding Audit', icon: <Shield className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  { value: 'falls_prevention', label: 'Falls Prevention', icon: <Users className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
  { value: 'infection_control', label: 'Infection Control', icon: <Zap className="w-4 h-4" />, color: 'bg-teal-100 text-teal-700' },
  { value: 'fire_safety', label: 'Fire Safety Audit', icon: <Flame className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  { value: 'activity', label: 'Activity Audit', icon: <Activity className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'pressure_sore', label: 'Pressure Sore / Skin', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
  { value: 'one_to_one', label: 'One-to-One Audit', icon: <Users className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'equipment', label: 'Equipment Audit', icon: <Home className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700' },
  { value: 'premises', label: 'Premises Audit', icon: <Home className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700' },
  { value: 'mandatory_safety', label: 'Mandatory Safety', icon: <Shield className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  { value: 'free_template', label: 'Free Template', icon: <FileText className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700' },
]

function parseMarkdown(text: string) {
  if (!text) return []
  const lines = text.split('\n')
  const sections: Array<{ type: string; content: string; level?: number }> = []
  for (const line of lines) {
    if (line.startsWith('## ')) sections.push({ type: 'h2', content: line.replace('## ', '') })
    else if (line.startsWith('### ')) sections.push({ type: 'h3', content: line.replace('### ', '') })
    else if (line.startsWith('- ') || line.startsWith('* ')) sections.push({ type: 'bullet', content: line.replace(/^[-*] /, '') })
    else if (line.startsWith('✅') || line.startsWith('⚠️') || line.startsWith('❌')) sections.push({ type: 'alert', content: line })
    else if (line.startsWith('**Period:**')) sections.push({ type: 'period', content: line.replace('**Period:**', '').trim() })
    else if (line.trim()) sections.push({ type: 'text', content: line })
  }
  return sections
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : <span key={i}>{part}</span>)
}

export default function Audits() {
  const { user } = useAuth()
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

  // Poll for generating audits
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

  const completedCount = audits.filter(a => a.status === 'completed').length
  const failedCount = audits.filter(a => a.status === 'failed').length

  return (
    <div className="flex h-full">
      {/* Left — audit list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" /> Audit Engine
            </h2>
            <button onClick={load} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">{completedCount} completed · {failedCount} failed</p>
          {homes.length > 1 && (
            <select className="input mb-3 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button className="w-full" icon={<Plus className="w-4 h-4" />} onClick={() => setGenerateOpen(true)}>
            Generate audit
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? <Spinner size="sm" /> : audits.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No audits yet</p>
              <p className="text-xs text-slate-300 mt-1">Generate your first audit above</p>
            </div>
          ) : audits.map((audit: any) => {
            const typeInfo = AUDIT_TYPES.find(t => t.value === audit.audit_type)
            const isSelected = selectedAudit?.id === audit.id
            return (
              <button key={audit.id} onClick={() => setSelectedAudit(audit)}
                className={`w-full text-left px-4 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {audit.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     audit.status === 'failed' ? <XCircle className="w-4 h-4 text-rose-400" /> :
                     <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                      {audit.custom_name || typeInfo?.label || audit.audit_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {audit.generated_at ? format(new Date(audit.generated_at), 'd MMM yyyy, HH:mm') :
                       audit.created_at ? format(new Date(audit.created_at), 'd MMM yyyy, HH:mm') : ''}
                    </p>
                    {audit.status === 'completed' && audit.checks_passed != null && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        ✓ {audit.checks_passed} passed{audit.checks_failed > 0 ? ` · ${audit.checks_failed} flagged` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — audit detail */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selectedAudit ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select an audit to view" description="Generate a new audit or select one from the list" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6">
            {/* Audit header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {(() => { const ti = AUDIT_TYPES.find(t => t.value === selectedAudit.audit_type); return ti ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${ti.color}`}>{ti.icon}{ti.label}</span> : null })()}
                  </div>
                  <h1 className="font-display text-2xl text-slate-900 mt-2">
                    {selectedAudit.custom_name || AUDIT_TYPES.find(t => t.value === selectedAudit.audit_type)?.label || selectedAudit.audit_type}
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Generated {selectedAudit.generated_at ? format(new Date(selectedAudit.generated_at), 'd MMMM yyyy, HH:mm') : format(new Date(selectedAudit.created_at), 'd MMMM yyyy, HH:mm')}
                    {selectedAudit.generated_by_name && ` by ${selectedAudit.generated_by_name}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Period: {selectedAudit.period_from ? format(new Date(selectedAudit.period_from), 'd MMM yyyy') : ''} – {selectedAudit.period_to ? format(new Date(selectedAudit.period_to), 'd MMM yyyy') : ''}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {selectedAudit.status === 'completed' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-200">
                      <CheckCircle className="w-4 h-4" /> Completed
                    </span>
                  ) : selectedAudit.status === 'generating' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-200">
                      <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-sm font-semibold border border-rose-200">
                      <XCircle className="w-4 h-4" /> Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Score cards */}
              {selectedAudit.status === 'completed' && selectedAudit.total_checks > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-900 font-display">{selectedAudit.total_checks}</p>
                    <p className="text-xs text-slate-400 font-medium">Total checks</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-700 font-display">{selectedAudit.checks_passed}</p>
                    <p className="text-xs text-emerald-600 font-medium">Passed</p>
                  </div>
                  <div className={`text-center p-3 rounded-xl ${selectedAudit.checks_failed > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                    <p className={`text-2xl font-bold font-display ${selectedAudit.checks_failed > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{selectedAudit.checks_failed}</p>
                    <p className={`text-xs font-medium ${selectedAudit.checks_failed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Flagged</p>
                  </div>
                </div>
              )}
            </div>

            {/* Findings */}
            {selectedAudit.findings && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-4">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" /> Audit Findings
                </h2>
                <div className="space-y-2">
                  {parseMarkdown(selectedAudit.findings).map((item, i) => {
                    if (item.type === 'h2') return null
                    if (item.type === 'period') return null
                    if (item.type === 'h3') return (
                      <div key={i} className="pt-3 pb-1 border-t border-slate-100 first:pt-0 first:border-0">
                        <h3 className="font-semibold text-slate-800 text-sm">{item.content}</h3>
                      </div>
                    )
                    if (item.type === 'bullet') return (
                      <div key={i} className="flex items-start gap-2.5 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                        <p className="text-sm text-slate-600 leading-relaxed">{renderBold(item.content)}</p>
                      </div>
                    )
                    if (item.type === 'alert') {
                      const isGood = item.content.startsWith('✅')
                      const isWarn = item.content.startsWith('⚠️')
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isGood ? 'bg-emerald-50 border-emerald-200' : isWarn ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                          <p className={`text-sm font-medium ${isGood ? 'text-emerald-700' : isWarn ? 'text-amber-700' : 'text-rose-700'}`}>
                            {item.content}
                          </p>
                        </div>
                      )
                    }
                    if (item.type === 'text') return (
                      <p key={i} className="text-sm text-slate-600 leading-relaxed">{renderBold(item.content)}</p>
                    )
                    return null
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {selectedAudit.recommendations && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Recommendations
                </h2>
                <div className="space-y-2.5">
                  {selectedAudit.recommendations.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
                    const clean = line.replace(/^[-*•] /, '')
                    const isNone = clean.toLowerCase().includes('no immediate')
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${isNone ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isNone ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          {isNone ? <CheckCircle className="w-3 h-3 text-white" /> : <AlertTriangle className="w-3 h-3 text-white" />}
                        </div>
                        <p className={`text-sm font-medium ${isNone ? 'text-emerald-700' : 'text-amber-800'}`}>{clean}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} onGenerate={generate} loading={generating} />
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
        <p className="text-sm text-slate-500">Select an audit type. The system will analyse your care data and generate a detailed compliance report.</p>

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
