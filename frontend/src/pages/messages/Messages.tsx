import React, { useEffect, useState } from 'react'
import { staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import { MessageSquare, Plus, Send, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Messages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [view, setView] = useState<'inbox' | 'sent'>('inbox')

  useEffect(() => { load() }, [view])

  const load = async () => {
    setLoading(true)
    try {
      const [msgRes, staffRes] = await Promise.all([
        api.get(`/messages?type=${view}`),
        staffApi.list(),
      ])
      setMessages(msgRes.data.data || [])
      setStaffList(staffRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const markRead = async (id: string) => {
    try { await api.put(`/messages/${id}/read`) } catch {}
  }

  return (
    <div className="flex h-full">
      {/* Left — message list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-purple-900">Messages</h2>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setComposeOpen(true)}>New</Button>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView('inbox')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'inbox' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600'}`}>
              Inbox
            </button>
            <button onClick={() => setView('sent')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'sent' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600'}`}>
              Sent
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <Spinner /> : messages.length === 0 ? (
            <div className="text-center p-8">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No messages</p>
            </div>
          ) : messages.map((msg: any) => (
            <button key={msg.id} onClick={() => { setSelected(msg); if (!msg.is_read && view === 'inbox') markRead(msg.id) }}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected?.id === msg.id ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!msg.is_read && view === 'inbox' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {view === 'inbox' ? (msg.sender_name || 'Unknown') : (msg.recipient_name || 'Unknown')}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{msg.subject || msg.message?.substring(0, 50)}</p>
                  <p className="text-xs text-slate-400 mt-1">{msg.created_at ? format(new Date(msg.created_at), 'd MMM, HH:mm') : ''}</p>
                </div>
                {!msg.is_read && view === 'inbox' && <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0 mt-1.5" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — message detail */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a message" description="Choose a message from the list to read it" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">{selected.subject || '(No subject)'}</h2>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>From: <span className="font-medium text-slate-700">{selected.sender_name || 'Unknown'}</span></span>
                <span>{selected.created_at ? format(new Date(selected.created_at), 'd MMMM yyyy, HH:mm') : ''}</span>
              </div>
              {selected.recipient_name && <p className="text-sm text-slate-500 mt-1">To: <span className="font-medium text-slate-700">{selected.recipient_name}</span></p>}
            </div>
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">{selected.message}</p>
          </div>
        )}
      </div>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} staffList={staffList}
        onSaved={async () => { setComposeOpen(false); setView('sent'); await load(); toast.success('Message sent') }} />
    </div>
  )
}

function ComposeModal({ open, onClose, staffList, onSaved }: { open: boolean; onClose: () => void; staffList: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({ recipientId: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const options = staffList.map(s => ({ value: s.id, label: `${s.first_name || s.firstName} ${s.last_name || s.lastName}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/messages', form); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">To *</label>
          <select required className="input" value={form.recipientId} onChange={e => set('recipientId', e.target.value)}>
            <option value="">Select recipient...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Message subject..." />
        </div>
        <div>
          <label className="label">Message *</label>
          <textarea required className="input" rows={5} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Type your message here..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>Send message</Button>
        </div>
      </form>
    </Modal>
  )
}
