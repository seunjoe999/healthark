import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input, SpeechTextarea } from '../../../components/ui'

export default function WelfareCheckForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ checkType: 'welfare', suStatus: '', environmentOk: true, environmentNotes: '', actionTaken: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: 'welfare_check', ...form }); onSaved() }
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
      <Button type="submit" loading={loading} className="w-full">Save check</Button>
    </form>
  )
}
