import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Pill, Plus, Check, X, AlertTriangle, Search, Package, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQUENCIES = [{ value: 'once_daily', label: 'Once daily' }, { value: 'twice_daily', label: 'Twice daily (BD)' }, { value: 'three_times_daily', label: 'Three times daily (TDS)' }, { value: 'four_times_daily', label: 'Four times daily (QDS)' }, { value: 'weekly', label: 'Weekly' }, { value: 'as_required', label: 'As required (PRN)' }, { value: 'other', label: 'Other' }]
const ROUTES = [{ value: 'oral', label: 'Oral' }, { value: 'topical', label: 'Topical' }, { value: 'inhaled', label: 'Inhaled' }, { value: 'injection', label: 'Injection' }, { value: 'patch', label: 'Patch' }, { value: 'eye_drops', label: 'Eye drops' }, { value: 'other', label: 'Other' }]

export default function MAR() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [marRecords, setMarRecords] = useState<any[]>([])
  const [stockData, setStockData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'mar' | 'medications' | 'stock'>('mar')
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [stockModalMed, setStockModalMed] = useState<any>(null)
  const [search, setSearch] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || []))
  }, [selectedHome])

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setLoading(true)
    try {
      const [medRes, marRes, stockRes] = await Promise.all([
        api.get(`/mar/medications/${su.id}`),
        api.get(`/mar/records/${su.id}`, { params: { date: today } }),
        api.get(`/mar/stock/${su.id}`),
      ])
      setMedications(medRes.data.data || [])
      setMarRecords(marRes.data.data || [])
      setStockData(stockRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const logMAR = async (medicationId: string, given: boolean) => {
    if (!selectedSu) return
    try {
      await api.post('/mar/records', { suId: selectedSu.id, medicationId, given, refused: !given })
      const res = await api.get(`/mar/records/${selectedSu.id}`, { params: { date: today } })
      setMarRecords(res.data.data || [])
      toast.success(given ? 'Medication given ✓' : 'Refused recorded')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-full">
      {/* Left */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" /> MAR Chart
          </h2>
          <p className="text-xs text-slate-400 mb-3">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="input pl-8 text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSus.map(su => {
            const name = getName(su)
            const isSelected = selectedSu?.id === su.id
            return (
              <button key={su.id} onClick={() => selectSu(su)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {(su.first_name || su.firstName || '?')[0]}{(su.last_name || su.lastName || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>{name}</p>
                    <p className="text-xs text-slate-400">{medications.length > 0 && isSelected ? `${medications.length} medications` : ''}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {!selectedSu ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a resident" description="Choose a resident to view their MAR chart and medications" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-slate-900">{getName(selectedSu)}</h2>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mb-5">
              {[{ key: 'mar', label: "Today's MAR" }, { key: 'medications', label: 'Medications' }, { key: 'stock', label: 'Stock count' }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? <Spinner /> : tab === 'mar' ? (
              <div>
                {medications.length === 0 ? (
                  <EmptyState title="No medications added" description="Add medications first to start logging the MAR chart"
                    action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>} />
                ) : (
                  <div className="space-y-3">
                    {medications.map((med: any) => {
                      const todayRecord = marRecords.find((r: any) => r.medication_id === med.id)
                      return (
                        <div key={med.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Pill className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                <h3 className="font-semibold text-slate-900">{med.medication_name}</h3>
                                {med.is_prn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">PRN</span>}
                              </div>
                              <p className="text-sm text-slate-500">
                                {med.dose && <span>{med.dose} </span>}
                                {med.frequency && <span>· {med.frequency.replace(/_/g, ' ')} </span>}
                                {med.route && <span>· {med.route}</span>}
                              </p>
                              {med.instructions && <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mt-2">{med.instructions}</p>}
                              {todayRecord && (
                                <div className={`flex items-center gap-2 mt-2 text-xs font-semibold ${todayRecord.given ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {todayRecord.given ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                  {todayRecord.given ? 'Given' : 'Refused'} · {todayRecord.administered_by_name}
                                  {todayRecord.reason && ` · ${todayRecord.reason}`}
                                </div>
                              )}
                            </div>
                            {!todayRecord && (
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => logMAR(med.id, true)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
                                  <Check className="w-3.5 h-3.5" /> Given
                                </button>
                                <button onClick={() => logMAR(med.id, false)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors">
                                  <X className="w-3.5 h-3.5" /> Refused
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : tab === 'medications' ? (
              <div className="space-y-3">
                {medications.length === 0 ? (
                  <EmptyState title="No medications" description="Add medications for this resident" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>} />
                ) : medications.map((med: any) => (
                  <div key={med.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className="w-4 h-4 text-purple-500" />
                        <h3 className="font-semibold text-slate-900">{med.medication_name}</h3>
                        {med.is_prn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">PRN</span>}
                      </div>
                      <p className="text-sm text-slate-500">{med.dose} · {(med.frequency || '').replace(/_/g, ' ')} · {med.route}</p>
                      {med.prescribed_by && <p className="text-xs text-slate-400 mt-0.5">Prescribed by: {med.prescribed_by}</p>}
                      {med.start_date && <p className="text-xs text-slate-400">Started: {format(new Date(med.start_date), 'd MMM yyyy')}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm('Discontinue this medication?')) return
                      await api.delete(`/mar/medications/${med.id}`)
                      const res = await api.get(`/mar/medications/${selectedSu.id}`)
                      setMedications(res.data.data || [])
                      toast.success('Medication discontinued')
                    }}>Discontinue</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Record medication stock counts for audit purposes.</p>
                {medications.map((med: any) => {
                  const stock = stockData.find((s: any) => s.medication_id === med.id)
                  return (
                    <div key={med.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{med.medication_name}</p>
                        <p className="text-sm text-slate-500">{med.dose}</p>
                        {stock && <p className="text-xs text-slate-400 mt-1">Last count: {stock.current_count} units · {stock.last_counted_at ? format(new Date(stock.last_counted_at), 'd MMM, HH:mm') : 'Never'}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {stock && <span className="text-2xl font-bold text-slate-900 font-display">{stock.current_count}</span>}
                        <Button size="sm" variant="outline" icon={<Package className="w-3.5 h-3.5" />} onClick={() => setStockModalMed({ ...med, currentStock: stock?.current_count || 0 })}>
                          Update count
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {medications.length === 0 && <EmptyState title="No medications" description="Add medications to track stock counts" />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add medication modal */}
      <AddMedicationModal open={addMedOpen} onClose={() => setAddMedOpen(false)} suId={selectedSu?.id}
        onSaved={async () => {
          setAddMedOpen(false)
          if (selectedSu) {
            const res = await api.get(`/mar/medications/${selectedSu.id}`)
            setMedications(res.data.data || [])
          }
          toast.success('Medication added')
        }} />

      {/* Stock count modal */}
      {stockModalMed && (
        <StockCountModal med={stockModalMed} suId={selectedSu?.id} onClose={() => setStockModalMed(null)}
          onSaved={async () => {
            setStockModalMed(null)
            if (selectedSu) {
              const res = await api.get(`/mar/stock/${selectedSu.id}`)
              setStockData(res.data.data || [])
            }
            toast.success('Stock count updated')
          }} />
      )}
    </div>
  )
}

function AddMedicationModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({ medicationName: '', dose: '', frequency: '', route: '', prescribedBy: '', startDate: '', instructions: '', isPrn: false })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/mar/medications', { suId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add medication" size="md">
      <form onSubmit={save} className="space-y-4">
        <Input label="Medication name *" required value={form.medicationName} onChange={e => set('medicationName', e.target.value)} placeholder="e.g. Amlodipine, Paracetamol..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dose" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="e.g. 5mg, 2 tablets..." />
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} placeholder="Select frequency" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Route" value={form.route} onChange={e => set('route', e.target.value)} options={ROUTES} placeholder="Select route" />
          <Input label="Prescribed by" value={form.prescribedBy} onChange={e => set('prescribedBy', e.target.value)} placeholder="GP or consultant name" />
        </div>
        <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <div><label className="label">Special instructions</label><textarea className="input" rows={2} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Any special instructions for staff..." /></div>
        <div className="flex items-center gap-2"><input type="checkbox" id="prn" checked={form.isPrn} onChange={e => set('isPrn', e.target.checked)} className="rounded" /><label htmlFor="prn" className="text-sm font-medium text-slate-700">This is a PRN (as required) medication</label></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Pill className="w-4 h-4" />}>Add medication</Button>
        </div>
      </form>
    </Modal>
  )
}

function StockCountModal({ med, suId, onClose, onSaved }: { med: any; suId: string; onClose: () => void; onSaved: () => void }) {
  const [count, setCount] = useState(String(med.currentStock || 0))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/mar/stock/${med.id}/count`, { suId, currentCount: parseFloat(count), notes })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Stock count — ${med.medication_name}`} size="sm">
      <form onSubmit={save} className="space-y-4">
        <Input label="Current stock count *" type="number" step="0.5" required value={count} onChange={e => setCount(e.target.value)} hint={`Previous count: ${med.currentStock} units`} />
        <div><label className="label">Notes (optional)</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this count..." /></div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save count</Button>
        </div>
      </form>
    </Modal>
  )
}
