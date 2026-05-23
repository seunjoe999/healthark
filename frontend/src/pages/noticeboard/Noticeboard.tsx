import React, { useState, useEffect } from 'react'
import { Newspaper, Plus, Pin, Trash2, CheckCircle, Clock, AlertCircle, Info } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'policy', label: 'Policy Update' },
  { value: 'training', label: 'Training' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'reminder', label: 'Reminder' },
]

const catConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  urgent:      { color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   icon: <AlertCircle className="w-4 h-4" /> },
  policy:      { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Info className="w-4 h-4" /> },
  training:    { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: <CheckCircle className="w-4 h-4" /> },
  maintenance: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: <Clock className="w-4 h-4" /> },
  celebration: { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',icon: <CheckCircle className="w-4 h-4" /> },
  general:     { color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  icon: <Info className="w-4 h-4" /> },
  reminder:    { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: <Clock className="w-4 h-4" /> },
}

export default function Noticeboard() {
  const { isRole, user } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', isPinned: false, expiresAt: '' })

  const canPost = isRole('home_manager', 'group_admin', 'senior_carer')

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/noticeboard', { params: { category: filterCat || undefined } })
      setNotices(res.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterCat])

  async function markRead(id: string) {
    try {
      await api.patch(`/noticeboard/${id}/read`)
      setNotices(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return
    try {
      await api.delete(`/noticeboard/${id}`)
      setNotices(n => n.filter(x => x.id !== id))
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/noticeboard', form)
      setShowAdd(false)
      setForm({ title: '', body: '', category: 'general', isPinned: false, expiresAt: '' })
      load()
    } catch {}
    setSubmitting(false)
  }

  const unread = notices.filter(n => !n.is_read).length
  const pinned = notices.filter(n => n.is_pinned)
  const rest = notices.filter(n => !n.is_pinned)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-amber-400" /> Updates & News
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Staff noticeboard
            {unread > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">{unread} unread</span>}
          </p>
        </div>
        {canPost && (
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Post Notice</Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', !filterCat ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
          style={!filterCat ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : { background: '#1a1a1a' }}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? '' : c.value)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', filterCat === c.value ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={filterCat === c.value ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : { background: '#1a1a1a' }}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : notices.length === 0 ? (
        <EmptyState title="No notices" description="Nothing posted yet on the noticeboard" />
      ) : (
        <div className="space-y-3">
          {[...pinned, ...rest].map(notice => {
            const cfg = catConfig[notice.category] || catConfig.general
            return (
              <div key={notice.id}
                className={clsx('card p-5 cursor-pointer transition-all', notice.is_pinned && 'border-amber-500/40', !notice.is_read && 'border-l-4 border-l-amber-400')}
                onClick={() => !notice.is_read && markRead(notice.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {notice.is_pinned && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Pin className="w-3 h-3" /> PINNED
                        </span>
                      )}
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color, cfg.bg, cfg.border)}>
                        {cfg.icon} {CATEGORIES.find(c => c.value === notice.category)?.label || notice.category}
                      </span>
                      {!notice.is_read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <h3 className="font-bold text-white text-base">{notice.title}</h3>
                    {notice.body && <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{notice.body}</p>}
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                      <span>{notice.posted_by_name}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}</span>
                      {notice.expires_at && (
                        <><span>·</span><span className="text-amber-500">Expires {format(new Date(notice.expires_at), 'd MMM yyyy')}</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {notice.is_read && <span className="text-xs text-emerald-400">✓ Read</span>}
                    {(canPost || notice.created_by === user?.id) && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(notice.id) }}
                        className="text-slate-600 hover:text-rose-400 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Post Notice" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title *" value={form.title} required onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title..." />
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Body / Message</label>
            <textarea className="input" rows={6} value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your notice here..." />
          </div>
          <Input label="Expires on (optional)" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Pin to top of noticeboard</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Post Notice</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
