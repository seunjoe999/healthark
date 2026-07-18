import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Droplet, Save, Printer, AlertTriangle } from 'lucide-react'

const CATHETER_TYPES = ['Urethral', 'Suprapubic', 'Intermittent']
const URINE_COLOURS = ['Clear/pale yellow (normal)', 'Dark yellow', 'Amber/brown', 'Pink/red (haematuria)', 'Cloudy', 'Offensive smell']
const COMPLICATIONS = ['Leakage/bypassing', 'Blockage/no drainage', 'Blood in urine', 'Infection signs (fever/pain)', 'Catheter fallen out', 'Visible debris', 'Skin irritation at site', 'Pain/discomfort']
const ACTIONS = ['Bag emptied and measured', 'Bag changed', 'Catheter cleaned (ANTT)', 'Leg bag to night bag', 'Night bag to leg bag', 'Catheter flushed', 'Catheter changed', 'GP/nurse informed', 'TWOC commenced']

export default function CatheterCare() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  // Catheter details (one-time setup)
  const [showSetup, setShowSetup] = useState(false)
  const [catheterType, setCatheterType] = useState('')
  const [cathSize, setCathSize] = useState('')
  const [insertedDate, setInsertedDate] = useState('')
  const [changeDate, setChangeDate] = useState('')
  const [batchNo, setBatchNo] = useState('')

  // Daily log
  const [urineColour, setUrineColour] = useState('')
  const [urineAmount, setUrineAmount] = useState('')
  const [complications, setComplications] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
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
    api.get(`/clinical/catheter/${selectedSu}`)
      .then(r => { setHistory(r.data.data || []) })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const hasComplications = complications.length > 0

  const save = async () => {
    if (!selectedSu || !urineColour) return
    setSaving(true)
    try {
      await api.post('/clinical/catheter', {
        suId: selectedSu, homeId: user?.homeId,
        catheterType: showSetup ? catheterType : undefined,
        cathSize: showSetup ? cathSize : undefined,
        insertedDate: showSetup ? insertedDate : undefined,
        changeDate: showSetup ? changeDate : undefined,
        batchNo: showSetup ? batchNo : undefined,
        urineColour, urineAmountMl: urineAmount ? parseFloat(urineAmount) : null,
        complications, actions, notes, staffId: user?.id,
      })
      toast.success('Catheter care record saved')
      const r = await api.get(`/clinical/catheter/${selectedSu}`)
      setHistory(r.data.data || [])
      setUrineColour(''); setUrineAmount(''); setComplications([]); setActions([]); setNotes('')
      setShowSetup(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  // Latest setup info
  const latestSetup = history.find(h => h.catheter_type)

  // Upcoming change date alert
  const nextChange = latestSetup?.change_date ? new Date(latestSetup.change_date) : null
  const daysToChange = nextChange ? Math.ceil((nextChange.getTime() - Date.now()) / 86400000) : null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Droplet className="w-6 h-6 text-blue-500" />
            Catheter Care Log
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Urinary catheter management and daily care recording</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
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
          {/* Change date alert */}
          {daysToChange !== null && daysToChange <= 7 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 border ${daysToChange <= 2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${daysToChange <= 2 ? 'text-red-600' : 'text-amber-600'}`} />
              <p className={`text-xs font-semibold ${daysToChange <= 2 ? 'text-red-700' : 'text-amber-700'}`}>
                Catheter change {daysToChange <= 0 ? 'OVERDUE' : `due in ${daysToChange} day${daysToChange === 1 ? '' : 's'}`} — {nextChange ? format(nextChange, 'd MMM yyyy') : ''}
              </p>
            </div>
          )}

          {/* Current catheter info */}
          {latestSetup && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-5 flex flex-wrap gap-4 items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Type</p>
                <p className="text-sm font-bold text-slate-700">{latestSetup.catheter_type}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Size</p>
                <p className="text-sm font-bold text-slate-700">Fr {latestSetup.cath_size}</p>
              </div>
              {latestSetup.inserted_date && <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Inserted</p>
                <p className="text-sm font-bold text-slate-700">{format(new Date(latestSetup.inserted_date), 'd MMM yyyy')}</p>
              </div>}
              {latestSetup.change_date && <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Next Change</p>
                <p className="text-sm font-bold text-slate-700">{format(new Date(latestSetup.change_date), 'd MMM yyyy')}</p>
              </div>}
              <button onClick={() => setShowSetup(true)} className="ml-auto text-xs text-blue-600 font-semibold">Update catheter details</button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Daily Care Entry — {format(new Date(), 'd MMM yyyy, HH:mm')}</h2>
            </div>
            <div className="px-5 py-5 space-y-5">
              {(!latestSetup || showSetup) && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Catheter Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
                      <select className="input w-full" value={catheterType} onChange={e => setCatheterType(e.target.value)}>
                        <option value="">Select...</option>
                        {CATHETER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Size (Fr)</label>
                      <input type="text" className="input w-full" placeholder="e.g. 14" value={cathSize} onChange={e => setCathSize(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Inserted</label>
                      <input type="date" className="input w-full" value={insertedDate} onChange={e => setInsertedDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Next Change Date</label>
                      <input type="date" className="input w-full" value={changeDate} onChange={e => setChangeDate(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Batch Number</label>
                      <input type="text" className="input w-full" placeholder="Catheter batch/lot number" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Urine Colour / Appearance</label>
                <div className="space-y-1">
                  {URINE_COLOURS.map(c => (
                    <label key={c} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${urineColour === c ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="radio" checked={urineColour === c} onChange={() => setUrineColour(c)} className="accent-blue-600" />
                      <span className="text-sm text-slate-700">{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Output Amount (ml)</label>
                <input type="number" className="input w-32" placeholder="e.g. 350" value={urineAmount} onChange={e => setUrineAmount(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Complications Observed</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPLICATIONS.map(c => (
                    <button key={c} onClick={() => toggle(c, complications, setComplications)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        complications.includes(c) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{c}</button>
                  ))}
                </div>
                {hasComplications && <p className="text-xs text-red-600 font-semibold mt-2">Complications noted — ensure appropriate action taken and documented below</p>}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Actions Taken</label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map(a => (
                    <button key={a} onClick={() => toggle(a, actions, setActions)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        actions.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>

              <textarea className="input w-full" rows={2} placeholder="Additional clinical notes, resident comfort, referrals..." value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!urineColour}>Save Record</Button>
              </div>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Care Log</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left">Date/Time</th>
                        <th className="px-4 py-2 text-left">Urine</th>
                        <th className="px-4 py-2 text-right">Output (ml)</th>
                        <th className="px-4 py-2 text-left">Complications</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                        <th className="px-4 py-2 text-left">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map((h: any) => (
                        <tr key={h.id} className={`hover:bg-slate-50 ${(h.complications || []).length > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2.5 whitespace-nowrap">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM, HH:mm') : '—'}</td>
                          <td className="px-4 py-2.5">{h.urine_colour || '—'}</td>
                          <td className="px-4 py-2.5 text-right">{h.urine_amount_ml || '—'}</td>
                          <td className="px-4 py-2.5">
                            {(h.complications || []).length > 0 ? <span className="text-red-600 font-semibold">{(h.complications).join(', ')}</span> : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-[160px] truncate">{(h.actions || []).join(', ') || '—'}</td>
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
