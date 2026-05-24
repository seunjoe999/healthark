import React, { useState, useEffect } from 'react'
import { History, Search, Filter, LogIn, Plus, Edit3, Trash2, CheckCircle, Eye, Shield } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'

const RESOURCE_TYPES = [
  'service_user', 'care_plan', 'daily_record', 'incident', 'safeguarding',
  'staff', 'mar_record', 'medication', 'assessment', 'task', 'rota',
]

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  create:          { icon: <Plus className="w-3.5 h-3.5" />,         bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Created' },
  update:          { icon: <Edit3 className="w-3.5 h-3.5" />,        bg: 'bg-blue-500/15',    text: 'text-blue-400',   label: 'Updated' },
  delete:          { icon: <Trash2 className="w-3.5 h-3.5" />,       bg: 'bg-rose-500/15',    text: 'text-rose-400',   label: 'Deleted' },
  login:           { icon: <LogIn className="w-3.5 h-3.5" />,        bg: 'bg-amber-500/15',   text: 'text-amber-400',  label: 'Login' },
  view:            { icon: <Eye className="w-3.5 h-3.5" />,          bg: 'bg-slate-500/15',   text: 'text-slate-400',  label: 'Viewed' },
  approve:         { icon: <CheckCircle className="w-3.5 h-3.5" />,  bg: 'bg-purple-500/15',  text: 'text-purple-400', label: 'Approved' },
  password_change: { icon: <Shield className="w-3.5 h-3.5" />,       bg: 'bg-indigo-500/15',  text: 'text-indigo-400', label: 'Password' },
}

function getActionCfg(action: string) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.view
}

function groupByDate(records: any[]) {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const todayStr = now.toDateString()
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString()

  for (const r of records) {
    const d = new Date(r.created_at)
    const ds = d.toDateString()
    let label: string
    if (ds === todayStr) label = 'Today'
    else if (ds === yesterdayStr) label = 'Yesterday'
    else label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(r)
  }
  return Object.entries(groups)
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

  const grouped = groupByDate(filtered)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Audit Trail</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Full history of all actions in the system</p>
        </div>
        {total > 0 && (
          <span className="ml-auto text-xs text-slate-500 font-medium">{total} records</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 text-sm" placeholder="Search staff, resource..." value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
        </div>
        <select className="input w-40 text-sm" value={filters.resourceType} onChange={e => setFilters(f => ({ ...f, resourceType: e.target.value }))}>
          <option value="">All resources</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" className="input w-36 text-sm" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <input type="date" className="input w-36 text-sm" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="No audit records found" description="Actions taken in the system will appear here" />
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateLabel, dayRecords]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{dateLabel}</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(232,177,48,0.1)' }} />
              </div>

              {/* Timeline entries */}
              <div className="space-y-1">
                {dayRecords.map(r => {
                  const cfg = getActionCfg(r.action)
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group">
                      {/* Action icon */}
                      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg, cfg.text)}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className={clsx('text-xs font-bold uppercase tracking-wider', cfg.text)}>{cfg.label}</span>
                          <span className="text-white text-sm font-medium capitalize">
                            {r.resource_type?.replace(/_/g, ' ')}
                          </span>
                          {r.resource_label && (
                            <span className="text-slate-500 text-xs truncate max-w-xs">· {r.resource_label}</span>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="text-right flex-shrink-0 min-w-20">
                        <p className="text-xs font-medium text-slate-300">{r.staff_name}</p>
                        <p className="text-xs text-slate-600">
                          {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-3 mt-6">
          <button className="btn-outline px-4 py-2 text-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{'<'} Prev</button>
          <span className="text-slate-400 text-sm py-2">Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn-outline px-4 py-2 text-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}>Next {'>'}</button>
        </div>
      )}
    </div>
  )
}
