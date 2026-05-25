import React, { useState, useEffect } from 'react'
import { Target, Plus, CheckCircle, Clock, TrendingUp, ChevronDown } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'

const STATUSES = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'yes', label: 'Achieved' },
  { value: 'partially', label: 'Partially Achieved' },
  { value: 'no', label: 'Not Achieved' },
]

const statusConfig: Record<string, { color: string; badge: string }> = {
  ongoing:   { color: 'text-blue-400', badge: 'badge-info' },
  yes:       { color: 'text-emerald-400', badge: 'badge-success' },
  partially: { color: 'text-amber-400', badge: 'badge-warning' },
  no:        { color: 'text-rose-400', badge: 'badge-critical' },
}

export default function Outcomes() {
  const [outcomes, setOutcomes] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSU, setFilterSU] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showReview, setShowReview] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Record<string, any[]>>({})
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ suId: '', goal: '', description: '', targetDate: '', reviewDate: '', status: 'ongoing' })
  const [reviewForm, setReviewForm] = useState({ status: 'ongoing', notes: '', reviewDate: new Date().toISOString().split('T')[0] })

  async function load() {
    setLoading(true)
    try {
      const [outRes, suRes] = await Promise.all([
        api.get('/outcomes', { params: { suId: filterSU || undefined } }),
        api.get('/service-users'),
      ])
      setOutcomes(outRes.data.data)
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSU])

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!reviews[id]) {
      try {
        const res = await api.get(`/outcomes/${id}/reviews`)
        setReviews(r => ({ ...r, [id]: res.data.data }))
      } catch {}
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId || !form.goal) { toast.error('Service User and Goal are required'); return }
    setSubmitting(true)
    try {
      await api.post('/outcomes', form)
      setShowAdd(false)
      setForm({ suId: '', goal: '', description: '', targetDate: '', reviewDate: '', status: 'ongoing' })
      load()
      toast.success('Outcome saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save outcome') }
    setSubmitting(false)
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault()
    if (!showReview) return
    setSubmitting(true)
    try {
      await api.post(`/outcomes/${showReview.id}/reviews`, reviewForm)
      setShowReview(null)
      setReviews(r => { const copy = { ...r }; delete copy[showReview.id]; return copy })
      load()
      toast.success('Review saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save review') }
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const filtered = outcomes.filter(o => (!filterStatus || o.status === filterStatus))

  const grouped = filtered.reduce<Record<string, any[]>>((acc, o) => {
    const key = o.su_id
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-6 h-6 text-amber-400" /> Care Outcomes
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track goals and progress for service users</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          Add Outcome
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATUSES.map(s => {
          const count = outcomes.filter(o => o.status === s.value).length
          return (
            <div key={s.value} className="card p-4 text-center cursor-pointer hover:border-amber-500/30 transition-all"
              onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)}>
              <div className={clsx('text-2xl font-bold', statusConfig[s.value].color)}>{count}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="input w-64" value={filterSU} onChange={e => setFilterSU(e.target.value)}>
          <option value="">All Service Users</option>
          {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
        <select className="input w-48" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : Object.keys(grouped).length === 0 ? (
        <EmptyState title="No outcomes found" description="Add care goals and track progress for service users" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([suId, items]) => (
            <div key={suId}>
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> {items[0].su_name}
              </h3>
              <div className="space-y-2">
                {items.map(o => (
                  <div key={o.id} className="card overflow-hidden">
                    <div className="p-4 cursor-pointer" onClick={() => toggleExpand(o.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('badge', statusConfig[o.status]?.badge)}>{STATUSES.find(s => s.value === o.status)?.label}</span>
                            {o.plan_type && <span className="text-xs text-slate-500 capitalize">{o.plan_type.replace(/_/g, ' ')}</span>}
                          </div>
                          <p className="font-semibold text-white">{o.goal}</p>
                          {o.description && <p className="text-sm text-slate-400 mt-0.5">{o.description}</p>}
                        </div>
                        <div className="text-right text-xs text-slate-400 flex-shrink-0">
                          {o.target_date && <div>Target: {new Date(o.target_date).toLocaleDateString('en-GB')}</div>}
                          <div className="mt-1">{o.created_by_name}</div>
                          <ChevronDown className={clsx('w-4 h-4 ml-auto mt-1 transition-transform', expanded === o.id && 'rotate-180')} />
                        </div>
                      </div>
                    </div>
                    {expanded === o.id && (
                      <div className="border-t border-white/5 p-4 space-y-3" style={{ background: '#0a0a0a' }}>
                        {o.progress_notes && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progress Notes</p>
                            <p className="text-sm text-slate-300">{o.progress_notes}</p>
                          </div>
                        )}
                        {reviews[o.id]?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Review History</p>
                            {reviews[o.id].map(r => (
                              <div key={r.id} className="flex gap-3 mb-2">
                                <div className="text-xs text-slate-400 w-20 flex-shrink-0">{new Date(r.review_date).toLocaleDateString('en-GB')}</div>
                                <div className="flex-1">
                                  <span className={clsx('badge text-xs', statusConfig[r.status]?.badge)}>{STATUSES.find(s => s.value === r.status)?.label}</span>
                                  <p className="text-sm text-slate-300 mt-1">{r.notes}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setShowReview(o); setReviewForm({ status: o.status, notes: '', reviewDate: new Date().toISOString().split('T')[0] }) }}>
                          Add Review
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Outcome Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Care Outcome">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Service User" options={suOptions} placeholder="Select service user..." value={form.suId}
            onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} />
          <Input label="Goal" placeholder="e.g. Improve mobility to walk 10 metres independently" value={form.goal} required
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Date" type="date" value={form.targetDate}
              onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            <Select label="Status" options={STATUSES} value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Outcome</Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal open={!!showReview} onClose={() => setShowReview(null)} title="Add Review">
        {showReview && (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="p-3 rounded-xl text-sm text-slate-300" style={{ background: '#1a1a1a' }}>
              <strong className="text-white">{showReview.goal}</strong>
            </div>
            <Select label="Current Status" options={STATUSES} value={reviewForm.status}
              onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} />
            <Input label="Review Date" type="date" value={reviewForm.reviewDate} required
              onChange={e => setReviewForm(f => ({ ...f, reviewDate: e.target.value }))} />
            <Textarea label="Review Notes" value={reviewForm.notes} required
              onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Describe progress made since last review..." />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowReview(null)}>Cancel</Button>
              <Button type="submit" variant="gold" loading={submitting}>Save Review</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

