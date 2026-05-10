import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'

const ENGAGEMENT = [{ value: 'good', label: 'Good' }, { value: 'limited', label: 'Limited' }, { value: 'refused', label: 'Refused' }, { value: 'other', label: 'Other' }]
const VISIT_TYPES = [{ value: 'social', label: 'Social visit' }, { value: 'family', label: 'Family visit' }, { value: 'community', label: 'Community access' }]
const COMMS_MODES = [{ value: 'verbal', label: 'Verbal' }, { value: 'makaton', label: 'Makaton' }, { value: 'pecs', label: 'PECS' }, { value: 'written', label: 'Written' }, { value: 'eye_gaze', label: 'Eye gaze' }, { value: 'other', label: 'Other' }]

export default function GeneralForm({ type, suId, onSaved }: { type: string; suId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, any>>({ notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await dailyRecordsApi.create({ suId, recordType: type, ...form }); onSaved() }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {type === 'one_to_one' && (<>
        <div><label className="label">Topics discussed</label><textarea className="input" rows={3} value={form.topics || ''} onChange={e => set('topics', e.target.value)} placeholder="What did you talk about..." /></div>
        <Input label="Duration (minutes)" type="number" value={form.durationMins || ''} onChange={e => set('durationMins', parseInt(e.target.value))} />
        <Select label="Engagement level" value={form.engagement || ''} onChange={e => set('engagement', e.target.value)} options={ENGAGEMENT} placeholder="Select level" />
        <div className="flex items-center gap-2"><input type="checkbox" id="fu" checked={form.followUp || false} onChange={e => set('followUp', e.target.checked)} className="rounded" /><label htmlFor="fu" className="text-sm">Follow-up required</label></div>
        {form.followUp && <Input label="Follow-up notes" value={form.followUpNotes || ''} onChange={e => set('followUpNotes', e.target.value)} />}
      </>)}

      {type === 'communication' && (<>
        <Select label="Mode of communication" value={form.modeUsed || ''} onChange={e => set('modeUsed', e.target.value)} options={COMMS_MODES} placeholder="Select mode" />
        <Input label="Topic" value={form.topic || ''} onChange={e => set('topic', e.target.value)} placeholder="What was communicated..." />
        <Select label="Response level" value={form.responseLevel || ''} onChange={e => set('responseLevel', e.target.value)}
          options={[{ value: 'good', label: 'Good' }, { value: 'limited', label: 'Limited' }, { value: 'none', label: 'None' }, { value: 'non_verbal', label: 'Non-verbal' }]} placeholder="Select level" />
      </>)}

      {type === 'social_activity' && (<>
        <Input label="Activity name" required value={form.activityName || ''} onChange={e => set('activityName', e.target.value)} placeholder="e.g. Bingo, gardening, music session..." />
        <Select label="Engagement" value={form.engagement || ''} onChange={e => set('engagement', e.target.value)}
          options={[{ value: 'fully_engaged', label: 'Fully engaged' }, { value: 'partially', label: 'Partially engaged' }, { value: 'observed', label: 'Observed only' }, { value: 'declined', label: 'Declined' }]} placeholder="Select level" />
        <Select label="Did they enjoy it?" value={form.enjoyed || ''} onChange={e => set('enjoyed', e.target.value)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Unsure' }]} placeholder="Select" />
      </>)}

      {type === 'visit' && (<>
        <Select label="Visit type" value={form.visitType || 'social'} onChange={e => set('visitType', e.target.value)} options={VISIT_TYPES} />
        <Input label="Visitor name" value={form.visitorName || ''} onChange={e => set('visitorName', e.target.value)} placeholder="Full name of visitor..." />
        <Input label="Relationship" value={form.relationship || ''} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter, friend, GP..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Time arrived" type="time" value={form.timeArrived || ''} onChange={e => set('timeArrived', e.target.value)} />
          <Input label="Time left" type="time" value={form.timeLeft || ''} onChange={e => set('timeLeft', e.target.value)} />
        </div>
        <Input label="Resident's response" value={form.suResponse || ''} onChange={e => set('suResponse', e.target.value)} placeholder="How did they react to the visit..." />
      </>)}

      {type === 'prn_medication' && (<>
        <Input label="Medication name" required value={form.medicationName || ''} onChange={e => set('medicationName', e.target.value)} placeholder="Name of medication given..." />
        <Input label="Dose" value={form.dose || ''} onChange={e => set('dose', e.target.value)} placeholder="e.g. 500mg, 2 tablets..." />
        <div><label className="label">Reason for giving *</label><textarea required className="input" rows={2} value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="Why was this medication needed..." /></div>
        <Input label="Witnessed by" value={form.witnessedBy || ''} onChange={e => set('witnessedBy', e.target.value)} placeholder="Name of witness..." />
      </>)}

      {type === 'handover' && (<>
        <div><label className="label">Shift summary *</label><textarea required className="input" rows={4} value={form.shiftSummary || ''} onChange={e => set('shiftSummary', e.target.value)} placeholder="Overview of the shift, key events, resident's condition..." /></div>
        <div><label className="label">Priority flags for next shift</label><textarea className="input" rows={2} value={(form.priorityFlags || []).join('\n')} onChange={e => set('priorityFlags', e.target.value.split('\n').filter(Boolean))} placeholder="One flag per line — things the next shift must know..." /></div>
        <div><label className="label">Outstanding actions</label><textarea className="input" rows={2} value={form.outstandingActions || ''} onChange={e => set('outstandingActions', e.target.value)} placeholder="Tasks not yet completed..." /></div>
      </>)}

      {type === 'general_support' && (
        <div><label className="label">Describe the support provided *</label><textarea required className="input" rows={4} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="What support did you give and how did the resident respond..." /></div>
      )}

      <div><label className="label">Additional notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
