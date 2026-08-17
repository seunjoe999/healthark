import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Activity, Save, ChevronDown, ChevronUp, AlertTriangle, Printer, TrendingUp } from 'lucide-react'
import { buildLetterheadPage, openLetterheadPrint, fmtDate as fmtLetterDate, nl as letterNl } from '../../utils/letterheadPrint'

// ── NEWS2 scoring ──────────────────────────────────────────────────
function scoreRR(v: number) {
  if (v <= 8) return 3; if (v <= 11) return 1; if (v <= 20) return 0; if (v <= 24) return 2; return 3
}
function scoreSpO2(v: number) {
  if (v <= 91) return 3; if (v <= 93) return 2; if (v <= 95) return 1; return 0
}
function scoreSBP(v: number) {
  if (v <= 90) return 3; if (v <= 100) return 2; if (v <= 110) return 1; if (v <= 219) return 0; return 3
}
function scorePulse(v: number) {
  if (v <= 40) return 3; if (v <= 50) return 1; if (v <= 90) return 0; if (v <= 110) return 1; if (v <= 130) return 2; return 3
}
function scoreTemp(v: number) {
  if (v <= 35.0) return 3; if (v <= 36.0) return 1; if (v <= 38.0) return 0; if (v <= 39.0) return 1; return 2
}

function getClinicalResponse(total: number, hasParameterScore3: boolean) {
  if (total >= 7) return {
    level: 'HIGH', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca',
    badge: 'Emergency',
    response: 'Continuous monitoring required. Immediate emergency assessment by clinical team. Consider transfer to acute care / ICU.',
  }
  if (total >= 5 || hasParameterScore3) return {
    level: 'MEDIUM', color: '#92400e', bg: '#fffbeb', border: '#fde68a',
    badge: 'Urgent Review',
    response: 'Minimum hourly monitoring. Urgent review by registered nurse. Inform ward-based clinical team. Consider escalation.',
  }
  if (total >= 1) return {
    level: 'LOW', color: '#1e3a5f', bg: '#eff6ff', border: '#bfdbfe',
    badge: 'Increased Monitoring',
    response: 'Minimum 4–6 hourly monitoring. Inform registered nurse who must assess. Nurse to decide if escalation required.',
  }
  return {
    level: 'MINIMUM', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0',
    badge: 'Routine',
    response: 'Minimum 12-hourly monitoring. Continue routine NEWS2 assessment.',
  }
}

const PARAM_COLOR = (s: number) => s === 0 ? '#166534' : s === 1 ? '#d97706' : s === 2 ? '#ea580c' : '#b91c1c'
const PARAM_BG = (s: number) => s === 0 ? '#f0fdf4' : s === 1 ? '#fffbeb' : s === 2 ? '#fff7ed' : '#fef2f2'

function ScoreChip({ score }: { score: number }) {
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ml-auto flex-shrink-0"
      style={{ background: PARAM_BG(score), color: PARAM_COLOR(score) }}>
      {score}
    </span>
  )
}

export default function NEWS2Score() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  // Vital sign inputs
  const [rr, setRr] = useState('')         // Respiration rate
  const [spo2, setSpo2] = useState('')     // SpO2 %
  const [onO2, setOnO2] = useState<boolean | null>(null)  // supplemental O2
  const [sbp, setSbp] = useState('')       // Systolic BP
  const [pulse, setPulse] = useState('')   // Pulse
  const [avpu, setAvpu] = useState<string>('')  // Alert/Voice/Pain/Unresponsive
  const [temp, setTemp] = useState('')     // Temperature
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/assessments/news2/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  // Scores
  const rrV = parseFloat(rr); const rrScore = !isNaN(rrV) ? scoreRR(rrV) : null
  const spo2V = parseFloat(spo2); const spo2Score = !isNaN(spo2V) ? scoreSpO2(spo2V) : null
  const o2Score = onO2 === true ? 2 : onO2 === false ? 0 : null
  const sbpV = parseFloat(sbp); const sbpScore = !isNaN(sbpV) ? scoreSBP(sbpV) : null
  const pulseV = parseFloat(pulse); const pulseScore = !isNaN(pulseV) ? scorePulse(pulseV) : null
  const avpuScore = avpu === 'A' ? 0 : avpu ? 3 : null
  const tempV = parseFloat(temp); const tempScore = !isNaN(tempV) ? scoreTemp(tempV) : null

  const allSet = [rrScore, spo2Score, o2Score, sbpScore, pulseScore, avpuScore, tempScore].every(s => s !== null)
  const params = [rrScore, spo2Score, o2Score, sbpScore, pulseScore, avpuScore, tempScore].filter(s => s !== null) as number[]
  const totalScore = params.reduce((a, b) => a + b, 0)
  const hasParam3 = params.some(s => s >= 3)
  const response = allSet ? getClinicalResponse(totalScore, hasParam3) : null

  const reset = () => { setRr(''); setSpo2(''); setOnO2(null); setSbp(''); setPulse(''); setAvpu(''); setTemp(''); setNotes('') }

  const save = async () => {
    if (!selectedSu || !allSet) return
    setSaving(true)
    try {
      await api.post('/assessments/news2', {
        suId: selectedSu, homeId: user?.homeId,
        respirationRate: rrV, spo2: spo2V, supplementalO2: onO2,
        systolicBp: sbpV, pulse: pulseV, avpu, temperature: tempV,
        rrScore, spo2Score, o2Score, sbpScore, pulseScore, avpuScore, tempScore,
        totalScore, responseLevel: response?.level, notes,
        assessedBy: user?.id,
      })
      toast.success('NEWS2 Score saved')
      const r = await api.get(`/assessments/news2/${selectedSu}`)
      setHistory(r.data.data || [])
      reset()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const resident = residents.find(r => r.id === selectedSu)

  const printCurrent = () => {
    const h = history[0]
    if (!h) { toast.error('No saved NEWS2 assessment to print yet'); return }
    const su = residents.find(r => r.id === selectedSu)
    const residentName = su ? `${su.first_name} ${su.last_name}` : ''
    const hr = getClinicalResponse(h.total_score, [h.rr_score, h.spo2_score, h.o2_score, h.sbp_score, h.pulse_score, h.avpu_score, h.temp_score].some((s: number) => s >= 3))
    const page = buildLetterheadPage({
      docTitle: 'NEWS2 Score',
      docSubtitle: 'National Early Warning Score 2 — Royal College of Physicians',
      docRefPrefix: 'NEWS2', docRefId: h.id, residentName,
      sections: [
        {
          title: 'Risk Summary',
          inner: `
            <div class="risk-box"><span class="rb-label">Clinical Risk</span><span class="rb-value">${hr.badge}</span></div>
            <table class="fields">
              <tr><th>Total Score</th><td>${h.total_score}</td></tr>
              <tr><th>Assessed</th><td>${fmtLetterDate(h.created_at)}</td></tr>
            </table>`,
        },
        {
          title: 'Vital Signs',
          inner: `<table class="fields">
            <tr><th>Respiration Rate</th><td>${h.respiration_rate} (score ${h.rr_score})</td></tr>
            <tr><th>SpO2</th><td>${h.spo2}% (score ${h.spo2_score})</td></tr>
            <tr><th>Supplemental O2</th><td>${h.supplemental_o2 ? 'Yes' : 'No'} (score ${h.o2_score})</td></tr>
            <tr><th>Systolic BP</th><td>${h.systolic_bp} (score ${h.sbp_score})</td></tr>
            <tr><th>Pulse</th><td>${h.pulse} (score ${h.pulse_score})</td></tr>
            <tr><th>AVPU</th><td>${h.avpu} (score ${h.avpu_score})</td></tr>
            <tr><th>Temperature</th><td>${h.temperature}°C (score ${h.temp_score})</td></tr>
          </table>`,
        },
        { title: 'Clinical Response', inner: `<p class="body-text">${letterNl(hr.response)}</p>` },
        ...(h.notes ? [{ title: 'Notes', inner: `<p class="body-text">${letterNl(h.notes)}</p>` }] : []),
      ],
    })
    if (!openLetterheadPrint('NEWS2 Score', page)) toast.error('Pop-up blocked — please allow pop-ups for this site and try again')
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-red-600" />
            NEWS2 Score
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">National Early Warning Score 2 — Royal College of Physicians</p>
        </div>
        <button onClick={printCurrent} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Resident selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
        <select className="input w-full max-w-xs" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
          <option value="">— Select resident —</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
      </div>

      {selectedSu && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                New Assessment — {format(new Date(), 'd MMMM yyyy, HH:mm')}
                {resident && <span className="text-slate-400 font-normal ml-2">· {resident.first_name} {resident.last_name}</span>}
              </h2>
            </div>

            <div className="divide-y divide-slate-50">
              {/* Respiration Rate */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Respiration Rate <span className="text-slate-400 font-normal">(breaths/min)</span></label>
                  <div className="text-xs text-slate-400">Normal: 12–20</div>
                </div>
                <input type="number" className="input w-24 text-center" placeholder="e.g. 18" value={rr} onChange={e => setRr(e.target.value)} />
                {rrScore !== null && <ScoreChip score={rrScore} />}
              </div>

              {/* SpO2 */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Oxygen Saturation <span className="text-slate-400 font-normal">(SpO2 %)</span></label>
                  <div className="text-xs text-slate-400">Normal: ≥96%</div>
                </div>
                <input type="number" className="input w-24 text-center" placeholder="e.g. 98" value={spo2} onChange={e => setSpo2(e.target.value)} />
                {spo2Score !== null && <ScoreChip score={spo2Score} />}
              </div>

              {/* Supplemental O2 */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Supplemental Oxygen</label>
                  <div className="text-xs text-slate-400">Is the patient receiving supplemental oxygen?</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setOnO2(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${onO2 === true ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                    Yes (+2)
                  </button>
                  <button onClick={() => setOnO2(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${onO2 === false ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                    No (0)
                  </button>
                </div>
                {o2Score !== null && <ScoreChip score={o2Score} />}
              </div>

              {/* Systolic BP */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Systolic Blood Pressure <span className="text-slate-400 font-normal">(mmHg)</span></label>
                  <div className="text-xs text-slate-400">Normal: 111–219</div>
                </div>
                <input type="number" className="input w-24 text-center" placeholder="e.g. 120" value={sbp} onChange={e => setSbp(e.target.value)} />
                {sbpScore !== null && <ScoreChip score={sbpScore} />}
              </div>

              {/* Pulse */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Pulse Rate <span className="text-slate-400 font-normal">(bpm)</span></label>
                  <div className="text-xs text-slate-400">Normal: 51–90</div>
                </div>
                <input type="number" className="input w-24 text-center" placeholder="e.g. 72" value={pulse} onChange={e => setPulse(e.target.value)} />
                {pulseScore !== null && <ScoreChip score={pulseScore} />}
              </div>

              {/* AVPU / Consciousness */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Consciousness (ACVPU)</label>
                    <div className="text-xs text-slate-400">Any new confusion scores 3</div>
                  </div>
                  {avpuScore !== null && <ScoreChip score={avpuScore} />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'A', label: 'Alert', desc: 'Fully awake', pts: 0 },
                    { value: 'C', label: 'Confused', desc: 'New confusion', pts: 3 },
                    { value: 'V', label: 'Voice', desc: 'Responds to voice', pts: 3 },
                    { value: 'P', label: 'Pain', desc: 'Responds to pain', pts: 3 },
                    { value: 'U', label: 'Unresponsive', desc: 'No response', pts: 3 },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        avpu === opt.value ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                      }`}>
                      <input type="radio" checked={avpu === opt.value} onChange={() => setAvpu(opt.value)} className="accent-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </div>
                      <span className="ml-auto text-xs font-bold" style={{ color: opt.pts === 0 ? '#166534' : '#b91c1c' }}>{opt.pts} pts</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Temperature <span className="text-slate-400 font-normal">(°C)</span></label>
                  <div className="text-xs text-slate-400">Normal: 36.1–38.0°C</div>
                </div>
                <input type="number" step="0.1" className="input w-24 text-center" placeholder="e.g. 37.2" value={temp} onChange={e => setTemp(e.target.value)} />
                {tempScore !== null && <ScoreChip score={tempScore} />}
              </div>
            </div>

            {/* Result */}
            {allSet && response && (
              <div className="mx-5 my-4 rounded-2xl p-5 border-2" style={{ background: response.bg, borderColor: response.border }}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0 bg-white"
                    style={{ borderColor: response.color }}>
                    <span className="text-xl font-black" style={{ color: response.color }}>{totalScore}</span>
                    <span className="text-[10px] font-semibold opacity-60" style={{ color: response.color }}>NEWS2</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: response.color }}>{response.level} RISK</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: response.color }}>{response.badge}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{response.response}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-xs text-slate-500">
                  {[
                    { l: 'RR', v: rrScore }, { l: 'SpO2', v: spo2Score }, { l: 'O2', v: o2Score },
                    { l: 'SBP', v: sbpScore }, { l: 'Pulse', v: pulseScore }, { l: 'AVPU', v: avpuScore }, { l: 'Temp', v: tempScore }
                  ].map(p => (
                    <span key={p.l}>{p.l}: <strong style={{ color: PARAM_COLOR(p.v!) }}>{p.v}</strong></span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes + Save */}
            <div className="px-5 pb-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Clinical Notes / Actions Taken</label>
                <textarea className="input w-full" rows={3}
                  placeholder="Escalation actions, observations, clinical review outcome..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={reset} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white">Reset</button>
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!allSet}>Save NEWS2</Button>
              </div>
            </div>
          </div>

          {/* History */}
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : history.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">NEWS2 History</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {history.map((h: any) => {
                  const hr = getClinicalResponse(h.total_score, false)
                  return (
                    <div key={h.id}>
                      <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white flex-shrink-0"
                            style={{ borderColor: hr.color }}>
                            <span className="text-sm font-black" style={{ color: hr.color }}>{h.total_score}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Score {h.total_score} — <span style={{ color: hr.color }}>{hr.badge}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {h.assessed_at ? format(new Date(h.assessed_at), 'd MMM yyyy, HH:mm') : ''}
                              {h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex gap-2 text-xs text-slate-500">
                            {h.respiration_rate && <span>RR:{h.respiration_rate}</span>}
                            {h.spo2 && <span>SpO2:{h.spo2}%</span>}
                            {h.temperature && <span>T:{h.temperature}°C</span>}
                          </div>
                          {expanded === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>
                      {expanded === h.id && (
                        <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-3 mb-2">
                            {[
                              { l: 'RR', v: h.respiration_rate, s: h.rr_score },
                              { l: 'SpO2', v: h.spo2 ? `${h.spo2}%` : '—', s: h.spo2_score },
                              { l: 'O2', v: h.supplemental_o2 ? 'Yes' : 'No', s: h.o2_score },
                              { l: 'BP', v: h.systolic_bp, s: h.sbp_score },
                              { l: 'Pulse', v: h.pulse, s: h.pulse_score },
                              { l: 'AVPU', v: h.avpu, s: h.avpu_score },
                              { l: 'Temp', v: h.temperature ? `${h.temperature}°C` : '—', s: h.temp_score },
                            ].map(p => (
                              <div key={p.l} className="text-center p-2 rounded-lg bg-white border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-semibold">{p.l}</p>
                                <p className="text-sm font-bold text-slate-700">{p.v ?? '—'}</p>
                                <p className="text-xs font-black" style={{ color: PARAM_COLOR(p.s ?? 0) }}>{p.s ?? '—'}</p>
                              </div>
                            ))}
                          </div>
                          {h.notes && <p className="text-xs text-slate-600 italic mt-2">{h.notes}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No NEWS2 scores recorded for this resident</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
