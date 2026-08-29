import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { Users, X, Plus, Search, ChevronDown, ChevronUp, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
  photo_url?: string
  team_id?: string | null
}

interface Team {
  id: string
  name: string
  leader_staff_id: string | null
  leader_name?: string | null
  member_count: number
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

export default function Teams() {
  const { user, isRole } = useAuth()
  const homeId = (user as any)?.homeId || ''

  if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">Only managers and admins can manage teams.</p>
      </div>
    )
  }

  const [teams, setTeams] = useState<Team[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [members, setMembers] = useState<Record<string, StaffMember[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLeaderId, setNewLeaderId] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    if (!homeId) return
    setLoading(true)
    Promise.all([
      api.get('/teams', { params: { homeId } }),
      api.get('/staff', { params: { homeId } }),
    ]).then(async ([tRes, sRes]) => {
      const allTeams: Team[] = tRes.data.data || []
      setTeams(allTeams)
      setStaff(sRes.data.data || [])
      const memberLists = await Promise.all(
        allTeams.map(t => api.get(`/teams/${t.id}/members`).then(r => [t.id, r.data.data || []] as const))
      )
      setMembers(Object.fromEntries(memberLists))
    }).catch(() => toast.error('Failed to load teams'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [homeId])

  const createTeam = async () => {
    if (!newName.trim()) { toast.error('Team name required'); return }
    setCreating(true)
    try {
      const res = await api.post('/teams', { homeId, name: newName.trim(), leaderStaffId: newLeaderId || undefined })
      const team = res.data.data
      setTeams(prev => [...prev, { ...team, member_count: newLeaderId ? 1 : 0 }])
      setMembers(prev => ({ ...prev, [team.id]: newLeaderId ? [staff.find(s => s.id === newLeaderId)!].filter(Boolean) : [] }))
      setNewName(''); setNewLeaderId(''); setShowCreate(false)
      toast.success('Team created')
    } catch { toast.error('Failed to create team') }
    finally { setCreating(false) }
  }

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Delete this team? Members will be unassigned.')) return
    try {
      await api.delete(`/teams/${teamId}`)
      setTeams(prev => prev.filter(t => t.id !== teamId))
      toast.success('Team deleted')
    } catch { toast.error('Failed to delete team') }
  }

  const setLeader = async (teamId: string, leaderStaffId: string) => {
    try {
      await api.put(`/teams/${teamId}`, { leaderStaffId })
      const s = staff.find(s => s.id === leaderStaffId)
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, leader_staff_id: leaderStaffId, leader_name: s ? `${s.first_name} ${s.last_name}` : t.leader_name } : t))
      // Ensure leader shows as a member too
      setMembers(prev => {
        const cur = prev[teamId] || []
        if (s && !cur.some(m => m.id === s.id)) return { ...prev, [teamId]: [...cur, s] }
        return prev
      })
      toast.success('Team leader updated')
    } catch { toast.error('Failed to update leader') }
  }

  const assign = async (teamId: string, staffId: string) => {
    setAdding(staffId)
    try {
      await api.put(`/teams/${teamId}/members/${staffId}`)
      const s = staff.find(s => s.id === staffId)!
      setMembers(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), s] }))
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, member_count: t.member_count + 1 } : t))
      toast.success(`${s.first_name} added to team`)
    } catch { toast.error('Failed to add member') }
    finally { setAdding(null) }
  }

  const unassign = async (teamId: string, staffId: string) => {
    setRemoving(staffId)
    try {
      await api.delete(`/teams/${teamId}/members/${staffId}`)
      setMembers(prev => ({ ...prev, [teamId]: (prev[teamId] || []).filter(m => m.id !== staffId) }))
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, member_count: Math.max(0, t.member_count - 1) } : t))
      toast.success('Removed from team')
    } catch { toast.error('Failed to remove member') }
    finally { setRemoving(null) }
  }

  const memberIdsOf = (teamId: string) => new Set((members[teamId] || []).map(m => m.id))
  const availableFor = (teamId: string) => {
    const taken = memberIdsOf(teamId)
    return staff.filter(s => !taken.has(s.id))
  }

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const potentialLeaders = staff // any staff member can be picked as leader

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <UsersRound className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Teams</h1>
            <p className="text-sm text-slate-500">Group staff into teams — a team leader will only see the staff and rota within their own team</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
          <Plus className="w-4 h-4" /> Create Team
        </button>
      </div>

      {showCreate && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Ground Floor Team"
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team leader (optional)</label>
            <select
              value={newLeaderId} onChange={e => setNewLeaderId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
              <option value="">No leader yet</option>
              {potentialLeaders.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({ROLE_LABELS[s.role] || s.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button disabled={creating} onClick={createTeam}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search teams…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">How team visibility works</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>A Team Leader only sees staff and rota shifts within their own team</li>
          <li>Managers, Deputy Managers, and Directors continue to see everyone in the home</li>
          <li>This is separate from Resident Assignments, which controls resident visibility</li>
        </ul>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-8">No teams found — create one above</p>
        )}
        {filtered.map(team => {
          const teamMembers = members[team.id] || []
          const available = availableFor(team.id)
          const isOpen = expanded === team.id

          return (
            <div key={team.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : team.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{team.name}</p>
                  <p className="text-xs text-slate-500">
                    {team.leader_name ? `Led by ${team.leader_name}` : <span className="text-rose-500 font-medium">No leader assigned</span>}
                    {' · '}{team.member_count} member{team.member_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTeam(team.id) }}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team leader</label>
                    <select
                      value={team.leader_staff_id || ''}
                      onChange={e => setLeader(team.id, e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">No leader</option>
                      {potentialLeaders.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({ROLE_LABELS[s.role] || s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {teamMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Members</p>
                      <div className="space-y-1.5">
                        {teamMembers.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                {m.first_name[0]}{m.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {m.first_name} {m.last_name}
                                  {m.id === team.leader_staff_id && <span className="ml-1.5 text-xs text-amber-600 font-semibold">(Leader)</span>}
                                </p>
                                <p className="text-xs text-slate-400">{ROLE_LABELS[m.role] || m.role}</p>
                              </div>
                            </div>
                            <button
                              disabled={removing === m.id}
                              onClick={() => unassign(team.id, m.id)}
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
                              onClick={() => assign(team.id, s.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {staff.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No staff found for this home</p>
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
