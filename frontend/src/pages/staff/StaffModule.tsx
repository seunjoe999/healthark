import React, { useEffect, useState } from 'react'
import { staffApi, homesApi } from '../../api'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInYears } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Plus, User, Calendar, Award, Clock, AlertTriangle, CheckCircle, Search, ChevronRight, Upload, FileText, Trash2, Eye, FileImage, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

const LEAVE_TYPES = [{ value: 'annual', label: 'Annual leave' }, { value: 'sick', label: 'Sick leave' }, { value: 'maternity', label: 'Maternity' }, { value: 'paternity', label: 'Paternity' }, { value: 'compassionate', label: 'Compassionate' }, { value: 'other', label: 'Other' }]

type StaffTab = 'profile' | 'training' | 'leave' | 'onboarding' | 'clock' | 'documents' | 'cautions' | 'supervisions'

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
  const [staffDocs, setStaffDocs] = useState<any[]>([])
  const [uploadStaffDocOpen, setUploadStaffDocOpen] = useState(false)
  const [cautions, setCautions] = useState<any[]>([])
  const [supervisions, setSupervisions] = useState<any[]>([])
  const [addCautionOpen, setAddCautionOpen] = useState(false)
  const [addSupervisionOpen, setAddSupervisionOpen] = useState(false)
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
    const [trainingRes, leaveRes, onboardingRes, clockRes, docsRes] = await Promise.all([
      api.get(`/staff-hr/training/${s.id}`),
      api.get('/staff-hr/leave'),
      api.get(`/staff-hr/onboarding/${s.id}`),
      staffApi.clockHistory(s.id),
      api.get(`/documents/staff/${s.id}`),
      api.get(`/reviews/cautions/${s.id}`),
      api.get(`/reviews/supervisions/${s.id}`),
    ])
    setTraining(trainingRes.data.data || [])
    setLeave((leaveRes.data.data || []).filter((l: any) => l.staff_id === s.id))
    setOnboarding(onboardingRes.data.data)
    setClockHistory(clockRes.data.data || [])
    setStaffDocs(docsRes.data.data || [])
    setCautions((await api.get(`/reviews/cautions/${s.id}`)).data.data || [])
    setSupervisions((await api.get(`/reviews/supervisions/${s.id}`)).data.data || [])
  }

  const getName = (s: any) => `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim()
  const filteredStaff = staff.filter(s => getName(s).toLowerCase().includes(search.toLowerCase()))

  const tabs: { key: StaffTab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'training', label: `Training (${training.length})` },
    { key: 'leave', label: `Leave (${leave.length})` },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'clock', label: 'Clock history' },
    { key: 'documents', label: 'Documents' },
    { key: 'cautions', label: 'Cautions' },
    { key: 'supervisions', label: 'Supervisions' },
  ]

  return (
    <div className="flex h-full">
      {/* Left — staff list */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3">Staff</h2>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="flex gap-2 mb-3">
            <Link to="/staff/new" className="flex-1">
              <button className="w-full py-2 rounded-xl text-xs font-semibold text-slate-900 transition-all" style={{background:'linear-gradient(135deg,#e8b130,#d4961a)'}}>
                + Add staff member
              </button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="input pl-8 text-sm" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <Spinner /> : filteredStaff.map(s => {
            const name = getName(s)
            const isSelected = selected?.id === s.id
            return (
              <button key={s.id} onClick={() => selectStaff(s)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-50 border-l-2 border-l-slate-900' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {(s.first_name || s.firstName || '?')[0]}{(s.last_name || s.lastName || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{name}</p>
                    <p className="text-xs text-slate-400 capitalize">{(s.role || '').replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — staff detail */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a staff member" description="Choose a staff member to view their profile and records" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
              <div className="flex items-center gap-4">
                <PhotoUpload
                  currentUrl={selected.photo_url || selected.photoUrl}
                  name={`${selected.first_name || selected.firstName || ''} ${selected.last_name || selected.lastName || ''}`}
                  uploadUrl={`/api/upload/staff-photo/${selected.id}`}
                  onUploaded={(url) => setSelected((p: any) => ({ ...p, photo_url: url }))}
                  size="md"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{getName(selected)}</h2>
                  <p className="text-sm text-slate-500 capitalize">{(selected.role || '').replace(/_/g, ' ')} · {selected.status}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    {selected.start_date && <span>Started {format(new Date(selected.start_date), 'd MMM yyyy')}</span>}
                    <span className="text-green-600 font-medium">{(selected.leave_hours_total || 224) - (selected.leave_hours_used || 0)} hrs leave remaining</span>
                  </div>
                </div>
                <Link to={`/staff/${selected.id}/edit`} className="flex-shrink-0">
                  <Button variant="outline" size="sm" icon={<Edit className="w-3.5 h-3.5" />}>Edit profile</Button>
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-5">
              <div className="flex overflow-x-auto">
                {tabs.map((t, i) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex-shrink-0 px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition-all relative border-b-2 ${
                      tab === t.key
                        ? 'border-gold-500 text-slate-900 bg-gold-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    style={tab === t.key ? { borderBottomColor: '#d4961a' } : {}}>
                    {t.label}
                    {tab === t.key && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: 'linear-gradient(90deg, #e8b130, #d4961a)' }} />
                    )}
                  </button>
                ))}
              </div>
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
                  <h3 className="font-semibold text-slate-900">Training & certificates</h3>
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
                        <div key={t.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                          <Award className={`w-5 h-5 flex-shrink-0 ${expired ? 'text-red-500' : expiring ? 'text-orange-500' : 'text-green-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{t.course_name}</p>
                            <p className="text-xs text-slate-500">Completed {t.completed_date ? format(new Date(t.completed_date), 'd MMM yyyy') : '—'}
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
                  <h3 className="font-semibold text-slate-900">Leave requests</h3>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddLeaveOpen(true)}>Request leave</Button>
                </div>
                {leave.length === 0 ? (
                  <EmptyState title="No leave requests" description="Submit a leave request using the button above" />
                ) : (
                  <div className="space-y-2">
                    {leave.map((l: any) => (
                      <div key={l.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                        <Calendar className="w-5 h-5 flex-shrink-0 text-slate-600" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 capitalize">{(l.leave_type || '').replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500">
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
                          : <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        }
                        <div>
                          <p className={`text-sm ${onboarding[item.key] ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</p>
                          {item.date && onboarding[item.key] && <p className="text-xs text-slate-400">{format(new Date(item.date), 'd MMM yyyy')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}


            {tab === 'documents' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Staff documents ({staffDocs.length})</h3>
                  <Button size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setUploadStaffDocOpen(true)}>Upload document</Button>
                </div>
                {staffDocs.length === 0 ? (
                  <EmptyState title="No documents uploaded" description="Upload DBS certificates, contracts, training records and more"
                    action={<Button icon={<Upload className="w-4 h-4" />} onClick={() => setUploadStaffDocOpen(true)}>Upload first document</Button>} />
                ) : (
                  <div className="space-y-2">
                    {staffDocs.map((doc: any) => (
                      <div key={doc.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{doc.title || doc.file_name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span>{STAFF_DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}</span>
                            {doc.expiry_date && <span className="text-amber-600 font-medium">Expires {format(new Date(doc.expiry_date), 'd MMM yyyy')}</span>}
                            <span>{doc.created_at ? format(new Date(doc.created_at), 'd MMM yyyy') : ''}</span>
                          </div>
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <StaffDocUploadModal open={uploadStaffDocOpen} onClose={() => setUploadStaffDocOpen(false)} staffId={selected.id}
                  onUploaded={(doc) => { setStaffDocs(prev => [doc, ...prev]); setUploadStaffDocOpen(false); toast.success('Document uploaded') }} />
              </div>
            )}

            {tab === 'cautions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Cautions & Disciplinary ({cautions.length})</h3>
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddCautionOpen(true)}>Add caution</Button>
                </div>
                {cautions.length === 0 ? (
                  <EmptyState title="No cautions recorded" description="Record verbal warnings, written warnings or disciplinary actions"
                    action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddCautionOpen(true)}>Add caution</Button>} />
                ) : (
                  <div className="space-y-3">
                    {cautions.map((c: any) => (
                      <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="badge badge-warning capitalize">{(c.caution_type || '').replace('_', ' ')}</span>
                          <p className="text-xs text-slate-400">{c.created_at ? format(new Date(c.created_at), 'd MMM yyyy') : ''}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overview</p><p className="text-slate-700 mt-0.5">{c.overview}</p></div>
                          {c.strengths && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strengths</p><p className="text-slate-700 mt-0.5">{c.strengths}</p></div>}
                          {c.weaknesses && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Areas for improvement</p><p className="text-slate-700 mt-0.5">{c.weaknesses}</p></div>}
                          {c.action_points && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action points</p><p className="text-slate-700 mt-0.5">{c.action_points}</p></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {addCautionOpen && selected && (
                  <AddCautionModalInline staffId={selected.id} onClose={() => setAddCautionOpen(false)}
                    onSaved={async () => { setAddCautionOpen(false); const res = await api.get(`/reviews/cautions/${selected.id}`); setCautions(res.data.data || []); toast.success('Caution recorded') }} />
                )}
              </div>
            )}

            {tab === 'supervisions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Supervisions & Reviews ({supervisions.length})</h3>
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddSupervisionOpen(true)}>Add supervision</Button>
                </div>
                {supervisions.length === 0 ? (
                  <EmptyState title="No supervisions recorded" description="Document supervision sessions and performance reviews"
                    action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddSupervisionOpen(true)}>Add supervision</Button>} />
                ) : (
                  <div className="space-y-3">
                    {supervisions.map((s: any) => (
                      <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                        <div className="flex items-start justify-between mb-2">
                          <span className="badge badge-info capitalize">{(s.supervision_type || '').replace('_', ' ')}</span>
                          <p className="text-xs text-slate-400">{s.supervision_date ? format(new Date(s.supervision_date), 'd MMM yyyy') : ''}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          {s.summary && <p className="text-slate-700">{s.summary}</p>}
                          {s.strengths && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strengths</p><p className="text-slate-700 mt-0.5">{s.strengths}</p></div>}
                          {s.areas_for_improvement && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Areas for improvement</p><p className="text-slate-700 mt-0.5">{s.areas_for_improvement}</p></div>}
                          {s.action_points && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action points</p><p className="text-slate-700 mt-0.5">{s.action_points}</p></div>}
                          {s.staff_comments && <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff comments</p><p className="text-slate-700 mt-0.5 italic">"{s.staff_comments}"</p></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {addSupervisionOpen && selected && (
                  <AddSupervisionModalInline staffId={selected.id} onClose={() => setAddSupervisionOpen(false)}
                    onSaved={async () => { setAddSupervisionOpen(false); const res = await api.get(`/reviews/supervisions/${selected.id}`); setSupervisions(res.data.data || []); toast.success('Supervision recorded') }} />
                )}
              </div>
            )}

            {tab === 'clock' && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Clock in / out history</h3>
                {clockHistory.length === 0 ? (
                  <EmptyState title="No clock events" description="No clock-in or clock-out records found" />
                ) : (
                  <div className="space-y-2">
                    {clockHistory.slice(0, 20).map((e: any) => (
                      <div key={e.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                        <Clock className={`w-5 h-5 flex-shrink-0 ${e.event_type === 'clock_in' ? 'text-green-500' : 'text-red-500'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 capitalize">{(e.event_type || '').replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500">{e.event_time ? format(new Date(e.event_time), 'd MMM yyyy, HH:mm') : '—'} · {e.home_name || 'Unknown home'}</p>
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
      <dt className="text-xs text-slate-500 font-medium">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5 capitalize">{value || '—'}</dd>
    </div>
  )
}

function AddCautionModalInline({ staffId, onClose, onSaved }: { staffId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState({ cautionType: 'verbal', overview: '', strengths: '', weaknesses: '', actionPoints: '', reviewDate: '' })
  const [loading, setLoading] = React.useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const CAUTION_TYPES = [{ value: 'verbal', label: 'Verbal warning' }, { value: 'written', label: 'Written warning' }, { value: 'final_written', label: 'Final written warning' }, { value: 'performance_plan', label: 'Performance improvement plan' }]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/reviews/cautions', { staffId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Record caution" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Select label="Caution type *" required value={form.cautionType} onChange={e => set('cautionType', e.target.value)} options={CAUTION_TYPES} />
        <div><label className="label">Overview *</label><textarea required className="input" rows={3} value={form.overview} onChange={e => set('overview', e.target.value)} placeholder="Overview of the issue or incident..." /></div>
        <div><label className="label">Strengths</label><textarea className="input" rows={2} value={form.strengths} onChange={e => set('strengths', e.target.value)} /></div>
        <div><label className="label">Weaknesses / Areas for improvement</label><textarea className="input" rows={2} value={form.weaknesses} onChange={e => set('weaknesses', e.target.value)} /></div>
        <div><label className="label">Action points</label><textarea className="input" rows={2} value={form.actionPoints} onChange={e => set('actionPoints', e.target.value)} /></div>
        <Input label="Review date" type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        <div className="flex gap-3 justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Save caution</Button></div>
      </form>
    </Modal>
  )
}

function AddSupervisionModalInline({ staffId, onClose, onSaved }: { staffId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState({ supervisionType: 'supervision', supervisionDate: new Date().toISOString().split('T')[0], summary: '', strengths: '', areasForImprovement: '', actionPoints: '', staffComments: '', nextDate: '' })
  const [loading, setLoading] = React.useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const SUPERVISION_TYPES = [{ value: 'supervision', label: 'Supervision' }, { value: 'appraisal', label: 'Appraisal' }, { value: 'one_to_one', label: 'One-to-one' }, { value: 'return_to_work', label: 'Return to work' }, { value: 'probation_review', label: 'Probation review' }]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/reviews/supervisions', { staffId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Record supervision" size="lg">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type *" required value={form.supervisionType} onChange={e => set('supervisionType', e.target.value)} options={SUPERVISION_TYPES} />
          <Input label="Date *" type="date" required value={form.supervisionDate} onChange={e => set('supervisionDate', e.target.value)} />
        </div>
        <div><label className="label">Summary</label><textarea className="input" rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} /></div>
        <div><label className="label">Strengths</label><textarea className="input" rows={2} value={form.strengths} onChange={e => set('strengths', e.target.value)} /></div>
        <div><label className="label">Areas for improvement</label><textarea className="input" rows={2} value={form.areasForImprovement} onChange={e => set('areasForImprovement', e.target.value)} /></div>
        <div><label className="label">Action points</label><textarea className="input" rows={2} value={form.actionPoints} onChange={e => set('actionPoints', e.target.value)} /></div>
        <div><label className="label">Staff member's comments</label><textarea className="input" rows={2} value={form.staffComments} onChange={e => set('staffComments', e.target.value)} /></div>
        <Input label="Next supervision date" type="date" value={form.nextDate} onChange={e => set('nextDate', e.target.value)} />
        <div className="flex gap-3 justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Save supervision</Button></div>
      </form>
    </Modal>
  )
}

function AddTrainingModal({ open, onClose, staffId, onSaved }: { open: boolean; onClose: () => void; staffId: string; onSaved: () => void }) {
  const [form, setForm] = React.useState({ courseName: '', completedDate: '', expiryDate: '', durationHours: '', provider: '', certificateUrl: '' })
  const [loading, setLoading] = React.useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/staff-hr/training`, { staffId, ...form })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add training record">
      <form onSubmit={save} className="space-y-4">
        <Input label="Course name *" required value={form.courseName} onChange={e => set('courseName', e.target.value)} placeholder="e.g. Manual Handling, Safeguarding Adults..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Completed date *" type="date" required value={form.completedDate} onChange={e => set('completedDate', e.target.value)} />
          <Input label="Expiry date" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Duration (hours)" type="number" step="0.5" value={form.durationHours} onChange={e => set('durationHours', e.target.value)} />
          <Input label="Provider / trainer" value={form.provider} onChange={e => set('provider', e.target.value)} />
        </div>
        <Input label="Certificate URL" value={form.certificateUrl} onChange={e => set('certificateUrl', e.target.value)} placeholder="Link to certificate..." />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add training</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddLeaveModal({ open, onClose, staffId, onSaved }: { open: boolean; onClose: () => void; staffId: string; onSaved: () => void }) {
  const [form, setForm] = React.useState({ leaveType: 'annual', startDate: '', endDate: '', totalHours: '', notes: '', status: 'pending' })
  const [loading, setLoading] = React.useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const LEAVE_TYPES = [{ value: 'annual', label: 'Annual leave' }, { value: 'sick', label: 'Sick leave' }, { value: 'maternity', label: 'Maternity leave' }, { value: 'paternity', label: 'Paternity leave' }, { value: 'unpaid', label: 'Unpaid leave' }, { value: 'other', label: 'Other' }]
  const STATUSES = [{ value: 'pending', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/staff-hr/leave`, { staffId, ...form, totalHours: parseFloat(form.totalHours) || null })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request / record leave">
      <form onSubmit={save} className="space-y-4">
        <Select label="Leave type *" required value={form.leaveType} onChange={e => set('leaveType', e.target.value)} options={LEAVE_TYPES} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date *" type="date" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End date *" type="date" required value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <Input label="Total hours" type="number" step="0.5" value={form.totalHours} onChange={e => set('totalHours', e.target.value)} hint="e.g. 7.5 for one day" />
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={STATUSES} />
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save leave record</Button>
        </div>
      </form>
    </Modal>
  )
}

function StaffDocUploadModal({ open, onClose, staffId, onSaved }: { open: boolean; onClose: () => void; staffId: string; onSaved: (doc: any) => void }) {
  const [docType, setDocType] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const STAFF_DOC_TYPES = [
    { value: 'dbs_certificate', label: 'DBS certificate' },
    { value: 'application_form', label: 'Application form' },
    { value: 'care_certificate', label: 'Care certificate' },
    { value: 'induction_record', label: 'Induction record' },
    { value: 'reference', label: 'Reference' },
    { value: 'contract', label: 'Employment contract' },
    { value: 'training_certificate', label: 'Training certificate' },
    { value: 'right_to_work', label: 'Right to work document' },
    { value: 'id_document', label: 'ID / Passport' },
    { value: 'disciplinary', label: 'Disciplinary record' },
    { value: 'appraisal', label: 'Appraisal document' },
    { value: 'medical_clearance', label: 'Medical clearance' },
    { value: 'other', label: 'Other document' },
  ]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !docType) { toast.error('Please select a document type and file'); return }
    setLoading(true)
    try {
      const token = (window as any).__HA_TOKEN__ || sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', docType)
      formData.append('title', title || file.name)
      if (notes) formData.append('notes', notes)
      if (expiryDate) formData.append('expiryDate', expiryDate)
      const res = await fetch(`/api/documents/staff/${staffId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSaved(data.data)
    } catch (err: any) { toast.error(err?.message || 'Upload failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload staff document">
      <form onSubmit={save} className="space-y-4">
        <Select label="Document type *" required value={docType} onChange={e => setDocType(e.target.value)}
          options={STAFF_DOC_TYPES} placeholder="Select document type" />
        <Input label="Document title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Leave blank to use filename" />
        <div onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-emerald-400 bg-emerald-500/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
          {file ? (
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <FileText className="w-5 h-5" /><span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <div><Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-600 font-medium">Click to choose file</p><p className="text-xs text-slate-400 mt-1">PDF, Word, images up to 20MB</p></div>
          )}
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
        <Input label="Expiry date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} hint="For certificates with expiry dates" />
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Upload className="w-4 h-4" />}>Upload</Button>
        </div>
      </form>
    </Modal>
  )
}
