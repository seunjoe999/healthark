import React, { useEffect, useState } from 'react'
import { suApi, homesApi, dailyRecordsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, DNARBanner, NilByMouthBanner, AlertBanner } from '../../components/ui'
import { Search, Plus, ChevronDown, Droplets, Activity, Heart, AlertTriangle,
         Pill, Utensils, MessageSquare, RotateCcw, Users, ClipboardList, Thermometer, Wind } from 'lucide-react'
import toast from 'react-hot-toast'
import FoodDrinkForm from './forms/FoodDrinkForm'
import VitalsForm from './forms/VitalsForm'
import PersonalCareForm from './forms/PersonalCareForm'
import BehaviourForm from './forms/BehaviourForm'
import BowelForm from './forms/BowelForm'
import OralCareForm from './forms/OralCareForm'
import WelfareCheckForm from './forms/WelfareCheckForm'
import IncidentForm from './forms/IncidentForm'
import RepositioningForm from './forms/RepositioningForm'
import GeneralForm from './forms/GeneralForm'

type RecordCategory = {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  description: string
}

const RECORD_TYPES: RecordCategory[] = [
  { id: 'food_drink', label: 'Food & Drinks', icon: <Utensils className="w-5 h-5" />, color: 'bg-green-50 text-green-700 border-green-200', description: 'Log meals and fluid intake' },
  { id: 'personal_care', label: 'Personal Care', icon: <Heart className="w-5 h-5" />, color: 'bg-pink-50 text-pink-700 border-pink-200', description: 'Washing, grooming, dressing' },
  { id: 'vitals_bp', label: 'Blood Pressure', icon: <Activity className="w-5 h-5" />, color: 'bg-red-50 text-red-700 border-red-200', description: 'Systolic, diastolic, pulse' },
  { id: 'vitals_temp', label: 'Temperature', icon: <Thermometer className="w-5 h-5" />, color: 'bg-orange-50 text-orange-700 border-orange-200', description: 'Body temperature reading' },
  { id: 'vitals_oxygen', label: 'Oxygen (SpO2)', icon: <Wind className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200', description: 'Oxygen saturation level' },
  { id: 'vitals_weight', label: 'Weight & MUST', icon: <Activity className="w-5 h-5" />, color: 'bg-purple-50 text-purple-700 border-purple-200', description: 'Weight, height, BMI, MUST score' },
  { id: 'bowel', label: 'Bowel Movement', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-amber-50 text-amber-700 border-amber-200', description: 'Bristol scale, frequency' },
  { id: 'behaviour', label: 'Behaviour', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', description: 'Mood, behaviour, triggers' },
  { id: 'repositioning', label: 'Repositioning', icon: <RotateCcw className="w-5 h-5" />, color: 'bg-teal-50 text-teal-700 border-teal-200', description: 'Position log and skin check' },
  { id: 'oral_care', label: 'Oral Care', icon: <Heart className="w-5 h-5" />, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', description: 'Teeth, dentures, mouth condition' },
  { id: 'welfare_check', label: 'Welfare Check', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', description: 'Comfort and welfare rounds' },
  { id: 'one_to_one', label: '1-to-1 Conversation', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-violet-50 text-violet-700 border-violet-200', description: 'Topics discussed, engagement' },
  { id: 'social_activity', label: 'Social Activity', icon: <Users className="w-5 h-5" />, color: 'bg-rose-50 text-rose-700 border-rose-200', description: 'Activities, engagement level' },
  { id: 'visit', label: 'Visit', icon: <Users className="w-5 h-5" />, color: 'bg-lime-50 text-lime-700 border-lime-200', description: 'Social, family or community' },
  { id: 'incident', label: 'Incident', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-50 text-red-700 border-red-200', description: 'Falls, accidents, near misses' },
  { id: 'prn_medication', label: 'PRN Medication', icon: <Pill className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200', description: 'As-needed medication given' },
  { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-sky-50 text-sky-700 border-sky-200', description: 'Mode used, topic, response' },
  { id: 'general_support', label: 'General Support', icon: <Heart className="w-5 h-5" />, color: 'bg-gray-50 text-gray-700 border-gray-200', description: 'Any other support given' },
  { id: 'handover', label: 'Handover', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', description: 'End of shift handover' },
]

export default function DailyRecords() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [fluidTotal, setFluidTotal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDisplay = format(new Date(), 'EEEE, d MMMM yyyy')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      const defaultHome = user?.homeId || h[0]?.id || ''
      setSelectedHome(defaultHome)
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => {
      setSus(res.data.data || [])
    })
  }, [selectedHome])

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setActiveForm(null)
    setLoading(true)
    try {
      const [recRes, fluidRes] = await Promise.all([
        dailyRecordsApi.list(su.id, today),
        dailyRecordsApi.getFluidTotal(su.id, today),
      ])
      setRecords(recRes.data.data || [])
      setFluidTotal(fluidRes.data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRecordSaved = async () => {
    setActiveForm(null)
    if (!selectedSu) return
    const [recRes, fluidRes] = await Promise.all([
      dailyRecordsApi.list(selectedSu.id, today),
      dailyRecordsApi.getFluidTotal(selectedSu.id, today),
    ])
    setRecords(recRes.data.data || [])
    setFluidTotal(fluidRes.data.data)
    toast.success('Record saved')
  }

  const filteredSus = sus.filter(su => {
    const name = `${su.first_name || su.firstName} ${su.last_name || su.lastName}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()

  return (
    <div className="flex h-full">
      {/* Left panel — service user selector */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-navy-900 mb-3">Daily Records</h2>
          <p className="text-xs text-gray-500 mb-3">{todayDisplay}</p>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input className="input pl-8 text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center p-6">No residents found</p>
          ) : filteredSus.map(su => {
            const name = getName(su)
            const initials = `${(su.first_name || su.firstName || '?')[0]}${(su.last_name || su.lastName || '?')[0]}`
            const isSelected = selectedSu?.id === su.id
            return (
              <button key={su.id} onClick={() => selectSu(su)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-navy-50 border-l-2 border-l-navy-900' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-navy-900' : 'text-gray-800'}`}>{name}</p>
                    {(su.emergency_rating || su.emergencyRating) === 'high' && (
                      <span className="text-xs text-red-600 font-medium">High risk</span>
                    )}
                    {su.dnar && <span className="text-xs text-red-600 font-medium ml-1">• DNAR</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel — record forms and timeline */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selectedSu ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Select a resident" description="Choose a resident from the left to start logging daily records" />
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            {/* SU header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="space-y-2 mb-3">
                <DNARBanner dnar={selectedSu.dnar} />
                <NilByMouthBanner nilByMouth={selectedSu.nil_by_mouth || selectedSu.nilByMouth} />
              </div>
              {(selectedSu.need_to_know || selectedSu.needToKnow) && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{selectedSu.need_to_know || selectedSu.needToKnow}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-navy-900">{getName(selectedSu)}</h2>
                  <p className="text-sm text-gray-500">{todayDisplay}</p>
                </div>
                {fluidTotal && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${fluidTotal.belowThreshold ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <Droplets className={`w-4 h-4 ${fluidTotal.belowThreshold ? 'text-red-600' : 'text-blue-600'}`} />
                    <div>
                      <p className={`text-sm font-bold ${fluidTotal.belowThreshold ? 'text-red-700' : 'text-blue-700'}`}>
                        {fluidTotal.totalMl}ml
                      </p>
                      <p className="text-xs text-gray-500">of {fluidTotal.minFluidMl}ml target</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active form */}
            {activeForm && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-navy-900">
                    {RECORD_TYPES.find(r => r.id === activeForm)?.label}
                  </h3>
                  <button onClick={() => setActiveForm(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                </div>
                {activeForm === 'food_drink' && <FoodDrinkForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'vitals_bp' && <VitalsForm type="bp" suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'vitals_temp' && <VitalsForm type="temp" suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'vitals_oxygen' && <VitalsForm type="oxygen" suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'vitals_weight' && <VitalsForm type="weight" suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'personal_care' && <PersonalCareForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'behaviour' && <BehaviourForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'bowel' && <BowelForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'oral_care' && <OralCareForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'welfare_check' && <WelfareCheckForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'repositioning' && <RepositioningForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {activeForm === 'incident' && <IncidentForm suId={selectedSu.id} onSaved={handleRecordSaved} />}
                {(activeForm === 'one_to_one' || activeForm === 'communication' || activeForm === 'social_activity' ||
                  activeForm === 'visit' || activeForm === 'prn_medication' || activeForm === 'general_support' ||
                  activeForm === 'handover') &&
                  <GeneralForm type={activeForm} suId={selectedSu.id} onSaved={handleRecordSaved} />}
              </div>
            )}

            {/* Record type grid */}
            {!activeForm && (
              <>
                <h3 className="font-semibold text-navy-900 mb-3">Add a record</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {RECORD_TYPES.map(rt => (
                    <button key={rt.id} onClick={() => setActiveForm(rt.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left hover:shadow-md transition-all ${rt.color}`}>
                      <span className="flex-shrink-0 mt-0.5">{rt.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{rt.label}</p>
                        <p className="text-xs opacity-75 mt-0.5">{rt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Today's records timeline */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-navy-900">Today's records ({records.length})</h3>
              </div>
              {loading ? <div className="p-6"><Spinner /></div>
              : records.length === 0 ? (
                <p className="text-sm text-gray-400 text-center p-8">No records logged today</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {records.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-3">
                      <div className="text-xs text-gray-400 w-12 flex-shrink-0">
                        {format(new Date(r.recorded_at), 'HH:mm')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {RECORD_TYPES.find(rt => rt.id === r.record_type)?.label || r.record_type}
                        </p>
                        <p className="text-xs text-gray-500">{r.staff_name}</p>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.notes}</p>}
                      </div>
                      {r.flagged && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />Flagged
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
