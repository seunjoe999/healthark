import React, { useEffect, useState, useRef } from 'react'
import api from '../../api'
import { Bell, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const TYPE_STYLES: Record<string, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  error: 'bg-rose-500/10 border-rose-500/20',
  shift: 'bg-blue-500/10 border-blue-500/20',
  info: 'bg-slate-500/10 border-slate-500/20',
}

const TYPE_DOT: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  shift: 'bg-blue-500',
  info: 'bg-slate-400',
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close) }
  }, [])

  const load = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.data || [])
      setUnread(res.data.unread || 0)
    } catch {}
  }

  const markRead = async (id: string, link?: string) => {
    try { await api.put(`/notifications/${id}/read`) } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    setOpen(false)
    navigate(link || '/messages')
  }

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all') } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: '#151515', border: '1px solid rgba(232,177,48,0.25)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(232,177,48,0.15)' }}>
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium transition-colors" style={{ color: '#e8b130' }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            ) : notifications.map((n: any) => (
              <div key={n.id}
                onClick={() => markRead(n.id, n.link)}
                className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${!n.is_read ? 'bg-white/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.is_read ? 'bg-slate-600' : (TYPE_DOT[n.type] || TYPE_DOT.info)}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-slate-600 mt-1">{n.created_at ? format(new Date(n.created_at), 'd MMM, HH:mm') : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
