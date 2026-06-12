import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, SpeechTextarea } from '../../../components/ui'

const MOODS = [{ value: 'happy', label: '😊 Happy' }, { value: 'calm', label: '😌 Calm' }, { value: 'anxious', label: '😟 Anxious' }, { value: 'agitated', label: '😤 Agitated' }, { value: 'distressed', label: '😢 Distressed' }, { value: 'withdrawn', label: '😶 Withdrawn' }, { value: 'other', label: 'Other' }]

export default function BehaviourForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    mood: '', behaviourTime: '',
    triggersNoted: '', behaviourNoted: '', actionTaken: '',
    escalated: false,
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: 'behaviour', ...form }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Mood" value={form.mood} onChange={e => set('mood', e.target.value)} options={MOODS} placeholder="Select mood" />
        <div>
          <label className="label">Time of behaviour</label>
          <input type="time" className="input w-full" value={form.behaviourTime} onChange={e => set('behaviourTime', e.target.value)} />
        </div>
      </div>

      {/* A — Antecedent */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-1">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">A — Antecedent</p>
        <p className="text-xs text-blue-600 mb-2">What happened immediately before the behaviour? (environment, triggers, context)</p>
        <SpeechTextarea rows={3} value={form.triggersNoted} onChange={v => set('triggersNoted', v)} placeholder="e.g. Staff asked resident to get dressed, loud noise in the corridor, other resident came into the room..." />
      </div>

      {/* B — Behaviour */}
      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-1">
        <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">B — Behaviour</p>
        <p className="text-xs text-orange-600 mb-2">Describe the behaviour objectively — what was seen or heard, not interpreted.</p>
        <SpeechTextarea rows={3} value={form.behaviourNoted} onChange={v => set('behaviourNoted', v)} placeholder="e.g. Resident raised voice, clenched fists and threw a cup at the wall..." />
      </div>

      {/* C — Consequence */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-1">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">C — Consequence</p>
        <p className="text-xs text-emerald-600 mb-2">What happened after? What action was taken and how did the resident respond?</p>
        <SpeechTextarea rows={3} value={form.actionTaken} onChange={v => set('actionTaken', v)} placeholder="e.g. Staff used de-escalation, offered a drink, resident calmed after 10 minutes..." />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="esc" checked={form.escalated} onChange={e => set('escalated', e.target.checked)} className="rounded" />
        <label htmlFor="esc" className="text-sm text-slate-700 font-medium">Escalated to manager</label>
      </div>
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
