import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button } from '../../components/ui'
import { Activity, Plus, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const AUDIT_TYPES = [
  { value: 'care_plan', label: 'Care Plan Audit' },
  { value: 'documentation', label: 'Documentation Audit' },
  { value: 'medication', label: 'Medication Audit' },
  { value: 'mar_chart', label: 'MAR Chart Audit' },
  { value: 'incident_analysis', label: 'Incident Analysis' },
  { value: 'nutrition_hydration', label: 'Nutrition & Hydration' },
  { value: 'safeguarding', label: 'Safeguarding Audit' },
  { value: 'falls_prevention', label: 'Falls Prevention' },
  { value: 'infection_control', label: 'Infection Control' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'activity', label: 'Activity Audit' },
  { value: 'pressure_sore', label: 'Pressure Sore / Skin' },
  { value: 'one_to_one', label: 'One-to-One Audit' },
  { value: 'equipment', label: 'Equipment Audit' },
  { value: 'premises', label: 'Premises Audit' },
  { value: 'mandatory_safety', label: 'Mandatory Safety' },
  { value: 'free_template', label: 'Free Template (Custom)' },
]

export default function Audits() {
  const { user, isRole } = useAuth()
  const [audits, setAudits] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [showTypeGrid, setShowTypeGrid] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) loadAudits() }, [selectedHome])

  const loadAudits = async () => {
    setLoading(true)
    try {
      const res = await api.get('/audits', { params: { homeId: selectedHome } })
      setAudits(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const generateAudit = async (auditType: string) => {
    setGenerating(auditType)
    setShowTypeGrid(false)
    try {
      await api.post('/audits/generate', { auditType, homeId: selectedHome })
      toast.success('Audit generating — refreshing shortly...')
      setTimeout(async () => { await loadAudits(); setGenerating(null) }, 4000)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
      setGenerating(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2"><Activity className="w-6 h-6 text-teal-500" /> AI Audit Engine</h1>
          <p className="text-gray-500 text-sm mt-0.5">Generate instant AI-compiled audit reports</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <Button icon={<RefreshCw className="w-4 h-4" />} variant="secondary" onClick={loadAudits}>Refresh</Button>
          {isRole('home_manager', 'group_admin') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowTypeGrid(!showTypeGrid)}>Generate audit</Button>}
        </div>
      </div>

      {showTypeGrid && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-navy-900 mb-4">Select audit type to generate</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AUDIT_TYPES.map(at => (
              <button key={at.value} onClick={() => generateAudit(at.value)} disabled={!!generating}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-navy-900 hover:bg-navy-50 transition-colors text-left disabled:opacity-50">
                <Activity className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span className="text-sm font-medium text-navy-900">{at.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {generating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
          <p className="text-sm text-blue-700 font-medium">AI is generating your audit report...</p>
        </div>
      )}

      {loading ? <Spinner /> : audits.length === 0 ? (
        <EmptyState title="No audit reports yet" description="Generate your first AI audit report"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowTypeGrid(true)}>Generate audit</Button>} />
      ) : (
        <div className="space-y-3">
          {audits.map((audit: any) => (
            <div key={audit.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setSelectedAudit(selectedAudit?.id === audit.id ? null : audit)}
                className="w-full p-5 text-left hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {audit.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                       audit.status === 'generating' ? <Clock className="w-4 h-4 text-blue-500 animate-pulse" /> :
                       <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <h3 className="font-semibold text-navy-900">{AUDIT_TYPES.find(t => t.value === audit.audit_type)?.label || audit.audit_type}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${audit.status === 'completed' ? 'bg-green-100 text-green-700' : audit.status === 'generating' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{audit.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{format(new Date(audit.generated_at), 'd MMM yyyy, HH:mm')} · Period: {audit.period_from} to {audit.period_to}</p>
                    {audit.status === 'completed' && (
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        <span className="text-green-600 font-medium">✓ {audit.checks_passed} passed</span>
                        {audit.checks_failed > 0 && <span className="text-red-600 font-medium">✗ {audit.checks_failed} issues found</span>}
                      </div>
                    )}
                  </div>
                </div>
              </button>
              {selectedAudit?.id === audit.id && audit.status === 'completed' && (
                <div className="px-6 pb-6 border-t border-gray-50 pt-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-700 font-mono">{audit.findings}</div>
                  {audit.recommendations && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-semibold text-blue-900 mb-2 text-sm">Recommendations</p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{audit.recommendations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
