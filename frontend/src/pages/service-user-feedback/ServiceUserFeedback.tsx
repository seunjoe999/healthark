import React, { useState, useEffect } from 'react'
import { MessageSquare, Plus, ChevronLeft } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api, { suApi, homesApi } from '../../api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function getName(p: any) {
  return `${p?.first_name || p?.firstName || ''} ${p?.last_name || p?.lastName || ''}`.trim()
}

// Verbatim from the "Service User Satisfaction Questionnaire" (Creative Support)
// the manager emailed as the template to use. Each question keeps its own
// scale where the source document uses a different one per question, rather
// than forcing everything onto one generic scale.
const SCALE_5_FREQ = ['Always', 'Most of the time', 'Sometimes', 'Not very often', 'Not at all']
const SCALE_4_FREQ = ['Regularly', 'Sometimes', 'Not very often', 'Not at all']
const SCALE_UNDERSTANDING = ['They are very understanding', 'They understand most of the time', 'They have some understanding', 'They understand very little', "They don't understand at all"]
const SCALE_STAFF_DESC = ['Very friendly and helpful', 'Approachable', 'Responsive but not very open', 'They treat me as an individual']
const YES_NO = ['Yes', 'No']

interface Q {
  id: string
  text: string
  type: 'scale' | 'yesno' | 'text'
  options?: string[]
  commentLabel?: string
  conditional?: { onId: string; onValue: string } // only show if another question was answered a certain way
}

const QUESTIONS: Q[] = [
  { id: 'q1', text: 'Does your accommodation meet your needs?', type: 'scale', options: SCALE_5_FREQ, commentLabel: 'Comments' },
  { id: 'q2', text: 'Are you consulted about your accommodation, i.e. décor and furnishings?', type: 'yesno', options: YES_NO, commentLabel: 'Comments' },
  { id: 'q3', text: 'Do you feel staff understand your needs and treat you as an individual?', type: 'scale', options: SCALE_UNDERSTANDING, commentLabel: 'Comments' },
  { id: 'q4', text: 'Do staff spend time with you discussing your needs and planning your support?', type: 'scale', options: SCALE_4_FREQ, commentLabel: 'Any comments' },
  { id: 'q5', text: 'Do you have a support plan?', type: 'yesno', options: YES_NO, commentLabel: 'Any comments' },
  { id: 'q6', text: "Do you have a copy of the Tenant's Handbook or Service User Guide?", type: 'yesno', options: YES_NO },
  { id: 'q6b', text: 'If so, is the Guide helpful?', type: 'yesno', options: YES_NO },
  { id: 'q7', text: 'Do you know who your keyworker / main support worker is at the project?', type: 'yesno', options: YES_NO },
  { id: 'q8', text: 'Do you spend individual time with your keyworker / main support worker?', type: 'yesno', options: YES_NO, commentLabel: 'How is the time spent?' },
  { id: 'q9', text: 'Are you satisfied with the support that you receive?', type: 'scale', options: SCALE_5_FREQ, commentLabel: 'Comments' },
  { id: 'q10', text: 'Do you use any local facilities, e.g. leisure centre, library, community centre, adult education facility, etc.?', type: 'yesno', options: YES_NO, commentLabel: 'If so, which ones' },
  { id: 'q11', text: 'Do your staff work with other people and agencies that help you?', type: 'scale', options: SCALE_4_FREQ, commentLabel: 'If you know, please tell us which ones' },
  { id: 'q12', text: 'Do you feel you can open up to staff?', type: 'yesno', options: YES_NO, commentLabel: 'Any comments' },
  { id: 'q13', text: 'How would you describe the staff at your project?', type: 'scale', options: SCALE_STAFF_DESC, commentLabel: 'Any comments' },
  { id: 'q14', text: 'Do you have a good quality of life and benefit from living here?', type: 'scale', options: SCALE_5_FREQ, commentLabel: 'If not, then please give reasons' },
  { id: 'q15', text: 'Have you ever made a complaint about the service or tried to change the service you receive?', type: 'yesno', options: YES_NO },
  { id: 'q16', text: 'Were you happy with the way staff responded to your complaint/suggestions?', type: 'yesno', options: YES_NO, commentLabel: 'Comments', conditional: { onId: 'q15', onValue: 'Yes' } },
  { id: 'q17', text: 'Were you happy with the outcome of your complaint/suggestion?', type: 'yesno', options: YES_NO, commentLabel: 'Comments', conditional: { onId: 'q15', onValue: 'Yes' } },
  { id: 'q18', text: 'Do you have any suggestions or ideas which could help us to improve the service or the support we give to you?', type: 'text' },
  { id: 'q19', text: 'Is there anything that you think is really good about the support you receive, or any event or activity you have really enjoyed?', type: 'text' },
]

export default function ServiceUserFeedback() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [sus, setSus] = useState<any[]>([])
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || []))
    load()
  }, [selectedHome])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/service-feedback')
      setList(res.data.data || [])
    } catch { toast.error('Failed to load feedback') }
    finally { setLoading(false) }
  }

  async function openDetail(id: string) {
    try {
      const res = await api.get(`/service-feedback/${id}`)
      setDetail(res.data.data)
    } catch { toast.error('Failed to load') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-amber-400" /> Service User Feedback
          </h1>
          <p className="text-slate-400 text-sm mt-1">Satisfaction questionnaire — completed with a resident</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>
          New Feedback
        </Button>
      </div>

      {homes.length > 1 && (
        <select className="input max-w-xs mb-4" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
          {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      )}

      {loading ? <Spinner /> : list.length === 0 ? (
        <EmptyState title="No feedback recorded yet"
          description="Complete the satisfaction questionnaire with a resident to get started."
          action={<Button variant="gold" onClick={() => setShowNew(true)}>New Feedback</Button>} />
      ) : (
        <div className="space-y-2">
          {list.map(f => (
            <div key={f.id} onClick={() => openDetail(f.id)}
              className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{f.su_name}</p>
                <p className="text-xs text-slate-400">{format(new Date(f.completed_at), 'd MMM yyyy')} · Completed by {f.completed_by_name || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewFeedbackModal sus={sus} onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }} />
      )}

      {detail && <FeedbackDetailModal feedback={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function NewFeedbackModal({ sus, fixedSuId, onClose, onSaved }: { sus?: any[]; fixedSuId?: string; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<0 | 1>(fixedSuId ? 1 : 0)
  const [suId, setSuId] = useState(fixedSuId || '')
  const [project, setProject] = useState('')
  const [location, setLocation] = useState('')
  const [answers, setAnswers] = useState<Record<string, { value?: string; comment?: string }>>({})
  const [saving, setSaving] = useState(false)

  const set = (id: string, field: 'value' | 'comment', v: string) =>
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], [field]: v } }))

  const visibleQuestions = QUESTIONS.filter(q => !q.conditional || answers[q.conditional.onId]?.value === q.conditional.onValue)

  const startForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!suId) { toast.error('Select a resident'); return }
    setStep(1)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/service-feedback', { suId, project, location, answers })
      toast.success('Feedback saved')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="New Service User Feedback" size="lg">
      {step === 0 ? (
        <form onSubmit={startForm} className="space-y-4">
          <Select label="Service User" options={(sus || []).map(s => ({ value: s.id, label: getName(s) }))}
            placeholder="Select resident..." value={suId} onChange={e => setSuId(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Project</label>
              <input className="input" value={project} onChange={e => setProject(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Location</label>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gold">Start questionnaire</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {!fixedSuId && (
            <button type="button" onClick={() => setStep(0)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
            {visibleQuestions.map((q, i) => (
              <div key={q.id} className="card p-3">
                <p className="text-sm font-semibold text-white mb-2">{i + 1}. {q.text}</p>
                {q.type === 'text' ? (
                  <textarea className="input" rows={2} value={answers[q.id]?.value || ''}
                    onChange={e => set(q.id, 'value', e.target.value)} placeholder="Please state..." />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {q.options!.map(opt => (
                        <button key={opt} type="button" onClick={() => set(q.id, 'value', opt)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            answers[q.id]?.value === opt ? 'bg-amber-400 text-slate-900 border-amber-400' : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/50'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    {q.commentLabel && (
                      <input className="input" placeholder={q.commentLabel} value={answers[q.id]?.comment || ''}
                        onChange={e => set(q.id, 'comment', e.target.value)} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="gold" loading={saving} onClick={save}>Save Feedback</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function FeedbackDetailModal({ feedback, onClose }: { feedback: any; onClose: () => void }) {
  const answers = feedback.answers || {}
  return (
    <Modal open={true} onClose={onClose} title={`Feedback — ${feedback.su_name}`} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          {format(new Date(feedback.completed_at), 'd MMM yyyy')} · Completed by {feedback.completed_by_name || 'Unknown'}
          {feedback.project ? ` · Project: ${feedback.project}` : ''}{feedback.location ? ` · Location: ${feedback.location}` : ''}
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {QUESTIONS.filter(q => answers[q.id]?.value || answers[q.id]?.comment).map((q, i) => (
            <div key={q.id} className="card p-3">
              <p className="text-sm font-semibold text-white mb-1">{i + 1}. {q.text}</p>
              {answers[q.id]?.value && <p className="text-sm text-amber-400 font-medium">{answers[q.id].value}</p>}
              {answers[q.id]?.comment && <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{answers[q.id].comment}</p>}
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

// Embeddable panel used on a resident's own profile page (Background tab) —
// scoped to just that resident, so no resident picker is needed.
export function SuFeedbackPanel({ suId, suName }: { suId: string; suName: string }) {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  const load = () => {
    setLoading(true)
    api.get('/service-feedback', { params: { suId } }).then(res => setList(res.data.data || []))
      .catch(() => toast.error('Failed to load feedback')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [suId])

  async function openDetail(id: string) {
    try {
      const res = await api.get(`/service-feedback/${id}`)
      setDetail(res.data.data)
    } catch { toast.error('Failed to load') }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: '#e8b130' }} /> Service User Feedback
        </h3>
        <Button size="sm" variant="gold" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowNew(true)}>New</Button>
      </div>
      {loading ? <Spinner /> : list.length === 0 ? (
        <p className="text-sm text-slate-400">No feedback recorded yet for this resident.</p>
      ) : (
        <div className="space-y-2">
          {list.map(f => (
            <div key={f.id} onClick={() => openDetail(f.id)}
              className="p-3 rounded-lg border border-slate-200 hover:border-amber-400/60 cursor-pointer transition-colors flex items-center justify-between">
              <p className="text-sm text-slate-700">{format(new Date(f.completed_at), 'd MMM yyyy')}</p>
              <p className="text-xs text-slate-400">Completed by {f.completed_by_name || 'Unknown'}</p>
            </div>
          ))}
        </div>
      )}
      {showNew && (
        <NewFeedbackModal fixedSuId={suId} onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }} />
      )}
      {detail && <FeedbackDetailModal feedback={{ ...detail, su_name: suName }} onClose={() => setDetail(null)} />}
    </div>
  )
}
