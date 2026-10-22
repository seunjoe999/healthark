import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { ukDateStr } from '../../utils/ukDate'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, PrintButton, SpeechTextarea } from '../../components/ui'
import { FileText, Plus, Trash2, Eye, X, Calendar, Users, ClipboardList, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { buildLetterheadPage, openLetterheadPrint, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'
import { draftKey, useDraftAutosave, restoreDraftOnOpen, clearDraft } from '../../hooks/useDraftAutosave'

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

function buildReviewPrintPage(r: any, suName: string): string {
  const typeLabel = REVIEW_TYPES.find(t => t.value === r.review_type)?.label || r.review_type
  const sections: PrintSection[] = []

  sections.push({
    title: 'Review Details',
    inner: `
      <table class="fields">
        <tr><th>Review Type</th><td>${esc(typeLabel)}</td></tr>
        <tr><th>Date</th><td>${fmtDate(r.review_date)}</td></tr>
        ${r.next_review_date ? `<tr><th>Next Review Due</th><td>${fmtDate(r.next_review_date)}</td></tr>` : ''}
        <tr><th>Recorded By</th><td>${esc(r.created_by_name)}</td></tr>
        ${r.attendees ? `<tr><th>Attendees</th><td>${esc(parseAttendees(r.attendees))}</td></tr>` : ''}
      </table>
    `,
  })

  sections.push({ title: 'Summary', inner: `<p class="body-text">${nl(r.summary)}</p>` })

  if (r.resident_feedback) sections.push({ title: "Resident's Feedback", inner: `<p class="body-text">${nl(r.resident_feedback)}</p>` })
  if (r.family_feedback) sections.push({ title: 'Family / Advocate Feedback', inner: `<p class="body-text">${nl(r.family_feedback)}</p>` })
  if (r.outcomes) sections.push({ title: 'Outcomes &amp; Action Points', inner: `<p class="body-text">${nl(r.outcomes)}</p>` })

  return buildLetterheadPage({
    docTitle: typeLabel,
    docSubtitle: 'Review & feedback record',
    docRefPrefix: 'REV',
    docRefId: r.id,
    residentName: suName,
    sections,
  })
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
  const [editingReview, setEditingReview] = useState<any>(null)
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

  const reloadReviews = async () => {
    if (!selectedSu) return
    const res = await api.get(`/reviews/su/${selectedSu.id}`)
    setReviews(res.data.data || [])
  }

  const deleteReview = async (id: string) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await api.delete(`/reviews/su/${id}`)
      await reloadReviews()
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

  const handlePrintReviews = () => {
    if (!selectedSu || reviews.length === 0) { toast.error('No reviews to print for this resident'); return }
    const name = getName(selectedSu)
    const body = reviews.map(r => buildReviewPrintPage(r, name)).join('')
    const ok = openLetterheadPrint(`${name} — Reviews & Feedback`, body)
    if (!ok) toast.error('Pop-up blocked — please allow pop-ups for this site and try again')
  }

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
          <PrintButton onClick={handlePrintReviews} />
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
                <div className="space-y-5">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="cursor-pointer" onClick={() => setPreviewReview(r)}>
                      <Card className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-purple-500" />
                              <h3 className="font-bold text-base text-slate-900">
                                {REVIEW_TYPES.find(t => t.value === r.review_type)?.label || r.review_type}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500">
                              {r.review_date ? format(new Date(r.review_date), 'd MMMM yyyy') : ''} · {r.created_by_name}
                            </p>
                            {r.attendees && <p className="text-xs text-slate-500 mt-1">Attendees: {parseAttendees(r.attendees)}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {r.next_review_date && (
                              <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg font-medium mr-1">
                                Next: {format(new Date(r.next_review_date), 'd MMM yyyy')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingReview(r) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                              title="Edit review"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewReview(r) }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteReview(r.id) }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5">
                          <div>
                            <p className="doc-section-heading">Summary</p>
                            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{r.summary}</p>
                          </div>
                          {r.resident_feedback && (
                            <div>
                              <p className="doc-section-heading">Resident Feedback</p>
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed italic">"{r.resident_feedback}"</p>
                            </div>
                          )}
                          {r.family_feedback && (
                            <div>
                              <p className="doc-section-heading">Family / Advocate Feedback</p>
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed italic">"{r.family_feedback}"</p>
                            </div>
                          )}
                          {r.outcomes && (
                            <div>
                              <p className="doc-section-heading">Outcomes &amp; Action Points</p>
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{r.outcomes}</p>
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

      <ReviewFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        suId={selectedSu?.id}
        onSaved={async () => {
          setAddOpen(false)
          await reloadReviews()
          toast.success('Review recorded')
        }}
      />

      {editingReview && (
        <ReviewFormModal
          open={true}
          review={editingReview}
          onClose={() => setEditingReview(null)}
          suId={selectedSu?.id || editingReview.su_id}
          onSaved={async () => {
            setEditingReview(null)
            await reloadReviews()
            toast.success('Review updated')
          }}
        />
      )}

      {/* Preview modal */}
      {previewReview && (
        <ReviewPreviewModal
          review={previewReview}
          suName={selectedSu ? getName(selectedSu) : ''}
          onClose={() => setPreviewReview(null)}
          onEdit={() => {
            const target = previewReview
            setPreviewReview(null)
            setEditingReview(target)
          }}
        />
      )}
    </div>
  )
}

function ReviewPreviewModal({ review, suName, onClose, onEdit }: { review: any; suName: string; onClose: () => void; onEdit: () => void }) {
  const typeLabel = REVIEW_TYPES.find(t => t.value === review.review_type)?.label || review.review_type
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto text-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-slate-900 text-base">{typeLabel}</span>
            </div>
            <p className="text-xs text-slate-500">{suName} · {review.review_date ? format(new Date(review.review_date), 'd MMMM yyyy') : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="gold" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>Edit</Button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span><strong>Date:</strong> {review.review_date ? format(new Date(review.review_date), 'd MMMM yyyy') : '—'}</span>
            </div>
            {review.next_review_date && (
              <div className="flex items-center gap-2 text-blue-700">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span><strong>Next review:</strong> {format(new Date(review.next_review_date), 'd MMMM yyyy')}</span>
              </div>
            )}
            {review.created_by_name && (
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-slate-400" />
                <span><strong>Recorded by:</strong> {review.created_by_name}</span>
              </div>
            )}
            {review.attendees && (
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span><strong>Attendees:</strong> {parseAttendees(review.attendees)}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <p className="doc-section-heading">
              <ClipboardList className="w-4 h-4" /> Summary
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50/60 border border-slate-200 rounded-xl p-4">
              {review.summary}
            </p>
          </div>

          {review.resident_feedback && (
            <div>
              <p className="doc-section-heading">Resident's Feedback</p>
              <blockquote className="text-sm text-slate-800 whitespace-pre-line leading-relaxed italic border-l-4 border-purple-300 bg-purple-50/30 rounded-r-xl pl-4 pr-4 py-3">
                "{review.resident_feedback}"
              </blockquote>
            </div>
          )}

          {review.family_feedback && (
            <div>
              <p className="doc-section-heading">Family / Advocate Feedback</p>
              <blockquote className="text-sm text-slate-800 whitespace-pre-line leading-relaxed italic border-l-4 border-blue-300 bg-blue-50/30 rounded-r-xl pl-4 pr-4 py-3">
                "{review.family_feedback}"
              </blockquote>
            </div>
          )}

          {review.outcomes && (
            <div>
              <p className="doc-section-heading">Outcomes &amp; Action Points</p>
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
                {review.outcomes}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>Edit Review</Button>
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

function ReviewFormModal({ open, onClose, suId, review, onSaved }: { open: boolean; onClose: () => void; suId?: string; review?: any; onSaved: () => void }) {
  const { isRole } = useAuth()
  const isEdit = !!review
  const canManageTypes = isRole('home_manager', 'group_admin', 'super_admin')
  const knownValues = REVIEW_TYPES.map(t => t.value)

  const buildInitialForm = () => {
    if (!review) {
      return {
        reviewType: 'monthly_review',
        customReviewType: '',
        reviewDate: ukDateStr(),
        summary: '',
        residentFeedback: '',
        familyFeedback: '',
        outcomes: '',
        monthlyProgress: '',
        nextReviewDate: '',
        attendees: '',
      }
    }
    const isCustom = review.review_type && !knownValues.includes(review.review_type)
    return {
      reviewType: isCustom ? 'other' : (review.review_type || 'monthly_review'),
      customReviewType: isCustom ? review.review_type : '',
      reviewDate: review.review_date ? String(review.review_date).split('T')[0] : ukDateStr(),
      summary: review.summary || '',
      residentFeedback: review.resident_feedback || '',
      familyFeedback: review.family_feedback || '',
      outcomes: review.outcomes || '',
      monthlyProgress: review.monthly_progress || '',
      nextReviewDate: review.next_review_date ? String(review.next_review_date).split('T')[0] : '',
      attendees: parseAttendees(review.attendees),
    }
  }

  const [form, setForm] = useState(buildInitialForm)
  const [loading, setLoading] = useState(false)
  const [customTypes, setCustomTypes] = useState<{ id: string; value: string; label: string }[]>([])
  const [manageOpen, setManageOpen] = useState(false)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [addingType, setAddingType] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) setForm(buildInitialForm())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, review?.id])

  const loadCustomTypes = () => { api.get('/review-types').then(res => setCustomTypes(res.data.data || [])).catch(() => {}) }
  useEffect(() => { if (open) loadCustomTypes() }, [open])

  const reviewDraftKey = draftKey('review', suId)
  restoreDraftOnOpen<any>(reviewDraftKey, open && !isEdit,
    draft => setForm(p => ({ ...p, ...draft })),
    draft => !!(draft.summary || draft.residentFeedback || draft.familyFeedback || draft.outcomes))
  useDraftAutosave(reviewDraftKey, form, open && !isEdit, !!(form.summary || form.residentFeedback || form.familyFeedback || form.outcomes))

  const addCustomType = async () => {
    if (!newTypeLabel.trim()) return
    setAddingType(true)
    try {
      await api.post('/review-types', { label: newTypeLabel.trim() })
      setNewTypeLabel('')
      loadCustomTypes()
      toast.success('Review type added')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to add review type') }
    finally { setAddingType(false) }
  }

  const removeCustomType = async (id: string) => {
    try { await api.delete(`/review-types/${id}`); loadCustomTypes() } catch { toast.error('Failed to remove') }
  }

  const typeOptions = [...REVIEW_TYPES.slice(0, -1), ...customTypes.map(t => ({ value: t.value, label: t.label })), REVIEW_TYPES[REVIEW_TYPES.length - 1]]

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { customReviewType, ...rest } = form
      const payload = { suId, ...rest, reviewType: form.reviewType === 'other' ? (customReviewType.trim() || 'other') : form.reviewType }
      if (isEdit) {
        await api.put(`/reviews/su/${review.id}`, payload)
      } else {
        await api.post('/reviews/su', payload)
        clearDraft(reviewDraftKey)
      }
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit review / feedback' : 'Record review / feedback'} size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[70dvh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select label="Review type *" required value={form.reviewType} onChange={e => set('reviewType', e.target.value)} options={typeOptions} />
            {canManageTypes && (
              <button type="button" onClick={() => setManageOpen(true)} className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1">
                + Manage review types
              </button>
            )}
          </div>
          <Input label="Review date *" type="date" required value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        </div>
        {manageOpen && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom review types</p>
            {customTypes.length === 0 && <p className="text-xs text-slate-400">No custom types yet</p>}
            {customTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm text-slate-700">
                <span>{t.label}</span>
                <button type="button" onClick={() => removeCustomType(t.id)} className="text-xs text-rose-500 hover:text-rose-700">Remove</button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" placeholder="New review type name"
                value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} />
              <button type="button" disabled={addingType} onClick={addCustomType}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">Add</button>
            </div>
          </div>
        )}
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
          <Button type="submit" loading={loading}>{isEdit ? 'Save changes' : 'Save review'}</Button>
        </div>
      </form>
    </Modal>
  )
}
