import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { assessmentsApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function QuestionField({ q, value, onChange }: { q: any; value: any; onChange: (v: any) => void }) {
  if (q.type === 'yes_no') {
    return (
      <div className="flex gap-2 flex-wrap">
        {['yes', 'no', 'n/a'].map(opt => (
          <label key={opt} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all select-none
            ${value === opt ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-300'}`}>
            <input type="radio" className="sr-only" checked={value === opt} onChange={() => onChange(opt)} />
            {opt.toUpperCase()}
          </label>
        ))}
      </div>
    )
  }

  if (q.type === 'scale') {
    const labels = ['Not at All', 'Rarely', 'Sometimes', 'Often', 'Very Often']
    return (
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3, 4].map(n => (
          <label key={n} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border cursor-pointer text-xs transition-all select-none
            ${value === n ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-300'}`}>
            <input type="radio" className="sr-only" checked={value === n} onChange={() => onChange(n)} />
            <span className="font-bold text-sm">{n}</span>
            <span>{labels[n]}</span>
          </label>
        ))}
      </div>
    )
  }

  if (q.type === 'select') {
    return (
      <select className="input w-full max-w-sm" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">Select...</option>
        {(q.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (q.type === 'multiselect') {
    const selected: string[] = Array.isArray(value) ? value : []
    const toggle = (o: string) =>
      onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])
    return (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((o: string) => (
          <label key={o} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all select-none
            ${selected.includes(o) ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-300'}`}>
            <input type="checkbox" className="sr-only" checked={selected.includes(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
    )
  }

  return (
    <textarea className="input w-full" rows={3} value={value || ''}
      onChange={e => onChange(e.target.value)} placeholder="Enter your notes..." />
  )
}

export default function AssessmentForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const templateKey = searchParams.get('template') || ''
  const category = searchParams.get('category') || 'service_user'
  const subjectId = searchParams.get('subjectId') || ''
  const homeId = searchParams.get('homeId') || ''

  const [template, setTemplate] = useState<any>(null)
  const [subjectName, setSubjectName] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [actionsIdentified, setActionsIdentified] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          assessmentsApi.template(templateKey),
          category === 'service_user'
            ? api.get(`/service-users/${subjectId}`)
            : api.get(`/staff/${subjectId}`),
        ])
        setTemplate(tRes.data.data)
        const s = sRes.data.data
        setSubjectName(`${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim())
      } catch { toast.error('Failed to load assessment') }
      finally { setLoading(false) }
    }
    if (templateKey && subjectId) load()
  }, [templateKey, subjectId, category])

  const setAnswer = (qId: string, value: any) =>
    setAnswers(prev => ({ ...prev, [qId]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const auditorName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      const res = await assessmentsApi.create({
        homeId,
        templateKey,
        category,
        subjectId,
        subjectName,
        auditorName,
        answers,
        actionsIdentified,
        nextReviewDate: nextReviewDate || null,
        notes,
        assessmentDate: new Date().toISOString().split('T')[0],
      })
      setResult(res.data.data)
      toast.success('Assessment saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!template) return <div className="p-8 text-slate-500">Template not found</div>

  if (result) {
    const riskColor = {
      good: 'text-green-600', low: 'text-green-600',
      requires_improvement: 'text-orange-500', medium: 'text-orange-500',
      inadequate: 'text-red-600', high: 'text-red-600',
    }[result.risk_level as string] || 'text-slate-700'

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Assessment complete</h2>
          <p className="text-slate-500 mb-6">Assessment for <strong>{subjectName}</strong> has been saved.</p>
          {(result.max_score > 0 || result.risk_level) && (
            <div className="bg-slate-50 rounded-xl p-6 mb-6 inline-block min-w-[180px]">
              {result.max_score > 0 && (
                <>
                  <p className="text-5xl font-bold text-purple-700">{Math.round(result.score_pct)}%</p>
                  <p className="text-xs text-slate-400 mt-1">{result.total_score} / {result.max_score} points</p>
                </>
              )}
              {result.risk_level && (
                <p className={`text-sm font-bold ${result.max_score > 0 ? 'mt-2' : ''} capitalize ${riskColor}`}>
                  Burnout Level: {result.risk_level.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/assessments')}>All assessments</Button>
            <Button onClick={() => navigate(`/assessments/${result.id}`)}>View full report</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/assessments')}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-5">
        <ChevronLeft className="w-4 h-4" /> Back to assessments
      </button>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Subject: <strong>{subjectName}</strong> &middot; {format(new Date(), 'd MMM yyyy')}
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); save() }}>
        {template.sections.map((section: any, si: number) => (
          <div key={si} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-4">
            <h2 className="font-semibold text-slate-800 mb-5 pb-2 border-b border-slate-100">{section.title}</h2>
            <div className="space-y-7">
              {section.questions.map((q: any, qi: number) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-800 mb-2.5">
                    <span className="text-slate-400 mr-1.5">{qi + 1}.</span>
                    {q.text}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <QuestionField q={q} value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" style={{ marginBottom: '4px' }}>
          <h2 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Actions & Follow-up</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Actions identified</label>
              <textarea className="input w-full" rows={3} value={actionsIdentified}
                onChange={e => setActionsIdentified(e.target.value)}
                placeholder="List any actions required as a result of this assessment..." />
            </div>
            <div>
              <label className="label">Next review date</label>
              <input type="date" className="input w-auto" value={nextReviewDate}
                onChange={e => setNextReviewDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Additional notes</label>
              <textarea className="input w-full" rows={2} value={notes}
                onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
      </form>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg px-6 py-1.5 flex justify-end gap-3 lg:left-64">
        <Button type="button" variant="outline" onClick={() => navigate('/assessments')}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save assessment</Button>
      </div>
    </div>
  )
}
