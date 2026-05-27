import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import { UserCheck, Plus, Trash2, Edit, Mail, ChevronDown, Check, X, Search, Filter, Send, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const PIPELINE_STAGES = [
  { key: 'applied', label: 'Applied', color: 'bg-slate-100 border-slate-300 text-slate-700' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'interview', label: 'Interview', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { key: 'interviewed', label: 'Interviewed', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { key: 'reference_check', label: 'Reference Check', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'dbs_check', label: 'DBS Check', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { key: 'training', label: 'Training', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { key: 'offer_sent', label: 'Offer Sent', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { key: 'hired', label: 'Hired', color: 'bg-green-50 border-green-200 text-green-700' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-700' },
]

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
]

const getStageLabel = (key: string) => PIPELINE_STAGES.find(s => s.key === key)?.label || key
const getStageColor = (key: string) => PIPELINE_STAGES.find(s => s.key === key)?.color || PIPELINE_STAGES[0].color

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  position: string
  applied_date: string
  status: string
  pipeline_stage: string
  interview_date: string
  notes: string
  dbs_check: string
  reference_check: string
  training_done: boolean
  dbs_cleared: boolean
  references_done: boolean
  fully_compliant: boolean
  ready_to_start: boolean
  start_date: string
  created_at: string
}

export default function Recruitment() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null)
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailCandidate, setEmailCandidate] = useState<Candidate | null>(null)
  const [emailConfigured, setEmailConfigured] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const [candRes, configRes] = await Promise.all([
        api.get('/recruitment', { params: { homeId: selectedHome } }),
        api.get('/recruitment/email-configured').catch(() => ({ data: { data: { configured: false } } })),
      ])
      setCandidates(candRes.data.data || [])
      setEmailConfigured(configRes.data.data?.configured || false)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  const deleteCandidate = async (id: string) => {
    if (!window.confirm('Delete this candidate?')) return
    try {
      await api.delete(`/recruitment/${id}`)
      setCandidates(prev => prev.filter(c => c.id !== id))
      toast.success('Candidate deleted')
    } catch { toast.error('Failed to delete') }
  }

  const moveStage = async (candidate: Candidate, newStage: string) => {
    try {
      const res = await api.put(`/recruitment/${candidate.id}`, { pipelineStage: newStage })
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, ...res.data.data } : c))
      toast.success(`Moved to ${getStageLabel(newStage)}`)
    } catch { toast.error('Failed to move candidate') }
  }

  const updateCompliance = async (id: string, field: string, value: boolean) => {
    try {
      const res = await api.put(`/recruitment/${id}`, { [field]: value })
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...res.data.data } : c))
      if (detailCandidate?.id === id) {
        setDetailCandidate({ ...detailCandidate, ...res.data.data })
      }
      toast.success('Updated')
    } catch { toast.error('Failed to update') }
  }

  const filtered = candidates.filter(c => {
    const matchesSearch = `${c.first_name} ${c.last_name} ${c.email} ${c.position}`.toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'all' || c.pipeline_stage === stageFilter
    return matchesSearch && matchesStage
  })

  const counts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = candidates.filter(c => c.pipeline_stage === stage.key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-purple-600" />
              Recruitment Pipeline
            </h1>
            <p className="text-sm text-slate-500 mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} total</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {homes.length > 1 && (
              <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Refresh</Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditCandidate(null); setAddOpen(true) }}>
              Add Candidate
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${stageFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            All ({candidates.length})
          </button>
          {PIPELINE_STAGES.map(stage => (
            <button
              key={stage.key}
              onClick={() => setStageFilter(stage.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${stageFilter === stage.key ? stage.color.replace('bg-', 'ring-2 ring-offset-1 ring-') : stage.color} ${stageFilter === stage.key ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
              {stage.label} ({counts[stage.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 text-sm w-full"
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select className="input text-sm w-auto" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Candidates list */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search || stageFilter !== 'all' ? 'No matching candidates' : 'No candidates yet'}
            description={search || stageFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first candidate to start tracking'}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onEdit={() => { setEditCandidate(candidate); setAddOpen(true) }}
                onDelete={() => deleteCandidate(candidate.id)}
                onView={() => setDetailCandidate(candidate)}
                onEmail={() => { setEmailCandidate(candidate); setEmailOpen(true) }}
                onMoveStage={(stage) => moveStage(candidate, stage)}
                emailConfigured={emailConfigured}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {addOpen && (
        <CandidateModal
          open={addOpen}
          onClose={() => { setAddOpen(false); setEditCandidate(null) }}
          candidate={editCandidate}
          homeId={selectedHome}
          onSaved={() => { setAddOpen(false); setEditCandidate(null); load(); }}
        />
      )}

      {/* Detail Modal */}
      {detailCandidate && (
        <DetailModal
          candidate={detailCandidate}
          onClose={() => setDetailCandidate(null)}
          onUpdateCompliance={updateCompliance}
          onMoveStage={(stage) => moveStage(detailCandidate, stage)}
          onEdit={() => { setDetailCandidate(null); setEditCandidate(detailCandidate); setAddOpen(true) }}
        />
      )}

      {/* Email Modal */}
      {emailOpen && emailCandidate && (
        <EmailModal
          candidate={emailCandidate}
          onClose={() => { setEmailOpen(false); setEmailCandidate(null) }}
          emailConfigured={emailConfigured}
        />
      )}
    </div>
  )
}

/* ─── Candidate Card ─── */
function CandidateCard({ candidate, onEdit, onDelete, onView, onEmail, onMoveStage, emailConfigured }: {
  candidate: Candidate; onEdit: () => void; onDelete: () => void; onView: () => void;
  onEmail: () => void; onMoveStage: (stage: string) => void; emailConfigured: boolean
}) {
  const [showStageMenu, setShowStageMenu] = useState(false)
  const stageLabel = getStageLabel(candidate.pipeline_stage)
  const stageColor = getStageColor(candidate.pipeline_stage)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{candidate.first_name} {candidate.last_name}</h3>
            <p className="text-sm text-slate-500 truncate">{candidate.position}</p>
          </div>
          <div className="flex gap-1 ml-2">
            <button onClick={onView} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="View details">
              <UserCheck className="w-4 h-4" />
            </button>
            {emailConfigured && candidate.email && (
              <button onClick={onEmail} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Send email">
                <Mail className="w-4 h-4" />
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stageColor}`}>{stageLabel}</span>
          {candidate.fully_compliant && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Fully Compliant
            </span>
          )}
          {candidate.ready_to_start && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Ready to Start
            </span>
          )}
        </div>

        {candidate.email && <p className="text-xs text-slate-500 mb-1">{candidate.email}</p>}
        {candidate.phone && <p className="text-xs text-slate-500 mb-1">{candidate.phone}</p>}
        {candidate.applied_date && (
          <p className="text-xs text-slate-400">Applied: {format(new Date(candidate.applied_date), 'd MMM yyyy')}</p>
        )}

        {/* Compliance mini indicators */}
        <div className="flex gap-2 mt-3">
          <ComplianceDot label="Training" done={candidate.training_done} />
          <ComplianceDot label="DBS" done={candidate.dbs_cleared} />
          <ComplianceDot label="References" done={candidate.references_done} />
        </div>

        {/* Quick stage move */}
        <div className="relative mt-3">
          <button
            onClick={() => setShowStageMenu(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-600 font-medium px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors w-full justify-between">
            Move stage <ChevronDown className="w-3 h-3" />
          </button>
          {showStageMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStageMenu(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1 max-h-48 overflow-y-auto">
                {PIPELINE_STAGES.filter(s => s.key !== candidate.pipeline_stage).map(stage => (
                  <button
                    key={stage.key}
                    onClick={() => { onMoveStage(stage.key); setShowStageMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors">
                    {stage.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ComplianceDot({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
      {done ? <Check className="w-2.5 h-2.5 inline mr-0.5" /> : <X className="w-2.5 h-2.5 inline mr-0.5" />}
      {label}
    </span>
  )
}

/* ─── Candidate Add/Edit Modal ─── */
function CandidateModal({ open, onClose, candidate, homeId, onSaved }: {
  open: boolean; onClose: () => void; candidate: Candidate | null; homeId: string; onSaved: () => void
}) {
  const [firstName, setFirstName] = useState(candidate?.first_name || '')
  const [lastName, setLastName] = useState(candidate?.last_name || '')
  const [email, setEmail] = useState(candidate?.email || '')
  const [phone, setPhone] = useState(candidate?.phone || '')
  const [position, setPosition] = useState(candidate?.position || '')
  const [appliedDate, setAppliedDate] = useState(candidate?.applied_date ? format(new Date(candidate.applied_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [pipelineStage, setPipelineStage] = useState(candidate?.pipeline_stage || 'applied')
  const [interviewDate, setInterviewDate] = useState(candidate?.interview_date ? format(new Date(candidate.interview_date), 'yyyy-MM-dd') : '')
  const [notes, setNotes] = useState(candidate?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !position.trim()) { toast.error('First name, last name and position are required'); return }
    setSaving(true)
    try {
      const data = { firstName, lastName, email, phone, position, appliedDate, pipelineStage, interviewDate, notes, homeId }
      if (candidate) {
        await api.put(`/recruitment/${candidate.id}`, data)
        toast.success('Candidate updated')
      } else {
        await api.post('/recruitment', data)
        toast.success('Candidate added')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={candidate ? 'Edit Candidate' : 'Add Candidate'}>
      <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name *</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Position *</label>
          <input className="input" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Senior Carer" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Applied Date</label>
            <input className="input" type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Interview Date</label>
            <input className="input" type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Pipeline Stage</label>
          <select className="input" value={pipelineStage} onChange={e => setPipelineStage(e.target.value)}>
            {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this candidate..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
            {candidate ? 'Update' : 'Add'} Candidate
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Detail Modal with Compliance Tracking ─── */
function DetailModal({ candidate, onClose, onUpdateCompliance, onMoveStage, onEdit }: {
  candidate: Candidate; onClose: () => void;
  onUpdateCompliance: (id: string, field: string, value: boolean) => void;
  onMoveStage: (stage: string) => void; onEdit: () => void
}) {
  const stageLabel = getStageLabel(candidate.pipeline_stage)
  const stageColor = getStageColor(candidate.pipeline_stage)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{candidate.first_name} {candidate.last_name}</h2>
            <p className="text-sm text-slate-500">{candidate.position}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${stageColor}`}>{stageLabel}</span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-slate-700">{candidate.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm text-slate-700">{candidate.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Applied</p>
              <p className="text-sm text-slate-700">{candidate.applied_date ? format(new Date(candidate.applied_date), 'd MMM yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Interview Date</p>
              <p className="text-sm text-slate-700">{candidate.interview_date ? format(new Date(candidate.interview_date), 'd MMM yyyy') : '—'}</p>
            </div>
          </div>

          {/* Compliance Tracking */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Compliance Checklist
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ComplianceToggle
                label="Training Completed"
                done={candidate.training_done}
                onChange={(v) => onUpdateCompliance(candidate.id, 'trainingDone', v)}
              />
              <ComplianceToggle
                label="DBS Cleared"
                done={candidate.dbs_cleared}
                onChange={(v) => onUpdateCompliance(candidate.id, 'dbsCleared', v)}
              />
              <ComplianceToggle
                label="References Checked"
                done={candidate.references_done}
                onChange={(v) => onUpdateCompliance(candidate.id, 'referencesDone', v)}
              />
              <ComplianceToggle
                label="Fully Compliant"
                done={candidate.fully_compliant}
                onChange={(v) => onUpdateCompliance(candidate.id, 'fullyCompliant', v)}
              />
              <ComplianceToggle
                label="Ready to Start"
                done={candidate.ready_to_start}
                onChange={(v) => onUpdateCompliance(candidate.id, 'readyToStart', v)}
              />
              {candidate.start_date && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Start Date: {format(new Date(candidate.start_date), 'd MMM yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* DBS & Reference Details */}
          {(candidate.dbs_check || candidate.reference_check) && (
            <div className="grid grid-cols-2 gap-4">
              {candidate.dbs_check && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">DBS Check Details</p>
                  <p className="text-sm text-slate-700">{candidate.dbs_check}</p>
                </div>
              )}
              {candidate.reference_check && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reference Check Details</p>
                  <p className="text-sm text-slate-700">{candidate.reference_check}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {candidate.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">{candidate.notes}</p>
            </div>
          )}

          {/* Move to Stage */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.filter(s => s.key !== candidate.pipeline_stage).map(stage => (
                <button
                  key={stage.key}
                  onClick={() => onMoveStage(stage.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${stage.color}`}>
                  {stage.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={onEdit} icon={<Edit className="w-4 h-4" />}>Edit</Button>
        </div>
      </div>
    </div>
  )
}

function ComplianceToggle({ label, done, onChange }: { label: string; done: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className={`relative w-10 h-5 rounded-full transition-colors ${done ? 'bg-green-500' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${done ? 'left-5' : 'left-0.5'}`} />
      </div>
      <input type="checkbox" className="sr-only" checked={done} onChange={e => onChange(e.target.checked)} />
      <span className={`text-sm font-medium ${done ? 'text-green-700' : 'text-slate-600'} group-hover:text-slate-800`}>{label}</span>
    </label>
  )
}

/* ─── Email Modal ─── */
function EmailModal({ candidate, onClose, emailConfigured }: { candidate: Candidate; onClose: () => void; emailConfigured: boolean }) {
  const [emailType, setEmailType] = useState('interview_invite')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [location, setLocation] = useState('')
  const [sending, setSending] = useState(false)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailConfigured) { toast.error('Email is not configured. Set SMTP_USER and SMTP_PASS in your backend .env file.'); return }
    if (!candidate.email) { toast.error('Candidate has no email address'); return }
    setSending(true)
    try {
      const payload: any = { type: emailType, subject: subject || undefined }
      if (emailType === 'interview_invite') {
        payload.interviewDate = interviewDate || 'TBC'
        payload.interviewTime = interviewTime || 'TBC'
        payload.location = location || 'Our care home'
      } else if (emailType === 'custom') {
        payload.message = message
      } else if (emailType === 'reference_request') {
        payload.refereeName = 'Sir/Madam'
      }
      await api.post(`/recruitment/${candidate.id}/email`, payload)
      toast.success('Email sent successfully')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!emailConfigured) {
    return (
      <Modal open={true} onClose={onClose} title="Send Email">
        <div className="text-center py-6">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">Email not configured</p>
          <p className="text-sm text-slate-500 mb-4">Set SMTP_USER and SMTP_PASS environment variables to enable email sending.</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={true} onClose={onClose} title={`Email ${candidate.first_name} ${candidate.last_name}`}>
      <form onSubmit={send} className="space-y-4">
        <div>
          <label className="label">To</label>
          <input className="input bg-slate-50" value={candidate.email || ''} disabled />
        </div>
        <div>
          <label className="label">Email Type</label>
          <select className="input" value={emailType} onChange={e => setEmailType(e.target.value)}>
            <option value="interview_invite">Interview Invitation</option>
            <option value="application_received">Application Received</option>
            <option value="reference_request">Reference Request</option>
            <option value="offer_letter">Offer Letter</option>
            <option value="rejection">Rejection</option>
            <option value="custom">Custom Message</option>
          </select>
        </div>

        {emailType === 'interview_invite' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Interview Date</label>
                <input className="input" type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Interview Time</label>
                <input className="input" type="time" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Our care home" />
            </div>
          </div>
        )}

        {emailType === 'custom' && (
          <div>
            <label className="label">Custom Subject</label>
            <input className="input mb-2" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." />
            <label className="label">Message</label>
            <textarea className="input" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." required />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={sending} icon={<Send className="w-4 h-4" />}>Send Email</Button>
        </div>
      </form>
    </Modal>
  )
}
