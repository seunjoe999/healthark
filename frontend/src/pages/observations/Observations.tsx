import React, { useState, useEffect } from 'react'
import { Thermometer, Plus, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'

const OBS_TYPES = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'pulse', label: 'Pulse / Heart Rate' },
  { value: 'spo2', label: 'Oxygen Saturation (SpO2)' },
  { value: 'weight', label: 'Weight' },
  { value: 'blood_glucose', label: 'Blood Glucose' },
  { value: 'full_set', label: 'Full Observations Set' },
]

const TEMP_METHODS = [
  { value: 'oral', label: 'Oral' },
  { value: 'axillary', label: 'Axillary (armpit)' },
  { value: 'tympanic', label: 'Tympanic (ear)' },
  { value: 'temporal', label: 'Temporal (forehead)' },
  { value: 'rectal', label: 'Rectal' },
]

function abnormalBadge(obs: any) {
  const flags: string[] = []
  if (obs.temp_celsius) {
    const t = parseFloat(obs.temp_celsius)
    if (t >= 38.0) flags.push('High temp')
    if (t < 36.0) flags.push('Low temp')
  }
  if (obs.systolic && obs.diastolic) {
    if (obs.systolic >= 140 || obs.diastolic >= 90) flags.push('High BP')
    if (obs.systolic < 90) flags.push('Low BP')
  }
  if (obs.spo2_percent && obs.spo2_percent < 94) flags.push('Low SpO2')
  if (obs.pulse && (obs.pulse > 100 || obs.pulse < 50)) flags.push('Abnormal pulse')
  return flags
}

function ObsValue({ obs }: { obs: any }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {obs.temp_celsius && (
        <span className={clsx('font-bold', parseFloat(obs.temp_celsius) >= 38 || parseFloat(obs.temp_celsius) < 36 ? 'text-rose-400' : 'text-emerald-400')}>
          🌡 {obs.temp_celsius}°C
          {obs.temp_method && <span className="text-slate-500 font-normal text-xs ml-1">({obs.temp_method})</span>}
        </span>
      )}
      {obs.systolic && obs.diastolic && (
        <span className={clsx('font-bold', obs.systolic >= 140 ? 'text-rose-400' : 'text-white')}>
          BP {obs.systolic}/{obs.diastolic} mmHg
        </span>
      )}
      {obs.pulse && (
        <span className={clsx('font-bold', obs.pulse > 100 || obs.pulse < 50 ? 'text-rose-400' : 'text-white')}>
          ♥ {obs.pulse} bpm
        </span>
      )}
      {obs.spo2_percent && (
        <span className={clsx('font-bold', obs.spo2_percent < 94 ? 'text-rose-400' : 'text-emerald-400')}>
          O₂ {obs.spo2_percent}%
          {obs.o2_litres_min && <span className="text-slate-400 font-normal text-xs ml-1">({obs.o2_litres_min}L/min)</span>}
        </span>
      )}
      {obs.weight_kg && <span className="font-bold text-white">⚖ {obs.weight_kg} kg</span>}
      {obs.blood_glucose && <span className="font-bold text-amber-400">🩸 {obs.blood_glucose} mmol/L</span>}
    </div>
  )
}

export default function Observations() {
  const [view, setView] = useState<'list' | 'summary'>('summary')
  const [summary, setSummary] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [filterType, setFilterType] = useState('')
  const [dateFrom, setDateFrom] = useState('')

  const [form, setForm] = useState({
    suId: '', obsType: 'temperature', observedAt: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().substring(0, 5),
    tempCelsius: '', tempMethod: 'tympanic', systolic: '', diastolic: '', pulse: '', spo2: '', o2Litres: '', weight: '', bloodGlucose: '', notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [sumRes, suRes] = await Promise.all([
        api.get('/observations/summary'),
        api.get('/service-users'),
      ])
      setSummary(sumRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  async function loadList() {
    try {
      const params: any = { limit: 100 }
      if (selectedSU) params.suId = selectedSU
      if (filterType) params.type = filterType
      if (dateFrom) params.from = dateFrom
      const res = await api.get('/observations', { params })
      setRecords(res.data.data || [])
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (view === 'list') loadList() }, [view, selectedSU, filterType, dateFrom])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/observations', {
        ...form,
        tempCelsius: form.tempCelsius || undefined,
        systolic: form.systolic ? parseInt(form.systolic) : undefined,
        diastolic: form.diastolic ? parseInt(form.diastolic) : undefined,
        pulse: form.pulse ? parseInt(form.pulse) : undefined,
        spo2: form.spo2 ? parseInt(form.spo2) : undefined,
        o2Litres: form.o2Litres ? parseFloat(form.o2Litres) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        bloodGlucose: form.bloodGlucose ? parseFloat(form.bloodGlucose) : undefined,
      })
      setShowAdd(false)
      load()
      if (view === 'list') loadList()
    } catch {}
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const showTemp = ['temperature', 'full_set'].includes(form.obsType)
  const showBP   = ['blood_pressure', 'full_set'].includes(form.obsType)
  const showPulse= ['pulse', 'full_set', 'blood_pressure'].includes(form.obsType)
  const showSpo2 = ['spo2', 'full_set'].includes(form.obsType)
  const showWeight = ['weight', 'full_set'].includes(form.obsType)
  const showGlucose = ['blood_glucose'].includes(form.obsType)

  const abnormalCount = summary.filter(s => abnormalBadge(s).length > 0).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Thermometer className="w-6 h-6 text-amber-400" /> Observations
          </h1>
          <p className="text-slate-400 text-sm mt-1">Vitals, temperature, blood pressure and clinical recordings</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Record Observation
          </Button>
        </div>
      </div>

      {abnormalCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{abnormalCount}</strong> service user{abnormalCount > 1 ? 's' : ''} with abnormal readings today</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['summary', 'list'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'summary' ? 'Latest per Resident' : 'All Records'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {view === 'summary' && (
            summary.length === 0 ? <EmptyState title="No observations recorded yet" description="Record the first observation to get started" /> : (
              <div className="space-y-3">
                {summary.map(s => {
                  const flags = abnormalBadge(s)
                  return (
                    <div key={s.su_id} className={clsx('card p-4', flags.length > 0 && 'border-rose-500/30')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-900 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                            {s.su_name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{s.su_name}</p>
                              {s.room_number && <span className="text-xs text-slate-500">Room {s.room_number}</span>}
                            </div>
                            <div className="mt-1.5"><ObsValue obs={s} /></div>
                            {flags.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {flags.map(f => (
                                  <span key={f} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-medium border border-rose-500/30">{f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500 flex-shrink-0">
                          <div>{format(new Date(s.observed_at), 'dd MMM yyyy')}</div>
                          <div>{format(new Date(s.observed_at), 'HH:mm')}</div>
                          <div className="mt-1 capitalize">{s.obs_type?.replace('_', ' ')}</div>
                          <div className="mt-0.5">{s.recorded_by_name}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {view === 'list' && (
            <div>
              <div className="flex flex-wrap gap-3 mb-4">
                <select className="input w-52" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
                  <option value="">All Service Users</option>
                  {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
                <select className="input w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {OBS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="date" className="input w-44" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              {records.length === 0 ? <EmptyState title="No records found" /> : (
                <div className="space-y-3">
                  {records.map(r => {
                    const flags = abnormalBadge(r)
                    return (
                      <div key={r.id} className={clsx('card p-4 cursor-pointer hover:border-amber-500/30 transition-all', flags.length > 0 && 'border-rose-500/30')} onClick={() => setPreview(r)}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">{r.su_name}</p>
                              <span className="badge badge-info text-xs capitalize">{r.obs_type?.replace(/_/g, ' ')}</span>
                              {flags.length > 0 && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                            </div>
                            <ObsValue obs={r} />
                            {flags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {flags.map(f => <span key={f} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs border border-rose-500/30">{f}</span>)}
                              </div>
                            )}
                            {r.notes && <p className="text-xs text-slate-400 mt-1.5">{r.notes}</p>}
                          </div>
                          <div className="text-right text-xs text-slate-500 flex-shrink-0">
                            <div className="text-white font-medium">{format(new Date(r.observed_at), 'dd MMM yyyy')}</div>
                            <div>{format(new Date(r.observed_at), 'HH:mm')}</div>
                            <div className="mt-1">{r.recorded_by_name}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Observation Detail" size="lg">
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-lg">{preview.su_name}</p>
                <p className="text-sm text-slate-400 capitalize">{preview.obs_type?.replace(/_/g, ' ')} · {format(new Date(preview.observed_at), 'dd MMM yyyy HH:mm')}</p>
              </div>
              {abnormalBadge(preview).length > 0 && (
                <div className="flex gap-1 flex-wrap justify-end">
                  {abnormalBadge(preview).map(f => <span key={f} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs border border-rose-500/30">{f}</span>)}
                </div>
              )}
            </div>
            <div className="card p-4"><ObsValue obs={preview} /></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {preview.temp_method && <div><span className="text-slate-500">Method:</span> <span className="text-white capitalize">{preview.temp_method}</span></div>}
              {preview.o2_litres_min && <div><span className="text-slate-500">O₂ flow:</span> <span className="text-white">{preview.o2_litres_min} L/min</span></div>}
              <div><span className="text-slate-500">Recorded by:</span> <span className="text-white">{preview.recorded_by_name}</span></div>
            </div>
            {preview.notes && <div><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-300">{preview.notes}</p></div>}
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Observation" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service User *" options={suOptions} placeholder="Select service user..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type *" options={OBS_TYPES} value={form.obsType} onChange={e => setForm(f => ({ ...f, obsType: e.target.value }))} />
            <Input label="Date & Time" type="datetime-local" value={form.observedAt} onChange={e => setForm(f => ({ ...f, observedAt: e.target.value }))} />
          </div>
          {showTemp && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Temperature (°C)" type="number" step="0.1" placeholder="e.g. 37.2" value={form.tempCelsius} onChange={e => setForm(f => ({ ...f, tempCelsius: e.target.value }))} />
              <Select label="Method" options={TEMP_METHODS} value={form.tempMethod} onChange={e => setForm(f => ({ ...f, tempMethod: e.target.value }))} />
            </div>
          )}
          {showBP && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Systolic (mmHg)" type="number" placeholder="e.g. 120" value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))} />
              <Input label="Diastolic (mmHg)" type="number" placeholder="e.g. 80" value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))} />
            </div>
          )}
          {showPulse && (
            <Input label="Pulse (bpm)" type="number" placeholder="e.g. 72" value={form.pulse} onChange={e => setForm(f => ({ ...f, pulse: e.target.value }))} />
          )}
          {showSpo2 && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="SpO2 (%)" type="number" placeholder="e.g. 98" value={form.spo2} onChange={e => setForm(f => ({ ...f, spo2: e.target.value }))} />
              <Input label="O₂ flow (L/min)" type="number" step="0.5" placeholder="If on O₂..." value={form.o2Litres} onChange={e => setForm(f => ({ ...f, o2Litres: e.target.value }))} />
            </div>
          )}
          {showWeight && (
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="e.g. 65.0" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
          )}
          {showGlucose && (
            <Input label="Blood Glucose (mmol/L)" type="number" step="0.1" placeholder="e.g. 5.4" value={form.bloodGlucose} onChange={e => setForm(f => ({ ...f, bloodGlucose: e.target.value }))} />
          )}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Observation</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
