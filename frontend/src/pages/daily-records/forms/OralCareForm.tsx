import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, SpeechTextarea } from '../../../components/ui'

const CARE_TYPES = ['Teeth brushed', 'Dentures cleaned', 'Mouthwash', 'Oral swab']

export default function OralCareForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [careTypes, setCareTypes] = useState<string[]>([])
  const [form, setForm] = useState({ mouthCondition: '', hasDentures: false, dentureType: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const toggle = (t: string) => setCareTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: 'oral_care', careTypes, ...form }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label">Care provided</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CARE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggle(t.toLowerCase().replace(/ /g, '_'))}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${careTypes.includes(t.toLowerCase().replace(/ /g, '_')) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Select label="Mouth condition" value={form.mouthCondition} onChange={e => setForm(p => ({ ...p, mouthCondition: e.target.value }))}
        options={[{ value: 'good', label: 'Good' }, { value: 'dry', label: 'Dry' }, { value: 'sore', label: 'Sore' }, { value: 'ulcers', label: 'Ulcers' }, { value: 'bleeding', label: 'Bleeding gums' }, { value: 'other', label: 'Other' }]} placeholder="Select condition" />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="dent" checked={form.hasDentures} onChange={e => setForm(p => ({ ...p, hasDentures: e.target.checked }))} className="rounded" />
        <label htmlFor="dent" className="text-sm text-slate-700">Has dentures</label>
      </div>
      {form.hasDentures && (
        <Select label="Denture type" value={form.dentureType} onChange={e => setForm(p => ({ ...p, dentureType: e.target.value }))}
          options={[{ value: 'upper', label: 'Upper' }, { value: 'lower', label: 'Lower' }, { value: 'full', label: 'Full' }]} placeholder="Select type" />
      )}
      <SpeechTextarea label="Notes" rows={2} value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} />
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
