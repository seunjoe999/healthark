import React, { useState, useEffect } from 'react'
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, Filter, Search } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner, EmptyState, PrintButton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api, { homesApi } from '../../api'
import clsx from 'clsx'

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'heating', label: 'Heating / HVAC' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'security', label: 'Security' },
  { value: 'garden', label: 'Garden / Outdoor' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'it', label: 'IT / Technology' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const statusColors: Record<string, string> = {
  open:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export default function Maintenance() {
  const { isRole, user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')

  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium', location: '' })
  const [updateForm, setUpdateForm] = useState({ status: '', resolutionNotes: '' })

  const canManage = isRole('home_manager', 'group_admin', 'senior_carer')

  useEffect(() => {
    if (isRole('group_admin')) {
      homesApi.list().then(res => {
        const h = res.data.data || []
        setHomes(h)
        if (h.length > 0 && !selectedHome) setSelectedHome(h[0].id)
      }).catch(() => {})
    }
  }, [user, isRole])

  async function load() {
    setLoading(true)
    try {
      const params: any = { status: filterStatus || undefined, priority: filterPriority || undefined }
      if (isRole('group_admin') && selectedHome) params.homeId = selectedHome

      const [dataRes, statsRes] = await Promise.all([
        api.get('/maintenance', { params }),
        api.get('/maintenance/stats', { params: isRole('group_admin') && selectedHome ? { homeId: selectedHome } : {} }),
      ])
      setItems(dataRes.data.data)
      setStats(statsRes.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus, filterPriority, selectedHome])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/maintenance', { ...form, homeId: isRole('group_admin') ? selectedHome : undefined })
      setShowNew(false)
      setForm({ title: '', description: '', category: 'other', priority: 'medium', location: '' })
      load()
    } catch {}
    setSubmitting(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!showDetail) return
    setSubmitting(true)
    try {
      await api.patch(`/maintenance/${showDetail.id}`, updateForm)
      setShowDetail(null)
      load()
    } catch {}
    setSubmitting(false)
  }

  const filtered = items.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.location || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-6 h-6 text-amber-400" /> Maintenance Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track and resolve facility issues</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>
            Report Issue
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: stats.open_count, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.in_progress_count, color: 'text-amber-400' },
            { label: 'Resolved', value: stats.resolved_count, color: 'text-emerald-400' },
            { label: 'Urgent', value: stats.urgent_count, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input w-40" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="No maintenance issues" description="Report a facility issue to get started" />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all"
              onClick={() => { setShowDetail(item); setUpdateForm({ status: item.status, resolutionNotes: item.resolution_notes || '' }) }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={clsx('badge border text-xs', priorityColors[item.priority])}>{item.priority}</span>
                    <span className={clsx('badge border text-xs', statusColors[item.status])}>{item.status.replace('_', ' ')}</span>
                    <span className="text-xs text-slate-500 capitalize">{item.category}</span>
                  </div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  {item.location && <p className="text-xs text-slate-400 mt-0.5">ðŸ“ {item.location}</p>}
                  {item.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>}
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0">
                  <div>{item.reported_by_name || 'Unknown'}</div>
                  <div>{new Date(item.created_at).toLocaleDateString()}</div>
                  {item.assigned_to_name && <div className="text-amber-400 mt-1">â†’ {item.assigned_to_name}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Issue Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Report Maintenance Issue">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CATEGORIES} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Priority" options={PRIORITIES} value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
          <Input label="Location (optional)" placeholder="e.g. Room 4, Kitchen" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Submit Issue</Button>
          </div>
        </form>
      </Modal>

      {/* Detail / Update Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Update Issue" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.15)' }}>
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className={clsx('badge border text-xs', priorityColors[showDetail.priority])}>{showDetail.priority}</span>
                <span className="text-xs text-slate-500 capitalize">{showDetail.category}</span>
              </div>
              <h3 className="font-bold text-white text-lg">{showDetail.title}</h3>
              {showDetail.location && <p className="text-sm text-slate-400 mt-1">ðŸ“ {showDetail.location}</p>}
              {showDetail.description && <p className="text-sm text-slate-300 mt-2">{showDetail.description}</p>}
              <p className="text-xs text-slate-500 mt-3">Reported by {showDetail.reported_by_name} Â· {new Date(showDetail.created_at).toLocaleDateString()}</p>
            </div>
            {canManage && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <Select label="Update Status" options={STATUSES} value={updateForm.status}
                  onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))} />
                <Textarea label="Resolution Notes" value={updateForm.resolutionNotes}
                  onChange={e => setUpdateForm(f => ({ ...f, resolutionNotes: e.target.value }))} rows={3} />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setShowDetail(null)}>Close</Button>
                  <Button type="submit" variant="gold" loading={submitting}>Update Issue</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

