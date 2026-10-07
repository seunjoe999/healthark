import React, { useEffect, useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { ukDateStr } from '../../../utils/ukDate'
import { Button, Input, Select, Toggle, SpeechTextarea } from '../../../components/ui'
import BodySitePicker, { BODY_ZONES } from '../../../components/BodySitePicker'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Draft autosave ───────────────────────────────────────────────────────
// Protects work-in-progress against the inactivity timeout / accidental tab close.
// This is a legal document with a lot of free text, so it's worth protecting.
function draftKey(suId: string) { return `compcare_incident_draft_${suId}` }
function getDraft(suId: string): any | null {
  try { const raw = localStorage.getItem(draftKey(suId)); return raw ? JSON.parse(raw) : null } catch { return null }
}
function saveDraft(suId: string, form: any) {
  try { localStorage.setItem(draftKey(suId), JSON.stringify({ ...form, savedAt: new Date().toISOString() })) } catch { /* storage unavailable — skip silently */ }
}
function clearDraft(suId: string) {
  try { localStorage.removeItem(draftKey(suId)) } catch { /* ignore */ }
}

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

const ZONE_LABEL = (id: string) => BODY_ZONES.find(z => z.id === id)?.label || ''

export default function IncidentForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    incidentType: '',
    incidentDate: ukDateStr(),
    incidentTime: new Date().toTimeString().substring(0, 5),
    location: '',
    description: '',
    witnesses: '',
    medicalAttentionRequired: false,
    medicalDetails: '',
    injuryDetails: '',
    injuredBodyPart: '',
    // Visual body map — a legal requirement for incident reports: staff must be
    // able to show WHERE the injury is, not just describe it in free text.
    injuredBodyParts: [] as string[],
    immediateActions: '',
    lessonsLearned: '',
    agenciesContacted: '',
    preventionMeasures: '',
    reportedToManagement: false,
    managementNotes: '',
    cqcNotified: false,
    cqcNotNotifiedReason: '',
    familyNotified: false,
    familyNotNotifiedReason: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const draft = getDraft(suId)
    if (draft && (draft.description || draft.incidentType)) {
      setForm(p => ({ ...p, ...draft, savedAt: undefined }))
      toast('Restored your unsaved draft', { icon: '📝' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const hasContent = form.incidentType || form.description || form.immediateActions
    if (!hasContent) return
    const t = setTimeout(() => saveDraft(suId, form), 800)
    return () => clearTimeout(t)
  }, [suId, form])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.incidentType || !form.description) {
      toast.error('Please fill in incident type and description')
      return
    }
    setSaving(true)
    try {
      // Body map labels folded into injury details too, so the record reads
      // correctly anywhere injury text is shown (reports, exports) without
      // needing to join back to body_map_data.
      const zoneLabels = (form.injuredBodyParts || [])
        .map((id: string) => ZONE_LABEL(id))
        .filter(Boolean)
      const injuryText = [form.injuryDetails, zoneLabels.length ? `Body map: ${zoneLabels.join(', ')}` : ''].filter(Boolean).join(' — ')
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
        injuryDetails: injuryText,
        injuredBodyPart: form.injuredBodyPart || (zoneLabels[0] ? zoneLabels[0].toLowerCase() : ''),
        bodyMapData: { selected: form.injuredBodyParts || [], labels: zoneLabels },
        immediateActions: form.immediateActions,
        lessonsLearned: form.lessonsLearned,
        agenciesContacted: form.agenciesContacted,
        preventionMeasures: form.preventionMeasures,
        reportedToManagement: form.reportedToManagement,
        managementNotes: form.managementNotes,
        cqcNotified: form.cqcNotified,
        cqcNotNotifiedReason: form.cqcNotNotifiedReason,
        familyNotified: form.familyNotified,
        familyNotNotifiedReason: form.familyNotNotifiedReason,
      })
      toast.success('Incident recorded')
      clearDraft(suId)
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

      <SpeechTextarea required label="Incident description *" rows={4} value={form.description} onChange={v => set('description', v)}
        placeholder="Describe exactly what happened, in your own words. Be factual and accurate..." />

      <Input label="Witness names" value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
        placeholder="Names of anyone who witnessed the incident" />

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <Toggle label="Medical attention required" checked={form.medicalAttentionRequired}
          onChange={v => set('medicalAttentionRequired', v)} description="Was first aid or medical treatment given?" />
        {form.medicalAttentionRequired && (
          <SpeechTextarea label="Medical attention details" rows={2} value={form.medicalDetails} onChange={v => set('medicalDetails', v)}
            placeholder="What treatment was given and by whom?" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SpeechTextarea label="Injury details" rows={2} value={form.injuryDetails} onChange={v => set('injuryDetails', v)}
          placeholder="Describe any injuries sustained..." />
        <Select label="Injured body part" value={form.injuredBodyPart}
          onChange={e => set('injuredBodyPart', e.target.value)}
          options={BODY_PARTS.map(b => ({ value: b.toLowerCase(), label: b }))}
          placeholder="Select if applicable" />
      </div>

      {/* Legal requirement: the incident report must show WHERE the injury is,
          not only describe it in words. Tap zones on the body (front/back) to
          mark every affected area; selections are stored on body_map_data and
          echoed into the injury details text. */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Body map — injury location</p>
        <BodySitePicker
          multiple
          label="Tap the injured area(s)"
          hint="Front and back views — tap again to remove."
          value={form.injuredBodyParts || []}
          onChange={(zoneId) => {
            setForm(p => {
              const cur: string[] = p.injuredBodyParts || []
              return { ...p, injuredBodyParts: cur.includes(zoneId) ? cur.filter(z => z !== zoneId) : [...cur, zoneId] }
            })
          }} />
      </div>

      <SpeechTextarea label="Immediate actions taken" rows={3} value={form.immediateActions} onChange={v => set('immediateActions', v)}
        placeholder="What did you do immediately after the incident?" />

      <Input label="Outside agencies contacted" value={form.agenciesContacted}
        onChange={e => set('agenciesContacted', e.target.value)}
        placeholder="e.g. Ambulance, Police, Social Services, GP..." />

      <SpeechTextarea label="Lessons learned" rows={2} value={form.lessonsLearned} onChange={v => set('lessonsLearned', v)}
        placeholder="What can be learned from this incident?" />

      <SpeechTextarea label="Prevention measures" rows={2} value={form.preventionMeasures} onChange={v => set('preventionMeasures', v)}
        placeholder="What actions will be taken to prevent this happening again?" />

      <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <Toggle label="Reported to management" checked={form.reportedToManagement}
          onChange={v => set('reportedToManagement', v)} />
        {form.reportedToManagement && (
          <Input label="Management notes" value={form.managementNotes}
            onChange={e => set('managementNotes', e.target.value)}
            placeholder="Management recommendations..." />
        )}
      </div>

      <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Notification of Incident</p>
        <Toggle label="CQC notified" checked={form.cqcNotified}
          onChange={v => set('cqcNotified', v)}
          description="Was the Care Quality Commission notified of this incident?" />
        {!form.cqcNotified && (
          <SpeechTextarea label="Reason CQC was not notified" rows={2} value={form.cqcNotNotifiedReason} onChange={v => set('cqcNotNotifiedReason', v)}
            placeholder="State why CQC notification was not required or not made..." />
        )}
        <Toggle label="Family / next of kin notified" checked={form.familyNotified}
          onChange={v => set('familyNotified', v)}
          description="Was the service user's family or next of kin informed?" />
        {!form.familyNotified && (
          <SpeechTextarea label="Reason family was not notified" rows={2} value={form.familyNotNotifiedReason} onChange={v => set('familyNotNotifiedReason', v)}
            placeholder="State why family notification was not made..." />
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
