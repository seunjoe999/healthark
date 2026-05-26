import React, { useEffect, useState } from 'react'
import api from '../../api'
import { homesApi, staffApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card } from '../../components/ui'
import { CalendarDays, Plus, Check, X, ChevronLeft, ChevronRight, Clock, ListFilter } from 'lucide-react'
import toast from 'react-hot-toast'

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid leave' },
  { value: 'other', label: 'Other' },
]

export default function Holidays() {
  const { user, isRole } = useAuth()
  const [leaves, setLeaves] = useState<any[]>([])
  const [allLeaves, setAllLeaves] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [view, setView] = useState<'calendar' | 'list' | 'requests'>('calendar')
  const [preview, setPreview] = useState<any>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    staffApi.list({ homeId: selectedHome }).then(res => setStaffList(res.data.data || []))
    load()
    loadAllRequests()
  }, [selectedHome, currentMonth])

  const load = async () => {
    setLoading(true)
    try {
      const staffId = !isRole('home_manager','group_admin','senior_carer') ? user?.id : undefined
      const res = await api.get('/staff-hr/leave/all', {
        params: {
          homeId: selectedHome,
          ...(staffId ? { staffId } : {}),
          from: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
          to: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
        }
      })
      setLeaves(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadAllRequests = async () => {
    if (!selectedHome) return
    setLoadingAll(true)
    try {
      const staffId = !isRole('home_manager','group_admin','senior_carer') ? user?.id : undefined
      const res = await api.get('/staff-hr/leave/all', {
        params: { homeId: selectedHome, ...(staffId ? { staffId } : {}), orderBy: 'applied' }
      })
      setAllLeaves(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingAll(false) }
  }

  const approve = async (id: string) => {
    try {
      await api.put(`/staff-hr/leave/${id}/approve`)
      await Promise.all([load(), loadAllRequests()])
      toast.success('Leave approved')
    } catch { toast.error('Failed') }
  }

  const decline = async (id: string) => {
    try {
      await api.put(`/staff-hr/leave/${id}/decline`)
      await Promise.all([load(), loadAllRequests()])
      toast.success('Leave declined')
    } catch { toast.error('Failed') }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDay = startOfMonth(currentMonth).getDay()

  const getDayLeaves = (day: Date) => leaves.filter(l => {
    try {
      return isWithinInterval(day, { start: parseISO(l.start_date), end: parseISO(l.end_date) })
    } catch { return false }
  })

  const pending = leaves.filter(l => l.status === 'pending')
  const approved = leaves.filter(l => l.status === 'approved')
  const allPending = allLeaves.filter(l => l.status === 'pending')
  const allApproved = allLeaves.filter(l => l.status === 'approved')
  const allDeclined = allLeaves.filter(l => l.status === 'declined')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-purple-600" /> Leave & Holidays
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {allPending.length} pending · {allApproved.length} approved · {allDeclined.length} declined
          </p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Calendar</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>List</button>
            <button onClick={() => setView('requests')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${view === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Requests
              {allPending.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{allPending.length > 9 ? '9+' : allPending.length}</span>}
            </button>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Request leave</Button>
        </div>
      </div>

      {/* Pending approvals banner */}
      {allPending.length > 0 && isRole('home_manager', 'group_admin') && view !== 'requests' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">{allPending.length} leave request{allPending.length > 1 ? 's' : ''} awaiting approval</p>
          </div>
          <button onClick={() => setView('requests')} className="text-xs text-amber-700 font-bold hover:underline">Review →</button>
        </div>
      )}

      {view === 'requests' ? (
        loadingAll ? <Spinner /> : (
          <div className="space-y-6">
            {[
              { status: 'pending', label: 'Pending', items: allPending, accent: 'border-amber-400', badge: 'badge-warning', headerBg: 'bg-amber-50', headerText: 'text-amber-800' },
              { status: 'approved', label: 'Approved', items: allApproved, accent: 'border-emerald-400', badge: 'badge-success', headerBg: 'bg-emerald-50', headerText: 'text-emerald-800' },
              { status: 'declined', label: 'Declined', items: allDeclined, accent: 'border-rose-400', badge: 'badge-critical', headerBg: 'bg-rose-50', headerText: 'text-rose-800' },
            ].map(({ status, label, items, accent, badge, headerBg, headerText }) => (
              <div key={status}>
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 ${headerBg}`}>
                  <span className={`text-sm font-bold ${headerText}`}>{label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${headerBg} ${headerText} border ${status === 'pending' ? 'border-amber-300' : status === 'approved' ? 'border-emerald-300' : 'border-rose-300'}`}>{items.length}</span>
                  {status === 'pending' && <span className="text-xs text-slate-400 ml-auto">sorted by application date ↑</span>}
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-slate-400 italic px-4">No {label.toLowerCase()} requests</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((l: any, idx: number) => (
                      <div key={l.id} className={`bg-white rounded-2xl border-l-4 ${accent} shadow-sm p-4 flex items-start justify-between gap-4`}
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 flex flex-col items-center pt-0.5 w-8">
                            <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            status === 'declined' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {(l.staff_name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{l.staff_name}</p>
                            <p className="text-sm text-slate-500 capitalize mt-0.5">
                              {(l.leave_type || '').replace(/_/g, ' ')} · {l.start_date ? format(parseISO(l.start_date), 'd MMM') : ''} – {l.end_date ? format(parseISO(l.end_date), 'd MMM yyyy') : ''}
                              {l.hours_requested ? ` · ${l.hours_requested}h` : ''}
                            </p>
                            {l.reason && <p className="text-xs text-slate-400 italic mt-1 truncate">{l.reason}</p>}
                            <p className="text-xs text-slate-300 mt-1">Applied {l.created_at ? format(parseISO(l.created_at), 'd MMM yyyy, HH:mm') : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {l.status === 'pending' && isRole('home_manager', 'group_admin', 'senior_carer') && (
                            <>
                              <button onClick={() => approve(l.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors">
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => decline(l.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                <X className="w-3.5 h-3.5" /> Decline
                              </button>
                            </>
                          )}
                          {l.status !== 'pending' && (
                            <span className={`badge ${badge}`}>{status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : loading ? <Spinner /> : view === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 px-6 py-3 border-b border-slate-50 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" />Pending</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" />Approved</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400" />Declined</span>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-50">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="min-h-[80px] border-b border-r border-slate-50" />)}
            {days.map(day => {
              const dayLeaves = getDayLeaves(day)
              const isToday = isSameDay(day, new Date())
              return (
                <div key={day.toString()} className="min-h-[80px] border-b border-r border-slate-50 p-1.5">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'text-white font-bold' : 'text-slate-600'}`}
                    style={isToday ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 2).map((l: any) => (
                      <div key={l.id} onClick={() => setPreview(l)} className={`text-xs px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-80 ${
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {(l.staff_name || '').split(' ')[0]}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && <p className="text-xs text-slate-400 pl-1">+{dayLeaves.length-2}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.length === 0 ? (
            <EmptyState title="No leave requests this month" description="All leave requests will appear here"
              action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Request leave</Button>} />
          ) : leaves.map((l: any) => (
            <div key={l.id} className={`bg-white rounded-2xl border shadow-card p-5 flex items-start justify-between gap-4 ${
              l.status === 'approved' ? 'border-emerald-200' : l.status === 'declined' ? 'border-rose-200' : 'border-amber-200'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  l.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {(l.staff_name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{l.staff_name}</p>
                  <p className="text-sm text-slate-500 capitalize">{(l.leave_type || '').replace('_', ' ')} · {l.start_date ? format(parseISO(l.start_date), 'd MMM') : ''} – {l.end_date ? format(parseISO(l.end_date), 'd MMM yyyy') : ''}</p>
                  {l.total_hours && <p className="text-xs text-slate-400">{l.total_hours} hours</p>}
                  {l.notes && <p className="text-xs text-slate-400 italic mt-0.5">{l.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'declined' ? 'badge-critical' : 'badge-warning'}`}>
                  {l.status}
                </span>
                {l.status === 'pending' && isRole('home_manager', 'group_admin', 'senior_carer') && (
                  <>
                    <button onClick={() => approve(l.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => decline(l.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 transition-colors">
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Leave Details">
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-lg">{preview.staff_name}</p>
                <p className="text-sm text-slate-500 capitalize">{(preview.leave_type || '').replace('_', ' ')}</p>
              </div>
              <span className={`badge ${preview.status === 'approved' ? 'badge-success' : preview.status === 'declined' ? 'badge-critical' : 'badge-warning'}`}>{preview.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Start date</p><p className="font-medium text-slate-800">{preview.start_date ? format(parseISO(preview.start_date), 'd MMM yyyy') : '—'}</p></div>
              <div><p className="text-xs text-slate-400">End date</p><p className="font-medium text-slate-800">{preview.end_date ? format(parseISO(preview.end_date), 'd MMM yyyy') : '—'}</p></div>
              {preview.total_hours && <div><p className="text-xs text-slate-400">Hours</p><p className="font-medium text-slate-800">{preview.total_hours}h</p></div>}
              {preview.approved_by_name && <div><p className="text-xs text-slate-400">Approved by</p><p className="font-medium text-slate-800">{preview.approved_by_name}</p></div>}
            </div>
            {preview.notes && <div><p className="text-xs text-slate-400 mb-1">Reason / notes</p><p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{preview.notes}</p></div>}
            {preview.status === 'pending' && isRole('home_manager', 'group_admin', 'senior_carer') && (
              <div className="flex gap-2 pt-2">
                <button onClick={async () => { await approve(preview.id); setPreview(null) }}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600">
                  Approve
                </button>
                <button onClick={async () => { await decline(preview.id); setPreview(null) }}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-rose-50 hover:text-rose-600">
                  Decline
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <AddLeaveRequestModal open={addOpen} onClose={() => setAddOpen(false)}
        staffList={isRole('home_manager','group_admin','senior_carer') ? staffList : []}
        defaultStaffId={!isRole('home_manager','group_admin','senior_carer') ? user?.id : undefined}
        homeId={selectedHome}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Leave request submitted') }} />
    </div>
  )
}

function AddLeaveRequestModal({ open, onClose, staffList, homeId, defaultStaffId, onSaved }: {
  open: boolean; onClose: () => void; staffList: any[]; homeId: string; defaultStaffId?: string; onSaved: () => void
}) {
  const [form, setForm] = useState({ staffId: defaultStaffId || '', leaveType: 'annual', startDate: '', endDate: '', totalHours: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const options = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId || !form.startDate || !form.endDate) { toast.error('Please fill all required fields'); return }
    setLoading(true)
    try {
      await api.post('/staff-hr/leave', { ...form, totalHours: parseFloat(form.totalHours) || null })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request / record leave">
      <form onSubmit={save} className="space-y-4">
        {staffList.length > 0 && <Select label="Staff member *" required value={form.staffId} onChange={e => set('staffId', e.target.value)} options={options} placeholder="Select staff member..." />}
        <Select label="Leave type *" required value={form.leaveType} onChange={e => set('leaveType', e.target.value)} options={LEAVE_TYPES} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date *" type="date" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End date *" type="date" required value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <Input label="Total hours" type="number" step="0.5" value={form.totalHours} onChange={e => set('totalHours', e.target.value)} hint="e.g. 7.5 per day" />
        <div><label className="label">Notes / reason</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Submit request</Button>
        </div>
      </form>
    </Modal>
  )
}
