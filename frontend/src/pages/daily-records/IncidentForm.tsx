import React, { useState } from 'react'
import { dailyRecordsApi } from '../../api'
import { Button, Input, Select, Toggle } from '../../components/ui'
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

// ── Body map ──────────────────────────────────────────────────────
const BODY_ZONES: { id: string; label: string; path: string; cx?: number; cy?: number; front: boolean }[] = [
  // Front zones
  { id: 'head_front',     label: 'Head',           cx: 60, cy: 18,  front: true,  path: '' },
  { id: 'neck_front',     label: 'Neck',           cx: 60, cy: 35,  front: true,  path: '' },
  { id: 'chest',          label: 'Chest',          cx: 60, cy: 58,  front: true,  path: '' },
  { id: 'abdomen',        label: 'Abdomen',        cx: 60, cy: 82,  front: true,  path: '' },
  { id: 'pelvis_front',   label: 'Pelvis',         cx: 60, cy: 105, front: true,  path: '' },
  { id: 'left_shoulder',  label: 'Left shoulder',  cx: 35, cy: 50,  front: true,  path: '' },
  { id: 'right_shoulder', label: 'Right shoulder', cx: 85, cy: 50,  front: true,  path: '' },
  { id: 'left_arm',       label: 'Left arm',       cx: 25, cy: 75,  front: true,  path: '' },
  { id: 'right_arm',      label: 'Right arm',      cx: 95, cy: 75,  front: true,  path: '' },
  { id: 'left_hand',      label: 'Left hand',      cx: 18, cy: 100, front: true,  path: '' },
  { id: 'right_hand',     label: 'Right hand',     cx: 102,cy: 100, front: true,  path: '' },
  { id: 'left_thigh',     label: 'Left thigh',     cx: 48, cy: 130, front: true,  path: '' },
  { id: 'right_thigh',    label: 'Right thigh',    cx: 72, cy: 130, front: true,  path: '' },
  { id: 'left_knee',      label: 'Left knee',      cx: 48, cy: 155, front: true,  path: '' },
  { id: 'right_knee',     label: 'Right knee',     cx: 72, cy: 155, front: true,  path: '' },
  { id: 'left_shin',      label: 'Left shin',      cx: 48, cy: 175, front: true,  path: '' },
  { id: 'right_shin',     label: 'Right shin',     cx: 72, cy: 175, front: true,  path: '' },
  { id: 'left_foot',      label: 'Left foot',      cx: 45, cy: 197, front: true,  path: '' },
  { id: 'right_foot',     label: 'Right foot',     cx: 75, cy: 197, front: true,  path: '' },
  // Back zones
  { id: 'head_back',      label: 'Head (back)',    cx: 60, cy: 18,  front: false, path: '' },
  { id: 'neck_back',      label: 'Neck (back)',    cx: 60, cy: 35,  front: false, path: '' },
  { id: 'upper_back',     label: 'Upper back',     cx: 60, cy: 58,  front: false, path: '' },
  { id: 'lower_back',     label: 'Lower back',     cx: 60, cy: 82,  front: false, path: '' },
  { id: 'buttocks',       label: 'Buttocks',       cx: 60, cy: 105, front: false, path: '' },
  { id: 'back_left_arm',  label: 'Left arm (back)',cx: 25, cy: 75,  front: false, path: '' },
  { id: 'back_right_arm', label: 'Right arm (back)',cx:95, cy: 75,  front: false, path: '' },
  { id: 'left_hamstring', label: 'Left hamstring', cx: 48, cy: 130, front: false, path: '' },
  { id: 'right_hamstring',label: 'Right hamstring',cx: 72, cy: 130, front: false, path: '' },
  { id: 'left_calf',      label: 'Left calf',      cx: 48, cy: 168, front: false, path: '' },
  { id: 'right_calf',     label: 'Right calf',     cx: 72, cy: 168, front: false, path: '' },
]

function BodyMap({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const zones = BODY_ZONES.filter(z => z.front === (view === 'front'))

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setView('front')}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${view === 'front' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          Front
        </button>
        <button type="button" onClick={() => setView('back')}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${view === 'back' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          Back
        </button>
      </div>
      <div className="flex gap-4">
        {/* SVG body silhouette */}
        <div className="flex-shrink-0">
          <svg width="120" height="210" viewBox="0 0 120 210" className="select-none">
            {/* Silhouette */}
            <ellipse cx="60" cy="18" rx="14" ry="16" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="44" y="32" width="32" height="8" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M 36 40 Q 30 42 22 55 L 18 100 Q 18 105 24 105 L 28 75 L 30 110 L 28 200 L 38 200 L 42 155 L 60 158 L 78 155 L 82 200 L 92 200 L 90 110 L 92 75 L 96 105 Q 102 105 102 100 L 98 55 Q 90 42 84 40 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            {/* Clickable zones */}
            {zones.map(z => {
              const isSelected = selected.includes(z.id)
              return (
                <circle key={z.id} cx={z.cx} cy={z.cy} r="11"
                  fill={isSelected ? '#ef4444' : 'transparent'}
                  stroke={isSelected ? '#dc2626' : '#94a3b8'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? undefined : '3,2'}
                  opacity={isSelected ? 0.8 : 0.4}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => toggle(z.id)} />
              )
            })}
          </svg>
        </div>
        {/* Zone buttons */}
        <div className="flex flex-col gap-1 flex-1 max-h-[210px] overflow-y-auto">
          {zones.map(z => (
            <button key={z.id} type="button"
              onClick={() => toggle(z.id)}
              className={`text-left text-xs px-2 py-1.5 rounded-lg border transition-colors ${selected.includes(z.id) ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
              {z.label}
            </button>
          ))}
        </div>
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-red-700 font-medium mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          Injury locations: {selected.map(id => BODY_ZONES.find(z => z.id === id)?.label).join(', ')}
        </p>
      )}
    </div>
  )
}

export default function IncidentForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    incidentType: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().substring(0, 5),
    location: '',
    description: '',
    witnesses: '',
    injuries: false,
    injuryDetails: '',
    injuredBodyParts: [] as string[],
    medicalAttentionRequired: false,
    medicalDetails: '',
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
    const bodyPartText = form.injuredBodyParts.length
      ? BODY_ZONES.filter(z => form.injuredBodyParts.includes(z.id)).map(z => z.label).join(', ')
      : ''
    try {
      await dailyRecordsApi.create({
        suId,
        recordType: 'incident',
        incidentType: form.incidentType,
        incidentDate: form.incidentDate,
        incidentTime: form.incidentTime,
        location: form.location,
        notes: form.description,
        description: form.description,
        witnesses: form.witnesses,
        injuries: form.injuries,
        injuryDetails: form.injuryDetails + (bodyPartText ? ` — Body map: ${bodyPartText}` : ''),
        injuredBodyPart: bodyPartText,
        medicalAttentionRequired: form.medicalAttentionRequired,
        medicalNeeded: form.medicalAttentionRequired,
        medicalDetails: form.medicalDetails,
        immediateAction: form.immediateActions,
        immediateActions: form.immediateActions,
        agenciesContacted: form.agenciesContacted,
        lessonsLearned: form.lessonsLearned,
        preventionMeasures: form.preventionMeasures,
        reportedToManagement: form.reportedToManagement,
        managementNotes: form.managementNotes,
      })
      toast.success('Incident recorded')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save incident')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
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

      {/* Injuries section */}
      <div className="space-y-3 p-4 bg-rose-50 rounded-xl border border-rose-200">
        <Toggle label="Was there an injury?" checked={form.injuries}
          onChange={v => set('injuries', v)} description="Did the incident result in a physical injury?" />
        {form.injuries && (
          <>
            <div>
              <label className="label">Injury details</label>
              <textarea className="input" rows={2} value={form.injuryDetails}
                onChange={e => set('injuryDetails', e.target.value)}
                placeholder="Describe the injury in detail..." />
            </div>
            <div>
              <label className="label mb-2">Body map — click to mark injury locations</label>
              <BodyMap selected={form.injuredBodyParts} onChange={v => set('injuredBodyParts', v)} />
            </div>
          </>
        )}
      </div>

      {/* Medical attention */}
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
