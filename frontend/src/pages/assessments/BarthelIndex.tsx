import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Activity, ChevronDown, ChevronUp, Save, Printer } from 'lucide-react'

// Barthel Index — 10 domain, 0–100 scale (Mahoney & Barthel 1965)
const DOMAINS = [
  {
    id: 'feeding',
    label: 'Feeding',
    description: 'Ability to eat food that has been prepared and served.',
    options: [
      { value: 10, label: 'Independent (able to eat from a tray or table when someone puts food within reach)' },
      { value: 5,  label: 'Some help needed (e.g. cutting food, spreading butter)' },
      { value: 0,  label: 'Dependent — needs to be fed' },
    ]
  },
  {
    id: 'bathing',
    label: 'Bathing',
    description: 'Ability to bath/shower self without assistance.',
    options: [
      { value: 5, label: 'Independent (can use bath/shower without supervision or help)' },
      { value: 0, label: 'Dependent — needs assistance' },
    ]
  },
  {
    id: 'grooming',
    label: 'Grooming',
    description: 'Face washing, hair combing, shaving, teeth cleaning.',
    options: [
      { value: 5, label: 'Independent (implements can be provided)' },
      { value: 0, label: 'Needs help with personal care' },
    ]
  },
  {
    id: 'dressing',
    label: 'Dressing',
    description: 'Ability to dress and undress.',
    options: [
      { value: 10, label: 'Independent (including buttons, zips, laces)' },
      { value: 5,  label: 'Needs help but can do about half unaided' },
      { value: 0,  label: 'Dependent — needs total assistance' },
    ]
  },
  {
    id: 'bowel_control',
    label: 'Bowel Control',
    description: 'Control of bowels over the preceding week.',
    options: [
      { value: 10, label: 'Continent (no accidents)' },
      { value: 5,  label: 'Occasional accident (once per week or less)' },
      { value: 0,  label: 'Incontinent or needs enemas' },
    ]
  },
  {
    id: 'bladder_control',
    label: 'Bladder Control',
    description: 'Control of bladder over the preceding week (or 24 hours if catheterised).',
    options: [
      { value: 10, label: 'Continent (or able to manage own catheter)' },
      { value: 5,  label: 'Occasional accident (max. once per 24 hours)' },
      { value: 0,  label: 'Incontinent or catheter managed by someone else' },
    ]
  },
  {
    id: 'toilet_use',
    label: 'Toilet Use',
    description: 'Ability to use toilet/commode.',
    options: [
      { value: 10, label: 'Independent (on/off, dressing, wiping, flushing)' },
      { value: 5,  label: 'Needs some help but can do something' },
      { value: 0,  label: 'Dependent — needs full assistance' },
    ]
  },
  {
    id: 'transfers',
    label: 'Transfers (Chair/Bed)',
    description: 'Ability to get in and out of bed and chair.',
    options: [
      { value: 15, label: 'Independent (including locking wheelchair, lifting footrests)' },
      { value: 10, label: 'Minor help needed (verbal or physical)' },
      { value: 5,  label: 'Major help needed (one or two people), can sit' },
      { value: 0,  label: 'Dependent — unable to transfer' },
    ]
  },
  {
    id: 'mobility',
    label: 'Mobility on Level Surfaces',
    description: 'Ability to walk (or propel wheelchair) on level ground.',
    options: [
      { value: 15, label: 'Independent (may use aid, e.g. stick) for 50 yards' },
      { value: 10, label: 'Walks with help of one person (verbal or physical) for 50 yards' },
      { value: 5,  label: 'Independent in wheelchair for 50 yards' },
      { value: 0,  label: 'Dependent — immobile' },
    ]
  },
  {
    id: 'stairs',
    label: 'Stairs',
    description: 'Ability to go up and down stairs.',
    options: [
      { value: 10, label: 'Independent (may use handrail or stick)' },
      { value: 5,  label: 'Needs help (verbal, physical or carrying aid)' },
      { value: 0,  label: 'Unable to manage stairs' },
    ]
  },
]

function getInterpretation(score: number) {
  if (score <= 20) return { label: 'Total Dependency', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' }
  if (score <= 35) return { label: 'Severe Dependency', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
  if (score <= 60) return { label: 'Moderate Dependency', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  if (score <= 90) return { label: 'Mild Dependency', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' }
  return { label: 'Independent', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' }
}

export default function BarthelIndex() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
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
    setScores({})
    setNotes('')
    setLoading(true)
    api.get(`/assessments/barthel/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const allAnswered = DOMAINS.every(d => scores[d.id] !== undefined)

  const save = async () => {
    if (!selectedSu || !allAnswered) return
    setSaving(true)
    try {
      await api.post('/assessments/barthel', {
        suId: selectedSu,
        homeId: user?.homeId,
        scores,
        totalScore,
        notes,
        assessedBy: user?.id,
      })
      toast.success('Barthel Index saved')
      // Refresh history
      const r = await api.get(`/assessments/barthel/${selectedSu}`)
      setHistory(r.data.data || [])
      setScores({})
      setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const interp = getInterpretation(totalScore)

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Barthel Index
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Validated ADL dependency assessment — scores from 0 (total dependency) to 100 (full independence)
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
          {/* Score entry */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">New Assessment — {format(new Date(), 'd MMMM yyyy')}</h2>
              {Object.keys(scores).length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: interp.color }}>{totalScore}<span className="text-sm font-medium text-slate-400">/100</span></p>
                    <p className="text-xs font-semibold" style={{ color: interp.color }}>{interp.label}</p>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center border-4 flex-shrink-0"
                    style={{ borderColor: interp.color, background: interp.bg }}>
                    <span className="text-xs font-black" style={{ color: interp.color }}>{totalScore}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-50">
              {DOMAINS.map(domain => (
                <div key={domain.id} className="px-5 py-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{domain.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{domain.description}</p>
                    </div>
                    {scores[domain.id] !== undefined && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                        {scores[domain.id]} pts
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {domain.options.map(opt => (
                      <label key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          scores[domain.id] === opt.value
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                        }`}>
                        <input type="radio" name={domain.id}
                          checked={scores[domain.id] === opt.value}
                          onChange={() => setScores(s => ({ ...s, [domain.id]: opt.value }))}
                          className="mt-0.5 flex-shrink-0 accent-blue-600" />
                        <div>
                          <span className="text-xs font-bold text-blue-600 mr-2">{opt.value} pts</span>
                          <span className="text-sm text-slate-700">{opt.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Score summary */}
            {allAnswered && (
              <div className="mx-5 my-4 rounded-xl p-4 border-2" style={{ background: interp.bg, borderColor: interp.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: interp.color }}>
                      Total Score: {totalScore}/100
                    </p>
                    <p className="text-lg font-black" style={{ color: interp.color }}>{interp.label}</p>
                    <p className="text-xs mt-1 text-slate-600">
                      {totalScore <= 20 && 'Resident requires full nursing care for all activities of daily living.'}
                      {totalScore > 20 && totalScore <= 35 && 'Resident requires substantial assistance with most activities.'}
                      {totalScore > 35 && totalScore <= 60 && 'Resident requires help with many activities but has some independence.'}
                      {totalScore > 60 && totalScore <= 90 && 'Resident is largely independent but needs some help with certain tasks.'}
                      {totalScore > 90 && 'Resident is fully independent in all activities of daily living.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="px-5 pb-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">
                Assessment Notes (optional)
              </label>
              <textarea className="input w-full" rows={3}
                placeholder="Any additional observations or context for this assessment..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="px-5 pb-5 flex justify-end">
              <Button
                icon={<Save className="w-4 h-4" />}
                onClick={save}
                loading={saving}
                disabled={!allAnswered}>
                Save Assessment
              </Button>
            </div>
          </div>

          {/* History */}
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : history.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Previous Assessments</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {history.map((h: any) => {
                  const hi = getInterpretation(h.total_score)
                  return (
                    <div key={h.id}>
                      <button
                        onClick={() => setExpandedHistory(expandedHistory === h.id ? null : h.id)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 text-left transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                            style={{ borderColor: hi.color, background: hi.bg }}>
                            <span className="text-xs font-black" style={{ color: hi.color }}>{h.total_score}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Score: {h.total_score}/100 — <span style={{ color: hi.color }}>{hi.label}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {h.assessed_at ? format(new Date(h.assessed_at), 'd MMMM yyyy') : ''}
                              {h.assessed_by_name ? ` · ${h.assessed_by_name}` : ''}
                            </p>
                          </div>
                        </div>
                        {expandedHistory === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {expandedHistory === h.id && (
                        <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                            {DOMAINS.map(d => {
                              const s = h.scores?.[d.id]
                              if (s === undefined) return null
                              return (
                                <div key={d.id} className="bg-white rounded-lg p-2.5 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-500">{d.label}</p>
                                  <p className="text-sm font-bold text-slate-800">{s} pts</p>
                                </div>
                              )
                            })}
                          </div>
                          {h.notes && (
                            <p className="text-xs text-slate-600 mt-3 italic">Notes: {h.notes}</p>
                          )}
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
              <p className="text-sm font-medium">No previous assessments for this resident</p>
              <p className="text-xs mt-1">Complete the form above to record the first assessment.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
