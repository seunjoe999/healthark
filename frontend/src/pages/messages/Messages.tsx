import React, { useEffect, useMemo, useRef, useState } from 'react'
import { staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { MessageSquare, Plus, Send, Trash2, Paperclip, Camera, X, Users2, RotateCcw, Search, ChevronLeft, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

// ── WhatsApp-style inbox ─────────────────────────────────────────────
// One row per person (not per message): tap a name, see the whole history
// with them, reply at the bottom. The old flat inbox/sent lists are gone —
// with hundreds of messages they were unfindable. Alerts and Deleted Items
// stay as simple lists under their own tabs.
interface Thread {
  other_id: string
  other_name: string
  last_at: string
  total: string | number
  unread: string | number
  last_subject: string | null
  last_snippet: string | null
  last_sender_id: string | null
}

export default function Messages() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [deletedItems, setDeletedItems] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [teamsList, setTeamsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [view, setView] = useState<'chats' | 'deleted'>('chats')
  const [selectedDeleted, setSelectedDeleted] = useState<any>(null)
  const [replyDefaults, setReplyDefaults] = useState<{ recipientId: string; subject: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Debounce the search box so every keystroke isn't a server round-trip.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = async () => {
    setLoading(true)
    try {
      const [threadsRes, staffRes, teamsRes] = await Promise.all([
        api.get('/messages', { params: { type: 'threads', ...(debouncedSearch ? { search: debouncedSearch } : {}) } }),
        staffApi.list(),
        api.get('/teams', { params: { homeId: user?.homeId } }).catch(() => ({ data: { data: [] } })),
      ])
      setThreads(threadsRes.data.data || [])
      setStaffList(staffRes.data.data || [])
      setTeamsList(teamsRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadDeleted = async () => {
    const [delMsgRes] = await Promise.all([api.get('/messages?type=deleted')])
    setDeletedItems((delMsgRes.data.data || []).map((m: any) => ({ ...m, _kind: 'message' })))
  }

  const backgroundLoad = async () => {
    try {
      if (view === 'deleted') { await loadDeleted(); return }
      const res = await api.get('/messages', { params: { type: 'threads', ...(debouncedSearch ? { search: debouncedSearch } : {}) } })
      setThreads(res.data.data || [])
      // Keep the open conversation fresh too — new replies land on their own.
      if (activeThread) {
        const h = await api.get('/messages', { params: { type: 'conversation', with: activeThread.other_id } })
        setHistory(h.data.data || [])
      }
    } catch { /* quiet refresh — never disturb reading */ }
  }

  useEffect(() => {
    if (view === 'deleted') { setLoading(true); loadDeleted().finally(() => setLoading(false)) }
    else load()
    const interval = setInterval(() => backgroundLoad(), 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, debouncedSearch])

  const openThread = async (t: Thread) => {
    setActiveThread(t)
    setReplyText('')
    setHistoryLoading(true)
    try {
      const h = await api.get('/messages', { params: { type: 'conversation', with: t.other_id } })
      const rows = h.data.data || []
      setHistory(rows)
      // Everything they sent that was still unread is now read — clear the
      // badge on this conversation.
      const unreadIds = rows.filter((m: any) => m.sender_id === t.other_id && !m.is_read).map((m: any) => m.id)
      if (unreadIds.length) {
        await Promise.all(unreadIds.map((id: string) => api.put(`/messages/${id}/read`).catch(() => {})))
        setThreads(prev => prev.map(x => x.other_id === t.other_id ? { ...x, unread: 0 } : x))
      }
    } catch { toast.error('Could not open this conversation') }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

  const sendReply = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!activeThread || !replyText.trim() || replySending) return
    setReplySending(true)
    try {
      await api.post('/messages', { recipientId: activeThread.other_id, message: replyText.trim() })
      setReplyText('')
      const h = await api.get('/messages', { params: { type: 'conversation', with: activeThread.other_id } })
      setHistory(h.data.data || [])
      const t = await api.get('/messages', { params: { type: 'threads' } })
      setThreads(t.data.data || [])
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send') }
    finally { setReplySending(false) }
  }

  const deleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return
    try {
      await api.delete(`/messages/${id}`)
      setHistory(prev => prev.filter(m => m.id !== id))
      toast.success('Message deleted — find it under Deleted Items if you need it back')
    } catch { toast.error('Failed to delete') }
  }

  const restoreItem = async (item: any) => {
    try {
      await api.put(`/messages/${item.id}/restore`)
      setDeletedItems(prev => prev.filter(x => x.id !== item.id))
      setSelectedDeleted(null)
      toast.success('Restored')
    } catch { toast.error('Failed to restore') }
  }

  const totalUnread = useMemo(
    () => threads.reduce((n, t) => n + (parseInt(String(t.unread || '0'), 10) || 0), 0),
    [threads]
  )

  const staffName = (id: string) => {
    const s = staffList.find((x: any) => x.id === id)
    return s ? `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim() : 'Unknown'
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — conversation list (full screen on mobile when no chat open) */}
      <div
        className={`flex-shrink-0 flex flex-col lg:w-80 ${activeThread || selectedDeleted ? 'hidden lg:flex' : 'flex w-full'}`}
        style={{ background: '#111', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" /> Messages
              {totalUnread > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111' }}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </h2>
            <button onClick={() => { setReplyDefaults(null); setComposeOpen(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111' }}>
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="flex gap-1 rounded-lg p-1 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['chats', 'deleted'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setActiveThread(null); setSelectedDeleted(null) }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === v ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                style={view === v ? { background: 'rgba(255,255,255,0.12)' } : {}}>
                {v === 'chats' ? 'Chats' : 'Deleted'}
              </button>
            ))}
          </div>
          {/* Search — by person, subject or message text */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-slate-200 placeholder-slate-500 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : view === 'deleted' ? (
            deletedItems.length === 0 ? (
              <div className="text-center p-8"><Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-500">No deleted items</p></div>
            ) : deletedItems.map((item: any) => (
              <button key={item.id} onClick={() => { setSelectedDeleted(item); setActiveThread(null) }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedDeleted?.id === item.id ? 'rgba(232,177,48,0.08)' : 'transparent' }}>
                <p className="text-sm font-medium truncate text-slate-300">{item.subject || item.message?.substring(0, 50) || '(No subject)'}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{item.sender_id === user?.id ? `To: ${item.recipient_name || 'Unknown'}` : `From: ${item.sender_name || 'Unknown'}`}</p>
              </button>
            ))
          ) : threads.length === 0 ? (
            <div className="text-center p-8">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{debouncedSearch ? `No conversations match "${debouncedSearch}"` : 'No conversations yet'}</p>
            </div>
          ) : threads.map((t: any) => {
            const unread = parseInt(String(t.unread || '0'), 10) || 0
            const mine = t.last_sender_id === user?.id
            return (
              <button key={t.other_id} onClick={() => openThread(t)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: activeThread?.other_id === t.other_id ? 'rgba(232,177,48,0.08)' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-slate-900"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    {(t.other_name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${unread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>{t.other_name}</p>
                      <p className="text-[11px] text-slate-600 flex-shrink-0">{t.last_at ? format(new Date(t.last_at), 'd MMM, HH:mm') : ''}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate flex-1">
                        {mine ? 'You: ' : ''}{t.last_subject || t.last_snippet || ''}
                      </p>
                      {unread > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: '#e8b130', color: '#111' }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — open conversation (full screen on mobile when open) */}
      <div
        className={`flex-col overflow-hidden lg:flex lg:flex-1 ${activeThread || selectedDeleted ? 'flex flex-1' : 'hidden'}`}
        style={{ background: '#0a0a0a' }}
      >
        {selectedDeleted ? (
          <>
            <button onClick={() => setSelectedDeleted(null)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 text-amber-400 font-semibold text-sm border-b border-white/8"
              style={{ background: '#111' }}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="max-w-2xl mx-auto rounded-xl p-5 lg:p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 className="text-base font-bold text-white mb-2">{selectedDeleted.subject || '(No subject)'}</h2>
                <p className="text-slate-300 whitespace-pre-line leading-relaxed text-sm">{selectedDeleted.message || selectedDeleted.body}</p>
                <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => restoreItem(selectedDeleted)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-400"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <RotateCcw className="w-4 h-4" /> Restore
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : !activeThread ? (
          <div className="flex-1 items-center justify-center hidden lg:flex">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setActiveThread(null)} className="lg:hidden text-amber-400 flex-shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-900"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                {(activeThread.other_name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{activeThread.other_name}</p>
                <p className="text-[11px] text-slate-500">{parseInt(String(activeThread.total || '0'), 10) || history.length} messages</p>
              </div>
              <button onClick={() => { setReplyDefaults({ recipientId: activeThread.other_id, subject: '' }); setComposeOpen(true) }}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex-shrink-0">
                New subject…
              </button>
            </div>
            {/* Message history */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {historyLoading ? <div className="flex justify-center py-12"><Spinner /></div> : history.map((m: any) => {
                const mine = m.sender_id === user?.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-2xl px-3.5 py-2 group"
                      style={mine
                        ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111', borderBottomRightRadius: 6 }
                        : { background: '#1c1c1c', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: 6 }}>
                      {m.subject && <p className={`text-xs font-bold mb-0.5 ${mine ? 'text-slate-800' : 'text-amber-400'}`}>{m.subject}</p>}
                      <p className="text-sm whitespace-pre-line leading-relaxed">{m.message || m.body}</p>
                      {m.attachment_url && (
                        /\.(jpe?g|png|webp|gif)$/i.test(m.attachment_name || m.attachment_url) ? (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                            <img src={m.attachment_url} alt={m.attachment_name || 'Attachment'} className="max-w-full max-h-60 rounded-lg" />
                          </a>
                        ) : (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${mine ? 'bg-black/15 text-slate-900' : 'text-amber-300'}`}
                            style={mine ? {} : { background: 'rgba(232,177,48,0.1)', border: '1px solid rgba(232,177,48,0.25)' }}>
                            <Paperclip className="w-3.5 h-3.5" /> {m.attachment_name || 'Attachment'}
                          </a>
                        )
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${mine ? 'text-slate-700' : 'text-slate-500'}`}>
                          {m.created_at ? format(new Date(m.created_at), 'd MMM, HH:mm') : ''}
                        </span>
                        {mine && <CheckCheck className="w-3.5 h-3.5 text-slate-700" />}
                        <button onClick={() => deleteMessage(m.id)} title="Delete"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'text-slate-700 hover:text-red-800' : 'text-slate-500 hover:text-rose-400'}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            {/* Reply box */}
            <form onSubmit={sendReply} className="flex-shrink-0 px-4 py-3 flex items-center gap-2" style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={`Message ${activeThread.other_name}…`}
                className="flex-1 px-4 py-2.5 rounded-full text-sm text-slate-200 placeholder-slate-500 outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <button type="submit" disabled={!replyText.trim() || replySending}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#111' }}
                aria-label="Send">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>

      <ComposeModal open={composeOpen} onClose={() => { setComposeOpen(false); setReplyDefaults(null) }}
        staffList={staffList} teamsList={teamsList} defaults={replyDefaults}
        onSaved={async (sentToIds?: string[]) => {
          setComposeOpen(false)
          setReplyDefaults(null)
          toast.success('Message sent')
          await backgroundLoad()
          // Jump straight into the conversation just started (single recipient).
          if (sentToIds && sentToIds.length === 1) {
            const otherId = sentToIds[0]
            const found = threads.find(t => t.other_id === otherId)
            openThread(found || { other_id: otherId, other_name: staffName(otherId), last_at: '', total: 0, unread: 0, last_subject: null, last_snippet: null, last_sender_id: user?.id } as Thread)
          }
        }} />
    </div>
  )
}

function ComposeModal({ open, onClose, staffList, teamsList, onSaved, defaults }: {
  open: boolean; onClose: () => void; staffList: any[]; teamsList: any[]; onSaved: (sentToIds?: string[]) => void; defaults?: { recipientId: string; subject: string } | null
}) {
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const options = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const filteredTeams = teamsList.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const totalSelected = recipientIds.length + teamIds.length

  useEffect(() => {
    if (open) {
      setRecipientIds(defaults?.recipientId ? [defaults.recipientId] : [])
      setTeamIds([])
      setSubject(defaults?.subject || '')
      setMessage('')
      setSearch('')
      setAttachment(null)
    }
  }, [open, defaults])

  const toggleRecipient = (id: string) =>
    setRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleTeam = (id: string) =>
    setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAttachment({ url: res.data?.data?.fileUrl || '', name: file.name })
    } catch { toast.error('Attachment upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = '' }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalSelected === 0) { toast.error('Select at least one recipient'); return }
    setLoading(true)
    try {
      // Teams expand to their member staff IDs at send time, merged with any
      // individually-picked staff (de-duplicated so nobody gets it twice).
      const teamMemberIds = (await Promise.all(teamIds.map(id => api.get(`/teams/${id}/members`))))
        .flatMap(res => (res.data.data || []).map((m: any) => m.id || m.staff_id))
      const allRecipientIds = Array.from(new Set([...recipientIds, ...teamMemberIds]))
      await Promise.all(allRecipientIds.map(recipientId => api.post('/messages', {
        recipientId, subject, message, attachmentUrl: attachment?.url || undefined, attachmentName: attachment?.name || undefined,
      })))
      onSaved(allRecipientIds)
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">To * {totalSelected > 0 && <span className="text-purple-600 font-semibold">({totalSelected} selected)</span>}</label>
          <input className="input mb-2 text-sm" placeholder="Search staff or teams..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto">
            {filteredTeams.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teams</p>
                {filteredTeams.map(t => (
                  <label key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="rounded accent-purple-600" checked={teamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                    <Users2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{t.name}</span>
                  </label>
                ))}
                <div className="border-t border-slate-100" />
              </>
            )}
            {filtered.length > 0 && (
              <>
                {filteredTeams.length > 0 && <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff</p>}
                {filtered.map(o => (
                  <label key={o.value} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="rounded accent-purple-600" checked={recipientIds.includes(o.value)} onChange={() => toggleRecipient(o.value)} />
                    <span className="text-sm text-slate-700">{o.label}</span>
                  </label>
                ))}
              </>
            )}
            {filtered.length === 0 && filteredTeams.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No staff or teams found</p>}
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
        <div>
          <label className="label">Attachment (optional)</label>
          <input ref={fileRef} type="file" className="hidden" onChange={upload} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={upload} />
          {attachment ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-rose-500 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" icon={<Paperclip className="w-3.5 h-3.5" />} loading={uploading} onClick={() => fileRef.current?.click()}>
                Attach file
              </Button>
              <Button type="button" size="sm" variant="outline" icon={<Camera className="w-3.5 h-3.5" />} loading={uploading} onClick={() => cameraRef.current?.click()}>
                Take photo
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>
            Send{totalSelected > 1 ? ` to ${totalSelected}` : ''}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
