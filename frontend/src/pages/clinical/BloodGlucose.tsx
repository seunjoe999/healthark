import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Droplets, Save, Printer, TrendingUp, AlertTriangle } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'

const READING_TYPES = ['Pre-breakfast', 'Post-breakfast', 'Pre-lunch', 'Post-lunch', 'Pre-dinner', 'Post-dinner', 'Bedtime', 'Random', 'Hypo check']

function getGlucoseStatus(val: number) {
  if (val < 4.0) return { label: 'HYPO', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca', action: 'Immediate action required — give 15g fast-acting carbohydrate, recheck in 15 mins, inform nurse/GP' }
  if (val <= 7.0) return { label: 'Normal', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', action: null }
  if (val <= 11.0) return { label: 'Elevated', color: '#92400e', bg: '#fffbeb', border: '#fde68a', action: 'Above target range. Monitor and document. Inform nurse if persistent.' }
  return { label: 'HIGH', color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca', action: 'Significantly elevated. Inform nurse immediately. Check for symptoms of hyperglycaemia.' }
}

export default function BloodGlucose() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [readingType, setReadingType] = useState('')
  const [glucoseValue, setGlucoseValue] = useState('')
  const [insulinGiven, setInsulinGiven] = useState(false)
  const [insulinType, setInsulinType] = useState('')
  const [insulinUnits, setInsulinUnits] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [action, setAction] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/blood-glucose/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const val = parseFloat(glucoseValue)
  const status = !isNaN(val) && val > 0 ? getGlucoseStatus(val) : null
  const canSave = readingType && !isNaN(val) && val > 0

  const save = async () => {
    if (!selectedSu || !canSave) return
    setSaving(true)
    try {
      await api.post('/clinical/blood-glucose', {
        suId: selectedSu, homeId: user?.homeId,
        readingType, glucoseMmol: val, insulinGiven,
        insulinType: insulinGiven ? insulinType : null,
        insulinUnits: insulinGiven ? parseFloat(insulinUnits) || null : null,
        symptoms, actionTaken: action, notes, staffId: user?.id,
      })
      toast.success('Reading saved')
      const r = await api.get(`/clinical/blood-glucose/${selectedSu}`)
      setHistory(r.data.data || [])
      setReadingType(''); setGlucoseValue(''); setInsulinGiven(false); setInsulinType(''); setInsulinUnits(''); setSymptoms(''); setAction(''); setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  // Average last 7 readings
  const avg = history.length > 0
    ? Math.round((history.slice(0, 7).reduce((s: number, h: any) => s + parseFloat(h.glucose_mmol), 0) / Math.min(history.length, 7)) * 10) / 10
    : null

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const sections: PrintSection[] = []
    if (history.length) {
      const rows = history.map((h: any) => {
        const s = getGlucoseStatus(parseFloat(h.glucose_mmol))
        return `<tr><th>${h.recorded_at ? fmtDate(h.recorded_at) : '—'}</th>
          <td><strong style="color:${s.color}">${esc(h.glucose_mmol)} mmol/L — ${s.label}</strong><br/>
          ${esc(h.reading_type)}${h.insulin_given ? ` · Insulin: ${esc(h.insulin_type)} ${esc(h.insulin_units)}u` : ''}${h.staff_name ? ` · ${esc(h.staff_name)}` : ''}
          ${h.symptoms ? `<br/>Symptoms: ${esc(h.symptoms)}` : ''}${h.action_taken ? `<br/>Action: ${esc(h.action_taken)}` : ''}${h.notes ? `<br/><em>${esc(h.notes)}</em>` : ''}</td></tr>`
      }).join('')
      sections.push({
        title: 'Reading History',
        inner: `${avg !== null ? `<div class="risk-box"><span class="rb-label">7-Reading Average</span><span class="rb-value">${avg} mmol/L</span></div>` : ''}<table class="fields">${rows}</table>`,
      })
    } else {
      sections.push({ title: 'Blood Glucose Log', inner: `<p class="body-text muted">No blood glucose readings recorded yet for this resident.</p>` })
    }
    const body = buildLetterheadPage({
      docTitle: 'Blood Glucose Log', docSubtitle: 'Blood glucose monitoring and insulin tracking',
      docRefPrefix: 'BG', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — Blood Glucose Log`, body)
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-600" />
            Blood Glucose Log
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Blood glucose monitoring and insulin tracking for diabetic residents</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
            <select className="input w-full" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
              <option value="">— Select resident —</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          {avg !== null && (
            <div className="text-right">
              <p className="text-xs text-slate-400">7-reading avg</p>
              <p className="text-2xl font-black" style={{ color: getGlucoseStatus(avg).color }}>{avg} <span className="text-sm font-normal text-slate-400">mmol/L</span></p>
            </div>
          )}
        </div>
      </div>

      {selectedSu && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">New Reading — {format(new Date(), 'd MMM yyyy, HH:mm')}</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Reading Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {READING_TYPES.map(t => (
                    <button key={t} onClick={() => setReadingType(t)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        readingType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Blood Glucose (mmol/L)</label>
                  <input type="number" step="0.1" min="1" max="30" className="input w-32 text-center text-lg font-bold"
                    placeholder="e.g. 6.5" value={glucoseValue} onChange={e => setGlucoseValue(e.target.value)} />
                </div>
                {status && (
                  <div className="flex-1 rounded-xl px-4 py-3 border-2" style={{ background: status.bg, borderColor: status.border }}>
                    <p className="text-sm font-black" style={{ color: status.color }}>{status.label}</p>
                    {status.action && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{status.action}</p>}
                  </div>
                )}
              </div>

              {status?.label === 'HYPO' && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-semibold">HYPOGLYCAEMIA PROTOCOL: Give 15g fast-acting carbohydrate (e.g. 150ml fruit juice). Recheck in 15 minutes. If no improvement or resident unconscious, call 999 immediately.</p>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={insulinGiven} onChange={e => setInsulinGiven(e.target.checked)} className="accent-blue-600" />
                  Insulin administered
                </label>
                {insulinGiven && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <input type="text" className="input" placeholder="Insulin type (e.g. Novorapid)" value={insulinType} onChange={e => setInsulinType(e.target.value)} />
                    <input type="number" className="input" placeholder="Units" value={insulinUnits} onChange={e => setInsulinUnits(e.target.value)} />
                  </div>
                )}
              </div>

              <input type="text" className="input w-full" placeholder="Symptoms noted (e.g. shaking, sweating, confusion)..." value={symptoms} onChange={e => setSymptoms(e.target.value)} />
              <input type="text" className="input w-full" placeholder="Actions taken..." value={action} onChange={e => setAction(e.target.value)} />
              <textarea className="input w-full" rows={2} placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />

              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!canSave}>Save Reading</Button>
              </div>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-slate-800">Reading History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left">Date / Time</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-center">mmol/L</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 text-left">Insulin</th>
                        <th className="px-4 py-2 text-left">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map((h: any) => {
                        const s = getGlucoseStatus(parseFloat(h.glucose_mmol))
                        return (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM, HH:mm') : '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-700">{h.reading_type}</td>
                            <td className="px-4 py-3 text-center font-black text-base" style={{ color: s.color }}>{h.glucose_mmol}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">{h.insulin_given ? `${h.insulin_type || ''} ${h.insulin_units ? h.insulin_units + 'u' : ''}`.trim() : '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-400">{h.staff_name || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}
