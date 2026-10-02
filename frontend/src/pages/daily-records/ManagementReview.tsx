import React, { useEffect, useState } from 'react'
import { dailyRecordsApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select, Textarea } from '../../components/ui'
import { ClipboardCheck, Search, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import SignaturePad from '../../components/SignaturePad'

const RECORD_TYPES = [
  { value: 'one_to_one', label: '1-to-1 Conversation' },
  { value: 'behaviour', label: 'Behavior Record (ABC)' },
  { value: 'vitals_bp', label: 'Blood Pressure' },
  { value: 'body_map', label: 'Body Map / Skin' },
  { value: 'bowel_movement', label: 'Bowel Movement' },
  { value: 'comfort_check', label: 'Comfort Check' },
  { value: 'communication', label: 'Communication' },
  { value: 'family_visit', label: 'Family Visit' },
  { value: 'financial_support', label: 'Financial Support' },
  { value: 'fluid_intake', label: 'Fluid / Drinks' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'food_intake', label: 'Food Intake' },
  { value: 'general_support', label: 'General Support' },
  { value: 'handover', label: 'Handover Note' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'incident', label: 'Incident' },
  { value: 'medication_disposed', label: 'Medication Disposed' },
  { value: 'medication_ordered', label: 'Medication Ordered' },
  { value: 'medication_received', label: 'Medication Received' },
  { value: 'medication_stock_count', label: 'Medication Team Count' },
  { value: 'vitals_oxygen', label: 'Oxygen (SpO2)' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'prn_medication', label: 'PRN Medication' },
  { value: 'repositioning', label: 'Repositioning' },
  { value: 'seizure', label: 'Seizure Episode' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'social_activity', label: 'Social Activity' },
  { value: 'social_visit', label: 'Social Visit' },
  { value: 'telephone_call', label: 'Telephone Call' },
  { value: 'vitals_temp', label: 'Temperature' },
  { value: 'welfare_check', label: 'Welfare Check' },
]

function summarize(r: any): string {
  const type = r.record_type || ''
  if (type === 'fluid_intake') return `${r.fluid_type || 'Fluid'} — ${r.amount_ml}ml`
  if (type === 'food_intake') return `${r.meal_type || 'Meal'}: ${r.amount_eaten || '—'}${r.food_description ? ` · ${r.food_description}` : ''}`
  if (type === 'vitals_bp') return `BP: ${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · Pulse: ${r.pulse}bpm` : ''}`
  if (type === 'vitals_temp') return `Temp: ${r.temp_celsius}°C`
  if (type === 'vitals_oxygen') return `SpO2: ${r.spo2_percent}%${r.supplemental_o2 ? ' (on O2)' : ''}`
  if (type === 'bowel_movement') return `Bristol type ${r.bristol_type || '—'}${r.notes ? ` · ${r.notes}` : ''}`
  return r.notes || r.description || (r.record_type ? r.record_type.replace(/_/g, ' ') : '—')
}

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }
function daysAgoStr(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return format(d, 'yyyy-MM-dd') }

export default function ManagementReview({ homeId }: { homeId: string }) {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [suId, setSuId] = useState('')
  const [recordType, setRecordType] = useState('')
  const [from, setFrom] = useState(daysAgoStr(7))
  const [to, setTo] = useState(todayStr())
  const [reviewStatus, setReviewStatus] = useState('')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [reviewing, setReviewing] = useState<any>(null)

  useEffect(() => {
    if (!homeId) return
    suApi.list(homeId).then(res => setSus(res.data.data || []))
  }, [homeId])

  const runSearch = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const res = await dailyRecordsApi.search({
        suId: suId || undefined,
        homeId: suId ? undefined : homeId,
        from, to,
        recordType: recordType || undefined,
        reviewStatus: reviewStatus || undefined,
      })
      setRecords(res.data.data || [])
    } catch { toast.error('Failed to load records') }
    finally { setLoading(false) }
  }

  const getSuName = (r: any) => r.su_name || sus.find(s => s.id === r.su_id) && `${sus.find(s => s.id === r.su_id).first_name} ${sus.find(s => s.id === r.su_id).last_name}` || ''

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-purple-600" />
          <h2 className="font-display text-lg text-slate-900">Management Review</h2>
        </div>
        <p className="text-sm text-slate-500 -mt-3">Search staff documentation, read it, and sign off with your own review notes.</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="label">Resident</label>
            <select className="input" value={suId} onChange={e => setSuId(e.target.value)}>
              <option value="">All residents</option>
              {sus.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Record type</label>
            <select className="input" value={recordType} onChange={e => setRecordType(e.target.value)}>
              <option value="">All types</option>
              {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date from</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} max={to} />
          </div>
          <div>
            <label className="label">Date to</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} max={todayStr()} />
          </div>
          <div>
            <label className="label">Review status</label>
            <select className="input" value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
              <option value="">All</option>
              <option value="reviewed">Reviewed</option>
              <option value="not_reviewed">Not reviewed</option>
            </select>
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <Button icon={<Search className="w-3.5 h-3.5" />} onClick={runSearch} loading={loading}>Search</Button>
          </div>
        </div>

        {!searched ? (
          <EmptyState title="Search for documentation" description="Choose a resident (or all), record type and date range, then search" />
        ) : loading ? <Spinner /> : records.length === 0 ? (
          <EmptyState title="No records found" description="Try widening the date range or filters" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {records.map(r => {
              const typeInfo = RECORD_TYPES.find(t => t.value === r.record_type)
              return (
                <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">
                      {r.record_date ? format(new Date(r.record_date), 'd MMM yyyy') : ''} · {typeInfo?.label || r.record_type} · {getSuName(r)}
                    </p>
                    <p className="text-sm text-slate-700 mt-0.5 truncate">{summarize(r)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">By {r.staff_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.reviewed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">Not reviewed</span>
                    )}
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => setReviewing(r)}>
                        {r.reviewed_at ? 'View review' : 'Review'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal record={reviewing} suName={getSuName(reviewing)}
          onClose={() => setReviewing(null)}
          onSaved={(updated) => {
            setRecords(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated, reviewed_by_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() } : r))
            setReviewing(null)
            toast.success('Review saved')
          }} />
      )}
    </div>
  )
}

function ReviewModal({ record, suName, onClose, onSaved }: { record: any; suName: string; onClose: () => void; onSaved: (r: any) => void }) {
  const [notes, setNotes] = useState(record.review_notes || '')
  const [signature, setSignature] = useState<string | null>(record.review_signature_dataurl || null)
  const [saving, setSaving] = useState(false)
  const alreadyReviewed = !!record.reviewed_at

  const save = async () => {
    setSaving(true)
    try {
      const res = await dailyRecordsApi.review(record.id, { reviewNotes: notes, signatureDataurl: signature || undefined })
      onSaved(res.data.data)
    } catch { toast.error('Failed to save review') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Review documentation" size="lg">
      <div className="space-y-4">
        <div className="text-xs text-slate-500 space-y-0.5">
          <p><span className="font-semibold text-slate-600">Resident:</span> {suName}</p>
          <p><span className="font-semibold text-slate-600">Recorded by:</span> {record.staff_name}</p>
          <p><span className="font-semibold text-slate-600">Date:</span> {record.record_date ? format(new Date(record.record_date), 'd MMMM yyyy') : ''}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Staff documentation</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{summarize(record)}</p>
        </div>

        {alreadyReviewed && (
          <p className="text-xs text-emerald-600 font-semibold">
            Already reviewed by {record.reviewed_by_name || 'a manager'} on {record.reviewed_at ? format(new Date(record.reviewed_at), 'd MMM yyyy HH:mm') : ''} — you can update the notes below.
          </p>
        )}

        <Textarea label="Review notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4}
          placeholder="Your review of this documentation..." />

        <SignaturePad label="Sign to confirm this review" savedSignature={signature} onSave={setSignature} />

        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save review</Button>
        </div>
      </div>
    </Modal>
  )
}
