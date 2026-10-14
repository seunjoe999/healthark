import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input, SpeechTextarea } from '../../../components/ui'

export default function WelfareCheckForm({ suId, onSaved, recordedAt }: { suId: string; onSaved: () => void; recordedAt?: string }) {
  const [form, setForm] = useState({ checkType: 'welfare', suStatus: '', environmentOk: true, environmentNotes: '', actionTaken: '', note: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // "note" is the daily_records-level notes column — previously only collected
    // later, via the generic record-edit screen, because this form never sent it
    // on creation at all. Saved as `notes`, kept separate from `actionTaken`
    // (which is specific to the welfare-check sub-record).
    try { const { note, ...rest } = form; await dailyRecordsApi.create({ suId, recordType: 'welfare_check', recordedAt, notes: note, ...rest }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Select label="Check type" value={form.checkType} onChange={e => set('checkType', e.target.value)}
        options={[{ value: 'welfare', label: 'Welfare check' }, { value: 'comfort', label: 'Comfort check' }, { value: 'night', label: 'Night check' }]} />
      <Input label="Current status" value={form.suStatus} onChange={e => set('suStatus', e.target.value)} placeholder="e.g. Settled, sleeping, watching TV..." />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="envok" checked={form.environmentOk} onChange={e => set('environmentOk', e.target.checked)} className="rounded" />
        <label htmlFor="envok" className="text-sm text-slate-700">Environment is satisfactory (temperature, comfort)</label>
      </div>
      {!form.environmentOk && <Input label="Environment concerns" value={form.environmentNotes} onChange={e => set('environmentNotes', e.target.value)} placeholder="Describe the concern..." />}
      <SpeechTextarea label="Action taken (if any)" rows={2} value={form.actionTaken} onChange={v => set('actionTaken', v)} />
      <SpeechTextarea label="Note" rows={2} value={form.note} onChange={v => set('note', v)} placeholder="Any other observations..." />
      <Button type="submit" loading={loading} className="w-full">Save check</Button>
    </form>
  )
}
