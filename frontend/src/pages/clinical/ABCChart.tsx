import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Brain, Save, ChevronDown, ChevronUp, Printer, TrendingUp } from 'lucide-react'

const ANTECEDENTS = ['Personal care', 'Mealtimes', 'Medication time', 'Night time', 'Visiting family', 'Moving/transferring', 'Loud noise', 'Crowded area', 'Change of routine', 'Toileting', 'Other residents', 'Unknown']
const BEHAVIOURS = ['Verbal aggression', 'Physical aggression', 'Self-harm', 'Wandering', 'Shouting/screaming', 'Refusal of care', 'Restlessness', 'Tearfulness', 'Repetitive questioning', 'Sexual disinhibition', 'Hoarding', 'Other']
const CONSEQUENCES = ['Verbal redirection', 'Physical guidance', 'PRN medication given', '1:1 support provided', 'Environment changed', 'Activity offered', 'Carer changed', 'Escalated to nurse', 'GP contacted', 'Family informed', 'Incident report filed', 'Settled independently']
const INTENSITY = ['Mild', 'Moderate', 'Severe']

export default function ABCChart() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  // Form
  const [antecedents, setAntecedents] = useState<string[]>([])
  const [antOther, setAntOther] = useState('')
  const [behaviours, setBehaviours] = useState<string[]>([])
  const [behOther, setBehOther] = useState('')
  const [intensity, setIntensity] = useState('')
  const [duration, setDuration] = useState('')
  const [consequences, setConsequences] = useState<string[]>([])
  const [residentResponse, setResidentResponse] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [viewPatterns, setViewPatterns] = useState(false)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/abc-chart/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const canSave = behaviours.length > 0 && intensity

  const save = async () => {
    if (!selectedSu || !canSave) return
    setSaving(true)
    try {
      await api.post('/clinical/abc-chart', {
        suId: selectedSu, homeId: user?.homeId,
        antecedents: [...antecedents, ...(antOther ? [antOther] : [])],
        behaviours: [...behaviours, ...(behOther ? [behOther] : [])],
        intensity, duration, consequences, residentResponse, notes,
        staffId: user?.id,
      })
      toast.success('ABC Chart entry saved')
      const r = await api.get(`/clinical/abc-chart/${selectedSu}`)
      setHistory(r.data.data || [])
      setAntecedents([]); setAntOther(''); setBehaviours([]); setBehOther('')
      setIntensity(''); setDuration(''); setConsequences([]); setResidentResponse(''); setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  // Pattern analysis
  const patterns = React.useMemo(() => {
    if (!history.length) return null
    const antCount: Record<string, number> = {}
    const behCount: Record<string, number> = {}
    history.forEach((h: any) => {
      (h.antecedents || []).forEach((a: string) => { antCount[a] = (antCount[a] || 0) + 1 })
      ;(h.behaviours || []).forEach((b: string) => { behCount[b] = (behCount[b] || 0) + 1 })
    })
    const topAnt = Object.entries(antCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topBeh = Object.entries(behCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { topAnt, topBeh, total: history.length }
  }, [history])

  const INTENSITY_COLOR: Record<string, string> = { Mild: '#854d0e', Moderate: '#9a3412', Severe: '#7f1d1d' }
  const INTENSITY_BG: Record<string, string> = { Mild: '#fefce8', Moderate: '#fff7ed', Severe: '#fef2f2' }

  const MultiSelect = ({ opts, selected, setSelected, label }: { opts: string[]; selected: string[]; setSelected: (v: string[]) => void; label: string }) => (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(opt => (
          <button key={opt} onClick={() => toggle(opt, selected, setSelected)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              selected.includes(opt) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}>{opt}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            ABC Behaviour Chart
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Antecedent · Behaviour · Consequence — behaviour tracking and pattern analysis</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden">
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
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">New Entry — {format(new Date(), 'd MMM yyyy, HH:mm')}</h2>
              </div>
            </div>
            <div className="px-5 py-5 space-y-5">
              {/* A — Antecedent */}
              <div className="rounded-xl border-l-4 border-blue-400 bg-blue-50/40 pl-4 pr-4 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">A — Antecedent (what happened before)</p>
                <MultiSelect opts={ANTECEDENTS} selected={antecedents} setSelected={setAntecedents} label="Select all triggers that apply" />
                <input type="text" className="input w-full mt-2" placeholder="Other antecedent..." value={antOther} onChange={e => setAntOther(e.target.value)} />
              </div>

              {/* B — Behaviour */}
              <div className="rounded-xl border-l-4 border-purple-400 bg-purple-50/40 pl-4 pr-4 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-3">B — Behaviour (what was observed)</p>
                <MultiSelect opts={BEHAVIOURS} selected={behaviours} setSelected={setBehaviours} label="Select all behaviours observed" />
                <input type="text" className="input w-full mt-2" placeholder="Describe other behaviour..." value={behOther} onChange={e => setBehOther(e.target.value)} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {INTENSITY.map(lvl => (
                    <button key={lvl} onClick={() => setIntensity(lvl)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        intensity === lvl ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                      style={intensity === lvl ? { background: INTENSITY_COLOR[lvl], borderColor: INTENSITY_COLOR[lvl] } : {}}>
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500">Duration:</label>
                  <input type="text" className="input flex-1" placeholder="e.g. 10 minutes" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
              </div>

              {/* C — Consequence */}
              <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/40 pl-4 pr-4 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">C — Consequence (staff response)</p>
                <MultiSelect opts={CONSEQUENCES} selected={consequences} setSelected={setConsequences} label="Select all actions taken" />
                <textarea className="input w-full mt-2" rows={2} placeholder="Resident's response / outcome..." value={residentResponse} onChange={e => setResidentResponse(e.target.value)} />
              </div>

              <textarea className="input w-full" rows={2} placeholder="Additional notes for care team..." value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!canSave}>Save Entry</Button>
              </div>
            </div>
          </div>

          {/* Pattern Analysis */}
          {patterns && patterns.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
              <button onClick={() => setViewPatterns(!viewPatterns)}
                className="w-full px-5 py-4 flex items-center gap-2 hover:bg-slate-50 text-left border-b border-slate-100">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-slate-800 flex-1">Pattern Analysis <span className="text-slate-400 font-normal text-sm">({patterns.total} entries)</span></h2>
                {viewPatterns ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {viewPatterns && (
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Top Triggers</p>
                    {patterns.topAnt.map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(v / patterns.total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 w-24 truncate">{k}</span>
                        <span className="text-xs font-bold text-slate-500 w-6 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Top Behaviours</p>
                    {patterns.topBeh.map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${(v / patterns.total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 w-24 truncate">{k}</span>
                        <span className="text-xs font-bold text-slate-500 w-6 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">ABC Log</h2></div>
                <div className="divide-y divide-slate-50">
                  {history.map((h: any) => (
                    <div key={h.id}>
                      <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 text-left">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                          style={{ background: INTENSITY_COLOR[h.intensity] || '#475569' }}>
                          {h.intensity || 'Logged'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{(h.behaviours || []).join(', ') || 'Behaviour logged'}</p>
                          <p className="text-xs text-slate-400">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM yyyy, HH:mm') : ''}{h.staff_name ? ` · ${h.staff_name}` : ''}</p>
                        </div>
                        {expanded === h.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {expanded === h.id && (
                        <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100 space-y-2 mt-2">
                          <p className="text-xs"><span className="font-semibold text-blue-600">A:</span> <span className="text-slate-600">{(h.antecedents || []).join(', ') || '—'}</span></p>
                          <p className="text-xs"><span className="font-semibold text-purple-600">B:</span> <span className="text-slate-600">{(h.behaviours || []).join(', ')} {h.duration ? `· ${h.duration}` : ''}</span></p>
                          <p className="text-xs"><span className="font-semibold text-emerald-600">C:</span> <span className="text-slate-600">{(h.consequences || []).join(', ') || '—'}</span></p>
                          {h.notes && <p className="text-xs text-slate-500 italic">{h.notes}</p>}
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
