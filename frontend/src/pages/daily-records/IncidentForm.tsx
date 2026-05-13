import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Input, Select, Toggle } from '../../../components/ui'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const INCIDENT_TYPES = [
  { value: 'fall', label: 'Fall' },
  { value: 'medication_error', label: 'Medication error' },
  { value: 'aggressive_behaviour', label: 'Aggressive behaviour' },
  { value: 'self_harm', label: 'Self harm' },
  { value: 'missing_person', label: 'Missing person' },
  { value: 'property_damage', label: 'Property damage' },
  { value: 'injury', label: 'Injury' },
  { value: 'near_miss', label: 'Near miss' },
  { value: 'other', label: 'Other' },
]

const BODY_PARTS = [
  'Head', 'Face', 'Neck', 'Shoulder', 'Arm', 'Elbow', 'Wrist', 'Hand',
  'Chest', 'Back', 'Hip', 'Leg', 'Knee', 'Ankle', 'Foot', 'Other'
]

export default function IncidentForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    incidentType: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().substring(0, 5),
    location: '',
    description: '',
    witnesses: '',
    medicalAttentionRequired: false,
    medicalDetails: '',
    injuryDetails: '',
    injuredBodyPart: '',
    immediateActions: '',
    lessonsLearned: '',
    agenciesContacted: '',
    preventionMeasures: '',
    reportedToManagement: false,
    managementNotes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.incidentType || !form.description) {
      toast.error('Please fill in incident type and description')
      return
    }
    setSaving(true)
    try {
      await dailyRecordsApi.create({
        suId,
        recordType: 'incident',
        incidentType: form.incidentType,
        incidentDate: form.incidentDate,
        incidentTime: form.incidentTime,
        location: form.location,
        notes: form.description,
        witnesses: form.witnesses,
        medicalAttentionRequired: form.medicalAttentionRequired,
        medicalDetails: form.medicalDetails,
        injuryDetails: form.injuryDetails,
        injuredBodyPart: form.injuredBodyPart,
        immediateActions: form.immediateActions,
        lessonsLearned: form.lessonsLearned,
        agenciesContacted: form.agenciesContacted,
        preventionMeasures: form.preventionMeasures,
        reportedToManagement: form.reportedToManagement,
        managementNotes: form.managementNotes,
      })
      toast.success('Incident recorded')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
        <p className="text-sm text-rose-700 font-medium">Complete all sections accurately. This report is a legal document.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Incident type *" required value={form.incidentType} onChange={e => set('incidentType', e.target.value)} options={INCIDENT_TYPES} placeholder="Select type..." />
        <Input label="Date *" type="date" required value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Time" type="time" value={form.incidentTime} onChange={e => set('incidentTime', e.target.value)} />
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bedroom, Lounge, Garden..." />
      </div>

      <div>
        <label className="label">Incident description *</label>
        <textarea required className="input" rows={4} value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Describe exactly what happened, in your own words. Be factual and accurate..." />
      </div>

      <Input label="Witness names" value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
        placeholder="Names of anyone who witnessed the incident" />

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <Toggle label="Medical attention required" checked={form.medicalAttentionRequired}
          onChange={v => set('medicalAttentionRequired', v)} description="Was first aid or medical treatment given?" />
        {form.medicalAttentionRequired && (
          <div>
            <label className="label">Medical attention details</label>
            <textarea className="input" rows={2} value={form.medicalDetails}
              onChange={e => set('medicalDetails', e.target.value)}
              placeholder="What treatment was given and by whom?" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Injury details</label>
          <textarea className="input" rows={2} value={form.injuryDetails}
            onChange={e => set('injuryDetails', e.target.value)}
            placeholder="Describe any injuries sustained..." />
        </div>
        <Select label="Injured body part" value={form.injuredBodyPart}
          onChange={e => set('injuredBodyPart', e.target.value)}
          options={BODY_PARTS.map(b => ({ value: b.toLowerCase(), label: b }))}
          placeholder="Select if applicable" />
      </div>

      <div>
        <label className="label">Immediate actions taken</label>
        <textarea className="input" rows={3} value={form.immediateActions}
          onChange={e => set('immediateActions', e.target.value)}
          placeholder="What did you do immediately after the incident?" />
      </div>

      <Input label="Outside agencies contacted" value={form.agenciesContacted}
        onChange={e => set('agenciesContacted', e.target.value)}
        placeholder="e.g. Ambulance, Police, Social Services, GP..." />

      <div>
        <label className="label">Lessons learned</label>
        <textarea className="input" rows={2} value={form.lessonsLearned}
          onChange={e => set('lessonsLearned', e.target.value)}
          placeholder="What can be learned from this incident?" />
      </div>

      <div>
        <label className="label">Prevention measures</label>
        <textarea className="input" rows={2} value={form.preventionMeasures}
          onChange={e => set('preventionMeasures', e.target.value)}
          placeholder="What actions will be taken to prevent this happening again?" />
      </div>

      <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <Toggle label="Reported to management" checked={form.reportedToManagement}
          onChange={v => set('reportedToManagement', v)} />
        {form.reportedToManagement && (
          <Input label="Management notes" value={form.managementNotes}
            onChange={e => set('managementNotes', e.target.value)}
            placeholder="Management recommendations..." />
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
        <Button type="submit" variant="danger" loading={saving} icon={<AlertTriangle className="w-4 h-4" />}>
          Submit incident report
        </Button>
      </div>
    </form>
  )
}
