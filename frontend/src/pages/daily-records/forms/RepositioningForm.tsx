import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'

export default function RepositioningForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ position: '', skinChecked: false, skinConcerns: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: 'repositioning', ...form }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Select label="New position" required value={form.position} onChange={e => set('position', e.target.value)}
        options={[{ value: 'left_side', label: 'Left side' }, { value: 'right_side', label: 'Right side' }, { value: 'back', label: 'Back' }, { value: 'sitting', label: 'Sitting' }, { value: 'other', label: 'Other' }]} placeholder="Select position" />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="skin" checked={form.skinChecked} onChange={e => set('skinChecked', e.target.checked)} className="rounded" />
        <label htmlFor="skin" className="text-sm text-gray-700">Skin condition checked</label>
      </div>
      {form.skinChecked && <Input label="Skin concerns (if any)" value={form.skinConcerns} onChange={e => set('skinConcerns', e.target.value)} placeholder="Any redness, pressure marks..." />}
      <Input label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any other observations..." />
      <Button type="submit" loading={loading} className="w-full">Save repositioning</Button>
    </form>
  )
}
