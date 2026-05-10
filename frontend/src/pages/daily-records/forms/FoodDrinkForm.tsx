import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Input, Select } from '../../../components/ui'

export default function FoodDrinkForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [entryType, setEntryType] = useState<'food' | 'drink'>('drink')
  const [form, setForm] = useState({ mealType: '', description: '', amountEaten: '', volumeMl: '', assisted: false, notes: '' })
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await dailyRecordsApi.create({
        suId, recordType: 'food_drink', entryType,
        mealType: form.mealType || null,
        description: form.description,
        amountEaten: form.amountEaten || null,
        volumeMl: entryType === 'drink' && form.volumeMl ? parseInt(form.volumeMl) : null,
        assisted: form.assisted, notes: form.notes || null,
      })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed to save') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex gap-3">
        {(['food', 'drink'] as const).map(t => (
          <button key={t} type="button" onClick={() => setEntryType(t)}
            className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-colors ${entryType === t ? 'border-navy-900 bg-navy-50 text-navy-900' : 'border-gray-200 text-gray-600'}`}>
            {t === 'food' ? '🍽 Food' : '💧 Drink'}
          </button>
        ))}
      </div>
      {entryType === 'food' && (
        <Select label="Meal type" value={form.mealType} onChange={e => setForm(p => ({ ...p, mealType: e.target.value }))}
          options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' }, { value: 'supplement', label: 'Supplement' }]} placeholder="Select meal" />
      )}
      <Input label={entryType === 'food' ? 'What was eaten' : 'What was drunk'} required
        value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        placeholder={entryType === 'food' ? 'e.g. Scrambled eggs and toast' : 'e.g. Orange juice'} />
      {entryType === 'food' && (
        <Select label="Amount eaten" value={form.amountEaten} onChange={e => setForm(p => ({ ...p, amountEaten: e.target.value }))}
          options={[{ value: 'all', label: 'All' }, { value: 'three_quarters', label: 'Three quarters' }, { value: 'half', label: 'Half' }, { value: 'quarter', label: 'Quarter' }, { value: 'none', label: 'None — refused' }]} placeholder="Select amount" />
      )}
      {entryType === 'drink' && (
        <Input label="Volume (ml)" type="number" required
          value={form.volumeMl} onChange={e => setForm(p => ({ ...p, volumeMl: e.target.value }))}
          placeholder="e.g. 200" hint="Enter the amount in millilitres" />
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="assisted" checked={form.assisted} onChange={e => setForm(p => ({ ...p, assisted: e.target.checked }))} className="rounded" />
        <label htmlFor="assisted" className="text-sm text-gray-700">Assistance required</label>
      </div>
      <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any observations..." />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Save record</Button>
      </div>
    </form>
  )
}
