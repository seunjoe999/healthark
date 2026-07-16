import React, { useEffect, useState, useMemo } from 'react'
import api, { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays, parseISO } from 'date-fns'
import {
  Spinner, EmptyState, Button, Modal, Select, Textarea
} from '../../components/ui'
import {
  Building2, Plus, Hospital, Calendar, Clock, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Search, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Types ────────────────────────────────────────────────────────────

interface Admission {
  id: string
  home_id: string
  su_id: string
  logged_by: string
  hospital_name: string
  ward: string | null
  admission_date: string
  admission_reason: string
  admission_type: 'emergency' | 'planned' | 'day_case'
  discharge_date: string | null
  discharge_destination: string | null
  outcome_notes: string | null
  follow_up_required: boolean
  follow_up_notes: string | null
  status: 'admitted' | 'discharged'
  resident_name: string
  resident_photo: string | null
  logged_by_name: string
  created_at: string
}

interface Stats {
  current_inpatients: string | number
  discharged_this_month: string | number
  planned_admissions: string | number
  avg_length_of_stay: string | number | null
}

// ── Helpers ──────────────────────────────────────────────────────────

const ADMISSION_TYPES = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'planned', label: 'Planned' },
  { value: 'day_case', label: 'Day Case' },
]

const DISCHARGE_DESTINATIONS = [
  { value: 'home', label: 'Home' },
  { value: 'care_home', label: 'Care Home' },
  { value: 'other_hospital', label: 'Other Hospital' },
  { value: 'deceased', label: 'Deceased' },
]

function typeStyles(type: string): string {
  if (type === 'emergency') return 'border-l-4 border-l-rose-500'
  if (type === 'planned') return 'border-l-4 border-l-blue-500'
  return 'border-l-4 border-l-slate-500'
}

function typeBadge(type: string) {
  const styles: Record<string, string> = {
    emergency: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    planned: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    day_case: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  }
  const labels: Record<string, string> = {
    emergency: 'Emergency', planned: 'Planned', day_case: 'Day Case'
  }
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', styles[type] || styles.day_case)}>
      {labels[type] || type}
    </span>
  )
}

function statusBadge(status: string) {
  return status === 'admitted'
    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">Admitted</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Discharged</span>
}

function duration(admission: Admission): string {
  const start = parseISO(admission.admission_date)
  if (admission.discharge_date) {
    const end = parseISO(admission.discharge_date)
    const days = differenceInDays(end, start)
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  const days = differenceInDays(new Date(), start)
  return days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''} (ongoing)`
}

// ── Discharge Modal ───────────────────────────────────────────────────

interface DischargeModalProps {
  admission: Admission | null
  onClose: () => void
  onSaved: () => void
}

function DischargeModal({ admission, onClose, onSaved }: DischargeModalProps) {
  const [form, setForm] = useState({
    dischargeDate: format(new Date(), 'yyyy-MM-dd'),
    dischargeDestination: '',
    outcomeNotes: '',
    followUpRequired: false,
    followUpNotes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  if (!admission) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dischargeDate) { toast.error('Discharge date required'); return }
    setSubmitting(true)
    try {
      await api.put(`/hospital-admissions/${admission.id}`, {
        ...form,
        status: 'discharged',
      })
      toast.success('Discharge recorded')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open title={`Discharge — ${admission.resident_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Discharge Date</label>
          <input type="date" className="input"
            value={form.dischargeDate}
            onChange={e => setForm(f => ({ ...f, dischargeDate: e.target.value }))}
            required />
        </div>
        <Select
          label="Discharge Destination"
          placeholder="Select destination..."
          options={DISCHARGE_DESTINATIONS}
          value={form.dischargeDestination}
          onChange={e => setForm(f => ({ ...f, dischargeDestination: e.target.value }))}
        />
        <Textarea
          label="Outcome Notes"
          placeholder="Condition on discharge, any notes..."
          value={form.outcomeNotes}
          onChange={e => setForm(f => ({ ...f, outcomeNotes: e.target.value }))}
        />
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => setForm(f => ({ ...f, followUpRequired: !f.followUpRequired }))}
            className={clsx(
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200',
              form.followUpRequired ? 'bg-amber-500' : 'bg-slate-600'
            )}>
            <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 m-0.5',
              form.followUpRequired ? 'translate-x-4' : 'translate-x-0')} />
          </button>
          <span className="text-sm text-slate-300">Follow-up required</span>
        </div>
        {form.followUpRequired && (
          <Textarea
            label="Follow-up Notes"
            placeholder="What follow-up is needed?"
            value={form.followUpNotes}
            onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))}
          />
        )}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="teal" loading={submitting} className="flex-1">Record Discharge</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── New Admission Modal ───────────────────────────────────────────────

interface NewAdmissionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  homeId: string
}

const EMPTY_FORM = {
  suId: '',
  hospitalName: '',
  ward: '',
  admissionDate: format(new Date(), 'yyyy-MM-dd'),
  admissionType: 'emergency' as const,
  admissionReason: '',
}

function NewAdmissionModal({ open, onClose, onSaved, homeId }: NewAdmissionModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [residents, setResidents] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && homeId) {
      suApi.list(homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
    }
  }, [open, homeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a resident'); return }
    if (!form.hospitalName.trim()) { toast.error('Hospital name required'); return }
    if (!form.admissionReason.trim()) { toast.error('Admission reason required'); return }
    setSubmitting(true)
    try {
      await api.post('/hospital-admissions', { ...form, homeId })
      toast.success('Admission recorded')
      setForm(EMPTY_FORM)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Hospital Admission" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Resident</label>
          <select className="input" value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required>
            <option value="">Select resident...</option>
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Hospital Name</label>
            <input className="input" placeholder="e.g. Royal Victoria Hospital"
              value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Ward (optional)</label>
            <input className="input" placeholder="e.g. Ward 7B"
              value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Admission Date</label>
            <input type="date" className="input"
              value={form.admissionDate}
              onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} required />
          </div>
          <Select
            label="Admission Type"
            options={ADMISSION_TYPES}
            value={form.admissionType}
            onChange={e => setForm(f => ({ ...f, admissionType: e.target.value as any }))}
          />
        </div>
        <Textarea
          label="Reason for Admission"
          placeholder="Brief clinical reason..."
          value={form.admissionReason}
          onChange={e => setForm(f => ({ ...f, admissionReason: e.target.value }))}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="gold" loading={submitting} className="flex-1">Record Admission</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────

export default function HospitalAdmissions() {
  const { isRole, user } = useAuth()
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showDischarge, setShowDischarge] = useState<Admission | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'current' | 'history'>('current')

  const effectiveHomeId = isRole('group_admin') ? selectedHome : (user?.homeId || '')

  useEffect(() => {
    if (isRole('group_admin')) {
      homesApi.list().then(r => {
        const h = r.data.data || []
        setHomes(h)
        if (h.length && !selectedHome) setSelectedHome(h[0].id)
      }).catch(() => {})
    }
  }, [])

  async function load() {
    if (!effectiveHomeId) return
    setLoading(true)
    try {
      const params: any = { homeId: effectiveHomeId }
      if (filterStatus) params.status = filterStatus

      const [dataRes, statsRes] = await Promise.all([
        api.get('/hospital-admissions', { params }),
        api.get('/hospital-admissions/stats', { params: { homeId: effectiveHomeId } }),
      ])
      setAdmissions(dataRes.data.data || [])
      setStats(statsRes.data.data || null)
    } catch {
      toast.error('Failed to load admissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [effectiveHomeId, filterStatus])

  const currentAdmissions = useMemo(() =>
    admissions.filter(a => a.status === 'admitted'), [admissions])

  const filteredHistory = useMemo(() => {
    let list = admissions
    if (tab === 'history') list = admissions // all records in history
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(a =>
        a.resident_name?.toLowerCase().includes(s) ||
        a.hospital_name.toLowerCase().includes(s)
      )
    }
    return list
  }, [admissions, tab, search])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            Hospital Admissions
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track resident hospital stays and discharges</p>
        </div>
        <div className="flex items-center gap-2">
          {isRole('group_admin') && homes.length > 0 && (
            <select className="input w-44" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>
            New Admission
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="text-2xl font-bold text-rose-400">{stats.current_inpatients ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Currently in Hospital</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(52,211,153,0.3)' }}>
            <div className="text-2xl font-bold text-emerald-400">{stats.discharged_this_month ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Discharged This Month</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="text-2xl font-bold text-blue-400">{stats.planned_admissions ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Planned Admissions</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-2xl font-bold text-slate-300">
              {stats.avg_length_of_stay != null ? `${stats.avg_length_of_stay}d` : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">Avg Length of Stay</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {[
          { id: 'current', label: `Currently Admitted (${currentAdmissions.length})` },
          { id: 'history', label: 'All Admissions' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Current Admissions */}
          {tab === 'current' && (
            <>
              {currentAdmissions.length === 0 ? (
                <EmptyState
                  title="No current admissions"
                  description="No residents are currently hospitalised"
                />
              ) : (
                <div className="space-y-3">
                  {currentAdmissions.map(a => {
                    const days = differenceInDays(new Date(), parseISO(a.admission_date))
                    const isExpanded = expandedId === a.id
                    return (
                      <div key={a.id}
                        className={clsx('rounded-xl p-4 transition-all', typeStyles(a.admission_type))}
                        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-white font-semibold">{a.resident_name}</span>
                              {typeBadge(a.admission_type)}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {a.hospital_name}{a.ward ? ` — ${a.ward}` : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(parseISO(a.admission_date), 'd MMM yyyy')}
                              </span>
                              <span className="flex items-center gap-1 text-amber-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 mt-2 line-clamp-2">{a.admission_reason}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="secondary" size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="teal"
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                              onClick={() => setShowDischarge(a)}>
                              Record Discharge
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/8 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500 text-xs uppercase tracking-wide">Logged by</span>
                              <p className="text-slate-300 mt-0.5">{a.logged_by_name}</p>
                            </div>
                            <div>
                              <span className="text-slate-500 text-xs uppercase tracking-wide">Follow-up</span>
                              <p className="text-slate-300 mt-0.5">
                                {a.follow_up_required ? (a.follow_up_notes || 'Required') : 'Not required'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* History Table */}
          {tab === 'history' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input pl-9" placeholder="Search by resident or hospital..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input w-40" value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="admitted">Admitted</option>
                  <option value="discharged">Discharged</option>
                </select>
              </div>

              {filteredHistory.length === 0 ? (
                <EmptyState title="No admissions found" description="Try adjusting your filters" />
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Resident</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Hospital</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Admitted</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Discharged</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((a, idx) => (
                        <tr key={a.id}
                          style={{ borderBottom: idx < filteredHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                          className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 text-sm text-white font-medium">{a.resident_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            <div>{a.hospital_name}</div>
                            {a.ward && <div className="text-xs text-slate-500">{a.ward}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {format(parseISO(a.admission_date), 'd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {a.discharge_date
                              ? format(parseISO(a.discharge_date), 'd MMM yyyy')
                              : <span className="text-slate-500">—</span>}
                          </td>
                          <td className="px-4 py-3">{typeBadge(a.admission_type)}</td>
                          <td className="px-4 py-3">{statusBadge(a.status)}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{duration(a)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <NewAdmissionModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSaved={load}
        homeId={effectiveHomeId}
      />
      <DischargeModal
        admission={showDischarge}
        onClose={() => setShowDischarge(null)}
        onSaved={load}
      />
    </div>
  )
}
