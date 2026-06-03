import React, { useEffect, useState, useMemo } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Spinner, EmptyState, Button, PrintButton, Modal } from '../../components/ui'
import { AlertTriangle, ChevronDown, ChevronUp, Search, Filter, Trash2, Sparkles, X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Severity helpers ──────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low'

function getSeverity(incidentType: string): Severity {
  if (incidentType === 'medication_error') return 'critical'
  if (incidentType === 'fall' || incidentType === 'missing_person') return 'high'
  if (incidentType === 'aggression' || incidentType === 'self_harm') return 'high'
  return 'medium'
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  low:      'bg-green-100 text-green-800 border-green-200',
}

const TYPE_STYLES: Record<string, string> = {
  fall:              'bg-orange-100 text-orange-700',
  medication_error:  'bg-red-100 text-red-700',
  missing_person:    'bg-red-100 text-red-700',
  aggression:        'bg-purple-100 text-purple-700',
  self_harm:         'bg-rose-100 text-rose-700',
  accident:          'bg-yellow-100 text-yellow-700',
  near_miss:         'bg-blue-100 text-blue-700',
  other:             'bg-slate-100 text-slate-700',
}

const TYPE_LABELS: Record<string, string> = {
  fall:             'Fall',
  medication_error: 'Medication Error',
  missing_person:   'Missing Person',
  aggression:       'Aggression',
  self_harm:        'Self Harm',
  accident:         'Accident',
  near_miss:        'Near Miss',
  other:            'Other',
}

const INCIDENT_TYPES = Object.keys(TYPE_LABELS)

// incidents come back as flat columns from records_incidents

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 border-l-4 ${color}`}>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

const BLANK_INC = {
  suId: '', incidentDate: new Date().toISOString().split('T')[0],
  incidentType: 'fall', location: '', description: '', immediateAction: '',
  witnesses: '', injuries: false, injuryDetails: '', medicalNeeded: false, medicalDetails: '',
  cqcNotified: false, familyNotified: false,
}

export default function Incidents() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [sus, setSus] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ ...BLANK_INC })
  const [creating, setCreating] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  // Load homes
  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || [])).catch(() => {})
  }, [selectedHome])

  const loadIncidents = (homeId: string) => {
    setLoading(true)
    const params: Record<string, string> = { homeId }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (filterType) params.incident_type = filterType
    if (search) params.search = search
    api.get('/incidents', { params })
      .then(res => setIncidents(res.data.data || []))
      .catch(() => toast.error('Failed to load incidents'))
      .finally(() => setLoading(false))
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.suId) { toast.error('Select a service user'); return }
    if (!createForm.description.trim()) { toast.error('Description is required'); return }
    setCreating(true)
    try {
      await api.post('/incidents', { ...createForm, homeId: selectedHome })
      setCreateOpen(false)
      setCreateForm({ ...BLANK_INC })
      toast.success('Incident logged')
      loadIncidents(selectedHome)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to log incident') }
    finally { setCreating(false) }
  }

  // Load incidents
  useEffect(() => {
    if (!selectedHome) return
    loadIncidents(selectedHome)
  }, [selectedHome, startDate, endDate, filterType, search])

  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    incidents.forEach(inc => {
      const sev = getSeverity(inc.incident_type || '')
      counts[sev]++
    })
    return counts
  }, [incidents])

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const requestAiAnalysis = async (inc: any) => {
    setAiLoading(inc.id)
    try {
      const res = await api.post(`/incidents/${inc.id}/ai-analysis`)
      setAiAnalysis(prev => ({ ...prev, [inc.id]: res.data.data.analysis }))
    } catch { toast.error('AI analysis failed. Check API key is configured.') }
    finally { setAiLoading(null) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault() }

  const deleteIncident = async (inc: any) => {
    if (!window.confirm(`Delete this incident report for ${inc.resident_name || 'this service user'}? This cannot be undone.`)) return
    try {
      // Try deleting by incident record id first, fallback to daily_record_id
      await api.delete(`/incidents/${inc.id}`)
      setIncidents(prev => prev.filter(i => i.id !== inc.id))
      toast.success('Incident deleted')
    } catch {
      try {
        await api.delete(`/incidents/${inc.daily_record_id}`)
        setIncidents(prev => prev.filter(i => i.id !== inc.id))
        toast.success('Incident deleted')
      } catch { toast.error('Failed to delete incident') }
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Incident Reports
            <span className="ml-2 text-sm font-semibold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
              {incidents.length}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All recorded incidents for {homes.find(h => h.id === selectedHome)?.name || 'the home'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {homes.length > 1 && (
            <select
              className="input w-auto"
              value={selectedHome}
              onChange={e => setSelectedHome(e.target.value)}
            >
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setCreateForm({ ...BLANK_INC }); setCreateOpen(true) }}>
            Log Incident
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total this period" value={incidents.length} color="border-slate-400" />
        <StatCard label="Critical" value={stats.critical} color="border-red-500" />
        <StatCard label="High severity" value={stats.high} color="border-orange-500" />
        <StatCard label="Medium" value={stats.medium} color="border-yellow-500" />
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              Service User Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search service user..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Incident type */}
          <div className="min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              Incident type
            </label>
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {INCIDENT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              From
            </label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              To
            </label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" icon={<Filter className="w-4 h-4" />}
            onClick={() => { setSearch(''); setFilterType(''); setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd')); }}>
            Reset
          </Button>
        </div>
      </form>

      {/* Incident list */}
      {loading ? <Spinner /> : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="No incidents match your current filters. Try adjusting the date range or clearing the filters."
          action={
            <Button variant="secondary" icon={<Filter className="w-4 h-4" />}
              onClick={() => { setSearch(''); setFilterType(''); setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd')); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc: any) => {
            const incidentType = inc.incident_type || 'other'
            const severity = getSeverity(incidentType)
            const isExpanded = expandedId === inc.id

            return (
              <div key={inc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleExpand(inc.id)} className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{inc.resident_name || 'Unknown resident'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[incidentType] || TYPE_STYLES.other}`}>
                          {TYPE_LABELS[incidentType] || incidentType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${SEVERITY_STYLES[severity]}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>{inc.record_date ? format(new Date(inc.record_date), 'd MMM yyyy') : format(new Date(inc.created_at), 'd MMM yyyy')}</span>
                        {inc.location && <span>📍 {inc.location}</span>}
                        <span>by {inc.recorded_by_name || 'unknown'}</span>
                      </div>
                      {inc.description && <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{inc.description}</p>}
                    </div>
                    <div className="flex-shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <IncidentField label="Service User" value={inc.resident_name} />
                      <IncidentField label="Incident type" value={TYPE_LABELS[incidentType] || incidentType} />
                      <IncidentField label="Date" value={inc.record_date ? format(new Date(inc.record_date), 'd MMMM yyyy') : ''} />
                      {inc.location && <IncidentField label="Location" value={inc.location} />}
                      <IncidentField label="Recorded by" value={inc.recorded_by_name} />
                      <IncidentField label="Injuries" value={inc.injuries ? `Yes${inc.injury_details ? ` — ${inc.injury_details}` : ''}` : 'None reported'} />
                      <IncidentField label="Medical attention" value={inc.medical_needed ? `Yes${inc.medical_details ? ` — ${inc.medical_details}` : ''}` : 'No'} />
                      {inc.safeguarding_ref && <IncidentField label="Safeguarding" value="Safeguarding referral made" />}
                    </div>
                    {inc.description && <IncidentField label="Details of Incident" value={inc.description} />}
                    {inc.witnesses && <IncidentField label="Witnesses" value={inc.witnesses} />}
                    {inc.immediate_action && <IncidentField label="Immediate action taken" value={inc.immediate_action} />}
                    {/* Notification section */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-blue-700 mb-0.5">CQC notified</p>
                        <p className={`text-sm font-medium ${inc.cqc_notified ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {inc.cqc_notified ? 'Yes' : 'No'}
                        </p>
                        {!inc.cqc_notified && inc.cqc_not_notified_reason && (
                          <p className="text-xs text-slate-500 mt-0.5">Reason: {inc.cqc_not_notified_reason}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700 mb-0.5">Family / next of kin notified</p>
                        <p className={`text-sm font-medium ${inc.family_notified ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {inc.family_notified ? 'Yes' : 'No'}
                        </p>
                        {!inc.family_notified && inc.family_not_notified_reason && (
                          <p className="text-xs text-slate-500 mt-0.5">Reason: {inc.family_not_notified_reason}</p>
                        )}
                      </div>
                    </div>
                    {/* AI Analysis */}
                    <div className="pt-2 border-t border-slate-50">
                      {!aiAnalysis[inc.id] ? (
                        <Button size="sm" variant="outline"
                          icon={<Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                          loading={aiLoading === inc.id}
                          onClick={() => requestAiAnalysis(inc)}>
                          AI Incident Analysis
                        </Button>
                      ) : (
                        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> AI Incident Analysis
                            </p>
                            <button onClick={() => setAiAnalysis(p => { const n = {...p}; delete n[inc.id]; return n })}
                              className="text-purple-400 hover:text-purple-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {aiAnalysis[inc.id]}
                          </div>
                        </div>
                      )}
                    </div>
                    {isRole('home_manager', 'group_admin') && (
                      <div className="flex justify-end pt-2 border-t border-slate-50">
                        <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => deleteIncident(inc)}>
                          Delete incident
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create incident modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Log New Incident" size="lg">
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Service User *</label>
              <select className="input w-full" value={createForm.suId} onChange={e => setCreateForm(f => ({ ...f, suId: e.target.value }))} required>
                <option value="">Select resident...</option>
                {sus.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incident Date *</label>
              <input type="date" className="input w-full" value={createForm.incidentDate} onChange={e => setCreateForm(f => ({ ...f, incidentDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Incident Type *</label>
              <select className="input w-full" value={createForm.incidentType} onChange={e => setCreateForm(f => ({ ...f, incidentType: e.target.value }))}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input w-full" placeholder="e.g. Bedroom, Bathroom" value={createForm.location} onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Witnesses</label>
              <input className="input w-full" placeholder="Names of anyone present" value={createForm.witnesses} onChange={e => setCreateForm(f => ({ ...f, witnesses: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description / What happened *</label>
              <textarea className="input w-full" rows={3} placeholder="Describe what happened..." value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Immediate action taken</label>
              <textarea className="input w-full" rows={2} placeholder="What was done immediately after the incident..." value={createForm.immediateAction} onChange={e => setCreateForm(f => ({ ...f, immediateAction: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.injuries} onChange={e => setCreateForm(f => ({ ...f, injuries: e.target.checked }))} className="w-4 h-4 rounded accent-red-600" />
                <span className="text-sm font-medium text-slate-700">Injuries sustained</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.medicalNeeded} onChange={e => setCreateForm(f => ({ ...f, medicalNeeded: e.target.checked }))} className="w-4 h-4 rounded accent-red-600" />
                <span className="text-sm font-medium text-slate-700">Medical attention required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.cqcNotified} onChange={e => setCreateForm(f => ({ ...f, cqcNotified: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-medium text-slate-700">CQC notified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.familyNotified} onChange={e => setCreateForm(f => ({ ...f, familyNotified: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-medium text-slate-700">Family notified</span>
              </label>
            </div>
            {createForm.injuries && (
              <div className="col-span-2">
                <label className="label">Injury details</label>
                <input className="input w-full" placeholder="Describe the injuries..." value={createForm.injuryDetails} onChange={e => setCreateForm(f => ({ ...f, injuryDetails: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Log Incident</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function IncidentField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}
