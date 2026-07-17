import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import api from '../../api'
import { Spinner } from '../../components/ui'
import { Shield, Check, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'care_staff',    label: 'Care Staff',      color: 'bg-slate-100 text-slate-700' },
  { value: 'senior_carer',  label: 'Senior Carer',    color: 'bg-cyan-100 text-cyan-700' },
  { value: 'team_leader',   label: 'Team Leader',     color: 'bg-blue-100 text-blue-700' },
  { value: 'admin',         label: 'Admin',           color: 'bg-purple-100 text-purple-700' },
  { value: 'deputy_manager',label: 'Deputy Manager',  color: 'bg-amber-100 text-amber-700' },
  { value: 'home_manager',  label: 'Manager',         color: 'bg-orange-100 text-orange-700' },
  { value: 'auditor',       label: 'Auditor',         color: 'bg-teal-100 text-teal-700' },
  { value: 'group_admin',   label: 'Director',        color: 'bg-rose-100 text-rose-700' },
]

const PERMISSIONS = [
  { key: 'edit_service_users', label: 'Add / edit resident profiles', group: 'Residents' },
  { key: 'edit_care_plans', label: 'Edit care plans', group: 'Care' },
  { key: 'view_sensitive_info', label: 'View sensitive info (key safe, financials)', group: 'Care' },
  { key: 'edit_staff', label: 'Edit staff profiles', group: 'Staff' },
  { key: 'approve_leave', label: 'Approve leave requests', group: 'Staff' },
  { key: 'manage_rota', label: 'Create / edit rota', group: 'Rota' },
  { key: 'manage_tasks', label: 'Manage task templates', group: 'Tasks' },
  { key: 'view_reports', label: 'Access reports & analytics', group: 'Reports' },
  { key: 'access_all_residents', label: 'See ALL residents (not just assigned)', group: 'Residents' },
]

const GROUPS = ['Residents', 'Care', 'Staff', 'Rota', 'Tasks', 'Reports']

export default function RolePermissions() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const list = res.data.data || []
      setHomes(list)
      if (list.length) setSelectedHome(user?.homeId || list[0].id)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    api.get('/staff/role-permissions', { params: { homeId: selectedHome } })
      .then(res => setPerms(res.data.data || {}))
      .catch(() => toast.error('Could not load permissions'))
      .finally(() => setLoading(false))
  }, [selectedHome])

  const toggle = async (role: string, permission: string) => {
    if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) return
    const current = perms[role]?.[permission] ?? false
    const next = !current
    setSaving(`${role}-${permission}`)
    try {
      await api.put('/staff/role-permissions', { homeId: selectedHome, role, permission, granted: next })
      setPerms(p => ({ ...p, [role]: { ...(p[role] || {}), [permission]: next } }))
      toast.success('Permission updated')
    } catch {
      toast.error('Failed to update permission')
    } finally { setSaving(null) }
  }

  if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p>You don't have access to permission settings.</p>
      </div>
    )
  }

  const canEdit = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Role Permissions</h1>
          <p className="text-sm text-slate-500">Configure what each role can do in your home</p>
        </div>
      </div>

      {homes.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Care home:</label>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          You can view permissions but only Managers and Directors can change them.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-3 border border-slate-200 font-semibold text-slate-700 min-w-[220px]">Permission</th>
                {ROLES.map(r => (
                  <th key={r.value} className="p-2 border border-slate-200 text-center min-w-[110px]">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${r.color}`}>{r.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map(group => {
                const groupPerms = PERMISSIONS.filter(p => p.group === group)
                if (!groupPerms.length) return null
                return (
                  <React.Fragment key={group}>
                    <tr className="bg-slate-100">
                      <td colSpan={ROLES.length + 1} className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {group}
                      </td>
                    </tr>
                    {groupPerms.map(perm => (
                      <tr key={perm.key} className="hover:bg-slate-50">
                        <td className="p-3 border border-slate-200 text-slate-700">{perm.label}</td>
                        {ROLES.map(role => {
                          const granted = perms[role.value]?.[perm.key] ?? false
                          const key = `${role.value}-${perm.key}`
                          const isSaving = saving === key
                          return (
                            <td key={role.value} className="p-2 border border-slate-200 text-center">
                              {canEdit ? (
                                <button
                                  onClick={() => toggle(role.value, perm.key)}
                                  disabled={!!saving}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                                    isSaving ? 'opacity-50 cursor-wait' :
                                    granted
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-500'
                                  }`}
                                  title={granted ? 'Click to revoke' : 'Click to grant'}
                                >
                                  {granted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                  granted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {granted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How permissions work:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>When you create a staff member with a role, they inherit these permissions automatically</li>
          <li>Care staff and Team leaders only see residents they're assigned to via the rota</li>
          <li>Care staff can only edit daily records they created on the current day</li>
          <li>Only Managers and above can add or edit service user profiles</li>
          <li>Changes take effect immediately — no re-login needed</li>
        </ul>
      </div>
    </div>
  )
}
