import React, { useState, useEffect } from 'react'
import { History, Search, Filter } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'

const RESOURCE_TYPES = [
  'service_user', 'care_plan', 'daily_record', 'incident', 'safeguarding',
  'staff', 'mar_record', 'medication', 'assessment', 'task', 'rota',
]

const actionColor: Record<string, string> = {
  create:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  update:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  delete:  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  login:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  view:    'text-slate-400 bg-slate-500/10 border-slate-500/20',
  approve: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export default function AuditTrail() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({ resourceType: '', from: '', to: '', q: '' })

  async function load(p = 1) {
    setLoading(true)
    try {
      const res = await api.get('/audit-trail', {
        params: {
          page: p,
          limit: 50,
          resourceType: filters.resourceType || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }
      })
      setRecords(res.data.data)
      setTotal(res.data.meta?.total || 0)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load(page) }, [page, filters.resourceType, filters.from, filters.to])

  const filtered = records.filter(r =>
    !filters.q ||
    (r.staff_name || '').toLowerCase().includes(filters.q.toLowerCase()) ||
    (r.resource_label || '').toLowerCase().includes(filters.q.toLowerCase()) ||
    r.action.toLowerCase().includes(filters.q.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
          <p className="text-slate-400 text-sm">Full history of all actions taken in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by staff, resource..." value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
        </div>
        <select className="input w-48" value={filters.resourceType} onChange={e => setFilters(f => ({ ...f, resourceType: e.target.value }))}>
          <option value="">All Resources</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" className="input w-40" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <input type="date" className="input w-40" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
      </div>

      {total > 0 && <p className="text-xs text-slate-500 mb-3">{total} total records</p>}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="No audit records found" description="Actions taken in the system will appear here" />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-3.5">
                <div className="w-24 flex-shrink-0">
                  <span className={clsx('badge border text-xs capitalize px-2 py-0.5', actionColor[r.action] || actionColor.view)}>
                    {r.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm capitalize">
                    {r.resource_type.replace(/_/g, ' ')}
                    {r.resource_label && <span className="text-slate-400"> · {r.resource_label}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-shrink-0">
                  <span className="font-medium text-slate-300">{r.staff_name}</span>
                  <span>{new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-3 mt-6">
          <button className="btn-outline px-4 py-2 text-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>â† Prev</button>
          <span className="text-slate-400 text-sm py-2">Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn-outline px-4 py-2 text-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}>Next â†'</button>
        </div>
      )}
    </div>
  )
}

