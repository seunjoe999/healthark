import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'

const BRISTOL = [
  { value: '1', label: 'Type 1 — Separate hard lumps (very constipated)' },
  { value: '2', label: 'Type 2 — Lumpy and sausage-like (constipated)' },
  { value: '3', label: 'Type 3 — Sausage shape with cracks (normal)' },
  { value: '4', label: 'Type 4 — Smooth, soft sausage (normal)' },
  { value: '5', label: 'Type 5 — Soft blobs with clear edges (lacking fibre)' },
  { value: '6', label: 'Type 6 — Mushy consistency (mild diarrhoea)' },
  { value: '7', label: 'Type 7 — Liquid with no solid pieces (diarrhoea)' },
]

export default function BowelForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ bristolType: '', frequencyToday: '1', colour: '', consistencyNotes: '', laxativeGiven: false })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await dailyRecordsApi.create({ suId, recordType: 'bowel', bristolType: parseInt(form.bristolType), frequencyToday: parseInt(form.frequencyToday), colour: form.colour, consistencyNotes: form.consistencyNotes, laxativeGiven: form.laxativeGiven })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Select label="Bristol Stool Scale type" value={form.bristolType} onChange={e => set('bristolType', e.target.value)} options={BRISTOL} placeholder="Select type" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Times today" type="number" min="1" value={form.frequencyToday} onChange={e => set('frequencyToday', e.target.value)} />
        <Select label="Colour" value={form.colour} onChange={e => set('colour', e.target.value)}
          options={[{ value: 'brown', label: 'Brown' }, { value: 'yellow', label: 'Yellow' }, { value: 'green', label: 'Green' }, { value: 'black', label: 'Black' }, { value: 'red', label: 'Red' }, { value: 'pale', label: 'Pale' }]} placeholder="Select colour" />
      </div>
      <div>
        <label className="label">Additional notes (optional)</label>
        <textarea className="input" rows={2} value={form.consistencyNotes} onChange={e => set('consistencyNotes', e.target.value)} placeholder="Any other observations..." />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="lax" checked={form.laxativeGiven} onChange={e => set('laxativeGiven', e.target.checked)} className="rounded" />
        <label htmlFor="lax" className="text-sm text-gray-700">Laxative given today</label>
      </div>
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
