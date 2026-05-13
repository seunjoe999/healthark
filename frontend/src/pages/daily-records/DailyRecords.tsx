import React, { useEffect, useState } from 'react'
import { suApi, homesApi, dailyRecordsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, parseISO } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import { ClipboardList, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Droplets, ThermometerSun, Activity, Weight, Utensils, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import BodyMap from './forms/BodyMap'
import IncidentForm from './forms/IncidentForm'

const RECORD_TYPES = [
  { value: 'personal_care', label: 'Personal care', icon: '🧼' },
  { value: 'food_intake', label: 'Food intake', icon: '🍽️' },
  { value: 'fluid_intake', label: 'Fluid / drinks', icon: '💧' },
  { value: 'bowel_movement', label: 'Bowel movement', icon: '📋' },
  { value: 'behaviour', label: 'Behaviour', icon: '💭' },
  { value: 'welfare_check', label: 'Welfare check', icon: '✅' },
  { value: 'repositioning', label: 'Repositioning', icon: '🔄' },
  { value: 'oral_care', label: 'Oral care', icon: '🦷' },
  { value: 'one_to_one', label: '1-to-1 conversation', icon: '💬' },
  { value: 'social_activity', label: 'Social activity', icon: '🎮' },
  { value: 'social_visit', label: 'Social visit', icon: '👥' },
  { value: 'family_visit', label: 'Family visit', icon: '👨‍👩‍👧' },
  { value: 'incident', label: 'Incident', icon: '⚠️' },
  { value: 'prn_medication', label: 'PRN medication', icon: '💊' },
  { value: 'handover', label: 'Handover note', icon: '📝' },
  { value: 'general_support', label: 'General support', icon: '🤝' },
  { value: 'communication', label: 'Communication', icon: '📣' },
  { value: 'vitals_bp', label: 'Blood pressure', icon: '❤️' },
  { value: 'vitals_temp', label: 'Temperature', icon: '🌡️' },
  { value: 'vitals_oxygen', label: 'Oxygen (SpO2)', icon: '🫁' },
  { value: 'vitals_weight', label: 'Weight & MUST', icon: '⚖️' },
  { value: 'body_map', label: 'Body map / skin', icon: '🗺️' },
]

const FOOD_AMOUNTS = ['None', 'Quarter', 'Half', 'Three quarters', 'Full']
const FLUID_TYPES = [
  { label: 'Water', ml: 200 }, { label: 'Tea', ml: 200 }, { label: 'Coffee', ml: 200 },
  { label: 'Juice', ml: 150 }, { label: 'Milk', ml: 200 }, { label: 'Soup', ml: 250 },
  { label: 'Supplement drink', ml: 200 }, { label: 'Other', ml: 200 },
]

export default function DailyRecords() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [fluidTotal, setFluidTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [recordType, setRecordType] = useState('personal_care')
  const [viewDate, setViewDate] = useState(new Date())
  const [search, setSearch] = useState('')

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
    await loadRecords(su.id, viewDate)
  }

  const loadRecords = async (suId: string, date: Date) => {
    setLoading(true)
    try {
      const [recRes, fluidRes] = await Promise.all([
        dailyRecordsApi.list(suId, format(date, 'yyyy-MM-dd')),
        dailyRecordsApi.getFluidTotal(suId, format(date, 'yyyy-MM-dd')),
      ])
      setRecords(recRes.data.data || [])
      setFluidTotal(fluidRes.data.data?.totalMl || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const changeDate = async (d: Date) => {
    if (d > new Date()) return // can't go to future
    setViewDate(d)
    if (selectedSu) await loadRecords(selectedSu.id, d)
  }

  const getName = (su: any) => `${su.first_name || ''} ${su.last_name || ''}`.trim()
  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  const groupedRecords = records.reduce((acc: Record<string, any[]>, r: any) => {
    const type = r.record_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {})

  const isToday = format(viewDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex h-full">
      {/* Left — resident selector */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-purple-600" /> Daily Records
          </h2>
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
            const isSelected = selectedSu?.id === su.id
            return (
              <button key={su.id} onClick={() => selectSu(su)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#151f35' }}>
                    {su.photo_url ? <img src={su.photo_url} className="w-full h-full object-cover" alt="" /> : `${(su.first_name||'?')[0]}${(su.last_name||'?')[0]}`}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>{getName(su)}</p>
                    <p className="text-xs text-slate-400 capitalize">{(su.status || '').replace('_', ' ')}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — records */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selectedSu ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a resident" description="Choose a resident to view and add daily records" />
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="font-display text-xl text-slate-900">{getName(selectedSu)}</h2>
                {/* Fluid total */}
                <div className={`flex items-center gap-2 mt-1 text-sm font-medium ${fluidTotal >= (selectedSu.min_fluid_ml || 1500) ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <Droplets className="w-4 h-4" />
                  {fluidTotal}ml / {selectedSu.min_fluid_ml || 1500}ml fluids today
                  {fluidTotal < (selectedSu.min_fluid_ml || 1500) && <span className="text-xs text-amber-500">⚠ Below target</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Date navigation */}
                <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                  <button onClick={() => changeDate(subDays(viewDate, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-2 min-w-28 text-center">
                    {isToday ? 'Today' : format(viewDate, 'd MMM yyyy')}
                  </span>
                  <button onClick={() => changeDate(new Date(viewDate.getTime() + 86400000))} disabled={isToday} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                {isToday && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add record</Button>}
              </div>
            </div>

            {loading ? <Spinner /> : records.length === 0 ? (
              <EmptyState title={isToday ? 'No records today' : `No records on ${format(viewDate, 'd MMMM yyyy')}`}
                description="Daily records will appear here once added"
                action={isToday ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add first record</Button> : undefined} />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedRecords).map(([type, typeRecords]) => {
                  const typeInfo = RECORD_TYPES.find(r => r.value === type)
                  return (
                    <div key={type} className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
                        <span className="text-base">{typeInfo?.icon || '📋'}</span>
                        <h3 className="font-semibold text-slate-800 text-sm">{typeInfo?.label || type.replace(/_/g, ' ')}</h3>
                        <span className="text-xs text-slate-400 ml-auto">{(typeRecords as any[]).length} record{(typeRecords as any[]).length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {(typeRecords as any[]).map((r: any) => (
                          <div key={r.id} className="px-5 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <RecordSummary record={r} />
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-slate-400">{r.created_at ? format(new Date(r.created_at), 'HH:mm') : ''}</p>
                                <p className="text-xs text-slate-400">{r.staff_name || ''}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add record modal */}
      {addOpen && selectedSu && (
        <AddRecordModal suId={selectedSu.id} onClose={() => setAddOpen(false)}
          onSaved={async () => { setAddOpen(false); await loadRecords(selectedSu.id, viewDate); toast.success('Record saved') }} />
      )}
    </div>
  )
}

function RecordSummary({ record: r }: { record: any }) {
  const type = r.record_type || ''
  if (type === 'fluid_intake') return <p className="text-sm text-slate-700">{r.fluid_type || 'Fluid'} — <strong>{r.amount_ml}ml</strong></p>
  if (type === 'food_intake') return <p className="text-sm text-slate-700">{r.meal_type || 'Meal'}: <strong>{r.amount_eaten || '—'}</strong>{r.food_description ? ` · ${r.food_description}` : ''}</p>
  if (type === 'vitals_bp') return <p className="text-sm text-slate-700">BP: <strong>{r.systolic}/{r.diastolic} mmHg</strong>{r.pulse ? ` · Pulse: ${r.pulse}bpm` : ''}</p>
  if (type === 'vitals_temp') return <p className="text-sm text-slate-700">Temp: <strong>{r.temp_celsius}°C</strong></p>
  if (type === 'vitals_oxygen') return <p className="text-sm text-slate-700">SpO2: <strong>{r.spo2_percent}%</strong>{r.supplemental_o2 ? ' (on O₂)' : ''}</p>
  if (type === 'vitals_weight') return <p className="text-sm text-slate-700">Weight: <strong>{r.weight_kg}kg</strong>{r.bmi ? ` · BMI: ${r.bmi}` : ''}</p>
  if (type === 'bowel_movement') return <p className="text-sm text-slate-700">Bristol type {r.bristol_type || '—'}{r.notes ? ` · ${r.notes}` : ''}</p>
  return <p className="text-sm text-slate-700">{r.notes || r.description || r.record_type?.replace(/_/g, ' ') || '—'}</p>
}

function AddRecordModal({ suId, onClose, onSaved }: { suId: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('personal_care')
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setLoading(true)
    try {
      await dailyRecordsApi.create({ suId, recordType: type, ...form })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Add daily record" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Select label="Record type" value={type} onChange={e => { setType(e.target.value); setForm({}) }}
          options={RECORD_TYPES.map(r => ({ value: r.value, label: `${r.icon} ${r.label}` }))} />

        {type === 'body_map' ? (
          <BodyMap suId={suId} onSaved={onSaved} />
        ) : type === 'incident' ? (
          <IncidentForm suId={suId} onSaved={onSaved} />
        ) : (
          <RecordForm type={type} form={form} set={set} />
        )}

        {type !== 'body_map' && type !== 'incident' && (
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={loading} onClick={save}>Save record</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function RecordForm({ type, form, set }: { type: string; form: Record<string, any>; set: (k: string, v: any) => void }) {
  switch (type) {
    case 'fluid_intake': return (
      <div className="space-y-3">
        <Select label="Drink type" value={form.fluidType || ''} onChange={e => { set('fluidType', e.target.value); const ft = FLUID_TYPES.find(f => f.label === e.target.value); if (ft) set('amountMl', ft.ml) }} options={FLUID_TYPES.map(f => ({ value: f.label, label: f.label }))} placeholder="Select drink" />
        <div><label className="label">Amount (ml)</label><input type="number" className="input" value={form.amountMl || ''} onChange={e => set('amountMl', parseInt(e.target.value))} placeholder="e.g. 200" /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    case 'food_intake': return (
      <div className="space-y-3">
        <Select label="Meal type" value={form.mealType || ''} onChange={e => set('mealType', e.target.value)} options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' }]} placeholder="Select meal" />
        <Select label="Amount eaten" value={form.amountEaten || ''} onChange={e => set('amountEaten', e.target.value)} options={FOOD_AMOUNTS.map(a => ({ value: a, label: a }))} placeholder="How much was eaten?" />
        <div><label className="label">What was served</label><input className="input" value={form.foodDescription || ''} onChange={e => set('foodDescription', e.target.value)} placeholder="e.g. Roast chicken with vegetables..." /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    case 'vitals_bp': return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">Systolic</label><input type="number" className="input" value={form.systolic || ''} onChange={e => set('systolic', parseInt(e.target.value))} placeholder="120" /></div>
          <div><label className="label">Diastolic</label><input type="number" className="input" value={form.diastolic || ''} onChange={e => set('diastolic', parseInt(e.target.value))} placeholder="80" /></div>
          <div><label className="label">Pulse (bpm)</label><input type="number" className="input" value={form.pulse || ''} onChange={e => set('pulse', parseInt(e.target.value))} placeholder="72" /></div>
        </div>
        {form.systolic > 180 || form.diastolic > 110 ? <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ Reading outside safe range</div> : null}
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    case 'vitals_temp': return (
      <div className="space-y-3">
        <div><label className="label">Temperature (°C)</label><input type="number" step="0.1" className="input" value={form.tempCelsius || ''} onChange={e => set('tempCelsius', parseFloat(e.target.value))} placeholder="36.5" /></div>
        {form.tempCelsius && (form.tempCelsius < 35 || form.tempCelsius > 37.5) ? <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ Temperature outside normal range (35–37.5°C)</div> : null}
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    case 'vitals_oxygen': return (
      <div className="space-y-3">
        <div><label className="label">SpO2 (%)</label><input type="number" className="input" value={form.spo2Percent || ''} onChange={e => set('spo2Percent', parseInt(e.target.value))} placeholder="98" /></div>
        {form.spo2Percent && form.spo2Percent < 94 ? <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">⚠ SpO2 below 94%</div> : null}
        <div className="flex items-center gap-2"><input type="checkbox" id="o2" checked={form.supplementalO2 || false} onChange={e => set('supplementalO2', e.target.checked)} /><label htmlFor="o2" className="text-sm text-slate-700">On supplemental oxygen</label></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    case 'bowel_movement': return (
      <div className="space-y-3">
        <Select label="Bristol stool type" value={form.bristolType || ''} onChange={e => set('bristolType', parseInt(e.target.value))}
          options={[1,2,3,4,5,6,7].map(n => ({ value: String(n), label: `Type ${n} — ${['Separate hard lumps','Lumpy sausage','Cracked sausage','Smooth sausage','Soft blobs','Fluffy mushy','Watery'][n-1]}` }))} placeholder="Select type" />
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
    )
    default: return (
      <div><label className="label">Notes / description</label><textarea required className="input" rows={4} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Describe what happened, what was observed..." /></div>
    )
  }
}
