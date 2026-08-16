import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, PrintButton, SpeechTextarea } from '../../components/ui'
import { FileText, Plus, Trash2, Eye, X, Calendar, Users, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

const REVIEW_TYPES = [
  { value: 'care_review', label: 'Care Review' },
  { value: 'six_week_review', label: '6-week review' },
  { value: 'monthly_review', label: 'Monthly review' },
  { value: 'hospital_review', label: 'Post-hospital review' },
  { value: 'incident_review', label: 'Post-incident review' },
  { value: 'resident_feedback', label: 'Resident feedback' },
  { value: 'family_feedback', label: 'Family feedback' },
  { value: 'other', label: 'Other (custom)' },
]

function parseAttendees(value: any): string {
  if (!value) return ''
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(arr)) return arr.map((a: any) => a.name ? `${a.name}${a.role ? ` (${a.role})` : ''}` : String(a)).join(', ')
  } catch {}
  return String(value)
}

export default function Reviews() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [previewReview, setPreviewReview] = useState<any>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome).then(res => setSus(res.data.data || []))
  }, [selectedHome])

  const deleteReview = async (id: string) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await api.delete(`/reviews/su/${id}`)
      if (selectedSu) { const res = await api.get(`/reviews/su/${selectedSu.id}`); setReviews(res.data.data || []) }
      toast.success('Review deleted')
    } catch { toast.error('Failed to delete review') }
  }

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setLoading(true)
    try {
      const res = await api.get(`/reviews/su/${su.id}`)
      setReviews(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()

  return (
    <div className="flex flex-col h-full">
      {/* Top control bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-shrink-0">
          <FileText className="w-4 h-4 text-purple-600" /> Reviews &amp; Feedback
        </span>

        {homes.length > 1 && (
          <select className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={selectedHome} onChange={e => { setSelectedHome(e.target.value); setSelectedSu(null); setReviews([]) }}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Resident</label>
          <select
            className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[180px]"
            value={selectedSu?.id || ''}
            onChange={e => {
              if (!e.target.value) { setSelectedSu(null); setReviews([]); return }
              const su = sus.find(s => s.id === e.target.value)
              if (su) selectSu(su)
            }}>
            <option value="">— Select resident —</option>
            {sus.map(su => <option key={su.id} value={su.id}>{getName(su)}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <PrintButton />
          {selectedSu && <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddOpen(true)}>Add review</Button>}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6">
          {!selectedSu ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <EmptyState title="Select a resident" description="Choose a resident to view their reviews and feedback" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-slate-900">{getName(selectedSu)}</h2>
              </div>

              {loading ? <Spinner /> : reviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Document care reviews and resident feedback"
                  action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add first review</Button>} />
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="cursor-pointer" onClick={() => setPreviewReview(r)}>
                    <Card className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-purple-500" />
                            <h3 className="font-semibold text-slate-900">
                              {REVIEW_TYPES.find(t => t.value === r.review_type)?.label || r.review_type}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400">
                            {r.review_date ? format(new Date(r.review_date), 'd MMMM yyyy') : ''} · {r.created_by_name}
                          </p>
                          {r.attendees && <p className="text-xs text-slate-400 mt-0.5">Attendees: {parseAttendees(r.attendees)}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.next_review_date && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium">
                              Next: {format(new Date(r.next_review_date), 'd MMM yyyy')}
                            </span>
                          )}
                          <button onClick={() => setPreviewReview(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Preview">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteReview(r.id) }} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Summary</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{r.summary}</p>
                        </div>
                        {r.resident_feedback && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Resident feedback</p>
                            <p className="text-sm text-slate-700 italic">"{r.resident_feedback}"</p>
                          </div>
                        )}
                        {r.family_feedback && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Family feedback</p>
                            <p className="text-sm text-slate-700 italic">"{r.family_feedback}"</p>
                          </div>
                        )}
                        {r.outcomes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Outcomes & actions</p>
                            <p className="text-sm text-slate-700 whitespace-pre-line">{r.outcomes}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddReviewModal open={addOpen} onClose={() => setAddOpen(false)} suId={selectedSu?.id}
        onSaved={async () => {
          setAddOpen(false)
          if (selectedSu) { const res = await api.get(`/reviews/su/${selectedSu.id}`); setReviews(res.data.data || []) }
          toast.success('Review recorded')
        }} />

      {/* Preview modal */}
      {previewReview && (
        <ReviewPreviewModal review={previewReview} suName={selectedSu ? getName(selectedSu) : ''} onClose={() => setPreviewReview(null)} />
      )}
    </div>
  )
}

function ReviewPreviewModal({ review, suName, onClose }: { review: any; suName: string; onClose: () => void }) {
  const typeLabel = REVIEW_TYPES.find(t => t.value === review.review_type)?.label || review.review_type
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-slate-900">{typeLabel}</span>
            </div>
            <p className="text-xs text-slate-500">{suName} · {review.review_date ? format(new Date(review.review_date), 'd MMMM yyyy') : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span><strong>Date:</strong> {review.review_date ? format(new Date(review.review_date), 'd MMMM yyyy') : '—'}</span>
            </div>
            {review.next_review_date && (
              <div className="flex items-center gap-2 text-blue-600">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span><strong>Next review:</strong> {format(new Date(review.next_review_date), 'd MMMM yyyy')}</span>
              </div>
            )}
            {review.created_by_name && (
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-4 h-4 text-slate-400" />
                <span><strong>Recorded by:</strong> {review.created_by_name}</span>
              </div>
            )}
            {review.attendees && (
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span><strong>Attendees:</strong> {parseAttendees(review.attendees)}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Summary
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line bg-white border border-slate-100 rounded-xl p-4">{review.summary}</p>
          </div>

          {review.resident_feedback && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resident's feedback</p>
              <blockquote className="text-sm text-slate-700 italic border-l-4 border-purple-200 pl-4 py-1">"{review.resident_feedback}"</blockquote>
            </div>
          )}

          {review.family_feedback && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Family / advocate feedback</p>
              <blockquote className="text-sm text-slate-700 italic border-l-4 border-blue-200 pl-4 py-1">"{review.family_feedback}"</blockquote>
            </div>
          )}

          {review.outcomes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Outcomes & action points</p>
              <p className="text-sm text-slate-700 whitespace-pre-line bg-emerald-50 border border-emerald-100 rounded-xl p-4">{review.outcomes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

function AddReviewModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({ reviewType: 'monthly_review', customReviewType: '', reviewDate: new Date().toISOString().split('T')[0], summary: '', residentFeedback: '', familyFeedback: '', outcomes: '', monthlyProgress: '', nextReviewDate: '', attendees: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { customReviewType, ...rest } = form
      const payload = { suId, ...rest, reviewType: form.reviewType === 'other' ? (customReviewType.trim() || 'other') : form.reviewType }
      await api.post('/reviews/su', payload); onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record review / feedback" size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Review type *" required value={form.reviewType} onChange={e => set('reviewType', e.target.value)} options={REVIEW_TYPES} />
          <Input label="Review date *" type="date" required value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        </div>
        {form.reviewType === 'other' && (
          <Input label="Custom review type name *" required value={form.customReviewType} onChange={e => set('customReviewType', e.target.value)} placeholder="e.g. Annual best interests review" />
        )}
        <Input label="Attendees" value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Names of people present..." />
        <SpeechTextarea required label="Summary *" rows={4} value={form.summary} onChange={v => set('summary', v)} placeholder="Summary of the review, key discussion points..." />
        <SpeechTextarea label="Resident's feedback / views" rows={3} value={form.residentFeedback} onChange={v => set('residentFeedback', v)} placeholder="What did the resident say about their care..." />
        <SpeechTextarea label="Family / advocate feedback" rows={3} value={form.familyFeedback} onChange={v => set('familyFeedback', v)} placeholder="Feedback from family members or advocates..." />
        <SpeechTextarea label="Outcomes & action points" rows={3} value={form.outcomes} onChange={v => set('outcomes', v)} placeholder="What was agreed, changes to be made..." />
        <Input label="Next review date" type="date" value={form.nextReviewDate} onChange={e => set('nextReviewDate', e.target.value)} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save review</Button>
        </div>
      </form>
    </Modal>
  )
}
