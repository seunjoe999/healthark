import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Scale, Save, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Printer } from 'lucide-react'

// MUST — Malnutrition Universal Screening Tool (BAPEN)
// Three-step process: BMI score + weight loss score + acute disease effect score

function calcBMI(height: number, weight: number) {
  if (!height || !weight) return 0
  const h = height / 100
  return Math.round((weight / (h * h)) * 10) / 10
}

function getBMIScore(bmi: number): number {
  if (bmi > 20) return 0
  if (bmi >= 18.5) return 1
  return 2
}

function getWeightLossScore(pct: number): number {
  if (pct < 5) return 0
  if (pct <= 10) return 1
  return 2
}

function getRiskLevel(total: number) {
  if (total === 0) return { label: 'Low Risk', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', guidance: 'Routine clinical care. Repeat screening: hospital — weekly, care home — monthly, community — annually for special groups.' }
  if (total === 1) return { label: 'Medium Risk', color: '#d97706', bg: '#fffbeb', border: '#fde68a', guidance: 'Observe. Record dietary intake for 3 days in hospital or care home. If adequate — little concern; if inadequate, refer to dietitian. Repeat screening: hospital — weekly, care home — at least monthly.' }
  return { label: 'High Risk', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', guidance: 'Treat: refer to dietitian / implement local nutritional support protocol. Set nutritional goals, monitor and review weekly (hospital), monthly (care home). Unless detrimental or no benefit expected.' }
}

const BMI_OPTIONS = [
  { label: '>20 (>30 = obese)', score: 0, value: 'above20' },
  { label: '18.5–20', score: 1, value: '18.5-20' },
  { label: '<18.5', score: 2, value: 'below18.5' },
]

const WLOSS_OPTIONS = [
  { label: '<5%', score: 0, value: 'lt5' },
  { label: '5–10%', score: 1, value: '5-10' },
  { label: '>10%', score: 2, value: 'gt10' },
]

export default function MUSTScore() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [resident, setResident] = useState<any>(null)

  // Step 1 — BMI
  const [useCalc, setUseCalc] = useState(true)
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [bmiOverride, setBmiOverride] = useState<string>('')

  // Step 2 — Weight loss
  const [wloss, setWloss] = useState<string>('')

  // Step 3 — Acute disease
  const [acuteDisease, setAcuteDisease] = useState<boolean | null>(null)

  // Notes and saving
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' })
      .then(r => setResidents(r.data.data || []))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    const su = residents.find(r => r.id === selectedSu)
    setResident(su || null)
    if (su?.height_cm) setHeightCm(String(su.height_cm))
    if (su?.weight_kg) setWeightKg(String(su.weight_kg))
    setLoading(true)
    api.get(`/assessments/must/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu, residents])

  // Derived
  const bmi = useCalc && heightCm && weightKg ? calcBMI(parseFloat(heightCm), parseFloat(weightKg)) : null
  const bmiScore = useCalc && bmi ? getBMIScore(bmi) : bmiOverride !== '' ? parseInt(bmiOverride.split(':')[0]) : null
  const wlossScore = wloss !== '' ? getWeightLossScore(wloss === 'lt5' ? 0 : wloss === '5-10' ? 7 : 15) : null
  const acuteScore = acuteDisease ? 2 : acuteDisease === false ? 0 : null

  const allSet = bmiScore !== null && wlossScore !== null && acuteScore !== null
  const totalScore = allSet ? bmiScore! + wlossScore! + acuteScore! : 0
  const risk = getRiskLevel(totalScore)

  const save = async () => {
    if (!selectedSu || !allSet) return
    setSaving(true)
    try {
      await api.post('/assessments/must', {
        suId: selectedSu,
        homeId: user?.homeId,
        bmiScore,
        bmi: bmi || null,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        weightLossScore: wlossScore,
        acuteDiseaseScore: acuteScore,
        totalScore,
        riskLevel: risk.label,
        notes,
        assessedBy: user?.id,
      })
      toast.success('MUST Score saved')
      const r = await api.get(`/assessments/must/${selectedSu}`)
      setHistory(r.data.data || [])
      setBmiOverride('')
      setWloss('')
      setAcuteDisease(null)
      setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            MUST — Malnutrition Screening
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Malnutrition Universal Screening Tool (BAPEN) — identifies adults at risk of malnutrition
          </p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Resident selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
        <select className="input w-full max-w-xs" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
          <option value="">— Select resident —</option>
          {residents.map(r => (
            <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
          ))}
        </select>
      </div>

      {selectedSu && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">New Assessment — {format(new Date(), 'd MMMM yyyy')}</h2>
            </div>

            {/* Step 1 – BMI */}
            <div className="px-5 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                <h3 className="font-semibold text-slate-800">BMI Score</h3>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setUseCalc(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${useCalc ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  Calculate from measurements
                </button>
                <button onClick={() => setUseCalc(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!useCalc ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  Select category directly
                </button>
              </div>

              {useCalc ? (
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Height (cm)</label>
                    <input type="number" className="input w-full" placeholder="e.g. 165"
                      value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Weight (kg)</label>
                    <input type="number" className="input w-full" placeholder="e.g. 62"
                      value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  {BMI_OPTIONS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        bmiOverride === `${opt.score}:${opt.value}` ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                      }`}>
                      <input type="radio" checked={bmiOverride === `${opt.score}:${opt.value}`}
                        onChange={() => setBmiOverride(`${opt.score}:${opt.value}`)}
                        className="accent-blue-600" />
                      <span className="text-sm text-slate-700">BMI {opt.label}</span>
                      <span className="ml-auto text-xs font-bold text-blue-600">{opt.score} pts</span>
                    </label>
                  ))}
                </div>
              )}

              {bmi !== null && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-600">Calculated BMI:</span>
                  <span className="text-lg font-black text-slate-900">{bmi}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                    background: bmiScore === 0 ? '#f0fdf4' : bmiScore === 1 ? '#fffbeb' : '#fef2f2',
                    color: bmiScore === 0 ? '#16a34a' : bmiScore === 1 ? '#d97706' : '#b91c1c',
                  }}>
                    Score: {bmiScore} pts
                  </span>
                </div>
              )}
            </div>

            {/* Step 2 – Weight loss */}
            <div className="px-5 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                <h3 className="font-semibold text-slate-800">Unplanned Weight Loss (last 3–6 months)</h3>
              </div>
              <div className="space-y-2">
                {WLOSS_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      wloss === opt.value ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                    }`}>
                    <input type="radio" checked={wloss === opt.value}
                      onChange={() => setWloss(opt.value)}
                      className="accent-blue-600" />
                    <span className="text-sm text-slate-700">Weight loss {opt.label}</span>
                    <span className="ml-auto text-xs font-bold text-blue-600">{opt.score} pts</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 3 – Acute disease */}
            <div className="px-5 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                <h3 className="font-semibold text-slate-800">Acute Disease Effect</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Is the patient acutely ill and has there been, or is there likely to be, no nutritional intake for &gt;5 days?
              </p>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  acuteDisease === true ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-300'
                }`}>
                  <input type="radio" checked={acuteDisease === true}
                    onChange={() => setAcuteDisease(true)}
                    className="accent-red-500" />
                  <span className="text-sm text-slate-700">Yes</span>
                  <span className="text-xs font-bold text-red-600">+2 pts</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  acuteDisease === false ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 hover:border-slate-300'
                }`}>
                  <input type="radio" checked={acuteDisease === false}
                    onChange={() => setAcuteDisease(false)}
                    className="accent-emerald-500" />
                  <span className="text-sm text-slate-700">No</span>
                  <span className="text-xs font-bold text-emerald-600">+0 pts</span>
                </label>
              </div>
            </div>

            {/* Score result */}
            {allSet && (
              <div className="mx-5 my-4 rounded-2xl p-4 border-2" style={{ background: risk.bg, borderColor: risk.border }}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: risk.color, background: 'white' }}>
                    <span className="text-xl font-black" style={{ color: risk.color }}>{totalScore}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: risk.color }}>
                      MUST Score: {totalScore}
                    </p>
                    <p className="font-bold text-lg" style={{ color: risk.color }}>{risk.label}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{risk.guidance}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-slate-500">
                  <span>BMI score: <strong style={{ color: risk.color }}>{bmiScore}</strong></span>
                  <span>Weight loss score: <strong style={{ color: risk.color }}>{wlossScore}</strong></span>
                  <span>Acute disease: <strong style={{ color: risk.color }}>{acuteScore}</strong></span>
                </div>
              </div>
            )}

            {/* Notes and save */}
            <div className="px-5 pb-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Notes</label>
                <textarea className="input w-full" rows={3}
                  placeholder="Dietary intake observations, referral actions, follow-up plan..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!allSet}>
                  Save MUST Score
                </Button>
              </div>
            </div>
          </div>

          {/* History */}
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : history.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Previous MUST Scores</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {history.map((h: any) => {
                  const hr = getRiskLevel(h.total_score)
                  return (
                    <div key={h.id}>
                      <button
                        onClick={() => setExpandedHistory(expandedHistory === h.id ? null : h.id)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 text-left transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white"
                            style={{ borderColor: hr.color }}>
                            <span className="text-xs font-black" style={{ color: hr.color }}>{h.total_score}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Score {h.total_score} — <span style={{ color: hr.color }}>{hr.label}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {h.assessed_at ? format(new Date(h.assessed_at), 'd MMM yyyy') : ''}
                              {h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}
                              {h.bmi ? ` · BMI ${h.bmi}` : ''}
                            </p>
                          </div>
                        </div>
                        {expandedHistory === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {expandedHistory === h.id && h.notes && (
                        <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                          <p className="text-xs text-slate-600 mt-3 italic">{h.notes}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No previous MUST scores for this resident</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
