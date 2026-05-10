import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Input, Select } from '../../../components/ui'

type VitalType = 'bp' | 'temp' | 'oxygen' | 'weight'

export default function VitalsForm({ type, suId, onSaved }: { type: VitalType; suId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const recordType = `vitals_${type}`
      await dailyRecordsApi.create({ suId, recordType, ...form })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed to save') }
    finally { setLoading(false) }
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={save} className="space-y-4">
      {type === 'bp' && (<>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Systolic (mmHg)" type="number" required value={form.systolic || ''} onChange={e => set('systolic', parseInt(e.target.value))} placeholder="120" />
          <Input label="Diastolic (mmHg)" type="number" required value={form.diastolic || ''} onChange={e => set('diastolic', parseInt(e.target.value))} placeholder="80" />
          <Input label="Pulse (bpm)" type="number" value={form.pulse || ''} onChange={e => set('pulse', parseInt(e.target.value))} placeholder="72" />
        </div>
        <Select label="Position" value={form.bpPosition || ''} onChange={e => set('bpPosition', e.target.value)}
          options={[{ value: 'sitting', label: 'Sitting' }, { value: 'standing', label: 'Standing' }, { value: 'lying', label: 'Lying' }]} placeholder="Select position" />
        {form.systolic > 180 || form.systolic < 90 || form.diastolic > 110 || form.diastolic < 60 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ Reading is outside safe range — this record will be flagged</div>
        ) : null}
      </>)}

      {type === 'temp' && (<>
        <Input label="Temperature (°C)" type="number" step="0.1" required value={form.tempCelsius || ''} onChange={e => set('tempCelsius', parseFloat(e.target.value))} placeholder="36.5" />
        <Select label="Method" value={form.tempMethod || ''} onChange={e => set('tempMethod', e.target.value)}
          options={[{ value: 'ear', label: 'Ear' }, { value: 'forehead', label: 'Forehead' }, { value: 'oral', label: 'Oral' }, { value: 'axillary', label: 'Axillary' }]} placeholder="Select method" />
        {form.tempCelsius && (form.tempCelsius < 35.0 || form.tempCelsius > 37.5) ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ Temperature outside safe range (35.0–37.5°C) — this record will be flagged</div>
        ) : null}
      </>)}

      {type === 'oxygen' && (<>
        <Input label="SpO2 (%)" type="number" required value={form.spo2Percent || ''} onChange={e => set('spo2Percent', parseInt(e.target.value))} placeholder="98" hint="Normal range: 94–100%" />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="supO2" checked={form.supplementalO2 || false} onChange={e => set('supplementalO2', e.target.checked)} className="rounded" />
          <label htmlFor="supO2" className="text-sm text-gray-700">Supplemental oxygen in use</label>
        </div>
        {form.supplementalO2 && <Input label="Litres per minute" type="number" step="0.5" value={form.o2LitresMin || ''} onChange={e => set('o2LitresMin', parseFloat(e.target.value))} placeholder="2" />}
        {form.spo2Percent && form.spo2Percent < 94 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ SpO2 below 94% — this record will be flagged</div>
        ) : null}
      </>)}

      {type === 'weight' && (<>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Weight (kg)" type="number" step="0.1" required value={form.weightKg || ''} onChange={e => set('weightKg', parseFloat(e.target.value))} placeholder="65.0" />
          <Input label="Height (cm)" type="number" step="0.1" value={form.heightCm || ''} onChange={e => set('heightCm', parseFloat(e.target.value))} placeholder="165" hint="Leave blank if unchanged" />
        </div>
        {form.weightKg && form.heightCm && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-700">
              BMI: {Math.round(form.weightKg / Math.pow(form.heightCm / 100, 2) * 10) / 10}
            </p>
          </div>
        )}
      </>)}

      <Button type="submit" loading={loading} className="w-full">Save reading</Button>
    </form>
  )
}
