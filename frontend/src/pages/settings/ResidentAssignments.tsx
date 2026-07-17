import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { UserCheck, X, Plus, Users, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resident {
  id: string
  first_name: string
  last_name: string
  photo_url?: string
  status: string
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
  photo_url?: string
}

interface Assignment {
  id: string
  staff_id: string
  su_id: string
  staff_name: string
  staff_role: string
  staff_photo?: string
  su_name: string
  su_photo?: string
  su_status: string
}

const ROLE_LABELS: Record<string, string> = {
  care_staff: 'Care Staff',
  senior_carer: 'Senior Carer',
  team_leader: 'Team Leader',
  admin: 'Admin',
  deputy_manager: 'Deputy Manager',
  home_manager: 'Manager',
  auditor: 'Auditor',
  group_admin: 'Director',
}

export default function ResidentAssignments() {
  const { user } = useAuth()
  const homeId = (user as any)?.homeId || ''

  const [residents, setResidents] = useState<Resident[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!homeId) return
    setLoading(true)
    Promise.all([
      api.get('/service-users', { params: { homeId } }),
      api.get('/staff', { params: { homeId } }),
      api.get('/service-users/assignments/list', { params: { homeId } }),
    ]).then(([rRes, sRes, aRes]) => {
      const allResidents = rRes.data.data || []
      setResidents(allResidents.filter((r: Resident) => r.status === 'live' || r.status === 'active'))
      setStaff((sRes.data.data || []).filter((s: StaffMember) =>
        ['care_staff', 'team_leader', 'senior_carer'].includes(s.role)
      ))
      setAssignments(aRes.data.data || [])
    }).catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false))
  }, [homeId])

  const autoAssignAll = async () => {
    if (!residents.length || !staff.length) { toast.error('No residents or staff to assign'); return }
    setAiLoading(true)
    try {
      // Round-robin: distribute all unassigned residents across available staff
      const unassignedResidents = residents.filter(r => assignedStaffForResident(r.id).length === 0)
      if (!unassignedResidents.length) { toast.success('All residents already have staff assigned'); setAiLoading(false); return }
      const staffPool = staff.slice()
      let idx = 0
      const newAssignments: any[] = []
      for (const r of unassignedResidents) {
        const s = staffPool[idx % staffPool.length]
        idx++
        try {
          await api.post('/service-users/assignments', { homeId, suId: r.id, staffId: s.id })
          newAssignments.push({
            id: `${s.id}-${r.id}`, staff_id: s.id, su_id: r.id,
            staff_name: `${s.first_name} ${s.last_name}`, staff_role: s.role,
            su_name: `${r.first_name} ${r.last_name}`, su_status: r.status,
          })
        } catch {}
      }
      setAssignments(prev => [...prev, ...newAssignments])
      toast.success(`Auto-assigned ${newAssignments.length} residents to staff`)
    } catch { toast.error('Auto-assign failed') }
    finally { setAiLoading(false) }
  }

  const assignedStaffForResident = (suId: string) =>
    assignments.filter(a => a.su_id === suId)

  const unassignedStaffForResident = (suId: string) => {
    const assigned = new Set(assignments.filter(a => a.su_id === suId).map(a => a.staff_id))
    return staff.filter(s => !assigned.has(s.id))
  }

  const assign = async (suId: string, staffId: string) => {
    setAdding(staffId)
    try {
      await api.post('/service-users/assignments', { homeId, suId, staffId })
      const s = staff.find(s => s.id === staffId)!
      const r = residents.find(r => r.id === suId)!
      setAssignments(prev => [...prev, {
        id: `${staffId}-${suId}`,
        staff_id: staffId, su_id: suId,
        staff_name: `${s.first_name} ${s.last_name}`,
        staff_role: s.role,
        staff_photo: s.photo_url,
        su_name: `${r.first_name} ${r.last_name}`,
        su_photo: r.photo_url,
        su_status: r.status,
      }])
      toast.success(`${s.first_name} assigned to ${r.first_name}`)
    } catch { toast.error('Failed to assign') }
    finally { setAdding(null) }
  }

  const unassign = async (suId: string, staffId: string) => {
    setRemoving(`${staffId}-${suId}`)
    try {
      await api.delete('/service-users/assignments', { data: { staffId, suId } })
      setAssignments(prev => prev.filter(a => !(a.staff_id === staffId && a.su_id === suId)))
      const s = staff.find(s => s.id === staffId)
      const r = residents.find(r => r.id === suId)
      toast.success(`${s?.first_name || 'Staff'} removed from ${r?.first_name || 'resident'}`)
    } catch { toast.error('Failed to remove') }
    finally { setRemoving(null) }
  }

  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Resident Assignments</h1>
            <p className="text-sm text-slate-500">Assign care staff to residents — staff only see residents they are assigned to</p>
          </div>
        </div>
        <button
          onClick={autoAssignAll}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
          {aiLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Auto-Assign All
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search residents…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">How confidentiality works</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Care Staff and Team Leaders only see residents assigned to them here</li>
          <li>Managers, Deputy Managers, and Directors see all residents</li>
          <li>Unassigned care staff see no residents at all</li>
        </ul>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-8">No active residents found</p>
        )}
        {filtered.map(resident => {
          const residentAssignments = assignedStaffForResident(resident.id)
          const available = unassignedStaffForResident(resident.id)
          const isOpen = expanded === resident.id

          return (
            <div key={resident.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : resident.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
              >
                {resident.photo_url ? (
                  <img src={resident.photo_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-600">
                    {resident.first_name[0]}{resident.last_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{resident.first_name} {resident.last_name}</p>
                  <p className="text-xs text-slate-500">
                    {residentAssignments.length === 0
                      ? <span className="text-rose-500 font-medium">No staff assigned</span>
                      : `${residentAssignments.length} staff assigned`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {residentAssignments.slice(0, 4).map(a => (
                    <div key={a.staff_id} title={a.staff_name}
                      className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {a.staff_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                  ))}
                  {residentAssignments.length > 4 && (
                    <span className="text-xs text-slate-400">+{residentAssignments.length - 4}</span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                  {residentAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Assigned staff</p>
                      <div className="space-y-1.5">
                        {residentAssignments.map(a => (
                          <div key={a.staff_id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                {a.staff_name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{a.staff_name}</p>
                                <p className="text-xs text-slate-400">{ROLE_LABELS[a.staff_role] || a.staff_role}</p>
                              </div>
                            </div>
                            <button
                              disabled={removing === `${a.staff_id}-${a.su_id}`}
                              onClick={() => unassign(resident.id, a.staff_id)}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {available.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add staff</p>
                      <div className="space-y-1.5">
                        {available.map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                                {s.first_name[0]}{s.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm text-slate-600">{s.first_name} {s.last_name}</p>
                                <p className="text-xs text-slate-400">{ROLE_LABELS[s.role] || s.role}</p>
                              </div>
                            </div>
                            <button
                              disabled={adding === s.id}
                              onClick={() => assign(resident.id, s.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50">
                              <Plus className="w-3 h-3" /> Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {available.length === 0 && residentAssignments.length > 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">All eligible staff are assigned to this resident</p>
                  )}
                  {staff.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No Care Staff or Team Leaders found</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
