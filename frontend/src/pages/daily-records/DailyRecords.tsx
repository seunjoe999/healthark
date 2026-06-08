import React, { useEffect, useState } from 'react'
import { suApi, homesApi, dailyRecordsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, parseISO } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select, Input, Textarea, PrintButton } from '../../components/ui'
import { ClipboardList, Plus, ChevronLeft, ChevronRight, Droplets, Edit, Trash2, X, Check, Music, Thermometer, Stethoscope, ArrowLeftRight, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import BodyMap from './forms/BodyMap'
import IncidentForm from './forms/IncidentForm'
import SeizureForm from './forms/SeizureForm'
import OralCareForm from './forms/OralCareForm'
import PersonalCareForm from './forms/PersonalCareForm'
import WelfareCheckForm from './forms/WelfareCheckForm'
import RepositioningForm from './forms/RepositioningForm'
import VitalsForm from './forms/VitalsForm'
import FoodDrinkForm from './forms/FoodDrinkForm'
import BowelForm from './forms/BowelForm'
import BehaviourForm from './forms/BehaviourForm'
import GeneralForm from './forms/GeneralForm'
import SocialActivities from '../social-activities/SocialActivities'
import BathChart from '../bath-chart/BathChart'
import BowelChart from '../bowel-chart/BowelChart'
import Observations from '../observations/Observations'
import ProfessionalVisits from '../professional-visits/ProfessionalVisits'
import HandoverReport from '../reports/HandoverReport'
import ResidentDiary from '../diary/ResidentDiary'

const DR_TABS = [
  { key: 'daily_records',       label: 'Daily Records',      icon: ClipboardList },
  { key: 'social_activities',   label: 'Social Activities',  icon: Music },
  { key: 'bath_chart',          label: 'Bath Chart',          icon: Droplets },
  { key: 'bowel_chart',         label: 'Bowel Chart',         icon: Droplets },
  { key: 'observations',        label: 'Observations',        icon: Thermometer },
  { key: 'professional_visits', label: 'Professional Visits', icon: Stethoscope },
  { key: 'handover',            label: 'Handover',            icon: ArrowLeftRight },
  { key: 'health_check',        label: 'Health Check',        icon: BookOpen },
]

const RECORD_TYPES = [
  { value: 'personal_care', label: 'Personal Care', icon: '🧼' },
  { value: 'food_intake', label: 'Food Intake', icon: '🍽️' },
  { value: 'fluid_intake', label: 'Fluid / Drinks', icon: '💧' },
  { value: 'bowel_movement', label: 'Bowel Movement', icon: '📋' },
  { value: 'behaviour', label: 'Behavior Record (ABC)', icon: '💭' },
  { value: 'welfare_check', label: 'Welfare Check', icon: '✅' },
  { value: 'repositioning', label: 'Repositioning', icon: '🔄' },
  { value: 'oral_care', label: 'Oral Care', icon: '🦷' },
  { value: 'one_to_one', label: '1-to-1 Conversation', icon: '💬' },
  { value: 'social_activity', label: 'Social Activity', icon: '🎮' },
  { value: 'social_visit', label: 'Social Visit', icon: '👥' },
  { value: 'family_visit', label: 'Family Visit', icon: '👨‍👩‍👧' },
  { value: 'incident', label: 'Incident', icon: '⚠️' },
  { value: 'prn_medication', label: 'PRN Medication', icon: '💊' },
  { value: 'handover', label: 'Handover Note', icon: '📝' },
  { value: 'general_support', label: 'General Support', icon: '🤝' },
  { value: 'communication', label: 'Communication', icon: '📣' },
  { value: 'vitals_bp', label: 'Blood Pressure', icon: '❤️' },
  { value: 'vitals_temp', label: 'Temperature', icon: '🌡️' },
  { value: 'vitals_oxygen', label: 'Oxygen (SpO2)', icon: '🫁' },
  { value: 'vitals_weight', label: 'Weight & MUST', icon: '⚖️' },
  { value: 'body_map', label: 'Body Map / Skin', icon: '🗺️' },
  { value: 'seizure', label: 'Seizure Episode', icon: '⚡' },
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
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editNotes, setEditNotes] = useState('')
  const [activeTab, setActiveTab] = useState('daily_records')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome).then(res => setSus(res.data.data || []))
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

  const groupedRecords = records.reduce((acc: Record<string, any[]>, r: any) => {
    const type = r.record_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {})

  const isToday = format(viewDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-2 flex gap-0 overflow-x-auto shrink-0">
        {DR_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'daily_records' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'social_activities'   && <SocialActivities />}
          {activeTab === 'bath_chart'           && <BathChart />}
          {activeTab === 'bowel_chart'          && <BowelChart />}
          {activeTab === 'observations'         && <Observations />}
          {activeTab === 'professional_visits'  && <ProfessionalVisits />}
          {activeTab === 'handover'             && <HandoverReport />}
          {activeTab === 'health_check'         && <ResidentDiary />}
        </div>
      ) : (
      <>
      {/* Top control bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-shrink-0">
          <ClipboardList className="w-4 h-4 text-purple-600" /> Daily Records
        </span>

        {homes.length > 1 && (
          <select className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={selectedHome} onChange={e => { setSelectedHome(e.target.value); setSelectedSu(null); setRecords([]) }}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Resident</label>
          <select
            className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[180px]"
            value={selectedSu?.id || ''}
            onChange={e => {
              if (!e.target.value) { setSelectedSu(null); setRecords([]); return }
              const su = sus.find(s => s.id === e.target.value)
              if (su) selectSu(su)
            }}>
            <option value="">— Select resident —</option>
            {sus.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1 border border-slate-300 rounded overflow-hidden ml-2">
          <button onClick={() => changeDate(subDays(viewDate, 1))} className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-medium text-slate-700 px-2 min-w-28 text-center">
            {isToday ? 'Today' : format(viewDate, 'd MMM yyyy')}
          </span>
          <button onClick={() => changeDate(new Date(viewDate.getTime() + 86400000))} disabled={isToday} className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-30">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <PrintButton />
          {selectedSu && isToday && <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddOpen(true)}>Add record</Button>}
        </div>
      </div>

      {/* Main content */}
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
                        <h3 className="font-semibold text-slate-800 text-sm">{typeInfo?.label || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h3>
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
                                <div className="flex gap-1 mt-1 justify-end">
                                  {(() => {
                                    const isCareStaff = user?.role === 'care_staff'
                                    const isToday = r.record_date === format(viewDate, 'yyyy-MM-dd') && format(viewDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                                    const isOwn = r.staff_id === user?.id
                                    const canEdit = !isCareStaff || (isToday && isOwn)
                                    return canEdit ? (
                                      <button onClick={() => setEditingRecord(r)}
                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                                        title="Edit record">
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    ) : null
                                  })()}
                                  {user?.role !== 'care_staff' && (
                                    <button onClick={async () => {
                                      if (!confirm('Delete this record? This cannot be undone.')) return
                                      try {
                                        await dailyRecordsApi.delete(r.id)
                                        await loadRecords(selectedSu.id, viewDate)
                                        toast.success('Record deleted')
                                      } catch { toast.error('Failed to delete') }
                                    }} className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                                    title="Delete record">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
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
        <AddRecordModal suId={selectedSu.id} homeId={selectedHome} onClose={() => setAddOpen(false)}
          onSaved={async () => { setAddOpen(false); await loadRecords(selectedSu.id, viewDate); toast.success('Record saved') }} />
      )}

      {/* Edit record modal */}
      {editingRecord && selectedSu && (
        <EditRecordModal record={editingRecord} onClose={() => setEditingRecord(null)}
          onSaved={async () => { setEditingRecord(null); await loadRecords(selectedSu.id, viewDate); toast.success('Record updated') }} />
      )}
      </>
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
  if (type === 'behaviour') return <p className="text-sm text-slate-700">{r.notes || 'Behaviour recorded'}</p>
  if (type === 'prn_medication') return <p className="text-sm text-slate-700">{r.notes || 'PRN medication administered'}</p>
  return <p className="text-sm text-slate-700">{r.notes || r.description || r.record_type?.replace(/_/g, ' ') || '—'}</p>
}

function AddRecordModal({ suId, homeId, onClose, onSaved }: { suId: string; homeId: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('personal_care')

  const renderForm = () => {
    const p = { suId, onSaved }
    switch (type) {
      case 'body_map':        return <BodyMap suId={suId} onSaved={onSaved} />
      case 'incident':        return <IncidentForm suId={suId} onSaved={onSaved} />
      case 'seizure':         return <SeizureForm suId={suId} onSaved={onSaved} />
      case 'personal_care':   return <PersonalCareForm {...p} />
      case 'oral_care':       return <OralCareForm {...p} />
      case 'welfare_check':   return <WelfareCheckForm {...p} />
      case 'repositioning':   return <RepositioningForm {...p} />
      case 'behaviour':       return <BehaviourForm {...p} />
      case 'bowel_movement':  return <BowelForm {...p} />
      case 'fluid_intake':
      case 'food_intake':     return <FoodDrinkForm {...p} />
      case 'vitals_bp':       return <VitalsForm type="bp" {...p} />
      case 'vitals_temp':     return <VitalsForm type="temp" {...p} />
      case 'vitals_oxygen':   return <VitalsForm type="oxygen" {...p} />
      case 'vitals_weight':   return <VitalsForm type="weight" {...p} />
      default:                return <GeneralForm type={type} {...p} />
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Add daily record" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Select label="Record type" value={type} onChange={e => setType(e.target.value)}
          options={RECORD_TYPES.map(r => ({ value: r.value, label: `${r.icon} ${r.label}` }))} />
        {renderForm()}
      </div>
    </Modal>
  )
}


function EditRecordModal({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    // Pre-populate from existing record
    return {
      notes: record.notes || '',
      fluidType: record.fluid_type || record.meal_type || '',
      amountMl: record.amount_ml || '',
      amountEaten: record.amount_eaten || '',
      mealType: record.meal_type || '',
      foodDescription: record.food_description || record.description || '',
      systolic: record.systolic || '',
      diastolic: record.diastolic || '',
      pulse: record.pulse || '',
      tempCelsius: record.temp_celsius || '',
      spo2Percent: record.spo2_percent || '',
      weightKg: record.weight_kg || '',
      bristolType: record.bristol_type || '',
      supplementalO2: record.supplemental_o2 || false,
    }
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setLoading(true)
    try {
      // Build the notes text from the form fields
      let notesText = form.notes || ''
      const type = record.record_type

      if (type === 'fluid_intake' || type === 'food_drink') {
        if (form.amountMl) notesText = `${form.fluidType || 'Fluid'} — ${form.amountMl}ml${form.notes ? '. ' + form.notes : ''}`
        else if (form.amountEaten) notesText = `${form.mealType || 'Meal'}: ${form.amountEaten}${form.foodDescription ? ' — ' + form.foodDescription : ''}${form.notes ? '. ' + form.notes : ''}`
      } else if (type === 'vitals_bp') {
        notesText = `BP: ${form.systolic}/${form.diastolic} mmHg${form.pulse ? ` · Pulse: ${form.pulse}bpm` : ''}${form.notes ? '. ' + form.notes : ''}`
      } else if (type === 'vitals_temp') {
        notesText = `Temperature: ${form.tempCelsius}°C${form.notes ? '. ' + form.notes : ''}`
      } else if (type === 'vitals_oxygen') {
        notesText = `SpO2: ${form.spo2Percent}%${form.supplementalO2 ? ' (on O₂)' : ''}${form.notes ? '. ' + form.notes : ''}`
      } else if (type === 'vitals_weight') {
        notesText = `Weight: ${form.weightKg}kg${form.notes ? '. ' + form.notes : ''}`
      } else if (type === 'bowel_movement') {
        notesText = `Bristol type ${form.bristolType}${form.notes ? '. ' + form.notes : ''}`
      }

      await dailyRecordsApi.update(record.id, { notes: notesText })
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update')
    } finally { setLoading(false) }
  }

  const type = record.record_type
  const typeInfo = RECORD_TYPES.find(r => r.value === type)

  return (
    <Modal open={true} onClose={onClose} title={`Edit — ${typeInfo?.label || type?.replace(/_/g, ' ')}`} size="md">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
          Recorded at {record.created_at ? format(new Date(record.created_at), 'HH:mm, d MMM yyyy') : ''}{record.staff_name ? ` by ${record.staff_name}` : ''}
        </div>

        {/* Show appropriate fields based on type */}
        {(type === 'fluid_intake') && (
          <div className="space-y-3">
            <Select label="Drink type" value={form.fluidType} onChange={e => set('fluidType', e.target.value)}
              options={[{value:'Water',label:'Water'},{value:'Tea',label:'Tea'},{value:'Coffee',label:'Coffee'},{value:'Juice',label:'Juice'},{value:'Milk',label:'Milk'},{value:'Soup',label:'Soup'},{value:'Supplement drink',label:'Supplement drink'},{value:'Other',label:'Other'}]}
              placeholder="Select drink" />
            <Input label="Amount (ml)" type="number" value={String(form.amountMl)} onChange={e => set('amountMl', e.target.value)} />
          </div>
        )}
        {(type === 'food_intake') && (
          <div className="space-y-3">
            <Select label="Meal" value={form.mealType} onChange={e => set('mealType', e.target.value)}
              options={[{value:'breakfast',label:'Breakfast'},{value:'lunch',label:'Lunch'},{value:'dinner',label:'Dinner'},{value:'snack',label:'Snack'}]} placeholder="Select meal" />
            <Select label="Amount eaten" value={form.amountEaten} onChange={e => set('amountEaten', e.target.value)}
              options={['None','Quarter','Half','Three quarters','Full'].map(a=>({value:a,label:a}))} placeholder="How much?" />
            <Input label="What was served" value={form.foodDescription} onChange={e => set('foodDescription', e.target.value)} />
          </div>
        )}
        {type === 'vitals_bp' && (
          <div className="grid grid-cols-3 gap-3">
            <Input label="Systolic" type="number" value={String(form.systolic)} onChange={e => set('systolic', e.target.value)} />
            <Input label="Diastolic" type="number" value={String(form.diastolic)} onChange={e => set('diastolic', e.target.value)} />
            <Input label="Pulse" type="number" value={String(form.pulse)} onChange={e => set('pulse', e.target.value)} />
          </div>
        )}
        {type === 'vitals_temp' && <Input label="Temperature (°C)" type="number" step="0.1" value={String(form.tempCelsius)} onChange={e => set('tempCelsius', e.target.value)} />}
        {type === 'vitals_oxygen' && (
          <div className="space-y-2">
            <Input label="SpO2 (%)" type="number" value={String(form.spo2Percent)} onChange={e => set('spo2Percent', e.target.value)} />
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.supplementalO2} onChange={e => set('supplementalO2', e.target.checked)} /><label className="text-sm text-slate-700">On supplemental oxygen</label></div>
          </div>
        )}
        {type === 'vitals_weight' && <Input label="Weight (kg)" type="number" step="0.1" value={String(form.weightKg)} onChange={e => set('weightKg', e.target.value)} />}
        {type === 'bowel_movement' && (
          <Select label="Bristol stool type" value={String(form.bristolType)} onChange={e => set('bristolType', e.target.value)}
            options={[1,2,3,4,5,6,7].map(n=>({value:String(n),label:`Type ${n}`}))} placeholder="Select type" />
        )}

        <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Add or update notes..." />

        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={save}>Save changes</Button>
        </div>
      </div>
    </Modal>
  )
}
