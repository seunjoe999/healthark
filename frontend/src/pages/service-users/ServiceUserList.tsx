import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { suApi, homesApi } from '../../api'
import { ServiceUser } from '../../types'
import { Search, Plus, Filter, Users, AlertTriangle } from 'lucide-react'
import { Spinner, EmptyState, StatusBadge, EmergencyBadge, Button } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInYears } from 'date-fns'

export default function ServiceUserList() {
  const { user, isRole } = useAuth()
  const [sus, setSus] = useState<ServiceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('live')
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(h[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    const params: Record<string, string> = { homeId: selectedHome }
    if (statusFilter) params.status = statusFilter
    if (search) params.search = search
    suApi.list(selectedHome, params)
      .then(res => setSus(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedHome, statusFilter, search])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Service Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sus.length} {statusFilter} residents</p>
        </div>
        {isRole('home_manager', 'group_admin') && (
          <Link to="/service-users/new">
            <Button icon={<Plus className="w-4 h-4" />}>Add service user</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {homes.length > 1 && (
          <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="pre_admission">Pre-admission</option>
          <option value="on_hold">On hold</option>
          <option value="hospital">Hospital</option>
          <option value="archive">Archive</option>
        </select>
      </div>

      {loading ? <Spinner /> : sus.length === 0 ? (
        <EmptyState
          title="No service users found"
          description={search ? "Try a different search term" : "Add your first service user to get started"}
          action={isRole('home_manager', 'group_admin') ? (
            <Link to="/service-users/new"><Button icon={<Plus className="w-4 h-4" />}>Add service user</Button></Link>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {sus.map(su => (
            <Link
              key={su.id}
              to={`/service-users/${su.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4"
            >
              {/* Photo */}
              <div className="w-14 h-14 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {su.photoUrl ? (
                  <img src={su.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-navy-600 text-lg font-bold">
                    {su.firstName[0]}{su.lastName[0]}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-navy-900">
                    {su.firstName} {su.lastName}
                    {su.preferredName && (
                      <span className="text-gray-400 font-normal ml-1">({su.preferredName})</span>
                    )}
                  </h3>
                  <StatusBadge status={su.status} />
                  <EmergencyBadge rating={su.emergencyRating} />
                  {su.dnar && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> DNAR
                    </span>
                  )}
                  {su.nilByMouth && (
                    <span className="bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      Nil by mouth
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                  <span>Age {differenceInYears(new Date(), new Date(su.dateOfBirth))}</span>
                  {su.nhsNumber && <span>NHS: {su.nhsNumber}</span>}
                  {su.admissionDate && <span>Admitted {format(new Date(su.admissionDate), 'd MMM yyyy')}</span>}
                </div>
                {su.needToKnow && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2 line-clamp-1">
                    ⚠ {su.needToKnow}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <div className="text-gray-300 flex-shrink-0">›</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
