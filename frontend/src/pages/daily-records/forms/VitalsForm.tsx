import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import api from '../../../api'
import { Button, Input, Select } from '../../../components/ui'

type VitalType = 'bp' | 'temp' | 'oxygen' | 'weight'

export default function VitalsForm({ type, suId, onSaved }: { type: VitalType; suId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  // MUST score fields
  const [mustBmiScore, setMustBmiScore] = useState<number | null>(null)
  const [mustWeightLossScore, setMustWeightLossScore] = useState<number | null>(null)
  const [mustAcuteScore, setMustAcuteScore] = useState<number | null>(null)
  const [savingMust, setSavingMust] = useState(false)

  const mustTotal = (mustBmiScore ?? 0) + (mustWeightLossScore ?? 0) + (mustAcuteScore ?? 0)
  const mustRisk = mustTotal === 0 ? { label: 'Low Risk', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' } : mustTotal === 1 ? { label: 'Medium Risk', color: 'text-amber-700 bg-amber-50 border-amber-200' } : { label: 'High Risk', color: 'text-rose-700 bg-rose-50 border-rose-200' }

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

  const saveMust = async () => {
    if (mustBmiScore === null || mustWeightLossScore === null || mustAcuteScore === null) {
      alert('Please complete all three MUST steps first')
      return
    }
    setSavingMust(true)
    try {
      await api.post('/reviews/must', {
        suId,
        weightKg: form.weightKg || null,
        heightCm: form.heightCm || null,
        bmiScore: mustBmiScore,
        weightLossScore: mustWeightLossScore,
        acuteDiseaseScore: mustAcuteScore,
      })
      onSaved()
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setSavingMust(false) }
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const calcBMI = () => {
    if (form.weightKg && form.heightCm) {
      return (parseFloat(form.weightKg) / Math.pow(parseFloat(form.heightCm) / 100, 2)).toFixed(1)
    }
    return null
  }

  const bmi = calcBMI()
  const bmiNum = bmi ? parseFloat(bmi) : null

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
        {(form.systolic > 180 || form.systolic < 90 || form.diastolic > 110 || form.diastolic < 60) ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ Reading is outside safe range — this record will be flagged</div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">Save reading</Button>
      </>)}

      {type === 'temp' && (<>
        <Input label="Temperature (°C)" type="number" step="0.1" required value={form.tempCelsius || ''} onChange={e => set('tempCelsius', parseFloat(e.target.value))} placeholder="36.5" />
        <Select label="Method" value={form.tempMethod || ''} onChange={e => set('tempMethod', e.target.value)}
          options={[{ value: 'ear', label: 'Ear' }, { value: 'forehead', label: 'Forehead' }, { value: 'oral', label: 'Oral' }, { value: 'axillary', label: 'Axillary' }]} placeholder="Select method" />
        {form.tempCelsius && (form.tempCelsius < 35.0 || form.tempCelsius > 37.5) ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ Temperature outside safe range (35.0–37.5°C)</div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">Save reading</Button>
      </>)}

      {type === 'oxygen' && (<>
        <Input label="SpO2 (%)" type="number" required value={form.spo2Percent || ''} onChange={e => set('spo2Percent', parseInt(e.target.value))} placeholder="98" hint="Normal range: 94–100%" />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="supO2" checked={form.supplementalO2 || false} onChange={e => set('supplementalO2', e.target.checked)} className="rounded" />
          <label htmlFor="supO2" className="text-sm text-slate-700">Supplemental oxygen in use</label>
        </div>
        {form.supplementalO2 && <Input label="Litres per minute" type="number" step="0.5" value={form.o2LitresMin || ''} onChange={e => set('o2LitresMin', parseFloat(e.target.value))} />}
        {form.spo2Percent && form.spo2Percent < 94 ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ SpO2 below 94% — this record will be flagged</div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">Save reading</Button>
      </>)}

      {type === 'weight' && (<>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Weight (kg)" type="number" step="0.1" required value={form.weightKg || ''} onChange={e => set('weightKg', parseFloat(e.target.value))} placeholder="65.0" />
          <Input label="Height (cm)" type="number" step="0.1" value={form.heightCm || ''} onChange={e => set('heightCm', parseFloat(e.target.value))} placeholder="165" hint="Leave blank if unchanged" />
        </div>
        {bmi && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-700">BMI: {bmi}</p>
            <p className="text-xs text-blue-500 mt-0.5">
              {bmiNum! < 18.5 ? 'Underweight' : bmiNum! < 25 ? 'Healthy weight' : bmiNum! < 30 ? 'Overweight' : 'Obese'}
            </p>
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">Save weight reading</Button>

        {/* MUST Score Calculator */}
        <div className="border-t border-slate-200 pt-4 mt-2">
          <h4 className="font-semibold text-slate-800 mb-1 text-sm">MUST Score Calculator</h4>
          <p className="text-xs text-slate-400 mb-4">Malnutrition Universal Screening Tool — complete all 3 steps</p>

          {/* Step 1 — BMI */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Step 1 — BMI score</p>
            <div className="space-y-1.5">
              {[
                { score: 0, label: 'BMI > 20 — Score 0' },
                { score: 1, label: 'BMI 18.5–20 — Score 1' },
                { score: 2, label: 'BMI < 18.5 — Score 2' },
              ].map(opt => (
                <label key={opt.score} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mustBmiScore === opt.score ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mustBmi" value={opt.score} checked={mustBmiScore === opt.score} onChange={() => setMustBmiScore(opt.score)} className="text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2 — Weight loss */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Step 2 — Unplanned weight loss in past 3–6 months</p>
            <div className="space-y-1.5">
              {[
                { score: 0, label: 'Less than 5% — Score 0' },
                { score: 1, label: '5–10% — Score 1' },
                { score: 2, label: 'More than 10% — Score 2' },
              ].map(opt => (
                <label key={opt.score} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mustWeightLossScore === opt.score ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mustWl" value={opt.score} checked={mustWeightLossScore === opt.score} onChange={() => setMustWeightLossScore(opt.score)} className="text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Step 3 — Acute disease */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Step 3 — Acute disease effect</p>
            <div className="space-y-1.5">
              {[
                { score: 0, label: 'Not applicable — Score 0' },
                { score: 2, label: 'Acutely ill and no nutritional intake for >5 days — Score 2' },
              ].map(opt => (
                <label key={opt.score} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mustAcuteScore === opt.score ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mustAcute" value={opt.score} checked={mustAcuteScore === opt.score} onChange={() => setMustAcuteScore(opt.score)} className="text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* MUST result */}
          {mustBmiScore !== null && mustWeightLossScore !== null && mustAcuteScore !== null && (
            <div className={`p-4 rounded-xl border-2 mb-3 ${mustRisk.color}`}>
              <p className="font-bold text-lg">MUST Score: {mustTotal}</p>
              <p className="font-semibold">{mustRisk.label}</p>
              <p className="text-xs mt-1 opacity-75">
                {mustTotal === 0 ? 'Routine clinical care. Repeat screening: hospital weekly, care home monthly.' :
                 mustTotal === 1 ? 'Observe. Document dietary intake for 3 days. If adequate, little concern. If inadequate, follow local policy.' :
                 'Treat. Refer to dietitian, nutritional support team or implement local policy.'}
              </p>
            </div>
          )}

          <Button type="button" variant="outline" loading={savingMust} onClick={saveMust} className="w-full">
            Save MUST score
          </Button>
        </div>
      </>)}
    </form>
  )
}
