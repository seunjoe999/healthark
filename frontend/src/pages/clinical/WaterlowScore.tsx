import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Shield, Save, ChevronDown, ChevronUp, Plus, Printer, RefreshCw, Clock } from 'lucide-react'
import { buildLetterheadPage, openLetterheadPrint, fmtDate as fmtLetterDate, nl as letterNl } from '../../utils/letterheadPrint'

// ── Waterlow risk interpretation ──────────────────────────────────
function getWaterlowRisk(score: number) {
  if (score >= 20) return { label: 'Very High Risk', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca', action: 'Implement full pressure care protocol. Specialist mattress/cushion required. 2-hourly repositioning. Refer to Tissue Viability Nurse.' }
  if (score >= 15) return { label: 'High Risk', color: '#92400e', bg: '#fff7ed', border: '#fed7aa', action: 'Implement pressure care protocol. Pressure-relieving mattress/cushion required. Regular repositioning. Document skin inspection at every care.' }
  if (score >= 10) return { label: 'At Risk', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', action: 'Implement preventive measures. Use pressure-relieving aids. Increase observation of skin integrity. Regular repositioning plan.' }
  return { label: 'Not at Risk', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', action: 'Continue routine skin checks. Monitor for any changes in condition.' }
}

// Waterlow scoring categories
const BUILD_OPTS = [
  { label: 'Average (BMI 20–24.9)', score: 0 },
  { label: 'Above Average (BMI 25–29.9)', score: 1 },
  { label: 'Obese (BMI ≥30)', score: 2 },
  { label: 'Below Average (BMI <20)', score: 3 },
]
const SKIN_OPTS = [
  { label: 'Healthy', score: 0 },
  { label: 'Tissue paper / Dry / Oedematous / Clammy', score: 1 },
  { label: 'Discoloured (not purple/maroon)', score: 2 },
  { label: 'Broken / Spots present', score: 3 },
]
const SEX_AGE_OPTS = [
  { label: 'Male, age 14–49', score: 1 },
  { label: 'Female, age 14–49', score: 2 },
  { label: 'Male, age 50–64', score: 2 },
  { label: 'Female, age 50–64', score: 3 },
  { label: 'Age 65–74', score: 3 },
  { label: 'Age 75–80', score: 4 },
  { label: 'Age 81+', score: 5 },
]
const MALNUT_OPTS = [
  { label: 'MUST Score 0 (Low risk)', score: 0 },
  { label: 'MUST Score 1 (Medium risk)', score: 1 },
  { label: 'MUST Score 2+ (High risk)', score: 2 },
]
const CONT_OPTS = [
  { label: 'Complete control / catheterised', score: 0 },
  { label: 'Occasional incontinence', score: 1 },
  { label: 'Catheter / incontinent of urine', score: 2 },
  { label: 'Doubly incontinent', score: 3 },
]
const MOB_OPTS = [
  { label: 'Fully mobile', score: 0 },
  { label: 'Restless / fidgety', score: 1 },
  { label: 'Apathetic', score: 2 },
  { label: 'Restricted / chairfast', score: 3 },
  { label: 'Inert / traction', score: 4 },
  { label: 'Chairbound (spinal injury)', score: 5 },
]

// Special risk factors (additive)
const TISSUE_RISKS = [
  { key: 'terminal_cachexia', label: 'Terminal cachexia', score: 8 },
  { key: 'multi_organ_failure', label: 'Multiple organ failure', score: 8 },
  { key: 'single_organ_failure', label: 'Single organ failure', score: 5 },
  { key: 'pvd', label: 'Peripheral vascular disease', score: 5 },
  { key: 'anaemia', label: 'Anaemia (Hb <8g/dl)', score: 2 },
  { key: 'smoking', label: 'Smoking', score: 1 },
]
const NEURO_RISKS = [
  { key: 'diabetes', label: 'Diabetes', score: 4 },
  { key: 'ms', label: 'Multiple sclerosis / CVA', score: 4 },
  { key: 'paraplegia', label: 'Motor / Sensory / Paraplegia', score: 6 },
]
const SURGERY_RISKS = [
  { key: 'ortho_spinal', label: 'Orthopaedic / Spinal surgery', score: 5 },
  { key: 'long_op', label: 'On table >2 hours', score: 5 },
]
const MED_RISKS = [
  { key: 'cytotoxics', label: 'Cytotoxics / High-dose steroids', score: 4 },
  { key: 'anti_inflam', label: 'Anti-inflammatory (NSAIDs)', score: 4 },
]

const POSITIONS = ['Left side', 'Right side', 'Supine (back)', 'Sitting upright', 'Semi-recumbent', 'Prone', 'Other']

export default function WaterlowScore() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'waterlow' | 'repositioning'>('waterlow')
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  // Waterlow fields
  const [build, setBuild] = useState<number | null>(null)
  const [skin, setSkin] = useState<number | null>(null)
  const [sexAge, setSexAge] = useState<number | null>(null)
  const [malnut, setMalnut] = useState<number | null>(null)
  const [cont, setCont] = useState<number | null>(null)
  const [mob, setMob] = useState<number | null>(null)
  const [tissueRisks, setTissueRisks] = useState<string[]>([])
  const [neuroRisks, setNeuroRisks] = useState<string[]>([])
  const [surgeryRisks, setSurgeryRisks] = useState<string[]>([])
  const [medRisks, setMedRisks] = useState<string[]>([])
  const [wNotes, setWNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Repositioning fields
  const [position, setPosition] = useState('')
  const [skinOk, setSkinOk] = useState<boolean | null>(null)
  const [painFree, setPainFree] = useState<boolean | null>(null)
  const [repoNotes, setRepoNotes] = useState('')
  const [repoSaving, setRepoSaving] = useState(false)

  // History
  const [waterlowHistory, setWaterlowHistory] = useState<any[]>([])
  const [repoHistory, setRepoHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    Promise.all([
      api.get(`/assessments/waterlow/${selectedSu}`).then(r => setWaterlowHistory(r.data.data || [])).catch(() => {}),
      api.get(`/assessments/repositioning/${selectedSu}`).then(r => setRepoHistory(r.data.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [selectedSu])

  const toggleRisk = (key: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(key) ? list.filter(k => k !== key) : [...list, key])
  }

  // Scoring
  const tissueScore = TISSUE_RISKS.filter(r => tissueRisks.includes(r.key)).reduce((s, r) => s + r.score, 0)
  const neuroScore = Math.min(NEURO_RISKS.filter(r => neuroRisks.includes(r.key)).reduce((s, r) => s + r.score, 0), 6)
  const surgeryScore = SURGERY_RISKS.filter(r => surgeryRisks.includes(r.key)).reduce((s, r) => s + r.score, 0)
  const medScore = MED_RISKS.filter(r => medRisks.includes(r.key)).reduce((s, r) => s + r.score, 0)

  const coreReady = [build, skin, sexAge, malnut, cont, mob].every(v => v !== null)
  const totalScore = coreReady
    ? (build! + skin! + sexAge! + malnut! + cont! + mob! + tissueScore + neuroScore + surgeryScore + medScore)
    : 0
  const risk = coreReady ? getWaterlowRisk(totalScore) : null

  const saveWaterlow = async () => {
    if (!selectedSu || !coreReady) return
    setSaving(true)
    try {
      await api.post('/assessments/waterlow', {
        suId: selectedSu, homeId: user?.homeId,
        buildScore: build, skinScore: skin, sexAgeScore: sexAge,
        malnutritionScore: malnut, continenceScore: cont, mobilityScore: mob,
        tissueRiskScore: tissueScore, neuroRiskScore: neuroScore,
        surgeryRiskScore: surgeryScore, medRiskScore: medScore,
        tissueRisks, neuroRisks, surgeryRisks, medRisks,
        totalScore, riskLevel: risk?.label, notes: wNotes,
        assessedBy: user?.id,
      })
      toast.success('Waterlow Score saved')
      const r = await api.get(`/assessments/waterlow/${selectedSu}`)
      setWaterlowHistory(r.data.data || [])
      setBuild(null); setSkin(null); setSexAge(null); setMalnut(null); setCont(null); setMob(null)
      setTissueRisks([]); setNeuroRisks([]); setSurgeryRisks([]); setMedRisks([]); setWNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const saveRepo = async () => {
    if (!selectedSu || !position || skinOk === null || painFree === null) return
    setRepoSaving(true)
    try {
      await api.post('/assessments/repositioning', {
        suId: selectedSu, homeId: user?.homeId,
        position, skinIntegrityOk: skinOk, painFree, notes: repoNotes,
        staffId: user?.id,
      })
      toast.success('Repositioning logged')
      const r = await api.get(`/assessments/repositioning/${selectedSu}`)
      setRepoHistory(r.data.data || [])
      setPosition(''); setSkinOk(null); setPainFree(null); setRepoNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to log')
    } finally { setRepoSaving(false) }
  }

  const residentName = residents.find(r => r.id === selectedSu)
    ? `${residents.find(r => r.id === selectedSu)!.first_name} ${residents.find(r => r.id === selectedSu)!.last_name}` : ''

  const printCurrent = () => {
    if (tab === 'waterlow') {
      const h = waterlowHistory[0]
      if (!h) { toast.error('No saved Waterlow assessment to print yet'); return }
      const hr = getWaterlowRisk(h.total_score)
      const page = buildLetterheadPage({
        docTitle: 'Waterlow Score & Repositioning',
        docSubtitle: 'Pressure Ulcer Risk Assessment',
        docRefPrefix: 'WL', docRefId: h.id, residentName,
        sections: [
          {
            title: 'Risk Summary',
            inner: `
              <div class="risk-box"><span class="rb-label">Overall Risk</span><span class="rb-value">${hr.label}</span></div>
              <table class="fields">
                <tr><th>Total Score</th><td>${h.total_score}</td></tr>
                <tr><th>Assessed</th><td>${fmtLetterDate(h.created_at)}</td></tr>
              </table>`,
          },
          {
            title: 'Score Breakdown',
            inner: `<table class="fields">
              <tr><th>Build</th><td>${h.build_score}</td></tr>
              <tr><th>Skin</th><td>${h.skin_score}</td></tr>
              <tr><th>Sex/Age</th><td>${h.sex_age_score}</td></tr>
              <tr><th>Malnutrition</th><td>${h.malnutrition_score}</td></tr>
              <tr><th>Continence</th><td>${h.continence_score}</td></tr>
              <tr><th>Mobility</th><td>${h.mobility_score}</td></tr>
              <tr><th>Special Risk Factors</th><td>${(h.tissue_risk_score||0)+(h.neuro_risk_score||0)+(h.surgery_risk_score||0)+(h.med_risk_score||0)}</td></tr>
            </table>`,
          },
          { title: 'Recommended Action', inner: `<p class="body-text">${letterNl(hr.action)}</p>` },
          ...(h.notes ? [{ title: 'Notes', inner: `<p class="body-text">${letterNl(h.notes)}</p>` }] : []),
        ],
      })
      if (!openLetterheadPrint('Waterlow Score', page)) toast.error('Pop-up blocked — please allow pop-ups for this site and try again')
    } else {
      const h = repoHistory[0]
      if (!h) { toast.error('No repositioning record to print yet'); return }
      const page = buildLetterheadPage({
        docTitle: 'Repositioning Chart',
        docSubtitle: 'Pressure Care Repositioning Record',
        docRefPrefix: 'RP', docRefId: h.id, residentName,
        sections: [
          {
            title: 'Repositioning Record',
            inner: `<table class="fields">
              <tr><th>Position</th><td>${h.position}</td></tr>
              <tr><th>Skin integrity OK</th><td>${h.skin_integrity_ok ? 'Yes' : 'No'}</td></tr>
              <tr><th>Pain free</th><td>${h.pain_free ? 'Yes' : 'No'}</td></tr>
              <tr><th>Recorded</th><td>${fmtLetterDate(h.created_at)}</td></tr>
            </table>`,
          },
          ...(h.notes ? [{ title: 'Notes', inner: `<p class="body-text">${letterNl(h.notes)}</p>` }] : []),
        ],
      })
      if (!openLetterheadPrint('Repositioning Chart', page)) toast.error('Pop-up blocked — please allow pop-ups for this site and try again')
    }
  }

  const RadioGroup = ({ opts, value, onChange }: { opts: { label: string; score: number }[]; value: number | null; onChange: (v: number) => void }) => (
    <div className="space-y-2">
      {opts.map(opt => (
        <label key={opt.score + opt.label}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            value === opt.score ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
          }`}>
          <input type="radio" checked={value === opt.score} onChange={() => onChange(opt.score)} className="accent-blue-600" />
          <span className="text-sm text-slate-700 flex-1">{opt.label}</span>
          <span className="text-xs font-bold text-blue-600">{opt.score}</span>
        </label>
      ))}
    </div>
  )

  const CheckGroup = ({ risks, selected, setSelected }: { risks: typeof TISSUE_RISKS; selected: string[]; setSelected: (v: string[]) => void }) => (
    <div className="space-y-2">
      {risks.map(r => (
        <label key={r.key}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            selected.includes(r.key) ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'
          }`}>
          <input type="checkbox" checked={selected.includes(r.key)}
            onChange={() => toggleRisk(r.key, selected, setSelected)} className="accent-red-600" />
          <span className="text-sm text-slate-700 flex-1">{r.label}</span>
          <span className="text-xs font-bold text-red-600">+{r.score}</span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Waterlow Score &amp; Repositioning
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Pressure ulcer risk assessment and repositioning chart</p>
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
          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
            <button onClick={() => setTab('waterlow')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'waterlow' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              Waterlow Assessment
            </button>
            <button onClick={() => setTab('repositioning')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'repositioning' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              Repositioning Chart
            </button>
          </div>

          {/* ── WATERLOW TAB ── */}
          {tab === 'waterlow' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Waterlow Pressure Ulcer Risk Assessment — {format(new Date(), 'd MMMM yyyy')}</h2>
                </div>

                {[
                  { title: 'Body Build / Weight for Height', opts: BUILD_OPTS, val: build, set: setBuild },
                  { title: 'Skin Type / Visual Appearance', opts: SKIN_OPTS, val: skin, set: setSkin },
                  { title: 'Sex / Age', opts: SEX_AGE_OPTS, val: sexAge, set: setSexAge },
                  { title: 'Malnutrition Screening Tool (MUST)', opts: MALNUT_OPTS, val: malnut, set: setMalnut },
                  { title: 'Continence', opts: CONT_OPTS, val: cont, set: setCont },
                  { title: 'Mobility', opts: MOB_OPTS, val: mob, set: setMob },
                ].map((section, idx) => (
                  <div key={idx} className="px-5 py-4 border-b border-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <h3 className="font-semibold text-slate-700 text-sm">{section.title}</h3>
                      {section.val !== null && (
                        <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{section.val} pts</span>
                      )}
                    </div>
                    <RadioGroup opts={section.opts} value={section.val} onChange={section.set} />
                  </div>
                ))}

                {/* Special risks */}
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">7</div>
                    Special Risk Factors <span className="text-xs font-normal text-slate-400">(tick all that apply)</span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Tissue Malnutrition</p>
                      <CheckGroup risks={TISSUE_RISKS} selected={tissueRisks} setSelected={setTissueRisks} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Neurological Deficit</p>
                      <CheckGroup risks={NEURO_RISKS} selected={neuroRisks} setSelected={setNeuroRisks} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Major Surgery / Trauma</p>
                      <CheckGroup risks={SURGERY_RISKS} selected={surgeryRisks} setSelected={setSurgeryRisks} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Medication</p>
                      <CheckGroup risks={MED_RISKS} selected={medRisks} setSelected={setMedRisks} />
                    </div>
                  </div>
                </div>

                {/* Result */}
                {coreReady && risk && (
                  <div className="mx-5 my-4 rounded-2xl p-4 border-2" style={{ background: risk.bg, borderColor: risk.border }}>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0 bg-white"
                        style={{ borderColor: risk.color }}>
                        <span className="text-xl font-black" style={{ color: risk.color }}>{totalScore}</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg" style={{ color: risk.color }}>{risk.label}</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{risk.action}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Build: <b>{build}</b></span>
                      <span>Skin: <b>{skin}</b></span>
                      <span>Sex/Age: <b>{sexAge}</b></span>
                      <span>Malnut: <b>{malnut}</b></span>
                      <span>Cont: <b>{cont}</b></span>
                      <span>Mob: <b>{mob}</b></span>
                      {tissueScore > 0 && <span>Tissue: <b>+{tissueScore}</b></span>}
                      {neuroScore > 0 && <span>Neuro: <b>+{neuroScore}</b></span>}
                      {surgeryScore > 0 && <span>Surgery: <b>+{surgeryScore}</b></span>}
                      {medScore > 0 && <span>Meds: <b>+{medScore}</b></span>}
                    </div>
                  </div>
                )}

                <div className="px-5 pb-5 space-y-3">
                  <textarea className="input w-full" rows={2} placeholder="Additional notes or care plan actions..." value={wNotes} onChange={e => setWNotes(e.target.value)} />
                  <div className="flex justify-end">
                    <Button icon={<Save className="w-4 h-4" />} onClick={saveWaterlow} loading={saving} disabled={!coreReady}>Save Waterlow Score</Button>
                  </div>
                </div>
              </div>

              {/* Waterlow history */}
              {loading ? <div className="flex justify-center py-8"><Spinner /></div>
                : waterlowHistory.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Previous Assessments</h2></div>
                    <div className="divide-y divide-slate-50">
                      {waterlowHistory.map((h: any) => {
                        const hr = getWaterlowRisk(h.total_score)
                        return (
                          <button key={h.id} onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 text-left">
                            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white flex-shrink-0" style={{ borderColor: hr.color }}>
                              <span className="text-xs font-black" style={{ color: hr.color }}>{h.total_score}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800"><span style={{ color: hr.color }}>{hr.label}</span> — Score {h.total_score}</p>
                              <p className="text-xs text-slate-400">{h.assessed_at ? format(new Date(h.assessed_at), 'd MMM yyyy') : ''}{h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}</p>
                            </div>
                            <div className="ml-auto">{expanded === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* ── REPOSITIONING TAB ── */}
          {tab === 'repositioning' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Log Turn — {format(new Date(), 'd MMMM yyyy, HH:mm')}</h2>
                </div>
                <div className="px-5 py-5 space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Position</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POSITIONS.map(p => (
                        <button key={p} onClick={() => setPosition(p)}
                          className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                            position === p ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-100 text-slate-600 hover:border-slate-300'
                          }`}>{p}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Skin Integrity</label>
                      <div className="flex gap-2">
                        {[{ v: true, l: 'Intact ✓', c: 'emerald' }, { v: false, l: 'Concern ⚠', c: 'red' }].map(opt => (
                          <button key={String(opt.v)} onClick={() => setSkinOk(opt.v)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              skinOk === opt.v
                                ? opt.c === 'emerald' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-red-50 border-red-400 text-red-700'
                                : 'border-slate-100 text-slate-600 hover:border-slate-300'
                            }`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Comfort / Pain</label>
                      <div className="flex gap-2">
                        {[{ v: true, l: 'Comfortable', c: 'emerald' }, { v: false, l: 'In pain', c: 'red' }].map(opt => (
                          <button key={String(opt.v)} onClick={() => setPainFree(opt.v)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              painFree === opt.v
                                ? opt.c === 'emerald' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-red-50 border-red-400 text-red-700'
                                : 'border-slate-100 text-slate-600 hover:border-slate-300'
                            }`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Notes</label>
                    <input type="text" className="input w-full" placeholder="Skin observations, concerns, equipment used..."
                      value={repoNotes} onChange={e => setRepoNotes(e.target.value)} />
                  </div>

                  <div className="flex justify-end">
                    <Button icon={<Plus className="w-4 h-4" />} onClick={saveRepo} loading={repoSaving}
                      disabled={!position || skinOk === null || painFree === null}>
                      Log Turn
                    </Button>
                  </div>
                </div>
              </div>

              {/* Repositioning history table */}
              {loading ? <div className="flex justify-center py-8"><Spinner /></div>
                : repoHistory.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h2 className="font-semibold text-slate-800">Repositioning Log</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left">Time</th>
                            <th className="px-4 py-2 text-left">Position</th>
                            <th className="px-4 py-2 text-center">Skin</th>
                            <th className="px-4 py-2 text-center">Comfort</th>
                            <th className="px-4 py-2 text-left">Staff</th>
                            <th className="px-4 py-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {repoHistory.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                                {r.turned_at ? format(new Date(r.turned_at), 'd MMM, HH:mm') : '—'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{r.position}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.skin_integrity_ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {r.skin_integrity_ok ? '✓ OK' : '⚠ Concern'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.pain_free ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {r.pain_free ? '✓ OK' : '⚠ Pain'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{r.staff_name || '—'}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{r.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                    <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No repositioning records yet</p>
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
