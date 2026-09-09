import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Frown, Save, ChevronDown, ChevronUp, Printer, Info } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'

const PAIN_INTENSITY_OPTIONS = [
  '0-1 No Hurt, Feels Good, No Pain',
  '1-2 Hurts a little bit',
  '3-4 Hurts a little more noticeable',
  '5-6 Hurts even more moderate',
  '7-8 Hurts A Whole Lot Severe Pain',
  '9-10 hurts worst pain unimaginable',
]

const PAIN_DESCRIPTION_OPTIONS = [
  'Sharp', 'Dull', 'Aching', 'Throbbing', 'Burning', 'Stabbing',
  'Shooting', 'Cramping', 'Gnawing', 'Pressure like', 'Tight', 'None',
]

const DAILY_LIFE_IMPACT_OPTIONS = [
  'Affects sleep', 'Limits mobility', 'Reduces appetite', 'Affects mood or behaviour',
  'Interferes with personal care', 'Impacts communication', 'None',
]

const YES_NO_NA = ['Yes', 'No', 'N/A']
const YES_NO = ['Yes', 'No']

const PAIN_PATTERN_OPTIONS = ['The Pain is Constant', 'The Pain Comes and Goes', 'Not Applicable']
const INTERVENTION_TYPE_OPTIONS = ['Medication', 'Repositioning', 'Distraction', 'None', 'Other']
const OUTCOME_OPTIONS = [
  'Improved - Continue to Monitor',
  'No change - Escalate to 111 or the GP',
  'Worsened - Escalate to 111 or the GP',
  'Not Applicable',
]

const PHARMA_BANDS = [
  { band: 'No Pain (0)', guidance: 'Continue to monitor - No analgesia required unless otherwise prescribed.' },
  { band: 'Mild Pain (1–3)', guidance: 'Encourage non-pharmacological measures to help relieve symptoms where appropriate Or Give Pain relief as prescribed if required. Continue to closely monitor pain, sedation and nausea.' },
  { band: 'Moderate Pain (4–6)', guidance: 'Give Pain relief as prescribed. Continue to closely monitor pain, sedation and nausea.' },
  { band: 'Severe Pain (7–10)', guidance: 'Give Pain relief as prescribed. Continue to closely monitor pain, sedation and nausea.' },
]

interface FormState {
  painIntensity: string
  painDescription: string
  durationTriggers: string
  dailyLifeImpact: string[]
  painReliefGiven: string
  lastAdminTimeChecked: string
  painPattern: string
  worseBetter: string
  interventionType: string
  outcome: string
  furtherActionRequired: string
  furtherActionPlan: string
  notes: string
}

const emptyForm: FormState = {
  painIntensity: '',
  painDescription: '',
  durationTriggers: '',
  dailyLifeImpact: [],
  painReliefGiven: '',
  lastAdminTimeChecked: '',
  painPattern: '',
  worseBetter: '',
  interventionType: '',
  outcome: '',
  furtherActionRequired: '',
  furtherActionPlan: '',
  notes: '',
}

function printPainAssessment(residentName: string, current: FormState | null, history: any[]) {
  const sections: PrintSection[] = []

  if (current) {
    sections.push({
      title: 'Current Assessment',
      inner: `
        <table class="fields">
          <tr><th>Pain Intensity Rating</th><td>${esc(current.painIntensity) || '—'}</td></tr>
          <tr><th>Pain Description</th><td>${esc(current.painDescription) || '—'}</td></tr>
          <tr><th>Pain Duration &amp; Triggers</th><td>${nl(current.durationTriggers) || '—'}</td></tr>
          <tr><th>Impact on Daily Life</th><td>${current.dailyLifeImpact.length ? esc(current.dailyLifeImpact.join(', ')) : '—'}</td></tr>
          <tr><th>Pain Relief Given?</th><td>${esc(current.painReliefGiven) || '—'}</td></tr>
          <tr><th>Last Admin Time Checked?</th><td>${esc(current.lastAdminTimeChecked) || '—'}</td></tr>
          <tr><th>Pain Constant or Comes &amp; Goes</th><td>${esc(current.painPattern) || '—'}</td></tr>
          <tr><th>What Makes It Worse or Better?</th><td>${nl(current.worseBetter) || '—'}</td></tr>
          <tr><th>Type of Intervention</th><td>${esc(current.interventionType) || '—'}</td></tr>
          <tr><th>Outcome</th><td>${esc(current.outcome) || '—'}</td></tr>
          <tr><th>Further Action Required</th><td>${esc(current.furtherActionRequired) || '—'}</td></tr>
          ${current.furtherActionPlan ? `<tr><th>Follow-Up Plan</th><td>${nl(current.furtherActionPlan)}</td></tr>` : ''}
        </table>
        ${current.notes ? `<h3 class="sub">Clinical Notes</h3><p class="body-text">${nl(current.notes)}</p>` : ''}
      `,
    })
  }

  if (history.length) {
    const rows = history.map(h => `
      <tr><th>${h.assessed_at ? fmtDate(h.assessed_at) : '—'}</th>
      <td>${esc(h.pain_intensity) || '—'}${h.pain_description ? ` · ${esc(h.pain_description)}` : ''}${h.assessed_by_name ? ` · by ${esc(h.assessed_by_name)}` : ''}${h.notes ? `<br/><span style="font-style:italic;color:#555">${nl(h.notes)}</span>` : ''}</td></tr>
    `).join('')
    sections.push({ title: 'Assessment History', inner: `<table class="fields">${rows}</table>` })
  }

  if (!sections.length) {
    sections.push({ title: 'Assessment', inner: `<p class="body-text muted">No Pain Assessment data recorded yet for this resident.</p>` })
  }

  return { sections }
}

export default function PainAssessment() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const cardBg = theme === 'dark' ? '#111' : '#ffffff'
  const cardBorder = theme === 'dark' ? '#2a2a2a' : '#e2e8f0'
  const headBorder = theme === 'dark' ? '#1f1f1f' : '#f1f5f9'
  const textPrimary = theme === 'dark' ? '#f5f0e8' : '#0f172a'
  const textMuted = theme === 'dark' ? '#9a9488' : '#64748b'
  const textFaint = theme === 'dark' ? '#7a746a' : '#94a3b8'
  const inputBg = theme === 'dark' ? '#0a0a0a' : '#ffffff'
  const inputBorder = theme === 'dark' ? '#2a2a2a' : '#e2e8f0'
  const optionBorder = theme === 'dark' ? '#2a2a2a' : '#e2e8f0'
  const optionBorderActive = '#e11d48'
  const optionBgActive = theme === 'dark' ? 'rgba(225,29,72,0.12)' : '#fff1f2'
  const infoBg = theme === 'dark' ? 'rgba(59,130,246,0.08)' : '#eff6ff'
  const infoBorder = theme === 'dark' ? 'rgba(59,130,246,0.3)' : '#bfdbfe'
  const infoText = theme === 'dark' ? '#93c5fd' : '#1e40af'
  const rowAltBg = theme === 'dark' ? '#161616' : '#f8fafc'

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/pain-assessment/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const canSave = !!form.painIntensity && !!form.painDescription

  const toggleDailyLife = (opt: string) => {
    setForm(f => {
      if (opt === 'None') return { ...f, dailyLifeImpact: f.dailyLifeImpact.includes('None') ? [] : ['None'] }
      const withoutNone = f.dailyLifeImpact.filter(x => x !== 'None')
      return {
        ...f,
        dailyLifeImpact: withoutNone.includes(opt) ? withoutNone.filter(x => x !== opt) : [...withoutNone, opt],
      }
    })
  }

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const { sections } = printPainAssessment(residentName, canSave ? form : null, history)
    const body = buildLetterheadPage({
      docTitle: 'Pain Assessment', docSubtitle: 'Pain assessment and pharmacological intervention guidance',
      docRefPrefix: 'PA', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — Pain Assessment`, body)
  }

  const save = async () => {
    if (!selectedSu || !canSave) return
    setSaving(true)
    try {
      await api.post('/clinical/pain-assessment', {
        suId: selectedSu, homeId: user?.homeId,
        assessedDate: format(new Date(), 'yyyy-MM-dd'),
        painIntensity: form.painIntensity,
        painDescription: form.painDescription,
        durationTriggers: form.durationTriggers,
        dailyLifeImpact: form.dailyLifeImpact,
        painReliefGiven: form.painReliefGiven,
        lastAdminTimeChecked: form.lastAdminTimeChecked,
        painPattern: form.painPattern,
        worseBetter: form.worseBetter,
        interventionType: form.interventionType,
        outcome: form.outcome,
        furtherActionRequired: form.furtherActionRequired,
        furtherActionPlan: form.furtherActionPlan,
        notes: form.notes,
        assessedBy: user?.id,
      })
      toast.success('Pain Assessment saved')
      const r = await api.get(`/clinical/pain-assessment/${selectedSu}`)
      setHistory(r.data.data || [])
      setForm(emptyForm)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const renderSingleSelect = (options: string[], value: string, onChange: (v: string) => void) => (
    <div className="space-y-1.5">
      {options.map(opt => (
        <label key={opt}
          className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all"
          style={{
            borderColor: value === opt ? optionBorderActive : optionBorder,
            background: value === opt ? optionBgActive : 'transparent',
          }}>
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="accent-rose-600" />
          <span className="text-sm flex-1" style={{ color: textPrimary }}>{opt}</span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: textPrimary }}>
            <Frown className="w-6 h-6 text-rose-600" />
            Pain Assessment
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>Structured pain assessment for service users</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-2 print:hidden"
          style={{ color: textMuted, borderColor: cardBorder, background: cardBg }}>
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="rounded-2xl border p-5 mb-5" style={{ background: cardBg, borderColor: cardBorder }}>
        <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: textMuted }}>Service User</label>
        <select className="input w-full max-w-xs" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
          <option value="">— Select resident —</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
      </div>

      {selectedSu && (
        <>
          <div className="rounded-2xl border overflow-hidden mb-5" style={{ background: cardBg, borderColor: cardBorder }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: headBorder }}>
              <h2 className="font-semibold" style={{ color: textPrimary }}>
                Assessment — {format(new Date(), 'd MMMM yyyy, HH:mm')}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: textFaint }}>Assessor: {user?.firstName} {user?.lastName}</p>
            </div>

            <div className="divide-y" style={{ borderColor: headBorder }}>
              {/* 1. Pain Intensity Rating */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>1. Pain Intensity Rating</p>
                <p className="text-xs mb-2" style={{ color: textFaint }}>Ask the service user to rate their pain on a scale of 0–10, with 10 being the worst</p>
                {renderSingleSelect(PAIN_INTENSITY_OPTIONS, form.painIntensity, v => setForm(f => ({ ...f, painIntensity: v })))}
              </div>

              {/* 2. Pain Description */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>2. Pain Description (Qualitative)</p>
                <p className="text-xs mb-2" style={{ color: textFaint }}>Ask the individual to describe their pain</p>
                <div className="flex flex-wrap gap-2">
                  {PAIN_DESCRIPTION_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, painDescription: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.painDescription === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Pain Duration & Triggers */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>3. Pain Duration &amp; Triggers</p>
                <textarea className="input w-full" rows={2} placeholder="Describe duration and any known triggers..."
                  value={form.durationTriggers} onChange={e => setForm(f => ({ ...f, durationTriggers: e.target.value }))} />
              </div>

              {/* 4. Impact on Daily Life */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>4. Impact on Daily Life</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DAILY_LIFE_IMPACT_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer"
                      style={{
                        borderColor: form.dailyLifeImpact.includes(opt) ? optionBorderActive : optionBorder,
                        background: form.dailyLifeImpact.includes(opt) ? optionBgActive : 'transparent',
                      }}>
                      <input type="checkbox" checked={form.dailyLifeImpact.includes(opt)} onChange={() => toggleDailyLife(opt)} className="accent-rose-600" />
                      <span className="text-sm" style={{ color: textPrimary }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 5. Actions Taken - Pain Relief Given? */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>5. Actions Taken - Pain Relief Given?</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {YES_NO_NA.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, painReliefGiven: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.painReliefGiven === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="text-xs mb-2" style={{ color: textFaint }}>
                  If pain relief is being considered, has the last administration time been checked and confirmed as safe to administer?
                </p>
                <div className="flex flex-wrap gap-2">
                  {YES_NO_NA.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, lastAdminTimeChecked: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.lastAdminTimeChecked === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pharmacological Intervention reference panel */}
              <div className="px-5 py-4">
                <div className="rounded-xl border p-4" style={{ background: infoBg, borderColor: infoBorder }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" style={{ color: infoText }} />
                    <p className="text-sm font-bold" style={{ color: infoText }}>Pharmacological Intervention (As Prescribed)</p>
                  </div>
                  <div className="space-y-2">
                    {PHARMA_BANDS.map(b => (
                      <div key={b.band}>
                        <p className="text-xs font-bold" style={{ color: infoText }}>{b.band}</p>
                        <p className="text-xs" style={{ color: theme === 'dark' ? '#c7d7f5' : '#1e3a8a' }}>{b.guidance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Is The Pain Constant Or Does It Come And Go? */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>Is The Pain Constant Or Does It Come And Go?</p>
                <div className="flex flex-wrap gap-2">
                  {PAIN_PATTERN_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, painPattern: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.painPattern === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* What Makes It Worse or Better? */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>What Makes It Worse or Better?</p>
                <textarea className="input w-full" rows={2} placeholder="Describe what worsens or relieves the pain..."
                  value={form.worseBetter} onChange={e => setForm(f => ({ ...f, worseBetter: e.target.value }))} />
              </div>

              {/* Type Of Intervention */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>Type Of Intervention</p>
                <div className="flex flex-wrap gap-2">
                  {INTERVENTION_TYPE_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, interventionType: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.interventionType === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outcome */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Outcome</p>
                <p className="text-xs mb-2" style={{ color: textFaint }}>To be completed following 30 mins - 1 hours administration of medication.</p>
                {renderSingleSelect(OUTCOME_OPTIONS, form.outcome, v => setForm(f => ({ ...f, outcome: v })))}
              </div>

              {/* Further Action Required */}
              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>Further Action Required</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {YES_NO.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, furtherActionRequired: opt }))}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      style={form.furtherActionRequired === opt
                        ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                        : { background: 'transparent', color: textMuted, borderColor: optionBorder }}>
                      {opt}
                    </button>
                  ))}
                </div>
                {form.furtherActionRequired === 'Yes' && (
                  <>
                    <p className="text-xs mb-2" style={{ color: textFaint }}>If Further Observations Or Follow-Up Required - Pls Detail Plan</p>
                    <textarea className="input w-full" rows={2} placeholder="Detail follow-up plan..."
                      value={form.furtherActionPlan} onChange={e => setForm(f => ({ ...f, furtherActionPlan: e.target.value }))} />
                  </>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3 pt-1">
              <textarea className="input w-full" rows={2} placeholder="Additional clinical notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!canSave}>Save Assessment</Button>
              </div>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: cardBg, borderColor: cardBorder }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: headBorder }}>
                  <h2 className="font-semibold" style={{ color: textPrimary }}>History</h2>
                </div>
                <div className="divide-y" style={{ borderColor: headBorder }}>
                  {history.map((h: any, idx: number) => (
                    <div key={h.id} style={{ background: idx % 2 === 1 ? rowAltBg : 'transparent' }}>
                      <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                        className="w-full px-5 py-4 flex items-center gap-3 text-left">
                        <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: '#e11d48', background: cardBg }}>
                          <Frown className="w-4 h-4 text-rose-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: textPrimary }}>
                            {h.pain_intensity || '—'}{h.pain_description ? ` · ${h.pain_description}` : ''}
                          </p>
                          <p className="text-xs" style={{ color: textFaint }}>
                            {h.assessed_at ? format(new Date(h.assessed_at), 'd MMM yyyy, HH:mm') : ''}{h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}
                          </p>
                        </div>
                        {expanded === h.id ? <ChevronUp className="w-4 h-4" style={{ color: textFaint }} /> : <ChevronDown className="w-4 h-4" style={{ color: textFaint }} />}
                      </button>
                      {expanded === h.id && (
                        <div className="px-5 pb-4 border-t" style={{ background: rowAltBg, borderColor: headBorder }}>
                          <div className="text-xs mt-2 space-y-1" style={{ color: textMuted }}>
                            {h.duration_triggers && <p><span className="font-semibold">Duration/Triggers:</span> {h.duration_triggers}</p>}
                            {Array.isArray(h.daily_life_impact) && h.daily_life_impact.length > 0 && <p><span className="font-semibold">Daily Life Impact:</span> {h.daily_life_impact.join(', ')}</p>}
                            {h.pain_relief_given && <p><span className="font-semibold">Pain Relief Given:</span> {h.pain_relief_given}</p>}
                            {h.pain_pattern && <p><span className="font-semibold">Pattern:</span> {h.pain_pattern}</p>}
                            {h.worse_better && <p><span className="font-semibold">Worse/Better:</span> {h.worse_better}</p>}
                            {h.intervention_type && <p><span className="font-semibold">Intervention:</span> {h.intervention_type}</p>}
                            {h.outcome && <p><span className="font-semibold">Outcome:</span> {h.outcome}</p>}
                            {h.further_action_required && <p><span className="font-semibold">Further Action Required:</span> {h.further_action_required}</p>}
                            {h.further_action_plan && <p><span className="font-semibold">Follow-Up Plan:</span> {h.further_action_plan}</p>}
                            {h.notes && <p className="italic">{h.notes}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}
