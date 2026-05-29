import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { suApi, homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { differenceInYears } from 'date-fns'
import { Spinner, EmptyState, StatusBadge, EmergencyBadge, Button } from '../../components/ui'
import { UserPlus, Search, Filter, AlertTriangle, Heart } from 'lucide-react'

const STATUS_OPTS = [
  { value: '', label: 'All residents' },
  { value: 'live', label: 'Live' },
  { value: 'pre_admission', label: 'Pre-admission' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'archive', label: 'Archive' },
]

export default function ServiceUserList() {
  const navigate = useNavigate()
  const { user, isRole } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('live')

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
    suApi.list(selectedHome, statusFilter ? { status: statusFilter } : {})
      .then(res => setSus(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedHome, statusFilter])

  const filtered = sus.filter(su => {
    const name = `${su.first_name || ''} ${su.last_name || ''} ${su.preferred_name || ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const getName = (su: any) => `${su.first_name || ''} ${su.last_name || ''}`.trim()
  const getAge = (dob: string) => dob ? differenceInYears(new Date(), new Date(dob)) : null

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900">Residents</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} resident{filtered.length !== 1 ? 's' : ''} {statusFilter ? `· ${statusFilter}` : ''}</p>
        </div>
        {isRole('home_manager', 'group_admin', 'senior_carer', 'admin') && (
          <Link to="/service-users/new">
            <Button icon={<UserPlus className="w-4 h-4" />}>Add resident</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9 w-full" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          {STATUS_OPTS.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === s.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="No residents found" description="Try adjusting your search or filter"
          action={isRole('home_manager', 'group_admin') ? <Link to="/service-users/new"><Button icon={<UserPlus className="w-4 h-4" />}>Add first resident</Button></Link> : undefined} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(su => {
            const age = getAge(su.date_of_birth || su.dateOfBirth)
            const initials = `${(su.first_name || '?')[0]}${(su.last_name || '?')[0]}`.toUpperCase()
            const hasWarning = su.nil_by_mouth || su.dnar || su.need_to_know
            return (
              <Link key={su.id} to={`/service-users/${su.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover hover:border-slate-200 transition-all p-4 group">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm font-display"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#151f35' }}>
                    {su.photo_url
                      ? <img src={su.photo_url} alt={initials} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm group-hover:text-purple-900 transition-colors truncate">
                          {getName(su)}
                          {su.preferred_name && <span className="text-slate-400 font-normal ml-1">({su.preferred_name})</span>}
                        </h3>
                        {age && <p className="text-xs text-slate-400">Age {age}</p>}
                      </div>
                      {hasWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <StatusBadge status={su.status} />
                      <EmergencyBadge rating={su.emergency_rating || 'low'} />
                    </div>
                  </div>
                </div>
                {/* Warning flags */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {su.dnar && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">DNAR</span>}
                  {su.nil_by_mouth && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">Nil by mouth</span>}
                  {su.requires_oxygen && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">O₂</span>}
                  {su.has_catheter && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Catheter</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
