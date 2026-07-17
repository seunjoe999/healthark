import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { assessmentsApi, homesApi, suApi, staffApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select, PrintButton } from '../../components/ui'
import { ClipboardCheck, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    good: 'bg-green-100 text-green-700',
    low: 'bg-green-100 text-green-700',
    requires_improvement: 'bg-orange-100 text-orange-700',
    medium: 'bg-orange-100 text-orange-700',
    inadequate: 'bg-red-100 text-red-700',
    high: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[level] || 'bg-slate-100 text-slate-600'}`}>
      {(level || '').replace(/_/g, ' ')}
    </span>
  )
}

function AuditHistoryCard({ a, templateName }: { a: any; templateName: string }) {
  const [open, setOpen] = useState(false)
  const score = a.max_score > 0 ? Math.round(a.score_pct) : null
  const scoreColor = score === null ? '' : score >= 75 ? 'text-emerald-700' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className="font-semibold text-slate-900 text-sm">{a.subject_name}</p>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">{templateName}</span>
              {a.risk_level && <RiskBadge level={a.risk_level} />}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{format(new Date(a.assessment_date), 'd MMM yyyy')}</span>
              {(a.auditor_name || a.conducted_by_name) && <span>by {a.auditor_name || a.conducted_by_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {score !== null && <span className={`text-lg font-bold ${scoreColor}`}>{score}%</span>}
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {score !== null && (
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }} />
                </div>
                <span className={`text-sm font-bold w-10 text-right ${scoreColor}`}>{score}%</span>
              </div>
              <p className="text-xs text-slate-400">{a.total_score} / {a.max_score} pts</p>
            </div>
          )}
          {a.actions_identified && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Actions identified</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{a.actions_identified}</p>
            </div>
          )}
          <Link to={`/assessments/${a.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium mt-1">
            View full report <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Assessments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'staff' ? 'staff' : 'service_user'
  const [tab, setTab] = useState<'service_user' | 'staff'>(initialTab)
  const [templates, setTemplates] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [startModal, setStartModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [sus, setSus] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [subjectId, setSubjectId] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(() => {
      if (user?.homeId) setSelectedHome(user.homeId)
    })
    assessmentsApi.templates().then(res => {
      setTemplates(res.data.data || [])
    }).catch(() => toast.error('Failed to load templates'))
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    Promise.all([
      assessmentsApi.list({ homeId: selectedHome, category: tab }),
      suApi.list(selectedHome, { status: 'live' }),
      staffApi.list({ homeId: selectedHome }),
    ]).then(([aRes, suRes, stRes]) => {
      setAssessments(aRes.data.data || [])
      setSus(suRes.data.data || [])
      setStaffList(stRes.data.data || [])
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [selectedHome, tab])

  const filteredTemplates = templates.filter(t => t.category === tab)

  const subjectOptions = (tab === 'service_user' ? sus : staffList).map(s => ({
    value: s.id,
    label: `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim(),
  }))

  const openStart = (t: any) => {
    setSelectedTemplate(t)
    setSubjectId('')
    setStartModal(true)
  }

  const startAssessment = () => {
    if (!subjectId) { toast.error('Please select a subject'); return }
    navigate(`/assessments/new?template=${selectedTemplate.key}&category=${tab}&subjectId=${subjectId}&homeId=${selectedHome}`)
  }

  const templateName = (key: string) => {
    const t = templates.find(x => x.key === key)
    return t?.name || key.replace(/_/g, ' ')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" /> {tab === 'staff' ? 'Staff Assessment' : 'Audit'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{tab === 'staff' ? 'Conduct and manage staff assessments' : 'Conduct and manage resident care audits'}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {homes.length > 1 && (
            <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Tab switcher — always visible so users can move between resident and staff assessments */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {(['service_user', 'staff'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'service_user' ? 'Resident Assessments' : 'Staff Assessments'}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Start a new assessment</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredTemplates.map(t => (
            <button key={t.key} onClick={() => openStart(t)}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:shadow-md text-left transition-all group">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 leading-tight">{t.name}</p>
              <p className="text-xs text-slate-400 mt-1">{t.sectionCount} section{t.sectionCount !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audit history</h2>
        {loading ? <Spinner /> : assessments.length === 0 ? (
          <EmptyState title="No audits completed yet" description="Select an audit type above to get started" />
        ) : (
          <div className="space-y-3">
            {assessments.map((a: any) => (
              <AuditHistoryCard key={a.id} a={a} templateName={templateName(a.template_key)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title={`Start assessment: ${selectedTemplate?.name}`}>
        <div className="space-y-4">
          <Select
            label={tab === 'service_user' ? 'Select resident *' : 'Select staff member *'}
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            options={subjectOptions}
            placeholder="Select..."
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setStartModal(false)}>Cancel</Button>
            <Button onClick={startAssessment} disabled={!subjectId}>Start assessment</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
