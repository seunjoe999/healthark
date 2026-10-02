import React, { useEffect, useState } from 'react'
import { staffApi } from '../api'
import { Button } from './ui'
import { Send, Users } from 'lucide-react'
import toast from 'react-hot-toast'

// Shared "select staff, send them a notification to read this document"
// checklist — used at the bottom of Support Plans and Risk Assessments so
// management can pick exactly who needs to read something, instead of
// hoping everyone stumbles across it. Reading the document (which already
// happens automatically on open) is what actually records the read; this
// just makes sure the right people are told to go look.
export default function NotifyReadersSection({ homeId, onSend }: {
  homeId: string
  onSend: (staffIds: string[]) => Promise<void>
}) {
  const [staff, setStaff] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || staff.length) return
    staffApi.list({ homeId }).then(res => setStaff(res.data.data || [])).catch(() => {})
  }, [open, homeId])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const send = async () => {
    if (selected.size === 0) { toast.error('Select at least one staff member'); return }
    setSending(true)
    try {
      await onSend(Array.from(selected))
      toast.success(`Sent to ${selected.size} staff member${selected.size === 1 ? '' : 's'}`)
      setSelected(new Set())
      setOpen(false)
    } catch {
      toast.error('Failed to send')
    } finally { setSending(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
        <Users className="w-3.5 h-3.5" /> Select staff to read
      </button>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select staff to notify</p>
      <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
        {staff.length === 0 ? (
          <p className="text-xs text-slate-400">Loading staff…</p>
        ) : staff.map(s => (
          <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer text-sm text-slate-700">
            <input type="checkbox" className="rounded" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
            {s.first_name} {s.last_name}
            <span className="text-xs text-slate-400">({(s.role || '').replace(/_/g, ' ')})</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setSelected(new Set()) }}>Cancel</Button>
        <Button size="sm" loading={sending} icon={<Send className="w-3.5 h-3.5" />} onClick={send}>
          Send to {selected.size || ''} staff
        </Button>
      </div>
    </div>
  )
}
