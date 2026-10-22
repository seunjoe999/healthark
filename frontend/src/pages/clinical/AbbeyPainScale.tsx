import React, { useEffect, useMemo, useState } from 'react'
import api, { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { UniformFilterBar } from '../../components/ui/FilterBar'
import toast from 'react-hot-toast'
import { Heart, Save, Printer, Plus, Edit, Eye, ChevronUp, CheckCircle } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'

export const ABBEY_ITEMS = [
  {
    id: 'vocalisation',
    label: 'Vocalisation',
    desc: 'e.g. whimpering, groaning, crying',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Occasional moan or groan' },
      { score: 2, label: 'Constant moaning or groaning, crying' },
      { score: 3, label: 'Screaming or calling out repeatedly' },
    ],
  },
  {
    id: 'facial_expression',
    label: 'Facial Expression',
    desc: 'e.g. grimacing, looking tense',
    options: [
      { score: 0, label: 'Smiling, or inexpressive' },
      { score: 1, label: 'Sad, frightened, frowning' },
      { score: 2, label: 'Moderate grimacing' },
      { score: 3, label: 'Severe distorted expression' },
    ],
  },
  {
    id: 'body_language',
    label: 'Body Language',
    desc: 'e.g. fidgeting, rocking, guarding',
    options: [
      { score: 0, label: 'Relaxed' },
      { score: 1, label: 'Tense, fidgeting' },
      { score: 2, label: 'Rigid, fists clenched' },
      { score: 3, label: 'Knees pulled up, pulling/pushing away, striking out' },
    ],
  },
  {
    id: 'behavioural_change',
    label: 'Behavioural Change',
    desc: 'e.g. increased confusion, refusal to eat',
    options: [
      { score: 0, label: 'No change' },
      { score: 1, label: 'Slight change in eating/sleeping pattern' },
      { score: 2, label: 'Moderate change in eating/sleeping, increased agitation' },
      { score: 3, label: 'Severe change, refusing treatment, withdrawn/uncommunicative' },
    ],
  },
  {
    id: 'physiological_change',
    label: 'Physiological Change',
    desc: 'e.g. temperature, pulse, perspiring, flushing',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Slight: temp/pulse slightly elevated' },
      { score: 2, label: 'Moderate: temp/pulse moderately elevated, diaphoretic' },
      { score: 3, label: 'Severe: temp/pulse greatly elevated' },
    ],
  },
  {
    id: 'physical_change',
    label: 'Physical Changes',
    desc: 'e.g. skin tears, pressure areas, arthritis',
    options: [
      { score: 0, label: 'Absent' },
      { score: 1, label: 'Slight: skin tear, bruising, arthritis' },
      { score: 2, label: 'Moderate: spread rash, healing limb fracture' },
      { score: 3, label: 'Severe: wound, limb fracture, skin changes' },
    ],
  },
]

export function getAbbeyInterpretation(score: number) {
  if (score <= 2) return { label: 'No pain', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' }
  if (score <= 7) return { label: 'Mild pain', color: '#854d0e', bg: '#fefce8', border: '#fef08a' }
  if (score <= 13) return { label: 'Moderate pain', color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' }
  return { label: 'Severe pain', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca' }
}

export const ABBEY_PAIN_TYPE_OPTIONS = ['Chronic', 'Acute', 'Post-procedure', 'Unknown']

export function printSingleAbbeyRecord(rec: any) {
  const sections: PrintSection[] = []
  const rows = ABBEY_ITEMS.map(item => {
    const sc = Number(rec[item.id] ?? 0)
    const optLabel = item.options.find(o => o.score === sc)?.label || ''
    return `<tr><th>${esc(item.label)}</th><td><strong>${sc} / 3</strong> — ${esc(optLabel)}</td></tr>`
  }).join('')
  sections.push({
    title: 'Completed Abbey Pain Scale Assessment',
    inner: `
      <div class="risk-box${Number(rec.total_score) >= 8 ? ' high' : ''}">
        <span class="rb-label">Total Score / Interpretation</span>
        <span class="rb-value">${esc(rec.total_score)} / 18 — ${esc(rec.interpretation || getAbbeyInterpretation(Number(rec.total_score || 0)).label)}</span>
      </div>
      <table class="fields">
        <tr><th>Assessed Date &amp; Time</th><td>${rec.assessed_at ? fmtDate(rec.assessed_at) : '—'}</td></tr>
        ${rec.assessed_by_name ? `<tr><th>Assessed By</th><td>${esc(rec.assessed_by_name)}</td></tr>` : ''}
        ${rows}
        <tr><th>Type of Pain</th><td>${esc(rec.pain_type || '—')}</td></tr>
      </table>
      ${rec.notes ? `<h3 class="sub">Clinical Notes</h3><p class="body-text">${nl(rec.notes)}</p>` : ''}
    `,
  })
  const residentName = rec.su_name || 'Resident'
  const body = buildLetterheadPage({
    docTitle: 'Abbey Pain Scale Assessment',
    docSubtitle: 'Completed clinical pain assessment record',
    docRefPrefix: 'APS',
    docRefId: rec.id || '—',
    residentName,
    sections,
  })
  openLetterheadPrint(`${residentName} — Abbey Pain Scale`, body)
}

export function AbbeyAssessmentDetailModal({
  record,
  initialEdit = false,
  onClose,
  onSaved,
}: {
  record: any
  initialEdit?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(initialEdit)
  const [scores, setScores] = useState<Record<string, number>>({
    vocalisation: Number(record.vocalisation ?? 0),
    facial_expression: Number(record.facial_expression ?? 0),
    body_language: Number(record.body_language ?? 0),
    behavioural_change: Number(record.behavioural_change ?? 0),
    physiological_change: Number(record.physiological_change ?? 0),
    physical_change: Number(record.physical_change ?? 0),
  })
  const [painType, setPainType] = useState<string>(record.pain_type || '')
  const [notes, setNotes] = useState<string>(record.notes || '')
  const [saving, setSaving] = useState(false)

  const liveTotal = Object.values(scores).reduce((sum, v) => sum + Number(v || 0), 0)
  const liveInterp = getAbbeyInterpretation(liveTotal)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/clinical/abbey-pain/${record.id}`, {
        vocalisation: scores.vocalisation,
        facialExpression: scores.facial_expression,
        bodyLanguage: scores.body_language,
        behaviouralChange: scores.behavioural_change,
        physiologicalChange: scores.physiological_change,
        physicalChange: scores.physical_change,
        totalScore: liveTotal,
        interpretation: liveInterp.label,
        painType,
        notes,
      })
      toast.success('Pain assessment updated')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update assessment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? `Edit Pain Assessment — ${record.su_name || 'Resident'}` : `Completed Pain Assessment — ${record.su_name || 'Resident'}`}
      size="xl"
    >
      <div className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 space-y-4">
        {/* Top summary banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
          <div>
            <p className="text-base font-bold text-slate-900">{record.su_name || 'Service User'}</p>
            <p className="text-xs text-slate-600">
              {record.assessed_at ? format(new Date(record.assessed_at), 'dd MMM yyyy, HH:mm') : '—'}
              {record.assessed_by_name ? ` · Assessed by ${record.assessed_by_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printSingleAbbeyRecord({
                ...record,
                ...scores,
                total_score: liveTotal,
                interpretation: liveInterp.label,
                pain_type: painType,
                notes,
              })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print PDF
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Assessment
              </button>
            )}
          </div>
        </div>

        {/* Score summary box */}
        <div
          className="rounded-2xl p-4 border-2 flex items-center gap-4"
          style={{ background: liveInterp.bg, borderColor: liveInterp.border }}
        >
          <div
            className="w-14 h-14 rounded-full border-4 bg-white flex items-center justify-center flex-shrink-0"
            style={{ borderColor: liveInterp.color }}
          >
            <span className="text-xl font-black" style={{ color: liveInterp.color }}>{liveTotal}</span>
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: liveInterp.color }}>
              {liveInterp.label}{painType ? ` · ${painType}` : ''}
            </p>
            <p className="text-xs text-slate-600">
              Total score: {liveTotal} / 18 {editing ? '(click any option below to amend score)' : '(all 6 domains shown below)'}
            </p>
          </div>
        </div>

        {/* Full 6-question breakdown showing every option & selected answer */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {ABBEY_ITEMS.map((item, idx) => {
            const currentScore = scores[item.id]
            return (
              <div key={item.id} className="p-4 bg-white">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <span
                    className="ml-auto text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{
                      background: getAbbeyInterpretation(currentScore * 3).bg,
                      color: getAbbeyInterpretation(currentScore * 3).color,
                    }}
                  >
                    Selected: {currentScore} / 3
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
                  {item.options.map(opt => {
                    const selected = currentScore === opt.score
                    return (
                      <label
                        key={opt.score}
                        onClick={() => { if (editing) setScores(s => ({ ...s, [item.id]: opt.score })) }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                          editing ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          selected
                            ? 'border-rose-500 bg-rose-50 text-slate-900 font-bold ring-1 ring-rose-300'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={selected}
                          readOnly
                          className="accent-rose-600 pointer-events-none"
                        />
                        <span className="flex-1">{opt.label}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                          {opt.score}
                        </span>
                        {selected && <CheckCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Type of pain & clinical notes */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 block">Type of Pain</label>
            <div className="flex flex-wrap gap-2">
              {ABBEY_PAIN_TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  disabled={!editing}
                  onClick={() => setPainType(t)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    painType === t
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  } ${!editing ? 'opacity-90 cursor-default' : 'hover:border-slate-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 block">Clinical Notes &amp; Actions Taken</label>
            {editing ? (
              <textarea
                className="input w-full text-slate-900 bg-white"
                rows={3}
                placeholder="Clinical notes, PRN analgesia administered, GP escalation..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                {notes || 'No clinical notes recorded.'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel Edit</Button>
              <Button icon={<Save className="w-4 h-4" />} onClick={handleSave} loading={saving}>Save Changes</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function AbbeyPainScale() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Uniform filter bar state
  const [filterSu, setFilterSu] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // New assessment form state
  const [formOpen, setFormOpen] = useState(false)
  const [formSu, setFormSu] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [painType, setPainType] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal state for viewing / editing completed assessment
  const [activeRecord, setActiveRecord] = useState<any | null>(null)
  const [startInEdit, setStartInEdit] = useState(false)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user?.homeId])

  const loadHistory = async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const r = await api.get('/clinical/abbey-pain', {
        params: {
          homeId: user.homeId,
          suId: filterSu || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        },
      })
      setHistory(r.data.data || [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [user?.homeId, filterSu, dateFrom, dateTo])

  useEffect(() => {
    if (filterSu) setFormSu(filterSu)
  }, [filterSu])

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history
    const q = search.toLowerCase()
    return history.filter(h => (
      String(h.su_name || '').toLowerCase().includes(q) ||
      String(h.assessed_by_name || '').toLowerCase().includes(q) ||
      String(h.interpretation || '').toLowerCase().includes(q) ||
      String(h.pain_type || '').toLowerCase().includes(q) ||
      String(h.notes || '').toLowerCase().includes(q)
    ))
  }, [history, search])

  const allScored = ABBEY_ITEMS.every(item => scores[item.id] !== undefined)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const interp = allScored ? getAbbeyInterpretation(totalScore) : null

  const handlePrintList = () => {
    const resident = residents.find(r => r.id === filterSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'All Service Users'
    const sections: PrintSection[] = filteredHistory.length
      ? [{
          title: 'Completed Abbey Pain Scale Assessments',
          inner: `<table class="fields">${filteredHistory.map(h => `
            <tr>
              <th>${h.assessed_at ? fmtDate(h.assessed_at) : '—'}<br/><span style="font-weight:normal;color:#64748b">${esc(h.su_name || residentName)}</span></th>
              <td>Score <strong>${esc(h.total_score)} / 18</strong> — ${esc(h.interpretation)}${h.pain_type ? ` · ${esc(h.pain_type)}` : ''}${h.assessed_by_name ? ` · by ${esc(h.assessed_by_name)}` : ''}${h.notes ? `<br/><em>${nl(h.notes)}</em>` : ''}</td>
            </tr>`).join('')}</table>`,
        }]
      : [{ title: 'Assessments', inner: `<p class="body-text muted">No completed assessments match the current filter.</p>` }]
    const body = buildLetterheadPage({
      docTitle: 'Abbey Pain Scale Assessments',
      docSubtitle: 'Pain assessment log — non-verbal / dementia care',
      docRefPrefix: 'APS',
      docRefId: filterSu || 'ALL',
      residentName,
      sections,
    })
    openLetterheadPrint(`${residentName} — Abbey Pain Scale`, body)
  }

  const save = async () => {
    const targetSu = formSu || filterSu
    if (!targetSu) { toast.error('Please select a service user'); return }
    if (!allScored) { toast.error('Please score all 6 items'); return }
    setSaving(true)
    try {
      await api.post('/clinical/abbey-pain', {
        suId: targetSu,
        homeId: user?.homeId,
        vocalisation: scores.vocalisation,
        facialExpression: scores.facial_expression,
        bodyLanguage: scores.body_language,
        behaviouralChange: scores.behavioural_change,
        physiologicalChange: scores.physiological_change,
        physicalChange: scores.physical_change,
        totalScore,
        interpretation: interp?.label,
        painType,
        notes,
        assessedBy: user?.id,
      })
      toast.success('Abbey Pain Scale saved')
      setScores({})
      setPainType('')
      setNotes('')
      setFormOpen(false)
      await loadHistory()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const personOptions = useMemo(
    () => residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` })),
    [residents]
  )

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            Abbey Pain Scale
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Pain assessment for non-verbal / dementia service users</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintList}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <Button
            icon={formOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={() => setFormOpen(v => !v)}
          >
            {formOpen ? 'Hide Form' : 'New Assessment'}
          </Button>
        </div>
      </div>

      {/* Uniform Filter Bar */}
      <UniformFilterBar
        personLabel="Service User"
        personAllLabel="All Service Users"
        personValue={filterSu}
        onPersonChange={setFilterSu}
        personOptions={personOptions}
        searchPlaceholder="Search resident, pain level, pain type, staff, notes..."
        searchValue={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClear={() => {
          setFilterSu('')
          setSearch('')
          setDateFrom('')
          setDateTo('')
        }}
        shownCount={filteredHistory.length}
        totalCount={history.length}
      />

      {/* New Abbey Pain Scale Assessment Card */}
      {formOpen && (
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/80">
            <h2 className="font-bold text-slate-900">New Abbey Pain Scale — {format(new Date(), 'd MMMM yyyy, HH:mm')}</h2>
            <select
              className="input w-full sm:w-72 text-slate-900 bg-white"
              value={formSu}
              onChange={e => setFormSu(e.target.value)}
            >
              <option value="">— Select service user —</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {ABBEY_ITEMS.map((item, idx) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  {scores[item.id] !== undefined && (
                    <span
                      className="ml-auto text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: getAbbeyInterpretation(scores[item.id]).bg, color: getAbbeyInterpretation(scores[item.id]).color }}
                    >
                      {scores[item.id]} pts
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 ml-7">
                  {item.options.map(opt => (
                    <label
                      key={opt.score}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        scores[item.id] === opt.score ? 'border-rose-400 bg-rose-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={scores[item.id] === opt.score}
                        onChange={() => setScores(s => ({ ...s, [item.id]: opt.score }))}
                        className="accent-rose-600"
                      />
                      <span className="text-sm text-slate-800 flex-1">{opt.label}</span>
                      <span className="text-xs font-bold text-slate-500">{opt.score}</span>
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
                <p className="text-xs text-slate-600">Total score: {totalScore} / 18 · {interp.label.toLowerCase()} indicated</p>
              </div>
            </div>
          )}

          <div className="px-5 pb-5 space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Type of Pain</label>
              <div className="flex flex-wrap gap-2">
                {ABBEY_PAIN_TYPE_OPTIONS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPainType(t)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      painType === t ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="input w-full text-slate-900 bg-white"
              rows={2}
              placeholder="Clinical notes, actions taken, PRN medication given..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!allScored}>Save Assessment</Button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Assessments History — ALWAYS visible underneath */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h2 className="font-bold text-slate-900">Completed Pain Assessments ({filteredHistory.length})</h2>
          <span className="text-xs font-medium text-slate-500">Click any assessment to open full completed form &amp; edit</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No completed Abbey Pain Scale assessments match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredHistory.map((h: any) => {
              const hi = getAbbeyInterpretation(Number(h.total_score || 0))
              return (
                <div
                  key={h.id}
                  onClick={() => { setStartInEdit(false); setActiveRecord(h) }}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-rose-50/50 transition-colors cursor-pointer"
                >
                  <div
                    className="w-11 h-11 rounded-full border-2 flex items-center justify-center bg-white flex-shrink-0"
                    style={{ borderColor: hi.color }}
                  >
                    <span className="text-sm font-black" style={{ color: hi.color }}>{h.total_score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{h.su_name || 'Resident'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-sm font-bold" style={{ color: hi.color }}>{h.interpretation}</span>
                      {h.pain_type && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {h.pain_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {h.assessed_at ? format(new Date(h.assessed_at), 'dd MMM yyyy, HH:mm') : '—'}
                      {h.assessed_by_name ? ` · Assessed by ${h.assessed_by_name}` : ''}
                      {h.notes ? ` · "${h.notes}"` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setStartInEdit(false); setActiveRecord(h) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Form
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStartInEdit(true); setActiveRecord(h) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeRecord && (
        <AbbeyAssessmentDetailModal
          record={activeRecord}
          initialEdit={startInEdit}
          onClose={() => { setActiveRecord(null); setStartInEdit(false) }}
          onSaved={loadHistory}
        />
      )}
    </div>
  )
}
