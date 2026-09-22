import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button, Input } from '../../../components/ui'
import { SpeechTextarea } from '../../../components/ui/SpeechButton'

// Matches the "Medication Team Count" template exactly (TIME/DATE/STAFF NAME
// are already shown automatically via the shared recorded-time header above
// every daily record) — this form only needs the medication-specific fields:
// MEDICATION NAME/STRENGTH/QUANTITY AT HAND/QUANTITY ADMINISTERED/QUANTITY
// REMAINING/IDENTIFIED ISSUE. This is a documentation record only — it does
// not touch actual Medication Stock numbers, which now track themselves
// automatically off MAR administration.
export default function MedicationCountForm({ suId, onSaved, recordedAt }: { suId: string; onSaved: () => void; recordedAt?: string }) {
  const [medicationName, setMedicationName] = useState('')
  const [strength, setStrength] = useState('')
  const [quantityAtHand, setQuantityAtHand] = useState('')
  const [quantityAdministered, setQuantityAdministered] = useState('')
  const [quantityRemaining, setQuantityRemaining] = useState('')
  const [identifiedIssue, setIdentifiedIssue] = useState('')
  const [loading, setLoading] = useState(false)

  // Keep "remaining" in sync automatically, but let staff override it if the
  // physical count doesn't match the arithmetic — that discrepancy is exactly
  // what Identified Issue is for.
  const onAtHandChange = (v: string) => {
    setQuantityAtHand(v)
    const hand = parseFloat(v); const admin = parseFloat(quantityAdministered)
    if (!isNaN(hand) && !isNaN(admin)) setQuantityRemaining(String(Math.max(0, hand - admin)))
  }
  const onAdministeredChange = (v: string) => {
    setQuantityAdministered(v)
    const hand = parseFloat(quantityAtHand); const admin = parseFloat(v)
    if (!isNaN(hand) && !isNaN(admin)) setQuantityRemaining(String(Math.max(0, hand - admin)))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicationName.trim()) { alert('Medication name is required'); return }
    setLoading(true)
    const notes = [
      `Medication Name: ${medicationName}`,
      strength && `Strength: ${strength}`,
      `Quantity At Hand: ${quantityAtHand || '—'}`,
      `Quantity Administered: ${quantityAdministered || '—'}`,
      `Quantity Remaining: ${quantityRemaining || '—'}`,
      identifiedIssue && `\nIdentified Issue: ${identifiedIssue}`,
    ].filter(Boolean).join('\n')
    try {
      await dailyRecordsApi.create({ suId, recordType: 'medication_stock_count', recordedAt, notes })
      onSaved()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Input label="Medication Name *" required value={medicationName} onChange={e => setMedicationName(e.target.value)} placeholder="e.g. Paracetamol" />
      <Input label="Strength" value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g. 500mg" />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Quantity At Hand" type="number" min="0" value={quantityAtHand} onChange={e => onAtHandChange(e.target.value)} />
        <Input label="Quantity Administered" type="number" min="0" value={quantityAdministered} onChange={e => onAdministeredChange(e.target.value)} />
        <Input label="Quantity Remaining" type="number" min="0" value={quantityRemaining} onChange={e => setQuantityRemaining(e.target.value)} />
      </div>
      <SpeechTextarea label="Identified Issue (optional)" rows={3} value={identifiedIssue} onChange={setIdentifiedIssue}
        placeholder="Describe any discrepancy identified and follow the escalation protocol..." />
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
