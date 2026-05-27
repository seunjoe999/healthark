import React, { useEffect, useState, useCallback } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO, isSameDay, eachDayOfInterval } from 'date-fns'
import { Spinner, EmptyState, Button } from '../../components/ui'
import { Calendar, Check, X, AlertTriangle, Clock, User, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-50 border-amber-200 text-amber-800',
  approved: 'bg-green-50 border-green-200 text-green-800',
  declined: 'bg-red-50 border-red-200 text-red-800',
}

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity',
  paternity: 'Paternity', compassionate: 'Compassionate', unpaid: 'Unpaid', other: 'Other',
}

interface LeaveRecord {
  id: string
  staff_id: string
  staff_name: string
  photo_url?: string
  leave_type: string
  start_date: string
  end_date: string
  hours_requested?: number
  status: string
  created_at: string
}

function detectConflicts(leaves: LeaveRecord[]): Set<string> {
  const conflicting = new Set<string>()
  const pending = leaves.filter(l => l.status === 'pending')
  for (let i = 0; i < pending.length; i++) {
    for (let j = i + 1; j < pending.length; j++) {
      const a = pending[i], b = pending[j]
      if (a.staff_id === b.staff_id) continue
      const aDays = eachDayOfInterval({ start: parseISO(a.start_date), end: parseISO(a.end_date) })
      const bDays = eachDayOfInterval({ start: parseISO(b.start_date), end: parseISO(b.end_date) })
      const overlap = aDays.some(d => bDays.some(d2 => isSameDay(d, d2)))
      if (overlap) { conflicting.add(a.id); conflicting.add(b.id) }
    }
  }
  return conflicting
}

export default function LeaveManagement() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  const load = useCallback(async () => {
    if (!selectedHome) return
    setLoading(true)
    try {
      const res = await api.get('/staff-hr/leave', { params: { homeId: selectedHome } })
      const data: LeaveRecord[] = res.data.data || []
      // Sort by created_at ASC so first request comes first
      data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setLeaves(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }, [selectedHome])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    try {
      await api.put(`/staff-hr/leave/${id}/approve`)
      toast.success('Leave approved')
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  const decline = async (id: string) => {
    if (!confirm('Decline this leave request?')) return
    try {
      await api.put(`/staff-hr/leave/${id}/decline`)
      toast.success('Leave declined')
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  const filtered = leaves.filter(l => filter === 'all' || l.status === filter)
  const conflicts = detectConflicts(leaves)

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    declined: leaves.filter(l => l.status === 'declined').length,
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              Leave Requests
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage staff leave — requests ordered by submission time (first come, first served)</p>
          </div>
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Filter dropdown */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <label className="text-sm text-slate-600 font-medium">Filter by status:</label>
        <div className="relative">
          <select
            className="input text-sm pr-10 appearance-none cursor-pointer bg-white"
            value={filter}
            onChange={e => setFilter(e.target.value as 'all' | 'pending' | 'approved' | 'declined')}
            style={{ minWidth: '180px' }}
          >
            <option value="all">All ({counts.all})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="approved">Approved ({counts.approved})</option>
            <option value="declined">Declined ({counts.declined})</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <span className="text-xs text-slate-400 ml-2">{filtered.length} request{filtered.length !== 1 ? 's' : ''} shown</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No leave requests" description={`No ${filter === 'all' ? '' : filter} leave requests found`} />
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filtered.map((leave, idx) => {
              const hasConflict = conflicts.has(leave.id)
              const requestNumber = leaves.findIndex(l => l.id === leave.id) + 1
              return (
                <div key={leave.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasConflict ? 'border-amber-300' : 'border-slate-200'}`}>
                  <div className="p-4 flex items-start gap-4">
                    {/* Position indicator */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                      {requestNumber}
                    </div>

                    {/* Staff info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{leave.staff_name}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {LEAVE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_COLORS[leave.status] || STATUS_COLORS.pending}`}>
                          {leave.status}
                        </span>
                        {hasConflict && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Conflict
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {format(parseISO(leave.start_date), 'd MMM yyyy')}
                          {leave.start_date !== leave.end_date && ` – ${format(parseISO(leave.end_date), 'd MMM yyyy')}`}
                        </span>
                        {leave.hours_requested && (
                          <span className="text-slate-500">{leave.hours_requested}h</span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400 text-xs">
                          <Clock className="w-3 h-3" />
                          Requested {format(new Date(leave.created_at), 'd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {leave.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approve(leave.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors border border-green-200">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => decline(leave.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors border border-red-200">
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {hasConflict && leave.status === 'pending' && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      This leave overlaps with another pending request. Request #{requestNumber} — consider approving the earliest request first.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
