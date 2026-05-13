import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'

const CARE_OPTIONS = ['Wash', 'Shower', 'Bath', 'Hair wash', 'Shave', 'Nail care', 'Other']
const ASSIST_LEVELS = [{ value: 'independent', label: 'Independent' }, { value: 'prompted', label: 'Prompted' }, { value: 'assisted', label: 'Assisted' }, { value: 'full_assist', label: 'Full assist' }]

export default function PersonalCareForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [careTypes, setCareTypes] = useState<string[]>([])
  const [form, setForm] = useState({ assistanceLevel: '', continenceCare: false, continenceNotes: '', skinCondition: '', notes: '' })
  const [loading, setLoading] = useState(false)

  const toggleCare = (t: string) => setCareTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await dailyRecordsApi.create({ suId, recordType: 'personal_care', careTypes, ...form })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label">Care provided (select all that apply)</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CARE_OPTIONS.map(t => (
            <button key={t} type="button" onClick={() => toggleCare(t.toLowerCase().replace(' ', '_'))}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${careTypes.includes(t.toLowerCase().replace(' ', '_')) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Select label="Assistance level" value={form.assistanceLevel} onChange={e => setForm(p => ({ ...p, assistanceLevel: e.target.value }))} options={ASSIST_LEVELS} placeholder="Select level" />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="cont" checked={form.continenceCare} onChange={e => setForm(p => ({ ...p, continenceCare: e.target.checked }))} className="rounded" />
        <label htmlFor="cont" className="text-sm text-slate-700">Continence care provided</label>
      </div>
      {form.continenceCare && <Input label="Continence notes" value={form.continenceNotes} onChange={e => setForm(p => ({ ...p, continenceNotes: e.target.value }))} placeholder="Details..." />}
      <Input label="Skin condition notes (optional)" value={form.skinCondition} onChange={e => setForm(p => ({ ...p, skinCondition: e.target.value }))} placeholder="Any concerns observed..." />
      <Input label="Additional notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Other observations..." />
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
