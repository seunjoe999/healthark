import React, { useState, useEffect } from 'react'
import api, { dailyRecordsApi, getToken } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'
import { SpeechTextarea } from '../../../components/ui/SpeechButton'

const ENGAGEMENT = [{ value: 'good', label: 'Good' }, { value: 'limited', label: 'Limited' }, { value: 'refused', label: 'Refused' }, { value: 'other', label: 'Other' }]
const VISIT_TYPES = [{ value: 'social', label: 'Social visit' }, { value: 'family', label: 'Family visit' }, { value: 'professional', label: 'Professional visit' }, { value: 'community', label: 'Community access' }]
// Daily Records lists these as their own record types (Professional Visit,
// Family Visit, Social Visit) but they all land in records_visits — the form
// block below only used to match the literal type 'visit', which nothing
// actually sent, so choosing Family Visit gave you a bare notes box with no
// visit details at all.
const VISIT_RECORD_TYPES = ['visit', 'professional_visit', 'family_visit', 'social_visit']
const VISIT_TYPE_BY_RECORD: Record<string, string> = {
  professional_visit: 'professional', family_visit: 'family', social_visit: 'social', visit: 'social',
}
const COMMS_MODES = [{ value: 'verbal', label: 'Verbal' }, { value: 'makaton', label: 'Makaton' }, { value: 'pecs', label: 'PECS' }, { value: 'written', label: 'Written' }, { value: 'eye_gaze', label: 'Eye gaze' }, { value: 'other', label: 'Other' }]
const CALL_DIRECTIONS = [{ value: 'incoming', label: 'Incoming — they called us' }, { value: 'outgoing', label: 'Outgoing — we called them' }]
const PAYMENT_METHODS = [{ value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'other', label: 'Other' }]

export default function GeneralForm({ type, suId, onSaved, recordedAt }: { type: string; suId: string; onSaved: () => void; recordedAt?: string }) {
  const [form, setForm] = useState<Record<string, any>>({ notes: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  // PRN: show the resident's OWN catalogued as-required medicines to pick from
  // (previously a blank text box, so staff typed a name from scratch instead of
  // seeing e.g. Paracetamol / Zopiclone that this resident is actually on).
  const [prnMeds, setPrnMeds] = useState<any[]>([])
  useEffect(() => {
    if (type !== 'prn_medication' || !suId) return
    api.get(`/mar/medications/${suId}`).then(res => {
      setPrnMeds((res.data.data || []).filter((m: any) => m.is_prn))
    }).catch(() => {})
  }, [type, suId])

  const uploadReceipt = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const res = await fetch('/api/upload/document', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      const json = await res.json()
      set('receiptUrl', json.fileUrl || '')
      set('receiptName', json.fileName || file.name)
    } catch { alert('Receipt upload failed') }
    finally { setUploading(false) }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (['medication_disposed', 'medication_received', 'medication_ordered'].includes(type) && !form.medicationName?.trim()) {
      alert('Medication name is required'); return
    }
    if (type === 'shopping' && !form.amountSpent) { alert('Amount spent is required'); return }
    if (type === 'financial_support' && (!form.amountSpent || !form.reasonForWithdrawal?.trim())) {
      alert('Amount spent and reason for withdrawal are required'); return
    }
    setLoading(true)
    try {
      // These medication-logistics types have no dedicated backend table —
      // like several other simple record types, their structured fields are
      // composed into notes so they're actually saved and displayed, rather
      // than silently dropped by daily-records' generic insert.
      let notes = form.notes || ''
      if (type === 'medication_disposed') {
        notes = [`Medication: ${form.medicationName}`, form.quantity && `Quantity disposed: ${form.quantity}`,
          form.reason && `Reason: ${form.reason}`, form.witnessedBy && `Witnessed by: ${form.witnessedBy}`, notes].filter(Boolean).join('\n')
      } else if (type === 'medication_received') {
        notes = [`Medication: ${form.medicationName}`, form.quantity && `Quantity received: ${form.quantity}`,
          form.receivedFrom && `Received from: ${form.receivedFrom}`, form.witnessedBy && `Received by: ${form.witnessedBy}`, notes].filter(Boolean).join('\n')
      } else if (type === 'medication_ordered') {
        notes = [`Medication: ${form.medicationName}`, form.quantity && `Quantity ordered: ${form.quantity}`,
          form.receivedFrom && `Ordered from: ${form.receivedFrom}`, form.expectedDate && `Expected delivery: ${form.expectedDate}`, notes].filter(Boolean).join('\n')
      } else if (type === 'shopping') {
        notes = [`Amount spent: £${form.amountSpent || '0.00'}`, form.paymentMethod && `Payment method: ${PAYMENT_METHODS.find(p => p.value === form.paymentMethod)?.label || form.paymentMethod}`,
          form.receiptUrl && `Receipt attached: ${form.receiptName || form.receiptUrl}`, notes].filter(Boolean).join('\n')
      } else if (type === 'financial_support') {
        notes = [`Cash withdrawal: £${form.cashWithdrawal || '0.00'}`, `Amount spent: £${form.amountSpent || '0.00'}`,
          form.balanceInBank && `Balance in bank: £${form.balanceInBank}`, form.reasonForWithdrawal && `Reason for withdrawal: ${form.reasonForWithdrawal}`,
          form.receiptUrl && `Receipt attached: ${form.receiptName || form.receiptUrl}`, notes].filter(Boolean).join('\n')
      } else if (VISIT_RECORD_TYPES.includes(type)) {
        // Daily Records, Management Review and the Daily Note report all render
        // `daily_records.notes` as the body of a record (they never join to
        // records_visits), so the visit template — time, name, role, announced,
        // purpose — is composed into notes as well as being stored in its own
        // columns. Without this the structured fields saved fine but were
        // invisible everywhere anyone actually reads them.
        const visitTypeLabel = VISIT_TYPES.find(v => v.value === (form.visitType ?? VISIT_TYPE_BY_RECORD[type]))?.label || 'Visit'
        const announced = form.visitAnnounced === undefined || form.visitAnnounced === null ? '—' : form.visitAnnounced ? 'Yes' : 'No'
        notes = [
          `Time: ${form.timeArrived || '—'}`,
          form.visitorName && `Name: ${form.visitorName}`,
          form.visitorRole && `Role: ${form.visitorRole}`,
          form.relationship && `Relationship: ${form.relationship}`,
          `Visit announced: ${announced}`,
          form.purpose && `Purpose of visit: ${form.purpose}`,
          form.suResponse && `Resident's response: ${form.suResponse}`,
          notes,
        ].filter(Boolean).join('\n')
        notes = `${visitTypeLabel} — ${notes}`
      }
      await dailyRecordsApi.create({
        suId, recordType: type, recordedAt, ...form, notes,
        // Defaulted from the record type when never touched (Professional
        // Visit → professional, Family Visit → family, ...), so the child
        // records_visits row is tagged correctly instead of falling back to
        // "social" for every visit kind.
        ...(VISIT_RECORD_TYPES.includes(type) ? { visitType: form.visitType ?? VISIT_TYPE_BY_RECORD[type] ?? 'social' } : {}),
      })
      onSaved()
    }
    catch (err: any) { alert(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {type === 'one_to_one' && (<>
        <div><label className="label">Topics discussed</label><textarea className="input" rows={3} value={form.topics || ''} onChange={e => set('topics', e.target.value)} placeholder="What did you talk about..." /></div>
        <Input label="Duration (minutes)" type="number" value={form.durationMins || ''} onChange={e => set('durationMins', parseInt(e.target.value))} />
        <Select label="Engagement level" value={form.engagement || ''} onChange={e => set('engagement', e.target.value)} options={ENGAGEMENT} placeholder="Select level" />
        <div className="flex items-center gap-2"><input type="checkbox" id="fu" checked={form.followUp || false} onChange={e => set('followUp', e.target.checked)} className="rounded" /><label htmlFor="fu" className="text-sm text-slate-700">Follow-up required</label></div>
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

      {type === 'telephone_call' && (<>
        <Select label="Direction" value={form.direction || 'incoming'} onChange={e => set('direction', e.target.value)} options={CALL_DIRECTIONS} />
        <Input label="Caller / contact name" value={form.callerName || ''} onChange={e => set('callerName', e.target.value)} placeholder="Full name of the person on the call..." />
        <Input label="Relationship" value={form.relationship || ''} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter, GP, social worker..." />
        <div><label className="label">Reason for call</label><textarea className="input" rows={2} value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="What was the call about..." /></div>
        <Input label="Outcome" value={form.outcome || ''} onChange={e => set('outcome', e.target.value)} placeholder="e.g. Call returned, information passed on, callback arranged..." />
      </>)}

      {VISIT_RECORD_TYPES.includes(type) && (<>
        {/* Date + time the visit happened — Date comes from the record's own
            recorded-at value (the shared field every record type has), Time
            from the arrival time below, per the owner's requested template. */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span><span className="font-semibold text-slate-600">Date:</span> {recordedAt ? new Date(recordedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
          <span className="text-slate-300">·</span>
          <span>Change the date/time in the "Recorded at" field above.</span>
        </div>
        <div>
          <label className="label">Visit type</label>
          <select className="input" value={form.visitType ?? VISIT_TYPE_BY_RECORD[type] ?? 'social'}
            onChange={e => set('visitType', e.target.value)}>
            {VISIT_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Time" type="time" value={form.timeArrived || ''} onChange={e => set('timeArrived', e.target.value)} />
          <Input label="Name" value={form.visitorName || ''} onChange={e => set('visitorName', e.target.value)} placeholder="Full name of visitor" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Role" value={form.visitorRole || ''} onChange={e => set('visitorRole', e.target.value)} placeholder="e.g. District Nurse, Daughter, GP" />
          <div>
            <label className="label">Visit announced?</label>
            <div className="flex gap-2">
              {[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }].map(o => (
                <button key={o.v} type="button"
                  onClick={() => set('visitAnnounced', o.v === 'yes')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    (form.visitAnnounced ?? null) === (o.v === 'yes')
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Purpose of visit</label>
          <textarea className="input" rows={2} value={form.purpose || ''} onChange={e => set('purpose', e.target.value)}
            placeholder="Why did they visit..." />
        </div>
        <Input label="Relationship" value={form.relationship || ''} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter, GP, Social worker..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Time left" type="time" value={form.timeLeft || ''} onChange={e => set('timeLeft', e.target.value)} />
          <Input label="Resident's response" value={form.suResponse || ''} onChange={e => set('suResponse', e.target.value)} placeholder="How did they react to the visit..." />
        </div>
      </>)}

      {type === 'prn_medication' && (<>
        {prnMeds.length > 0 && form.medicationId !== 'other' ? (
          <div>
            <label className="label">PRN medication *</label>
            <select required className="input" value={form.medicationId || ''}
              onChange={e => {
                const picked = prnMeds.find(m => m.id === e.target.value)
                set('medicationId', e.target.value)
                set('medicationName', picked?.medication_name || '')
                set('dose', picked?.dose || '')
              }}>
              <option value="">Select the PRN medication given...</option>
              {prnMeds.map(m => <option key={m.id} value={m.id}>{m.medication_name}{m.dose ? ` (${m.dose})` : ''}</option>)}
              <option value="other">Other / not listed…</option>
            </select>
          </div>
        ) : (
          <div>
            {prnMeds.length > 0 && (
              <button type="button" className="text-xs text-purple-600 mb-1" onClick={() => { set('medicationId', ''); set('medicationName', ''); set('dose', '') }}>
                ← Pick from {prnMeds.length === 1 ? "resident's PRN medication" : "resident's PRN medications"}
              </button>
            )}
            <Input label="Medication name *" required value={form.medicationName || ''} onChange={e => set('medicationName', e.target.value)} placeholder="Name of medication given..." />
          </div>
        )}
        <Input label="Dose" value={form.dose || ''} onChange={e => set('dose', e.target.value)} placeholder="e.g. 500mg, 2 tablets..." />
        <div><label className="label">Reason for giving *</label><textarea required className="input" rows={2} value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="Why was this medication needed..." /></div>
        <Input label="Witnessed by" value={form.witnessedBy || ''} onChange={e => set('witnessedBy', e.target.value)} placeholder="Name of witness..." />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="prnSe" checked={form.sideEffects || false} onChange={e => set('sideEffects', e.target.checked)} className="rounded" />
          <label htmlFor="prnSe" className="text-sm text-slate-700">Any side effects observed?</label>
        </div>
        {form.sideEffects && (
          <div><label className="label">Side effect details</label><textarea className="input" rows={2} value={form.sideEffectsNotes || ''} onChange={e => set('sideEffectsNotes', e.target.value)} placeholder="What was observed..." /></div>
        )}
        <Select label="Resident's response" value={form.emotion || ''} onChange={e => set('emotion', e.target.value)}
          options={[{ value: 'settled', label: 'Settled / relieved' }, { value: 'no_change', label: 'No change' }, { value: 'distressed', label: 'Still distressed' }, { value: 'other', label: 'Other' }]}
          placeholder="How were they afterwards..." />
        <Input label="Outcome notes" value={form.outcomeNotes || ''} onChange={e => set('outcomeNotes', e.target.value)} placeholder="Effect of the medication, follow-up needed..." />
      </>)}

      {type === 'medication_disposed' && (<>
        <Input label="Medication name *" required value={form.medicationName || ''} onChange={e => set('medicationName', e.target.value)} placeholder="Name of medication disposed of..." />
        <Input label="Quantity disposed" value={form.quantity || ''} onChange={e => set('quantity', e.target.value)} placeholder="e.g. 12 tablets, 50ml..." />
        <Input label="Reason for disposal" value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="e.g. Discontinued, expired, damaged..." />
        <Input label="Witnessed by" value={form.witnessedBy || ''} onChange={e => set('witnessedBy', e.target.value)} placeholder="Name of witness..." />
      </>)}

      {type === 'medication_received' && (<>
        <Input label="Medication name *" required value={form.medicationName || ''} onChange={e => set('medicationName', e.target.value)} placeholder="Name of medication received..." />
        <Input label="Quantity received" value={form.quantity || ''} onChange={e => set('quantity', e.target.value)} placeholder="e.g. 28 tablets, box of 56..." />
        <Input label="Received from" value={form.receivedFrom || ''} onChange={e => set('receivedFrom', e.target.value)} placeholder="e.g. Pharmacy name..." />
        <Input label="Received by" value={form.witnessedBy || ''} onChange={e => set('witnessedBy', e.target.value)} placeholder="Staff who checked the delivery in..." />
      </>)}

      {type === 'medication_ordered' && (<>
        <Input label="Medication name *" required value={form.medicationName || ''} onChange={e => set('medicationName', e.target.value)} placeholder="Name of medication ordered..." />
        <Input label="Quantity ordered" value={form.quantity || ''} onChange={e => set('quantity', e.target.value)} placeholder="e.g. 28 tablets..." />
        <Input label="Ordered from" value={form.receivedFrom || ''} onChange={e => set('receivedFrom', e.target.value)} placeholder="e.g. Pharmacy name..." />
        <Input label="Expected delivery date" type="date" value={form.expectedDate || ''} onChange={e => set('expectedDate', e.target.value)} />
      </>)}

      {type === 'shopping' && (<>
        <Input label="Amount spent (£) *" required type="number" step="0.01" value={form.amountSpent || ''} onChange={e => set('amountSpent', e.target.value)} placeholder="0.00" />
        <Select label="Payment method" value={form.paymentMethod || ''} onChange={e => set('paymentMethod', e.target.value)} options={PAYMENT_METHODS} placeholder="Select method" />
        <div>
          <label className="label">Receipt attached</label>
          <input type="file" accept="image/*,.pdf" className="input" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f) }} />
          {uploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
          {form.receiptUrl && <p className="text-xs text-green-600 mt-1">Attached: {form.receiptName}</p>}
        </div>
      </>)}

      {type === 'financial_support' && (<>
        <Input label="Cash withdrawal (£)" type="number" step="0.01" value={form.cashWithdrawal || ''} onChange={e => set('cashWithdrawal', e.target.value)} placeholder="0.00" />
        <Input label="Amount spent (£) *" required type="number" step="0.01" value={form.amountSpent || ''} onChange={e => set('amountSpent', e.target.value)} placeholder="0.00" />
        <Input label="Balance in bank (£)" type="number" step="0.01" value={form.balanceInBank || ''} onChange={e => set('balanceInBank', e.target.value)} placeholder="0.00" />
        <div><label className="label">Reason for withdrawal *</label><textarea required className="input" rows={2} value={form.reasonForWithdrawal || ''} onChange={e => set('reasonForWithdrawal', e.target.value)} placeholder="What was the money withdrawn for..." /></div>
        <div>
          <label className="label">Receipt attached</label>
          <input type="file" accept="image/*,.pdf" className="input" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f) }} />
          {uploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
          {form.receiptUrl && <p className="text-xs text-green-600 mt-1">Attached: {form.receiptName}</p>}
        </div>
      </>)}

      {type === 'handover' && (<>
        <div><label className="label">Shift summary *</label><textarea required className="input" rows={4} value={form.shiftSummary || ''} onChange={e => set('shiftSummary', e.target.value)} placeholder="Overview of the shift, key events, resident's condition..." /></div>
        <div><label className="label">Priority flags for next shift</label><textarea className="input" rows={2} value={(form.priorityFlags || []).join('\n')} onChange={e => set('priorityFlags', e.target.value.split('\n').filter(Boolean))} placeholder="One flag per line — things the next shift must know..." /></div>
        <div><label className="label">Outstanding actions</label><textarea className="input" rows={2} value={form.outstandingActions || ''} onChange={e => set('outstandingActions', e.target.value)} placeholder="Tasks not yet completed..." /></div>
      </>)}

      {type === 'general_support' ? (
        <SpeechTextarea label="Describe the support provided *" required rows={7} value={form.notes || ''} onChange={v => set('notes', v)} placeholder="What support did you give and how did the resident respond...&#10;&#10;Tip: press Enter to start a new paragraph for each separate point — it'll display clearly spaced out, not jammed together." />
      ) : (
        <SpeechTextarea label="Notes" rows={4} value={form.notes || ''} onChange={v => set('notes', v)} placeholder="Any additional notes..." />
      )}
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
