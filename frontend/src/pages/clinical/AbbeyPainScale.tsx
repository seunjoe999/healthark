import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Heart, Save, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'

// Abbey Pain Scale — validated for non-verbal/dementia residents
const ITEMS = [
  {
    id: 'vocalisation', label: 'Vocalisation',
    desc: 'e.g. whimpering, groaning, crying',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Occasional moan or groan' },
      { score: 2, label: 'Constant moaning or groaning, crying' },
      { score: 3, label: 'Screaming or calling out repeatedly' },
    ]
  },
  {
    id: 'facial_expression', label: 'Facial Expression',
    desc: 'e.g. grimacing, looking tense',
    options: [
      { score: 0, label: 'Smiling, or inexpressive' },
      { score: 1, label: 'Sad, frightened, frowning' },
      { score: 2, label: 'Moderate grimacing' },
      { score: 3, label: 'Severe distorted expression' },
    ]
  },
  {
    id: 'body_language', label: 'Body Language',
    desc: 'e.g. fidgeting, rocking, guarding',
    options: [
      { score: 0, label: 'Relaxed' },
      { score: 1, label: 'Tense, fidgeting' },
      { score: 2, label: 'Rigid, fists clenched' },
      { score: 3, label: 'Knees pulled up, pulling/pushing away, striking out' },
    ]
  },
  {
    id: 'behavioural_change', label: 'Behavioural Change',
    desc: 'e.g. increased confusion, refusal to eat',
    options: [
      { score: 0, label: 'No change' },
      { score: 1, label: 'Slight change in eating/sleeping pattern' },
      { score: 2, label: 'Moderate change in eating/sleeping, increased agitation' },
      { score: 3, label: 'Severe change, refusing treatment, withdrawn/uncommunicative' },
    ]
  },
  {
    id: 'physiological_change', label: 'Physiological Change',
    desc: 'e.g. temperature, pulse, perspiring, flushing',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Slight: temp/pulse slightly elevated' },
      { score: 2, label: 'Moderate: temp/pulse moderately elevated, diaphoretic' },
      { score: 3, label: 'Severe: temp/pulse greatly elevated' },
    ]
  },
  {
    id: 'physical_change', label: 'Physical Changes',
    desc: 'e.g. skin tears, pressure areas, arthritis',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Slight: skin tear, bruising, arthritis' },
      { score: 2, label: 'Moderate: spread rash, healing limb fracture' },
      { score: 3, label: 'Severe: wound, limb fracture, skin changes' },
    ]
  },
]

function getInterpretation(score: number) {
  if (score <= 2)  return { label: 'No pain',         color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' }
  if (score <= 7)  return { label: 'Mild pain',        color: '#854d0e', bg: '#fefce8', border: '#fef08a' }
  if (score <= 13) return { label: 'Moderate pain',    color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' }
  return             { label: 'Severe pain',          color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca' }
}

const PAIN_TYPE_OPTIONS = ['Chronic', 'Acute', 'Post-procedure', 'Unknown']

function printAbbeyPainScale(residentName: string, current: { scores: Record<string, number>; totalScore: number; interp: { label: string } | null; painType: string; notes: string } | null, history: any[]) {
  const sections: PrintSection[] = []

  if (current && current.interp) {
    const rows = ITEMS.map(item => {
      const score = current.scores[item.id]
      const optLabel = item.options.find(o => o.score === score)?.label
      return `<tr><th>${esc(item.label)}</th><td>${score}pt — ${esc(optLabel)}</td></tr>`
    }).join('')
    sections.push({
      title: 'Current Assessment',
      inner: `
        <div class="risk-box${current.totalScore >= 8 ? ' high' : ''}">
          <span class="rb-label">Total Score / Interpretation</span>
          <span class="rb-value">${current.totalScore} / 18 — ${esc(current.interp.label)}</span>
        </div>
        <table class="fields">${rows}
          ${current.painType ? `<tr><th>Type of Pain</th><td>${esc(current.painType)}</td></tr>` : ''}
        </table>
        ${current.notes ? `<h3 class="sub">Clinical Notes</h3><p class="body-text">${nl(current.notes)}</p>` : ''}
      `,
    })
  }

  if (history.length) {
    const rows = history.map(h => `
      <tr><th>${h.assessed_at ? fmtDate(h.assessed_at) : '—'}</th>
      <td>Score ${esc(h.total_score)}/18 — ${esc(h.interpretation)}${h.pain_type ? ` · ${esc(h.pain_type)}` : ''}${h.assessed_by_name ? ` · by ${esc(h.assessed_by_name)}` : ''}${h.notes ? `<br/><span style="font-style:italic;color:#555">${nl(h.notes)}</span>` : ''}</td></tr>
    `).join('')
    sections.push({ title: 'Assessment History', inner: `<table class="fields">${rows}</table>` })
  }

  if (!sections.length) {
    sections.push({ title: 'Assessment', inner: `<p class="body-text muted">No Abbey Pain Scale data recorded yet for this resident.</p>` })
  }

  return { sections }
}

export default function AbbeyPainScale() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [painType, setPainType] = useState('')
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
    api.get(`/clinical/abbey-pain/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const allScored = ITEMS.every(item => scores[item.id] !== undefined)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const interp = allScored ? getInterpretation(totalScore) : null

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const { sections } = printAbbeyPainScale(residentName, allScored ? { scores, totalScore, interp, painType, notes } : null, history)
    const body = buildLetterheadPage({
      docTitle: 'Abbey Pain Scale', docSubtitle: 'Pain assessment — non-verbal / dementia resident',
      docRefPrefix: 'APS', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — Abbey Pain Scale`, body)
  }

  const save = async () => {
    if (!selectedSu || !allScored) return
    setSaving(true)
    try {
      await api.post('/clinical/abbey-pain', {
        suId: selectedSu, homeId: user?.homeId,
        vocalisation: scores.vocalisation,
        facialExpression: scores.facial_expression,
        bodyLanguage: scores.body_language,
        behaviouralChange: scores.behavioural_change,
        physiologicalChange: scores.physiological_change,
        physicalChange: scores.physical_change,
        totalScore, interpretation: interp?.label, painType, notes,
        assessedBy: user?.id,
      })
      toast.success('Abbey Pain Scale saved')
      const r = await api.get(`/clinical/abbey-pain/${selectedSu}`)
      setHistory(r.data.data || [])
      setScores({}); setPainType(''); setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            Abbey Pain Scale
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Pain assessment for non-verbal / dementia residents</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

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
              <h2 className="font-semibold text-slate-800">Assessment — {format(new Date(), 'd MMMM yyyy, HH:mm')}</h2>
            </div>

            <div className="divide-y divide-slate-50">
              {ITEMS.map((item, idx) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                    {scores[item.id] !== undefined && (
                      <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: getInterpretation(scores[item.id]).bg, color: getInterpretation(scores[item.id]).color }}>
                        {scores[item.id]} pts
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 ml-7">
                    {item.options.map(opt => (
                      <label key={opt.score}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          scores[item.id] === opt.score ? 'border-rose-400 bg-rose-50' : 'border-slate-100 hover:border-slate-200'
                        }`}>
                        <input type="radio" checked={scores[item.id] === opt.score}
                          onChange={() => setScores(s => ({ ...s, [item.id]: opt.score }))}
                          className="accent-rose-600" />
                        <span className="text-sm text-slate-700 flex-1">{opt.label}</span>
                        <span className="text-xs font-bold text-slate-400">{opt.score}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {interp && (
              <div className="mx-5 my-4 rounded-2xl p-4 border-2 flex items-center gap-4" style={{ background: interp.bg, borderColor: interp.border }}>
                <div className="w-14 h-14 rounded-full border-4 bg-white flex items-center justify-center flex-shrink-0" style={{ borderColor: interp.color }}>
                  <span className="text-xl font-black" style={{ color: interp.color }}>{totalScore}</span>
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: interp.color }}>{interp.label}</p>
                  <p className="text-xs text-slate-500">Total score: {totalScore} / 18 · {interp.label.toLowerCase()} indicated</p>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Type of Pain</label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_TYPE_OPTIONS.map(t => (
                    <button key={t} onClick={() => setPainType(t)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        painType === t ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
              <textarea className="input w-full" rows={2} placeholder="Clinical notes, actions taken, PRN medication given..." value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!allScored}>Save Assessment</Button>
              </div>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">History</h2></div>
                <div className="divide-y divide-slate-50">
                  {history.map((h: any) => {
                    const hi = getInterpretation(h.total_score)
                    return (
                      <div key={h.id}>
                        <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 text-left">
                          <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white flex-shrink-0" style={{ borderColor: hi.color }}>
                            <span className="text-xs font-black" style={{ color: hi.color }}>{h.total_score}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800"><span style={{ color: hi.color }}>{h.interpretation}</span>{h.pain_type ? ` · ${h.pain_type}` : ''}</p>
                            <p className="text-xs text-slate-400">{h.assessed_at ? format(new Date(h.assessed_at), 'd MMM yyyy, HH:mm') : ''}{h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}</p>
                          </div>
                          {expanded === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                        {expanded === h.id && h.notes && (
                          <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                            <p className="text-xs text-slate-600 italic mt-2">{h.notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}
