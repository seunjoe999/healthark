import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, SpeechTextarea } from '../../../components/ui'

const MOODS = [{ value: 'happy', label: '😊 Happy' }, { value: 'calm', label: '😌 Calm' }, { value: 'anxious', label: '😟 Anxious' }, { value: 'agitated', label: '😤 Agitated' }, { value: 'distressed', label: '😢 Distressed' }, { value: 'withdrawn', label: '😶 Withdrawn' }, { value: 'other', label: 'Other' }]

export default function BehaviourForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ mood: '', behaviourNoted: '', triggersNoted: '', actionTaken: '', escalated: false })
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
    <form onSubmit={save} className="space-y-4">
      <Select label="Mood" value={form.mood} onChange={e => set('mood', e.target.value)} options={MOODS} placeholder="Select mood" />
      <SpeechTextarea label="Behaviour observed" rows={3} value={form.behaviourNoted} onChange={v => set('behaviourNoted', v)} placeholder="Describe any notable behaviour..." />
      <SpeechTextarea label="Triggers identified (optional)" rows={2} value={form.triggersNoted} onChange={v => set('triggersNoted', v)} placeholder="What appeared to trigger this..." />
      <SpeechTextarea label="Action taken" rows={2} value={form.actionTaken} onChange={v => set('actionTaken', v)} placeholder="What did you do in response..." />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="esc" checked={form.escalated} onChange={e => set('escalated', e.target.checked)} className="rounded" />
        <label htmlFor="esc" className="text-sm text-slate-700 font-medium">Escalated to manager</label>
      </div>
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
