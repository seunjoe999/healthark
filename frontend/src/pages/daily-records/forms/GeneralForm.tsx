import React, { useState } from 'react'
import { dailyRecordsApi, getToken } from '../../../api'
import { Button, Select, Input } from '../../../components/ui'
import { SpeechTextarea } from '../../../components/ui/SpeechButton'

const ENGAGEMENT = [{ value: 'good', label: 'Good' }, { value: 'limited', label: 'Limited' }, { value: 'refused', label: 'Refused' }, { value: 'other', label: 'Other' }]
const VISIT_TYPES = [{ value: 'social', label: 'Social visit' }, { value: 'family', label: 'Family visit' }, { value: 'community', label: 'Community access' }]
const COMMS_MODES = [{ value: 'verbal', label: 'Verbal' }, { value: 'makaton', label: 'Makaton' }, { value: 'pecs', label: 'PECS' }, { value: 'written', label: 'Written' }, { value: 'eye_gaze', label: 'Eye gaze' }, { value: 'other', label: 'Other' }]
const CALL_DIRECTIONS = [{ value: 'incoming', label: 'Incoming — they called us' }, { value: 'outgoing', label: 'Outgoing — we called them' }]
const PAYMENT_METHODS = [{ value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'other', label: 'Other' }]

export default function GeneralForm({ type, suId, onSaved, recordedAt }: { type: string; suId: string; onSaved: () => void; recordedAt?: string }) {
  const [form, setForm] = useState<Record<string, any>>({ notes: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

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
      }
      await dailyRecordsApi.create({ suId, recordType: type, recordedAt, ...form, notes })
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

      {type === 'telephone_call' && (<>
        <Select label="Direction" value={form.direction || 'incoming'} onChange={e => set('direction', e.target.value)} options={CALL_DIRECTIONS} />
        <Input label="Caller / contact name" value={form.callerName || ''} onChange={e => set('callerName', e.target.value)} placeholder="Full name of the person on the call..." />
        <Input label="Relationship" value={form.relationship || ''} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter, GP, social worker..." />
        <div><label className="label">Reason for call</label><textarea className="input" rows={2} value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="What was the call about..." /></div>
        <Input label="Outcome" value={form.outcome || ''} onChange={e => set('outcome', e.target.value)} placeholder="e.g. Call returned, information passed on, callback arranged..." />
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
