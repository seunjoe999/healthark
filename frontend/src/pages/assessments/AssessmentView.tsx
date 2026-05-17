import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { assessmentsApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import { ChevronLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    good: 'bg-green-50 text-green-700 border-green-200',
    low: 'bg-green-50 text-green-700 border-green-200',
    requires_improvement: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    inadequate: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${colors[level] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {(level || '').replace(/_/g, ' ')}
    </span>
  )
}

function AnswerDisplay({ q, value }: { q: any; value: any }) {
  if (value === undefined || value === null || value === '') return <span className="text-slate-400">—</span>
  if (q.type === 'yes_no') {
    const colors: Record<string, string> = { yes: 'text-green-600', no: 'text-red-500', 'n/a': 'text-slate-400' }
    return <span className={`font-semibold uppercase text-sm ${colors[value] || 'text-slate-700'}`}>{value}</span>
  }
  if (q.type === 'scale') {
    const labels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']
    return <span className="text-sm font-semibold text-purple-700">{value}/4 — {labels[value]}</span>
  }
  if (Array.isArray(value)) {
    return <span className="text-sm text-slate-700">{value.join(', ') || '—'}</span>
  }
  return <p className="text-sm text-slate-700 whitespace-pre-line">{String(value)}</p>
}

export default function AssessmentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isRole } = useAuth()
  const [assessment, setAssessment] = useState<any>(null)
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const deleteAssessment = async () => {
    if (!confirm('Delete this assessment? This cannot be undone.')) return
    try {
      await api.delete(`/assessments/${id}`)
      toast.success('Assessment deleted')
      navigate('/assessments')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to delete') }
  }

  useEffect(() => {
    assessmentsApi.get(id!).then(async res => {
      const a = res.data.data
      setAssessment(a)
      const tRes = await assessmentsApi.template(a.template_key)
      setTemplate(tRes.data.data)
    }).catch(() => toast.error('Failed to load assessment')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!assessment || !template) return (
    <div className="p-8">
      <p className="text-slate-500">Assessment not found.</p>
      <Button variant="outline" onClick={() => navigate('/assessments')} className="mt-4">
        Back to assessments
      </Button>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/assessments')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to assessments
        </button>
        {isRole('home_manager', 'group_admin') && (
          <button onClick={deleteAssessment}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete assessment
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
            <p className="text-slate-600 text-sm mt-1">
              <strong>{assessment.subject_name}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(assessment.assessment_date), 'd MMMM yyyy')}
              {(assessment.auditor_name || assessment.conducted_by_name) && ` · Conducted by ${assessment.auditor_name || assessment.conducted_by_name}`}
            </p>
          </div>
          {assessment.max_score > 0 && (
            <div className="text-center flex-shrink-0">
              <p className="text-4xl font-bold text-purple-700">{Math.round(assessment.score_pct)}%</p>
              <p className="text-xs text-slate-400 mt-0.5">{assessment.total_score} / {assessment.max_score} pts</p>
              {assessment.risk_level && (
                <div className="mt-2">
                  <RiskBadge level={assessment.risk_level} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Answers by section */}
      {template.sections.map((section: any, si: number) => (
        <div key={si} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">{section.title}</h2>
          <div className="space-y-4">
            {section.questions.map((q: any, qi: number) => {
              const ans = assessment.answers?.[q.id]
              return (
                <div key={q.id} className={`flex gap-4 ${qi > 0 ? 'pt-3 border-t border-slate-50' : ''}`}>
                  <p className="flex-1 text-sm text-slate-700 leading-snug">
                    <span className="text-slate-400 mr-1">{qi + 1}.</span>{q.text}
                  </p>
                  <div className="flex-shrink-0 text-right max-w-xs">
                    <AnswerDisplay q={q} value={ans} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Actions & notes */}
      {(assessment.actions_identified || assessment.notes || assessment.next_review_date) && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Actions & Follow-up</h2>
          {assessment.actions_identified && (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Actions identified</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{assessment.actions_identified}</p>
            </div>
          )}
          {assessment.next_review_date && (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next review</p>
              <p className="text-sm text-slate-700">{format(new Date(assessment.next_review_date), 'd MMMM yyyy')}</p>
            </div>
          )}
          {assessment.notes && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{assessment.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
