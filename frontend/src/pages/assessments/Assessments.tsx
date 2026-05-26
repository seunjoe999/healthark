import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { assessmentsApi, homesApi, suApi, staffApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select, PrintButton } from '../../components/ui'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
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

export default function Assessments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const staffOnly = searchParams.get('tab') === 'staff'
  const [tab, setTab] = useState<'service_user' | 'staff'>(staffOnly ? 'staff' : 'service_user')
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
            <ClipboardCheck className="w-6 h-6 text-purple-600" /> {staffOnly ? 'Staff Assessment' : 'Audit'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{staffOnly ? 'Conduct and manage staff assessments' : 'Conduct and manage care audits'}</p>
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

      {/* Tabs — hidden when staffOnly mode (from Staff Assessment nav) */}
      {!staffOnly && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {(['service_user', 'staff'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'service_user' ? 'Resident Assessments' : 'Staff Assessments'}
            </button>
          ))}
        </div>
      )}

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
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Recent assessments</h2>
        {loading ? <Spinner /> : assessments.length === 0 ? (
          <EmptyState title="No assessments completed yet" description="Select an assessment type above to get started" />
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Subject', 'Assessment', 'Date', 'Score', 'Risk level', 'Conducted by', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assessments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.subject_name}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{templateName(a.template_key)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{format(new Date(a.assessment_date), 'd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      {a.max_score > 0
                        ? <span className="font-semibold text-slate-800">{Math.round(a.score_pct)}%</span>
                        : <span className="text-slate-400 text-xs">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.risk_level ? <RiskBadge level={a.risk_level} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.auditor_name || a.conducted_by_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/assessments/${a.id}`}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title={`Start: ${selectedTemplate?.name}`}>
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
