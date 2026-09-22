import React, { useState } from 'react'
import { dailyRecordsApi } from '../../../api'
import { Button } from '../../../components/ui'
import { SpeechTextarea } from '../../../components/ui/SpeechButton'

// Matches the old system's "Medication Team Count" task exactly (screenshot supplied
// by the manager): a read-only Directions block explaining the template, and ONE
// Notes box staff fill in for the whole session — they copy the TIME/DATE/STAFF
// NAME/MEDICATION NAME/STRENGTH/QUANTITY AT HAND/QUANTITY ADMINISTERED/QUANTITY
// REMAINING block once per medication inside the same note and save once at the
// end, rather than submitting a separate record per medication ("1 1 1 1 1").
// This is a documentation record only — it does not touch actual Medication Stock
// numbers, which track themselves automatically off MAR administration.
const TEMPLATE = `TIME:
DATE:
STAFF NAME:
MEDICATION NAME:
STRENGTH:
QUANTITY AT HAND:
QUANTITY ADMINISTERED:
QUANTITY REMAINING:

IDENTIFIED ISSUE (any discrepancy identified — follow the escalation protocol):
`

export default function MedicationCountForm({ suId, onSaved, recordedAt }: { suId: string; onSaved: () => void; recordedAt?: string }) {
  const [notes, setNotes] = useState(TEMPLATE)
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim() || notes.trim() === TEMPLATE.trim()) { alert('Please fill in the medication count details'); return }
    setLoading(true)
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
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 leading-relaxed">
        Use this space to track the daily medication countdown. All Medication Team Counts must also be recorded on the Handover.
        Copy the template block below for each medication you're counting, fill it in, and save once you've done all of this resident's medications.
      </div>
      <SpeechTextarea label="Notes" rows={16} value={notes} onChange={setNotes} />
      <Button type="submit" loading={loading} className="w-full">Save record</Button>
    </form>
  )
}
