import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { Search as SearchIcon, Users, UserSquare, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { differenceInYears } from 'date-fns'

export default function GlobalSearch() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<any>({ residents: [], staff: [], carePlans: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults({ residents: [], staff: [], carePlans: [] }); return }
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get('/search', { params: { q: query, homeId: user?.homeId } })
        setResults(res.data.data || { residents: [], staff: [], carePlans: [] })
      } catch { setResults({ residents: [], staff: [], carePlans: [] }) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const total = (results.residents?.length || 0) + (results.staff?.length || 0) + (results.carePlans?.length || 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl text-slate-900 mb-5">Search</h1>
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input autoFocus className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-card text-base focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
          placeholder="Search residents, staff, care plans..." value={query} onChange={e => setQuery(e.target.value)} />
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
      </div>

      {query.length < 2 ? (
        <div className="text-center py-12"><SearchIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400">Type at least 2 characters to search</p></div>
      ) : total === 0 && !loading ? (
        <div className="text-center py-12"><p className="text-slate-400">No results for "<strong>{query}</strong>"</p></div>
      ) : (
        <div className="space-y-6">
          {results.residents?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Residents ({results.residents.length})</h2>
              <div className="space-y-2">
                {results.residents.map((r: any) => (
                  <Link key={r.id} to={`/service-users/${r.id}`} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-card p-4 hover:border-purple-200 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#151f35' }}>
                      {r.photo_url ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" /> : `${(r.first_name||'?')[0]}${(r.last_name||'?')[0]}`}
                    </div>
                    <div className="flex-1"><p className="font-semibold text-slate-900">{r.first_name} {r.last_name}</p><p className="text-xs text-slate-400 capitalize">{r.date_of_birth ? `Age ${differenceInYears(new Date(), new Date(r.date_of_birth))} · ` : ''}{(r.status||'').replace('_',' ')}</p></div>
                    <span className="text-xs text-purple-500 font-semibold">View →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {results.staff?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><UserSquare className="w-3.5 h-3.5" /> Staff ({results.staff.length})</h2>
              <div className="space-y-2">
                {results.staff.map((s: any) => (
                  <Link key={s.id} to="/staff" className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-card p-4 hover:border-purple-200 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden bg-slate-200 text-slate-600">
                      {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" alt="" /> : `${(s.first_name||'?')[0]}${(s.last_name||'?')[0]}`}
                    </div>
                    <div className="flex-1"><p className="font-semibold text-slate-900">{s.first_name} {s.last_name}</p><p className="text-xs text-slate-400 capitalize">{(s.role||'').replace(/_/g,' ')} · {s.status}</p></div>
                    <span className="text-xs text-purple-500 font-semibold">View →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {results.carePlans?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Care Plans ({results.carePlans.length})</h2>
              <div className="space-y-2">
                {results.carePlans.map((cp: any) => (
                  <Link key={cp.id} to="/care-plans" className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-card p-4 hover:border-purple-200 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-purple-600" /></div>
                    <div className="flex-1"><p className="font-semibold text-slate-900 capitalize">{(cp.plan_type||'').replace(/_/g,' ')}</p><p className="text-xs text-slate-400">{cp.su_name}</p></div>
                    <span className="text-xs text-purple-500 font-semibold">View →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
