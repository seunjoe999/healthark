import React, { useEffect, useState } from 'react'
import { staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import { MessageSquare, Plus, Send, Inbox, Trash2, Reply, Bell, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const NOTIF_ICON: Record<string, any> = {
  error: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle, shift: Bell,
}
const NOTIF_COLOR: Record<string, string> = {
  error: 'text-rose-400', warning: 'text-amber-400', info: 'text-blue-400', success: 'text-emerald-400', shift: 'text-sky-400',
}

export default function Messages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [view, setView] = useState<'inbox' | 'sent' | 'alerts'>('inbox')
  const [replyDefaults, setReplyDefaults] = useState<{ recipientId: string; subject: string } | null>(null)

  useEffect(() => {
    load()
    const interval = setInterval(() => backgroundLoad(), 10000) // update every 10s quietly
    return () => clearInterval(interval)
  }, [view])

  const backgroundLoad = async () => {
    try {
      if (view === 'alerts') {
        const notifRes = await api.get('/notifications')
        setAlerts(notifRes.data.data || [])
      } else {
        const msgRes = await api.get(`/messages?type=${view}`)
        setMessages(msgRes.data.data || [])
      }
    } catch (e) {}
  }

  const load = async () => {
    setLoading(true)
    try {
      if (view === 'alerts') {
        const [notifRes, staffRes] = await Promise.all([
          api.get('/notifications'),
          staffApi.list(),
        ])
        setAlerts(notifRes.data.data || [])
        setStaffList(staffRes.data.data || [])
      } else {
        const [msgRes, staffRes] = await Promise.all([
          api.get(`/messages?type=${view}`),
          staffApi.list(),
        ])
        setMessages(msgRes.data.data || [])
        setStaffList(staffRes.data.data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const unreadAlerts = alerts.filter(a => !a.is_read).length

  const markRead = async (id: string) => {
    try { await api.put(`/messages/${id}/read`) } catch {}
  }

  const deleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return
    try {
      await api.delete(`/messages/${id}`)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Message deleted')
    } catch { toast.error('Failed to delete') }
  }

  const reply = (msg: any) => {
    const recipientId = view === 'inbox' ? msg.sender_id : msg.recipient_id
    const subject = msg.subject ? (msg.subject.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`) : 'Re: (no subject)'
    setReplyDefaults({ recipientId, subject })
    setComposeOpen(true)
  }

  const hasDetail = !!(selected || selectedAlert)
  const clearDetail = () => { setSelected(null); setSelectedAlert(null) }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — message list (full screen on mobile when no detail open) */}
      <div
        className={`flex-shrink-0 flex flex-col lg:w-80 ${hasDetail ? 'hidden lg:flex' : 'flex w-full'}`}
        style={{ background: '#111', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-400" /> Messages</h2>
            <button onClick={() => { setReplyDefaults(null); setComposeOpen(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111' }}>
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['inbox', 'sent', 'alerts'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelected(null); setSelectedAlert(null) }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors relative ${view === v ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                style={view === v ? { background: 'rgba(255,255,255,0.12)' } : {}}>
                {v === 'alerts' ? 'Alerts' : v.charAt(0).toUpperCase() + v.slice(1)}
                {v === 'alerts' && unreadAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111' }}>
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : view === 'alerts' ? (
            alerts.length === 0 ? (
              <div className="text-center p-8"><Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-500">No alerts</p></div>
            ) : alerts.map((n: any) => {
              const Icon = NOTIF_ICON[n.type] || Bell
              const col = NOTIF_COLOR[n.type] || 'text-slate-400'
              return (
                <button key={n.id} onClick={() => { setSelectedAlert(n); setSelected(null) }}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedAlert?.id === n.id ? 'rgba(232,177,48,0.08)' : n.is_read ? 'transparent' : 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${col}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-slate-500 truncate mt-0.5">{n.body}</p>}
                      <p className="text-xs text-slate-600 mt-1">{n.created_at ? format(new Date(n.created_at), 'd MMM, HH:mm') : ''}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#e8b130' }} />}
                  </div>
                </button>
              )
            })
          ) : messages.length === 0 ? (
            <div className="text-center p-8"><Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-500">No messages</p></div>
          ) : messages.map((msg: any) => (
            <button key={msg.id} onClick={() => { setSelected(msg); setSelectedAlert(null); if (!msg.is_read && view === 'inbox') markRead(msg.id) }}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selected?.id === msg.id ? 'rgba(232,177,48,0.08)' : !msg.is_read && view === 'inbox' ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!msg.is_read && view === 'inbox' ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                    {view === 'inbox' ? (msg.sender_name || 'Unknown') : (msg.recipient_name || 'Unknown')}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{msg.subject || msg.message?.substring(0, 50) || msg.body?.substring(0, 50)}</p>
                  <p className="text-xs text-slate-600 mt-1">{msg.created_at ? format(new Date(msg.created_at), 'd MMM, HH:mm') : ''}</p>
                </div>
                {!msg.is_read && view === 'inbox' && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#e8b130' }} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — detail panel (full screen on mobile when open) */}
      <div
        className={`flex-col overflow-y-auto lg:flex lg:flex-1 ${hasDetail ? 'flex flex-1' : 'hidden'}`}
        style={{ background: '#0a0a0a' }}
      >
        {/* Mobile back button */}
        <button onClick={clearDetail}
          className="lg:hidden flex items-center gap-2 px-4 py-3 text-amber-400 font-semibold text-sm border-b border-white/8"
          style={{ background: '#111' }}>
          ← Back to messages
        </button>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {selectedAlert ? (
          <div className="max-w-2xl mx-auto rounded-xl p-5 lg:p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            {(() => {
              const Icon = NOTIF_ICON[selectedAlert.type] || Bell
              const col = NOTIF_COLOR[selectedAlert.type] || 'text-slate-400'
              return (
                <>
                  <div className="flex items-start gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${col}`} />
                    <div>
                      <h2 className="text-base font-bold text-white">{selectedAlert.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">{selectedAlert.created_at ? format(new Date(selectedAlert.created_at), 'd MMMM yyyy, HH:mm') : ''}</p>
                    </div>
                  </div>
                  {selectedAlert.body && <p className="text-slate-300 text-sm leading-relaxed">{selectedAlert.body}</p>}
                  {selectedAlert.link && selectedAlert.link !== '/messages' && (
                    <a href={selectedAlert.link} className="inline-flex items-center gap-1 mt-4 text-sm text-amber-400 hover:text-amber-300 underline">View related record →</a>
                  )}
                </>
              )
            })()}
          </div>
        ) : !selected ? (
          <div className="flex items-center justify-center h-full min-h-[40vh]">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Select a message or alert</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-xl p-5 lg:p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-base font-bold text-white mb-2">{selected.subject || '(No subject)'}</h2>
              <div className="flex flex-wrap items-center justify-between gap-1 text-sm text-slate-500">
                <span>From: <span className="font-medium text-slate-300">{selected.sender_name || 'System'}</span></span>
                <span>{selected.created_at ? format(new Date(selected.created_at), 'd MMM yyyy, HH:mm') : ''}</span>
              </div>
              {selected.recipient_name && <p className="text-sm text-slate-500 mt-1">To: <span className="font-medium text-slate-300">{selected.recipient_name}</span></p>}
            </div>
            <p className="text-slate-300 whitespace-pre-line leading-relaxed text-sm">{selected.message || selected.body}</p>
            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => reply(selected)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => deleteMessage(selected.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 transition-colors"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <ComposeModal open={composeOpen} onClose={() => { setComposeOpen(false); setReplyDefaults(null) }}
        staffList={staffList} defaults={replyDefaults}
        onSaved={async () => { setComposeOpen(false); setReplyDefaults(null); await load(); toast.success('Message sent') }} />
    </div>
  )
}

function ComposeModal({ open, onClose, staffList, onSaved, defaults }: {
  open: boolean; onClose: () => void; staffList: any[]; onSaved: () => void; defaults?: { recipientId: string; subject: string } | null
}) {
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const options = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (open) {
      setRecipientIds(defaults?.recipientId ? [defaults.recipientId] : [])
      setSubject(defaults?.subject || '')
      setMessage('')
      setSearch('')
    }
  }, [open, defaults])

  const toggleRecipient = (id: string) =>
    setRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (recipientIds.length === 0) { toast.error('Select at least one recipient'); return }
    setLoading(true)
    try {
      await Promise.all(recipientIds.map(recipientId => api.post('/messages', { recipientId, subject, message })))
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">To * {recipientIds.length > 0 && <span className="text-purple-600 font-semibold">({recipientIds.length} selected)</span>}</label>
          <input className="input mb-2 text-sm" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
            {filtered.map(o => (
              <label key={o.value} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="rounded accent-purple-600" checked={recipientIds.includes(o.value)} onChange={() => toggleRecipient(o.value)} />
                <span className="text-sm text-slate-700">{o.label}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No staff found</p>}
          </div>
        </div>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject..." />
        </div>
        <div>
          <label className="label">Message *</label>
          <textarea required className="input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>
            Send{recipientIds.length > 1 ? ` to ${recipientIds.length}` : ''}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
