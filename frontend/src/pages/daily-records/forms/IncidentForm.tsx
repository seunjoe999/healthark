import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'

export default function IncidentForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ incidentType: '', location: '', description: '', injuries: false, injuryDetails: '', medicalNeeded: false, medicalDetails: '', witnesses: '', immediateAction: '', safeguardingRef: false })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.immediateAction) { alert('Immediate action taken is required'); return }
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: 'incident', ...form }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
        ⚠ Incident record — complete all fields as accurately as possible
      </div>
      <Select label="Incident type" required value={form.incidentType} onChange={e => set('incidentType', e.target.value)}
        options={[{ value: 'fall', label: 'Fall' }, { value: 'medication_error', label: 'Medication error' }, { value: 'skin_tear', label: 'Skin tear' }, { value: 'choking', label: 'Choking' }, { value: 'aggression', label: 'Aggression' }, { value: 'property_damage', label: 'Property damage' }, { value: 'near_miss', label: 'Near miss' }, { value: 'other', label: 'Other' }]} placeholder="Select type" />
      <Input label="Location" required value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bedroom, bathroom, lounge..." />
      <div><label className="label">Full description *</label><textarea required className="input" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe exactly what happened..." /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="inj" checked={form.injuries} onChange={e => set('injuries', e.target.checked)} className="rounded" />
        <label htmlFor="inj" className="text-sm text-slate-700 font-medium">Injuries sustained</label>
      </div>
      {form.injuries && <div><label className="label">Injury details</label><textarea className="input" rows={2} value={form.injuryDetails} onChange={e => set('injuryDetails', e.target.value)} /></div>}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="med" checked={form.medicalNeeded} onChange={e => set('medicalNeeded', e.target.checked)} className="rounded" />
        <label htmlFor="med" className="text-sm text-slate-700 font-medium">Medical attention required</label>
      </div>
      {form.medicalNeeded && <Input label="Medical attention details" value={form.medicalDetails} onChange={e => set('medicalDetails', e.target.value)} placeholder="Who attended, when..." />}
      <Input label="Witnesses (if any)" value={form.witnesses} onChange={e => set('witnesses', e.target.value)} placeholder="Names of any witnesses..." />
      <div><label className="label">Immediate action taken *</label><textarea required className="input" rows={3} value={form.immediateAction} onChange={e => set('immediateAction', e.target.value)} placeholder="What did you do immediately after..." /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="safe" checked={form.safeguardingRef} onChange={e => set('safeguardingRef', e.target.checked)} className="rounded" />
        <label htmlFor="safe" className="text-sm text-slate-700 font-medium">Safeguarding referral required</label>
      </div>
      <Button type="submit" loading={loading} className="w-full">Submit incident record</Button>
    </form>
  )
}
