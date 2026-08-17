import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import api from '../../api'
import { Spinner } from '../../components/ui'
import { Key, Check, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'care_staff',     label: 'Care Staff',      color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'team_leader',    label: 'Team Leader',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'admin',          label: 'Admin',           color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'deputy_manager', label: 'Deputy Manager',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'home_manager',   label: 'Manager',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'group_admin',    label: 'Director',        color: 'bg-rose-100 text-rose-700 border-rose-200' },
]

const FEATURES = [
  { key: 'dashboard',           label: 'Dashboard',                   group: 'General' },
  { key: 'messages',            label: 'Inbox / Messages',            group: 'General' },
  { key: 'noticeboard',         label: 'Noticeboard',                 group: 'General' },
  { key: 'alerts',              label: 'Alerts',                      group: 'General' },
  { key: 'service_users',       label: 'Service Users',               group: 'Residents' },
  { key: 'daily_records',       label: 'Daily Records',               group: 'Residents' },
  { key: 'care_plans',          label: 'Support Plans',               group: 'Residents' },
  { key: 'mar',                 label: 'Medication (MAR)',             group: 'Residents' },
  { key: 'medicine_risk',       label: 'Medication Risk Assessment',  group: 'Residents' },
  { key: 'risk_management',     label: 'Other Risk Assessment',       group: 'Residents' },
  { key: 'outcomes',            label: 'Care Outcomes',               group: 'Residents' },
  { key: 'reviews',             label: 'Care Reviews',                group: 'Residents' },
  { key: 'diary',               label: 'Resident Health Check',        group: 'Residents' },
  { key: 'safeguarding',        label: 'Safeguarding',                group: 'Residents' },
  { key: 'incidents',           label: 'Incidents',                   group: 'Residents' },
  { key: 'consents',            label: 'Consents & Signatures',       group: 'Residents' },
  { key: 'calendar',            label: 'Calendar',                    group: 'Residents' },
  { key: 'social_activities',   label: 'Social Activities',           group: 'Daily Records' },
  { key: 'bath_chart',          label: 'Bath Records',                group: 'Daily Records' },
  { key: 'bowel_chart',         label: 'Bowel Chart',                 group: 'Daily Records' },
  { key: 'observations',        label: 'Observations',                group: 'Daily Records' },
  { key: 'professional_visits', label: 'Professional Visits',         group: 'Daily Records' },
  { key: 'handover',            label: 'Handover',                    group: 'Daily Records' },
  { key: 'seizures',            label: 'Seizure Log',                 group: 'Daily Records' },
  { key: 'medication_stock',    label: 'Medication Stock',            group: 'Medication' },
  { key: 'staff',               label: 'Staff Profiles',              group: 'Staff' },
  { key: 'dbs',                 label: 'DBS Compliance',              group: 'Staff' },
  { key: 'training',            label: 'Training',                    group: 'Staff' },
  { key: 'clockin',             label: 'Clock In',                    group: 'Staff' },
  { key: 'performance',         label: 'Staff Performance',           group: 'Staff' },
  { key: 'timesheets',          label: 'Timesheets',                  group: 'Staff' },
  { key: 'holidays',            label: 'Leave & Holidays',            group: 'Staff' },
  { key: 'staff_assessment',    label: 'Staff Assessment',            group: 'Staff' },
  { key: 'tasks',               label: 'Tasks',                       group: 'Operations' },
  { key: 'rota',                label: 'Rota',                        group: 'Operations' },
  { key: 'maintenance',         label: 'Maintenance',                 group: 'Operations' },
  { key: 'policies',            label: 'Policies',                    group: 'Operations' },
  { key: 'recruitment',         label: 'Recruitment',                 group: 'Operations' },
  { key: 'invoicing',           label: 'Invoicing',                   group: 'Operations' },
  { key: 'ppe',                 label: 'PPE Stock',                   group: 'Operations' },
  { key: 'compliance',          label: 'Compliance',                  group: 'Quality' },
  { key: 'assessments',         label: 'Audit',                       group: 'Quality' },
  { key: 'audits',              label: 'Audit Reports',               group: 'Quality' },
  { key: 'audit_trail',         label: 'Audit Trail',                 group: 'Quality' },
  { key: 'reports',             label: 'Reports',                     group: 'Quality' },
  { key: 'cqc_notifications',   label: 'CQC Alerts',                  group: 'Quality' },
  { key: 'family_portal',       label: 'Family Portal',               group: 'Other' },
  { key: 'notifications',       label: 'Notification Manager',        group: 'Other' },
  { key: 'clockin_analytics',   label: 'Clock In Analytics',          group: 'Other' },
]

const GROUPS = ['General', 'Residents', 'Daily Records', 'Medication', 'Staff', 'Operations', 'Quality', 'Other']

type RoleFlags = Record<string, Record<string, boolean>>

export default function AccessRights() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [flags, setFlags] = useState<RoleFlags>({})
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
    api.get('/staff/role-access-rights', { params: { homeId: selectedHome } })
      .then(res => setFlags(res.data.data || {}))
      .catch(() => toast.error('Could not load access rights'))
      .finally(() => setLoading(false))
  }, [selectedHome])

  const isEnabled = (role: string, key: string) => flags[role]?.[key] !== false

  const toggle = async (role: string, key: string) => {
    if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) return
    const current = isEnabled(role, key)
    const nextFlags = { ...(flags[role] || {}) }
    // When granting full access, we omit the key (defaults to true)
    // When revoking, we set false explicitly
    if (current) nextFlags[key] = false
    else delete nextFlags[key]

    setSaving(`${role}-${key}`)
    try {
      await api.put('/staff/role-access-rights', { homeId: selectedHome, role, featureFlags: nextFlags })
      setFlags(f => ({ ...f, [role]: nextFlags }))
      const featLabel = FEATURES.find(f => f.key === key)?.label ?? key
      const roleLabel = ROLES.find(r => r.value === role)?.label ?? role
      toast.success(current ? `${featLabel} removed for ${roleLabel}` : `${featLabel} granted to ${roleLabel}`)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update'
      toast.error(msg)
    } finally { setSaving(null) }
  }

  const grantAll = async (role: string) => {
    if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) return
    setSaving(`${role}-all`)
    try {
      // Empty object = all features enabled (no restrictions)
      await api.put('/staff/role-access-rights', { homeId: selectedHome, role, featureFlags: {} })
      setFlags(f => ({ ...f, [role]: {} }))
      toast.success(`Full access granted to ${ROLES.find(r => r.value === role)?.label}`)
    } catch {
      toast.error('Failed')
    } finally { setSaving(null) }
  }

  const revokeAll = async (role: string) => {
    if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) return
    setSaving(`${role}-all`)
    const allOff: Record<string, boolean> = {}
    for (const f of FEATURES) allOff[f.key] = false
    try {
      await api.put('/staff/role-access-rights', { homeId: selectedHome, role, featureFlags: allOff })
      setFlags(f => ({ ...f, [role]: allOff }))
      toast.success(`All access removed from ${ROLES.find(r => r.value === role)?.label}`)
    } catch {
      toast.error('Failed')
    } finally { setSaving(null) }
  }

  if (!isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Key className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p>You don't have access to these settings.</p>
      </div>
    )
  }

  const canEdit = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Access Rights</h1>
          <p className="text-sm text-slate-500">Configure which sections each role can access in the navigation</p>
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

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-8">
          {ROLES.map(role => {
            const roleFlags = flags[role.value] || {}
            const enabledCount = FEATURES.filter(f => roleFlags[f.key] !== false).length
            const isSavingAll = saving === `${role.value}-all`
            return (
              <div key={role.value} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Role header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${role.color}`}>{role.label}</span>
                      <span className="text-xs text-slate-400 ml-3">{enabledCount} / {FEATURES.length} sections enabled</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        disabled={!!saving}
                        onClick={() => grantAll(role.value)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                        {isSavingAll ? '...' : 'Full Access'}
                      </button>
                      <button
                        disabled={!!saving}
                        onClick={() => revokeAll(role.value)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-colors">
                        {isSavingAll ? '...' : 'Remove All'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Feature grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                  {GROUPS.map(group => {
                    const groupFeatures = FEATURES.filter(f => f.group === group)
                    if (!groupFeatures.length) return null
                    return (
                      <React.Fragment key={group}>
                        <div className="col-span-full mt-2 first:mt-0">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group}</span>
                        </div>
                        {groupFeatures.map(feat => {
                          const enabled = roleFlags[feat.key] !== false
                          const key = `${role.value}-${feat.key}`
                          const isSavingThis = saving === key
                          return (
                            <label key={feat.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none ${
                              canEdit ? 'hover:bg-slate-50' : 'cursor-default'
                            }`}>
                              {canEdit ? (
                                <button
                                  type="button"
                                  disabled={!!saving}
                                  onClick={() => toggle(role.value, feat.key)}
                                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                                    isSavingThis ? 'opacity-50' :
                                    enabled
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-white border-slate-300 text-transparent'
                                  }`}>
                                  <Check className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                                  enabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'
                                }`}>
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                              <span className={`text-sm ${enabled ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                {feat.label}
                              </span>
                            </label>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How access rights work:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>Sections that are turned off are hidden from the navigation for that role</li>
          <li>"Full Access" enables all sections — new staff with that role see everything</li>
          <li>Changes take effect the next time a staff member refreshes the page</li>
          <li>Individual overrides in Admin Accounts take priority over role defaults</li>
        </ul>
      </div>
    </div>
  )
}
