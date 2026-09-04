import React, { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import { Heart, Plus, Edit, ChevronDown, ChevronUp, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  su_id: string
  su_name?: string
  height_cm?: number
  weight_kg?: number
  bmi?: number
  blood_pressure?: string
  pulse?: number
  temperature_c?: number
  oxygen_sat?: number
  conditions?: string
  allergies?: string
  current_meds?: string
  gp_name?: string
  gp_phone?: string
  hospital_number?: string
  nhs_number?: string
  last_gp_review?: string
  next_review_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

function calcBMI(h?: number, w?: number): number | null {
  if (!h || !w || h <= 0) return null
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' }
  if (bmi < 25) return { label: 'Healthy', color: 'text-green-600' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600' }
  return { label: 'Obese', color: 'text-red-600' }
}

const EMPTY_FORM = {
  suId: '', heightCm: '', weightKg: '', bloodPressure: '', pulse: '', temperatureC: '',
  oxygenSat: '', conditions: '', allergies: '', currentMeds: '', gpName: '', gpPhone: '',
  hospitalNumber: '', nhsNumber: '', lastGpReview: '', nextReviewDate: '', notes: '',
}

export default function PhysicalHealthPlan() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [sus, setSus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const load = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const [plansRes, suRes] = await Promise.all([
        api.get('/physical-health-plans', { params: { homeId: user.homeId } }),
        api.get('/service-users', { params: { homeId: user.homeId, status: 'live' } }),
      ])
      setPlans(plansRes.data.data || [])
      setSus(suRes.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [user?.homeId])

  useEffect(() => { load() }, [load])

  const openEdit = (plan: Plan) => {
    setEditPlan(plan)
    setForm({
      suId: plan.su_id,
      heightCm: String(plan.height_cm || ''),
      weightKg: String(plan.weight_kg || ''),
      bloodPressure: plan.blood_pressure || '',
      pulse: String(plan.pulse || ''),
      temperatureC: String(plan.temperature_c || ''),
      oxygenSat: String(plan.oxygen_sat || ''),
      conditions: plan.conditions || '',
      allergies: plan.allergies || '',
      currentMeds: plan.current_meds || '',
      gpName: plan.gp_name || '',
      gpPhone: plan.gp_phone || '',
      hospitalNumber: plan.hospital_number || '',
      nhsNumber: plan.nhs_number || '',
      lastGpReview: plan.last_gp_review ? plan.last_gp_review.split('T')[0] : '',
      nextReviewDate: plan.next_review_date ? plan.next_review_date.split('T')[0] : '',
      notes: plan.notes || '',
    })
    setShowAdd(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.suId) { toast.error('Select a service user'); return }
    setSubmitting(true)
    try {
      const bmi = calcBMI(parseFloat(form.heightCm) || 0, parseFloat(form.weightKg) || 0)
      const payload = {
        homeId: user?.homeId,
        suId: form.suId,
        heightCm: parseFloat(form.heightCm) || null,
        weightKg: parseFloat(form.weightKg) || null,
        bmi,
        bloodPressure: form.bloodPressure || null,
        pulse: parseInt(form.pulse) || null,
        temperatureC: parseFloat(form.temperatureC) || null,
        oxygenSat: parseInt(form.oxygenSat) || null,
        conditions: form.conditions || null,
        allergies: form.allergies || null,
        currentMeds: form.currentMeds || null,
        gpName: form.gpName || null,
        gpPhone: form.gpPhone || null,
        hospitalNumber: form.hospitalNumber || null,
        nhsNumber: form.nhsNumber || null,
        lastGpReview: form.lastGpReview || null,
        nextReviewDate: form.nextReviewDate || null,
        notes: form.notes || null,
      }
      if (editPlan) {
        await api.patch(`/physical-health-plans/${editPlan.id}`, payload)
        toast.success('Plan updated')
      } else {
        await api.post('/physical-health-plans', payload)
        toast.success('Plan created')
      }
      setShowAdd(false)
      setEditPlan(null)
      setForm({ ...EMPTY_FORM })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const bmiPreview = calcBMI(parseFloat(form.heightCm), parseFloat(form.weightKg))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Heart className="w-6 h-6 text-rose-400" /> Physical Health Support Plans
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and document residents' physical health</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditPlan(null); setForm({ ...EMPTY_FORM }); setShowAdd(true) }}>
          New Plan
        </Button>
      </div>

      {loading ? <Spinner /> : plans.length === 0 ? (
        <EmptyState title="No physical health plans" description="Create plans to track residents' physical health measurements and GP details" />
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const bmi = plan.bmi || calcBMI(plan.height_cm, plan.weight_kg)
            const bmiInfo = bmi ? bmiCategory(bmi) : null
            const isExpanded = expanded === plan.id
            return (
              <div key={plan.id} className="card overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : plan.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{plan.su_name || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                          {bmi && <span>BMI: <span className={bmiInfo?.color}>{bmi} ({bmiInfo?.label})</span></span>}
                          {plan.blood_pressure && <span>BP: {plan.blood_pressure}</span>}
                          {plan.oxygen_sat && <span>O₂: {plan.oxygen_sat}%</span>}
                          {plan.gp_name && <span>GP: {plan.gp_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(plan) }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-white/5 p-4" style={{ background: '#0a0a0a' }}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {plan.height_cm && <Field label="Height" value={`${plan.height_cm} cm`} />}
                      {plan.weight_kg && <Field label="Weight" value={`${plan.weight_kg} kg`} />}
                      {bmi && <Field label="BMI" value={`${bmi} — ${bmiInfo?.label}`} valueClass={bmiInfo?.color} />}
                      {plan.blood_pressure && <Field label="Blood Pressure" value={plan.blood_pressure} />}
                      {plan.pulse && <Field label="Pulse" value={`${plan.pulse} bpm`} />}
                      {plan.temperature_c && <Field label="Temperature" value={`${plan.temperature_c}°C`} />}
                      {plan.oxygen_sat && <Field label="Oxygen Saturation" value={`${plan.oxygen_sat}%`} />}
                      {plan.nhs_number && <Field label="NHS Number" value={plan.nhs_number} />}
                      {plan.hospital_number && <Field label="Hospital Number" value={plan.hospital_number} />}
                      {plan.gp_name && <Field label="GP" value={plan.gp_name} />}
                      {plan.gp_phone && <Field label="GP Phone" value={plan.gp_phone} />}
                      {plan.last_gp_review && <Field label="Last GP Review" value={format(parseISO(plan.last_gp_review), 'd MMM yyyy')} />}
                      {plan.next_review_date && <Field label="Next Review" value={format(parseISO(plan.next_review_date), 'd MMM yyyy')} />}
                    </div>
                    {plan.conditions && <ExpandField label="Medical Conditions" value={plan.conditions} />}
                    {plan.allergies && <ExpandField label="Allergies" value={plan.allergies} />}
                    {plan.current_meds && <ExpandField label="Current Medications" value={plan.current_meds} />}
                    {plan.notes && <ExpandField label="Notes" value={plan.notes} />}
                    <p className="text-xs text-slate-600 mt-3">Updated {format(new Date(plan.updated_at), 'd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditPlan(null) }} title={editPlan ? 'Update Physical Health Plan' : 'New Physical Health Plan'} size="lg">
        <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {!editPlan && (
            <div>
              <label className="label">Service User *</label>
              <select className="input w-full" required value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))}>
                <option value="">Select resident...</option>
                {sus.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Height (cm)" type="number" step="0.1" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} placeholder="e.g. 170" />
            <Input label="Weight (kg)" type="number" step="0.1" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="e.g. 75" />
          </div>
          {bmiPreview && (
            <div className={`text-sm font-medium ${bmiCategory(bmiPreview).color}`}>
              BMI: {bmiPreview} — {bmiCategory(bmiPreview).label}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Blood Pressure" value={form.bloodPressure} onChange={e => setForm(f => ({ ...f, bloodPressure: e.target.value }))} placeholder="e.g. 120/80" />
            <Input label="Pulse (bpm)" type="number" value={form.pulse} onChange={e => setForm(f => ({ ...f, pulse: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Temperature (°C)" type="number" step="0.1" value={form.temperatureC} onChange={e => setForm(f => ({ ...f, temperatureC: e.target.value }))} />
            <Input label="Oxygen Saturation (%)" type="number" value={form.oxygenSat} onChange={e => setForm(f => ({ ...f, oxygenSat: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="NHS Number" value={form.nhsNumber} onChange={e => setForm(f => ({ ...f, nhsNumber: e.target.value }))} />
            <Input label="Hospital Number" value={form.hospitalNumber} onChange={e => setForm(f => ({ ...f, hospitalNumber: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="GP Name" value={form.gpName} onChange={e => setForm(f => ({ ...f, gpName: e.target.value }))} />
            <Input label="GP Phone" value={form.gpPhone} onChange={e => setForm(f => ({ ...f, gpPhone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Last GP Review" type="date" value={form.lastGpReview} onChange={e => setForm(f => ({ ...f, lastGpReview: e.target.value }))} />
            <Input label="Next Review Date" type="date" value={form.nextReviewDate} onChange={e => setForm(f => ({ ...f, nextReviewDate: e.target.value }))} />
          </div>

          <div>
            <label className="label">Medical Conditions</label>
            <textarea className="input" rows={2} value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} placeholder="List existing medical conditions..." />
          </div>
          <div>
            <label className="label">Allergies</label>
            <textarea className="input" rows={2} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Any known allergies..." />
          </div>
          <div>
            <label className="label">Current Medications</label>
            <textarea className="input" rows={2} value={form.currentMeds} onChange={e => setForm(f => ({ ...f, currentMeds: e.target.value }))} placeholder="List current medications..." />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional health support notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowAdd(false); setEditPlan(null) }}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>{editPlan ? 'Update Plan' : 'Create Plan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  )
}

function ExpandField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
