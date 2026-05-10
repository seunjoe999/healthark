import React, { useEffect, useState } from 'react'
import { staffApi, homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInYears } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Plus, User, Calendar, Award, Clock, AlertTriangle, CheckCircle, Search, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const LEAVE_TYPES = [{ value: 'annual', label: 'Annual leave' }, { value: 'sick', label: 'Sick leave' }, { value: 'maternity', label: 'Maternity' }, { value: 'paternity', label: 'Paternity' }, { value: 'compassionate', label: 'Compassionate' }, { value: 'other', label: 'Other' }]

type StaffTab = 'profile' | 'training' | 'leave' | 'onboarding' | 'clock'

export default function StaffModule() {
  const { user, isRole } = useAuth()
  const [staff, setStaff] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<StaffTab>('profile')
  const [loading, setLoading] = useState(true)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [search, setSearch] = useState('')
  const [training, setTraining] = useState<any[]>([])
  const [leave, setLeave] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState<any>(null)
  const [clockHistory, setClockHistory] = useState<any[]>([])
  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [addTrainingOpen, setAddTrainingOpen] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    staffApi.list({ homeId: selectedHome }).then(res => setStaff(res.data.data || []))
      .catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const selectStaff = async (s: any) => {
    setSelected(s)
    setTab('profile')
    const [trainingRes, leaveRes, onboardingRes, clockRes] = await Promise.all([
      api.get(`/staff-hr/training/${s.id}`),
      api.get('/staff-hr/leave'),
      api.get(`/staff-hr/onboarding/${s.id}`),
      staffApi.clockHistory(s.id),
    ])
    setTraining(trainingRes.data.data || [])
    setLeave((leaveRes.data.data || []).filter((l: any) => l.staff_id === s.id))
    setOnboarding(onboardingRes.data.data)
    setClockHistory(clockRes.data.data || [])
  }

  const getName = (s: any) => `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim()
  const filteredStaff = staff.filter(s => getName(s).toLowerCase().includes(search.toLowerCase()))

  const tabs: { key: StaffTab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'training', label: `Training (${training.length})` },
    { key: 'leave', label: `Leave (${leave.length})` },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'clock', label: 'Clock history' },
  ]

  return (
    <div className="flex h-full">
      {/* Left — staff list */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-navy-900 mb-3">Staff</h2>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input className="input pl-8 text-sm" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <Spinner /> : filteredStaff.map(s => {
            const name = getName(s)
            const isSelected = selected?.id === s.id
            return (
              <button key={s.id} onClick={() => selectStaff(s)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-navy-50 border-l-2 border-l-navy-900' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {(s.first_name || s.firstName || '?')[0]}{(s.last_name || s.lastName || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-navy-900' : 'text-gray-800'}`}>{name}</p>
                    <p className="text-xs text-gray-400 capitalize">{(s.role || '').replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — staff detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a staff member" description="Choose a staff member to view their profile and records" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center text-xl font-bold text-navy-600 flex-shrink-0">
                  {(selected.first_name || selected.firstName || '?')[0]}{(selected.last_name || selected.lastName || '?')[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-navy-900">{getName(selected)}</h2>
                  <p className="text-sm text-gray-500 capitalize">{(selected.role || '').replace(/_/g, ' ')} · {selected.status}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    {selected.start_date && <span>Started {format(new Date(selected.start_date), 'd MMM yyyy')}</span>}
                    <span className="text-green-600 font-medium">{(selected.leave_hours_total || 224) - (selected.leave_hours_used || 0)} hrs leave remaining</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-4 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'profile' && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <SectionHeading title="Personal details" />
                  <dl className="space-y-3">
                    <InfoField label="Email" value={selected.email} />
                    <InfoField label="Phone" value={selected.phone} />
                    <InfoField label="Date of birth" value={selected.date_of_birth ? format(new Date(selected.date_of_birth), 'd MMMM yyyy') : null} />
                    <InfoField label="Gender" value={selected.gender} />
                    <InfoField label="Nationality" value={selected.nationality} />
                    <InfoField label="Marital status" value={selected.marital_status} />
                  </dl>
                </Card>
                <Card>
                  <SectionHeading title="Employment" />
                  <dl className="space-y-3">
                    <InfoField label="Role" value={(selected.role || '').replace(/_/g, ' ')} />
                    <InfoField label="Status" value={selected.status} />
                    <InfoField label="Start date" value={selected.start_date ? format(new Date(selected.start_date), 'd MMMM yyyy') : null} />
                    <InfoField label="Annual leave total" value={`${selected.leave_hours_total || 224} hours`} />
                    <InfoField label="Leave used" value={`${selected.leave_hours_used || 0} hours`} />
                    <InfoField label="Leave remaining" value={`${(selected.leave_hours_total || 224) - (selected.leave_hours_used || 0)} hours`} />
                  </dl>
                </Card>
                {selected.emergency_name && (
                  <Card>
                    <SectionHeading title="Emergency contact" />
                    <dl className="space-y-3">
                      <InfoField label="Name" value={selected.emergency_name} />
                      <InfoField label="Phone" value={selected.emergency_phone} />
                      <InfoField label="Notes" value={selected.emergency_notes} />
                    </dl>
                  </Card>
                )}
              </div>
            )}

            {tab === 'training' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-navy-900">Training & certificates</h3>
                  {isRole('home_manager', 'group_admin') && (
                    <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddTrainingOpen(true)}>Add training</Button>
                  )}
                </div>
                {training.length === 0 ? (
                  <EmptyState title="No training records" description="Add completed training courses and certificates" />
                ) : (
                  <div className="space-y-2">
                    {training.map((t: any) => {
                      const expiring = t.expiry_date && differenceInYears(new Date(t.expiry_date), new Date()) < 1
                      const expired = t.expiry_date && new Date(t.expiry_date) < new Date()
                      return (
                        <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                          <Award className={`w-5 h-5 flex-shrink-0 ${expired ? 'text-red-500' : expiring ? 'text-orange-500' : 'text-green-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{t.course_name}</p>
                            <p className="text-xs text-gray-500">Completed {t.completed_date ? format(new Date(t.completed_date), 'd MMM yyyy') : '—'}
                              {t.duration_hours && ` · ${t.duration_hours}hrs`}
                              {t.expiry_date && ` · Expires ${format(new Date(t.expiry_date), 'd MMM yyyy')}`}
                            </p>
                          </div>
                          {expired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Expired</span>}
                          {!expired && expiring && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Expiring soon</span>}
                          {!expired && !expiring && t.expiry_date && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Current</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <AddTrainingModal open={addTrainingOpen} onClose={() => setAddTrainingOpen(false)} staffId={selected.id}
                  onSaved={async () => { setAddTrainingOpen(false); const res = await api.get(`/staff-hr/training/${selected.id}`); setTraining(res.data.data || []); toast.success('Training added') }} />
              </div>
            )}

            {tab === 'leave' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-navy-900">Leave requests</h3>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddLeaveOpen(true)}>Request leave</Button>
                </div>
                {leave.length === 0 ? (
                  <EmptyState title="No leave requests" description="Submit a leave request using the button above" />
                ) : (
                  <div className="space-y-2">
                    {leave.map((l: any) => (
                      <div key={l.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                        <Calendar className="w-5 h-5 flex-shrink-0 text-navy-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 capitalize">{(l.leave_type || '').replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">
                            {l.start_date ? format(new Date(l.start_date), 'd MMM') : '—'} — {l.end_date ? format(new Date(l.end_date), 'd MMM yyyy') : '—'} · {l.hours_requested}hrs
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {l.status}
                        </span>
                        {l.status === 'pending' && isRole('home_manager', 'group_admin') && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="teal" onClick={async () => {
                              await api.put(`/staff-hr/leave/${l.id}/approve`, { action: 'approve' })
                              const res = await api.get('/staff-hr/leave')
                              setLeave((res.data.data || []).filter((x: any) => x.staff_id === selected.id))
                              toast.success('Leave approved')
                            }}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={async () => {
                              await api.put(`/staff-hr/leave/${l.id}/approve`, { action: 'decline' })
                              const res = await api.get('/staff-hr/leave')
                              setLeave((res.data.data || []).filter((x: any) => x.staff_id === selected.id))
                              toast.success('Leave declined')
                            }}>Decline</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <AddLeaveModal open={addLeaveOpen} onClose={() => setAddLeaveOpen(false)} staffId={selected.id}
                  onSaved={async () => { setAddLeaveOpen(false); const res = await api.get('/staff-hr/leave'); setLeave((res.data.data || []).filter((l: any) => l.staff_id === selected.id)); toast.success('Leave request submitted') }} />
              </div>
            )}

            {tab === 'onboarding' && onboarding && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <SectionHeading title="Onboarding checklist" />
                  <div className="space-y-3">
                    {[
                      { key: 'application_received', label: 'Application received', date: onboarding.application_date },
                      { key: 'interview_completed', label: 'Interview completed', date: onboarding.interview_date },
                      { key: 'dbs_cleared', label: 'DBS check cleared', date: onboarding.dbs_cleared_date },
                      { key: 'care_cert_completed', label: 'Care certificate completed', date: onboarding.care_cert_date },
                      { key: 'induction_completed', label: 'Induction completed', date: onboarding.induction_date },
                      { key: 'med_training_completed', label: 'Medication training', date: onboarding.med_training_date },
                      { key: 'right_to_work_verified', label: 'Right to work verified' },
                      { key: 'system_training_completed', label: 'System training', date: onboarding.system_training_date },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-3">
                        {onboarding[item.key]
                          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        }
                        <div>
                          <p className={`text-sm ${onboarding[item.key] ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                          {item.date && onboarding[item.key] && <p className="text-xs text-gray-400">{format(new Date(item.date), 'd MMM yyyy')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'clock' && (
              <div>
                <h3 className="font-semibold text-navy-900 mb-4">Clock in / out history</h3>
                {clockHistory.length === 0 ? (
                  <EmptyState title="No clock events" description="No clock-in or clock-out records found" />
                ) : (
                  <div className="space-y-2">
                    {clockHistory.slice(0, 20).map((e: any) => (
                      <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                        <Clock className={`w-5 h-5 flex-shrink-0 ${e.event_type === 'clock_in' ? 'text-green-500' : 'text-red-500'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 capitalize">{(e.event_type || '').replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{e.event_time ? format(new Date(e.event_time), 'd MMM yyyy, HH:mm') : '—'} · {e.home_name || 'Unknown home'}</p>
                        </div>
                        {e.punctuality && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.punctuality === 'on_time' ? 'bg-green-100 text-green-700' : e.punctuality === 'early' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {(e.punctuality || '').replace('_', ' ')}
                          </span>
                        )}
                        {e.geofence_passed !== undefined && (
                          e.geofence_passed
                            ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            : <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 font-medium">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5 capitalize">{value || '—'}</dd>
    </div>
  )
}

function AddLeaveModal({ open, onClose, staffId, onSaved }: { open: boolean; onClose: () => void; staffId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ leaveType: '', startDate: '', endDate: '', hoursRequested: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/staff-hr/leave', { staffId, ...form, hoursRequested: parseFloat(form.hoursRequested) }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request leave">
      <form onSubmit={save} className="space-y-4">
        <Select label="Leave type *" required value={form.leaveType} onChange={e => set('leaveType', e.target.value)} options={LEAVE_TYPES} placeholder="Select type" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date *" type="date" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End date *" type="date" required value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <Input label="Hours requested *" type="number" step="0.5" required value={form.hoursRequested} onChange={e => set('hoursRequested', e.target.value)} />
        <div><label className="label">Reason (optional)</label><textarea className="input" rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} /></div>
        <div className="flex gap-3 justify-end"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Submit request</Button></div>
      </form>
    </Modal>
  )
}

function AddTrainingModal({ open, onClose, staffId, onSaved }: { open: boolean; onClose: () => void; staffId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ courseName: '', completedDate: '', durationHours: '', expiryDate: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/staff-hr/training', { staffId, ...form, durationHours: form.durationHours ? parseFloat(form.durationHours) : null, expiryDate: form.expiryDate || null }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add training record">
      <form onSubmit={save} className="space-y-4">
        <Input label="Course name *" required value={form.courseName} onChange={e => set('courseName', e.target.value)} placeholder="e.g. First Aid, Manual Handling..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date completed *" type="date" required value={form.completedDate} onChange={e => set('completedDate', e.target.value)} />
          <Input label="Duration (hours)" type="number" step="0.5" value={form.durationHours} onChange={e => set('durationHours', e.target.value)} />
        </div>
        <Input label="Certificate expiry date" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} hint="Leave blank if no expiry" />
        <div className="flex gap-3 justify-end"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Save training</Button></div>
      </form>
    </Modal>
  )
}
