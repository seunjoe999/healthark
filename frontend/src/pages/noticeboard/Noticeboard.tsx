import React, { useState, useEffect } from 'react'
import { Newspaper, Plus, Pin, Trash2, CheckCircle, Clock, AlertCircle, Info, Check, CheckSquare } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { openLetterheadPrint, buildLetterheadPage, esc, nl } from '../../utils/letterheadPrint'
import { getServerTodayStr } from '../../utils/serverTime'

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

function NoticeCard({ notice, onRead, onDelete, canDelete }: {
  notice: any
  onRead: (id: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const cfg = catConfig[notice.category] || catConfig.general
  const categoryLabel = CATEGORIES.find(c => c.value === notice.category)?.label || notice.category

  return (
    <div
      onClick={() => !notice.is_read && onRead(notice.id)}
      className={clsx(
        'relative rounded-xl border shadow-sm transition-all cursor-pointer group',
        notice.is_pinned
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
          : 'border-slate-100 bg-white hover:border-slate-200',
        !notice.is_read && !notice.is_pinned && 'border-l-2 border-l-amber-400',
      )}
    >
      {/* Unread indicator */}
      {!notice.is_read && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
      )}

      <div className="p-5">
        {/* Category + pinned row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.color, cfg.bg, cfg.border)}>
            {cfg.icon} {categoryLabel}
          </span>
          {notice.is_pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {notice.is_read && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 ml-auto">
              <Check className="w-3 h-3" /> Read
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 text-[15px] leading-snug mb-2">{notice.title}</h3>

        {/* Body */}
        {notice.body && (
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3">{notice.body}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">{notice.posted_by_name}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}</span>
            {notice.expires_at && (
              <><span>·</span><span className="text-amber-500/80">Expires {format(new Date(notice.expires_at), 'd MMM')}</span></>
            )}
          </div>
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(notice.id) }}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-1 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Noticeboard() {
  const { isRole, user } = useAuth()
  const { theme } = useTheme()
  const pillBg = theme === 'dark' ? '#1a1a1a' : '#f1f5f9'
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', isPinned: false, expiresAt: '' })
  const [todaysTasks, setTodaysTasks] = useState<any[]>([])

  const canPost = isRole('home_manager', 'group_admin', 'senior_carer')

  async function loadTasks() {
    const today = await getServerTodayStr()
    try {
      const res = await api.get('/tasks', { params: { date: today } })
      setTodaysTasks((res.data.data || []).filter((t: any) => t.status === 'pending'))
    } catch { setTodaysTasks([]) }
  }

  useEffect(() => { loadTasks() }, [])

  async function completeTask(id: string) {
    try {
      await api.put(`/tasks/${id}/complete`, { notes: '' })
      toast.success('Task completed')
      loadTasks()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to complete task') }
  }

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
      toast.success('Notice deleted')
      // Re-fetch to confirm deletion persisted to the database
      load()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to delete notice'
      toast.error(msg)
      // Reload to restore the notice if the delete failed
      load()
    }
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

  const printNotices = () => {
    const noticeBlock = (n: any) => `
      <h3 class="sub">${esc(n.title)}${n.is_pinned ? ' (Pinned)' : ''}</h3>
      <p class="body-text">${nl(n.body)}</p>
      <p class="body-text muted">Posted by ${esc(n.posted_by_name)} on ${format(new Date(n.created_at), 'd MMMM yyyy')}${n.expires_at ? ` — expires ${format(new Date(n.expires_at), 'd MMMM yyyy')}` : ''}</p>
    `
    const sections = []
    if (pinned.length) sections.push({ title: 'Pinned Notices', inner: pinned.map(noticeBlock).join('') })
    sections.push({ title: 'All Notices', inner: rest.length ? rest.map(noticeBlock).join('') : '<p class="body-text muted">No further notices.</p>' })
    const body = buildLetterheadPage({
      docTitle: 'Staff Noticeboard',
      docSubtitle: filterCat ? `Category: ${CATEGORIES.find(c => c.value === filterCat)?.label || filterCat}` : 'All notices',
      docRefPrefix: 'NTB',
      docRefId: format(new Date(), 'yyyyMMdd'),
      residentName: 'All staff',
      sections,
    })
    openLetterheadPrint('Staff Noticeboard', body)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-amber-400" /> Updates & News
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Staff noticeboard
            {unread > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">{unread} unread</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton onClick={printNotices} />
          {canPost && (
            <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Post Notice</Button>
          )}
        </div>
      </div>

      {/* Today's Tasks — always shown here, not collapsible, not tucked under a menu */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-amber-500" />
          <p className="font-bold text-slate-900 text-sm">Today's Tasks</p>
          {todaysTasks.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{todaysTasks.length} pending</span>
          )}
        </div>
        {todaysTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks assigned for today.</p>
        ) : (
          <div className="space-y-2">
            {todaysTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2.5">
                <button onClick={() => completeTask(t.id)}
                  className="w-5 h-5 rounded border-2 border-slate-300 hover:border-amber-400 flex-shrink-0 transition-colors" title="Mark complete" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{t.title}</p>
                  {t.su_name && <p className="text-xs text-slate-500">{t.su_name}</p>}
                </div>
                {t.due_time && <span className="text-xs text-slate-500 flex-shrink-0">{t.due_time}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', !filterCat ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700')}
          style={!filterCat ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : { background: pillBg }}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? '' : c.value)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', filterCat === c.value ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700')}
            style={filterCat === c.value ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : { background: pillBg }}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : notices.length === 0 ? (
        <EmptyState title="No notices" description="Nothing posted yet on the noticeboard" />
      ) : (
        <>
          {/* Pinned notices — displayed prominently */}
          {pinned.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" /> Pinned
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {pinned.map(notice => <NoticeCard key={notice.id} notice={notice} onRead={markRead} onDelete={handleDelete} canDelete={isRole('home_manager', 'group_admin') || notice.created_by === user?.id} />)}
              </div>
            </div>
          )}
          {/* Regular notices */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">All notices</p>}
              {rest.map(notice => <NoticeCard key={notice.id} notice={notice} onRead={markRead} onDelete={handleDelete} canDelete={isRole('home_manager', 'group_admin') || notice.created_by === user?.id} />)}
            </div>
          )}
        </>
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
            <span className="text-sm text-slate-700">Pin to top of noticeboard</span>
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
