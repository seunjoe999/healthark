import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { homesApi } from '../../api'
import { Spinner } from '../../components/ui'
import { Send, Bell, CheckCheck, Users, User, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { value: 'urgent', label: 'Urgent', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
]

export default function NotificationsManager() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('info')
  const [link, setLink] = useState('')
  const [target, setTarget] = useState<'all' | 'individual'>('all')
  const [targetStaffId, setTargetStaffId] = useState('')

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
    Promise.all([
      api.get('/staff', { params: { homeId: selectedHome } }),
      api.get('/notifications'),
    ]).then(([staffRes, notifRes]) => {
      setStaff(staffRes.data.data || [])
      setSent(notifRes.data.data || [])
    }).finally(() => setLoading(false))
  }, [selectedHome])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Enter a title'); return }
    setSending(true)
    try {
      if (target === 'all') {
        await api.post('/notifications/broadcast', { homeId: selectedHome, title, body, type, link: link || undefined })
        toast.success('Notification sent to all staff')
      } else {
        if (!targetStaffId) { toast.error('Select a staff member'); setSending(false); return }
        await api.post('/notifications/send', { recipientId: targetStaffId, homeId: selectedHome, title, body, type, link: link || undefined })
        toast.success('Notification sent')
      }
      setTitle('')
      setBody('')
      setLink('')
      // Refresh sent list
      const res = await api.get('/notifications')
      setSent(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send')
    } finally { setSending(false) }
  }

  const deleteNotif = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setSent(prev => prev.filter(n => n.id !== id))
      toast.success('Notification deleted')
    } catch { toast.error('Failed to delete') }
  }

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    setSent(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  const typeInfo = TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-purple-600" /> Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Send alerts and messages to staff</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-600" /> Send Notification
          </h2>

          <form onSubmit={send} className="space-y-4">
            {/* Target */}
            <div>
              <label className="label">Send to</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTarget('all')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${target === 'all' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <Users className="w-4 h-4" /> All staff
                </button>
                <button type="button" onClick={() => setTarget('individual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${target === 'individual' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <User className="w-4 h-4" /> Individual
                </button>
              </div>
              {target === 'individual' && (
                <select className="input mt-2 text-sm" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)}>
                  <option value="">Select staff member...</option>
                  {staff.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.role?.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.value} type="button" onClick={() => setType(t.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${type === t.value ? `${t.bg} ${t.color} border-current` : 'border-slate-200 text-slate-500'}`}>
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g. Urgent: Medication review required" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            {/* Body */}
            <div>
              <label className="label">Message (optional)</label>
              <textarea className="input" rows={3} placeholder="Additional details..." value={body} onChange={e => setBody(e.target.value)} />
            </div>

            {/* Link */}
            <div>
              <label className="label">Link (optional)</label>
              <input className="input text-sm" placeholder="e.g. /safeguarding or /tasks" value={link} onChange={e => setLink(e.target.value)} />
            </div>

            {/* Preview */}
            {title && (
              <div className={`p-3 rounded-xl border ${typeInfo.bg} ${typeInfo.color}`}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Preview</p>
                <p className="text-sm font-semibold">{title}</p>
                {body && <p className="text-xs mt-0.5 opacity-80">{body}</p>}
              </div>
            )}

            <button type="submit" disabled={sending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : target === 'all' ? `Send to all staff` : 'Send to staff member'}
            </button>
          </form>
        </div>

        {/* Recent notifications */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: '#111' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" /> Recent Notifications
            </h2>
            <button onClick={markAllRead} className="text-xs text-amber-400 font-semibold flex items-center gap-1 hover:text-amber-300 transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          {loading ? <Spinner /> : sent.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sent.map((n: any) => {
                const t = TYPE_OPTIONS.find(x => x.value === n.type) || TYPE_OPTIONS[0]
                const Icon = t.icon
                return (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${t.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-xs text-slate-600 mt-1">{format(new Date(n.created_at), 'd MMM, HH:mm')}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />}
                    {isRole('home_manager', 'group_admin') && (
                      <button onClick={() => deleteNotif(n.id)} className="p-1 rounded-lg text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
