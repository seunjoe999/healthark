import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, eachDayOfInterval, endOfMonth } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Smile, Save, Printer } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'

const MOUTH_CONDITIONS = ['Normal/healthy', 'Dry mouth', 'Sore mouth', 'Bleeding gums', 'Oral thrush', 'Ulcers', 'Halitosis', 'Food debris']
const PRODUCTS = ['Toothpaste + brush', 'Mouthwash', 'Denture adhesive', 'Dental floss', 'Interdental brush', 'Dry mouth gel', 'Lip balm']
const ASSISTANCE = ['Independent', 'Prompting only', 'Partial assistance', 'Full assistance']

export default function OralHygiene() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  const [session, setSession] = useState<'Morning' | 'Evening'>('Morning')
  const [mouthConditions, setMouthConditions] = useState<string[]>([])
  const [upperDenture, setUpperDenture] = useState<'Cleaned' | 'Not present' | 'Not cleaned' | ''>('')
  const [lowerDenture, setLowerDenture] = useState<'Cleaned' | 'Not present' | 'Not cleaned' | ''>('')
  const [products, setProducts] = useState<string[]>([])
  const [assistance, setAssistance] = useState('')
  const [refused, setRefused] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMonth] = useState(new Date())

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/oral-hygiene/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const save = async () => {
    if (!selectedSu || !assistance) return
    setSaving(true)
    try {
      await api.post('/clinical/oral-hygiene', {
        suId: selectedSu, homeId: user?.homeId, session,
        mouthConditions, upperDenture, lowerDenture,
        products, assistance, refused, notes, staffId: user?.id,
      })
      toast.success('Oral hygiene record saved')
      const r = await api.get(`/clinical/oral-hygiene/${selectedSu}`)
      setHistory(r.data.data || [])
      setMouthConditions([]); setUpperDenture(''); setLowerDenture(''); setProducts([]); setAssistance(''); setRefused(false); setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  // Monthly calendar grid
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const entryByDay: Record<string, any[]> = {}
  history.forEach(h => {
    const d = format(new Date(h.recorded_at), 'yyyy-MM-dd')
    if (!entryByDay[d]) entryByDay[d] = []
    entryByDay[d].push(h)
  })

  const getDayColor = (entries: any[]) => {
    if (!entries || entries.length === 0) return '#f1f5f9'
    const hasRefused = entries.some(e => e.refused)
    if (hasRefused) return '#fee2e2'
    if (entries.length >= 2) return '#bbf7d0'
    return '#fef9c3'
  }

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const sections: PrintSection[] = []
    if (history.length) {
      const rows = history.map((h: any) => `
        <tr><th>${h.recorded_at ? fmtDate(h.recorded_at) : '—'}<br/><span style="font-weight:400;font-size:8.5px">${esc(h.session)}</span></th>
        <td>${h.refused ? '<strong style="color:#b91c1c">Refused oral care</strong>' : esc((h.mouth_conditions || []).join(', '))}
        ${h.assistance ? `<br/>Assistance: ${esc(h.assistance)}` : ''}
        ${(h.products || []).length ? `<br/>Products: ${esc((h.products || []).join(', '))}` : ''}
        ${h.upper_denture ? `<br/>Upper denture: ${esc(h.upper_denture)}` : ''}${h.lower_denture ? ` · Lower denture: ${esc(h.lower_denture)}` : ''}
        ${h.staff_name ? `<br/>Recorded by: ${esc(h.staff_name)}` : ''}${h.notes ? `<br/><em>${esc(h.notes)}</em>` : ''}</td></tr>
      `).join('')
      sections.push({ title: 'Oral Hygiene Records', inner: `<table class="fields">${rows}</table>` })
    } else {
      sections.push({ title: 'Oral Hygiene Chart', inner: `<p class="body-text muted">No oral hygiene records recorded yet for this resident.</p>` })
    }
    const body = buildLetterheadPage({
      docTitle: 'Oral Hygiene Chart', docSubtitle: 'Daily oral care record — morning and evening',
      docRefPrefix: 'OH', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — Oral Hygiene Chart`, body)
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Smile className="w-6 h-6 text-sky-500" />
            Oral Hygiene Chart
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily oral care recording — morning and evening</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
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
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">New Entry — {format(new Date(), 'd MMM yyyy')}</h2>
              <div className="flex rounded-xl overflow-hidden border border-slate-200">
                {(['Morning', 'Evening'] as const).map(s => (
                  <button key={s} onClick={() => setSession(s)}
                    className={`px-4 py-1.5 text-xs font-bold transition-all ${session === s ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Mouth Condition <span className="font-normal text-slate-400">(tick all that apply)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {MOUTH_CONDITIONS.map(c => (
                    <button key={c} onClick={() => toggle(c, mouthConditions, setMouthConditions)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        mouthConditions.includes(c) ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Upper Denture</label>
                  <div className="space-y-1">
                    {['Cleaned', 'Not present', 'Not cleaned'].map(v => (
                      <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${upperDenture === v ? 'border-sky-400 bg-sky-50' : 'border-slate-100'}`}>
                        <input type="radio" checked={upperDenture === v} onChange={() => setUpperDenture(v as any)} className="accent-sky-500" />
                        <span className="text-xs text-slate-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Lower Denture</label>
                  <div className="space-y-1">
                    {['Cleaned', 'Not present', 'Not cleaned'].map(v => (
                      <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${lowerDenture === v ? 'border-sky-400 bg-sky-50' : 'border-slate-100'}`}>
                        <input type="radio" checked={lowerDenture === v} onChange={() => setLowerDenture(v as any)} className="accent-sky-500" />
                        <span className="text-xs text-slate-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Products Used</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCTS.map(p => (
                    <button key={p} onClick={() => toggle(p, products, setProducts)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        products.includes(p) ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Level of Assistance</label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSISTANCE.map(a => (
                    <label key={a} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${assistance === a ? 'border-sky-400 bg-sky-50' : 'border-slate-100'}`}>
                      <input type="radio" checked={assistance === a} onChange={() => setAssistance(a)} className="accent-sky-500" />
                      <span className="text-xs text-slate-700">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-red-700 cursor-pointer">
                <input type="checkbox" checked={refused} onChange={e => setRefused(e.target.checked)} className="accent-red-600" />
                Resident refused oral care
              </label>

              <textarea className="input w-full" rows={2} placeholder="Additional notes, referrals (dentist, hygienist)..." value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!assistance}>Save Record</Button>
              </div>
            </div>
          </div>

          {/* Monthly Calendar */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{format(viewMonth, 'MMMM yyyy')}</h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-200 inline-block"/> Both sessions</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-100 inline-block"/> One session</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block"/> Refused</span>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['M','T','W','T','F','S','S'].map((d, i) => <p key={i} className="text-[10px] text-center text-slate-400 font-bold">{d}</p>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() === 0 ? 6 : new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() - 1).fill(null).map((_, i) => <div key={i} />)}
                {days.map(d => {
                  const key = format(d, 'yyyy-MM-dd')
                  const entries = entryByDay[key] || []
                  const bg = getDayColor(entries)
                  const isToday = key === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <div key={key} className="aspect-square rounded-lg flex flex-col items-center justify-center relative"
                      style={{ background: bg, border: isToday ? '2px solid #0ea5e9' : 'none' }}>
                      <span className="text-[10px] font-bold text-slate-600">{format(d, 'd')}</span>
                      {entries.length > 0 && <span className="text-[8px] text-slate-400">{entries.length}x</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Recent Records</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left">Date/Time</th>
                        <th className="px-4 py-2 text-left">Session</th>
                        <th className="px-4 py-2 text-left">Condition</th>
                        <th className="px-4 py-2 text-left">Assistance</th>
                        <th className="px-4 py-2 text-left">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.slice(0, 30).map((h: any) => (
                        <tr key={h.id} className={`hover:bg-slate-50 ${h.refused ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2.5 whitespace-nowrap">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM, HH:mm') : '—'}</td>
                          <td className="px-4 py-2.5">{h.session}</td>
                          <td className="px-4 py-2.5 text-slate-600">{h.refused ? <span className="text-red-600 font-bold">Refused</span> : (h.mouth_conditions || []).join(', ') || '—'}</td>
                          <td className="px-4 py-2.5">{h.assistance}</td>
                          <td className="px-4 py-2.5 text-slate-400">{h.staff_name}</td>
                        </tr>
                      ))}
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
