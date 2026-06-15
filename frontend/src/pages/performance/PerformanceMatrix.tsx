import React, { useState, useEffect } from 'react'
import { BarChart3, Plus, Star, CheckCircle2, XCircle, Zap, ClipboardCheck } from 'lucide-react'
import { Button, Modal, Select, Input, Spinner, EmptyState, PrintButton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { homesApi } from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'

const RISK_RATINGS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

function scoreColor(score: number | null) {
  if (!score) return 'text-slate-500'
  if (score >= 4) return 'text-emerald-400'
  if (score >= 3) return 'text-amber-400'
  return 'text-rose-400'
}

function riskBadge(rating: string) {
  if (rating === 'high') return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  if (rating === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
}

function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="text-slate-600 text-xs">—</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={clsx('w-3 h-3', i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-700')} />
      ))}
    </div>
  )
}

function ScoreInput({ label, field, form, setForm }: { label: string; field: string; form: any; setForm: any }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 block mb-1.5">{label} (1–5)</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onClick={() => setForm((f: any) => ({ ...f, [field]: f[field] === n ? null : n }))}
            className={clsx('w-9 h-9 rounded-lg text-sm font-bold border transition-all', form[field] === n ? 'text-slate-900 border-amber-400' : 'text-slate-400 border-slate-700 hover:border-slate-500')}
            style={form[field] === n ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PerformanceMatrix() {
  const { user, isRole } = useAuth()
  const navigate = useNavigate()
  const [matrix, setMatrix] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'matrix' | 'history' | 'shift_matrix'>('matrix')
  const [selectedStaff, setSelectedStaff] = useState('')

  const canAssess = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')
  const isGroupAdmin = isRole('group_admin')
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoGenResult, setAutoGenResult] = useState<any>(null)
  const [shiftMatrixData, setShiftMatrixData] = useState<{ staff: any[]; homes: any[]; shiftMap: Record<string, Record<string, number>> } | null>(null)

  async function autoGenerate() {
    if (!window.confirm('Auto-generate performance matrix for all staff? This will build records from training, DBS, incidents and shift data.')) return
    setAutoGenerating(true)
    try {
      const res = await api.post('/performance/auto-generate', { homeId: selectedHome || undefined })
      await load()
      setView('matrix')
      setAutoGenResult(res.data.data)
    } catch (e: any) {
      alert('Auto-generate failed: ' + (e?.response?.data?.error || e?.message || 'Unknown error'))
    }
    setAutoGenerating(false)
  }

  useEffect(() => {
    if (isGroupAdmin) {
      homesApi.list().then(res => {
        const h = res.data.data || []
        setHomes(h)
        if (h.length > 0) setSelectedHome(h[0].id)
      }).catch(() => {})
    }
  }, [])

  const [form, setForm] = useState({
    staffId: '',
    period: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
    trainingCompliance: '' as string | number,
    supervisionCompleted: false,
    supervisionsDue: '' as string | number,
    supervisionsDone: '' as string | number,
    incidentsReported: 0,
    punctualityScore: null as number | null,
    attitudeScore: null as number | null,
    careQualityScore: null as number | null,
    documentationScore: null as number | null,
    teamworkScore: null as number | null,
    overallScore: '' as string | number,
    riskRating: 'low',
    strengths: '', areasImprovement: '', actionPlan: '', notes: '',
  })

  async function load() {
    setLoading(true)
    const homeParam = selectedHome || undefined
    try {
      const [matrixRes, staffRes, historyRes, shiftRes] = await Promise.all([
        api.get('/performance/matrix', { params: homeParam ? { homeId: homeParam } : {} }),
        api.get('/staff', { params: homeParam ? { homeId: homeParam } : {} }),
        api.get('/performance', { params: { ...(homeParam ? { homeId: homeParam } : {}), ...(selectedStaff ? { staffId: selectedStaff } : {}) } }),
        api.get('/performance/shift-matrix', { params: homeParam ? { homeId: homeParam } : {} }),
      ])
      setMatrix(matrixRes.data.data || [])
      setStaff(staffRes.data.data || [])
      setHistory(historyRes.data.data || [])
      setShiftMatrixData(shiftRes.data.data || null)
    } catch (err) {
      console.error('Failed to load performance data:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isGroupAdmin && !selectedHome) return
    load()
  }, [selectedStaff, selectedHome])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/performance', {
        ...form,
        homeId: selectedHome || undefined,
        trainingCompliance: form.trainingCompliance !== '' ? Number(form.trainingCompliance) : null,
        supervisionsDue: form.supervisionsDue !== '' ? Number(form.supervisionsDue) : null,
        supervisionsDone: form.supervisionsDone !== '' ? Number(form.supervisionsDone) : null,
        overallScore: form.overallScore !== '' ? Number(form.overallScore) : null,
      })
      setShowAdd(false)
      setForm(f => ({ ...f, staffId: '', strengths: '', areasImprovement: '', actionPlan: '', notes: '' }))
      load()
    } catch {}
    setSubmitting(false)
  }

  const staffOptions = staff.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name} (${s.role?.replace(/_/g, ' ')})` }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-amber-400" /> Performance Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1">Staff performance reviews and compliance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<ClipboardCheck className="w-4 h-4" />} onClick={() => navigate('/assessments')}>
            Staff Assessments
          </Button>
          <PrintButton />
          {canAssess && (
            <>
              <Button variant="ghost" icon={<Zap className="w-4 h-4" />} onClick={autoGenerate} loading={autoGenerating}>
                Auto-generate
              </Button>
              <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
                New Review
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Home selector for group admin */}
      {isGroupAdmin && homes.length > 1 && (
        <div className="mb-4">
          <select className="input w-64 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {([
          { key: 'matrix', label: 'Matrix Overview' },
          { key: 'shift_matrix', label: 'Shift Matrix' },
          { key: 'history', label: 'Review History' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setView(t.key as any)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all', view === t.key ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t.key ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'history' && (
        <div className="mb-4">
          <select className="input w-64" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
            <option value="">All Staff</option>
            {staff.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {view === 'matrix' && (
            matrix.length === 0 ? <EmptyState title="No staff found" /> : (
              <div className="overflow-x-auto border border-white/8 rounded-xl" style={{ background: '#111' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Staff Member</th>
                      <th className="text-center py-3 px-3">Training %</th>
                      <th className="text-center py-3 px-3">Supervision</th>
                      <th className="text-center py-3 px-3">Punctuality</th>
                      <th className="text-center py-3 px-3">Care Quality</th>
                      <th className="text-center py-3 px-3">Assessments</th>
                      <th className="text-center py-3 px-3">Overall</th>
                      <th className="text-center py-3 px-3">Risk</th>
                      <th className="text-left py-3 px-3">Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {matrix.map(row => (
                      <tr key={row.staff_id} className="hover:bg-white/3 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-medium text-white">{row.staff_name}</p>
                          <p className="text-xs text-slate-500 capitalize">{row.role?.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.training_compliance != null ? (
                            <span className={clsx('font-bold', row.training_compliance >= 80 ? 'text-emerald-400' : row.training_compliance >= 60 ? 'text-amber-400' : 'text-rose-400')}>
                              {row.training_compliance}%
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.supervision_completed != null ? (
                            row.supervision_completed
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                              : <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center"><Stars value={row.punctuality_score} /></td>
                        <td className="py-3 px-3 text-center"><Stars value={row.care_quality_score} /></td>
                        <td className="py-3 px-3 text-center">
                          <button onClick={() => navigate('/assessments')}
                            className="flex flex-col items-center gap-0.5 hover:text-amber-400 transition-colors group mx-auto">
                            <span className={clsx('font-bold text-sm', parseInt(row.assessment_count) > 0 ? 'text-emerald-400' : 'text-slate-600')}>
                              {parseInt(row.assessment_count) || 0}
                            </span>
                            {row.latest_assessment_score != null && (
                              <span className="text-xs text-slate-500">{parseFloat(row.latest_assessment_score).toFixed(0)}%</span>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.overall_score != null ? (
                            <span className={clsx('font-bold text-base', scoreColor(parseFloat(row.overall_score)))}>
                              {parseFloat(row.overall_score).toFixed(1)}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.risk_rating ? (
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border capitalize', riskBadge(row.risk_rating))}>
                              {row.risk_rating}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-xs">{row.period || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {view === 'shift_matrix' && (
            !shiftMatrixData || shiftMatrixData.staff.length === 0 ? (
              <EmptyState title="No shift data" description="No shifts have been scheduled yet" />
            ) : (
              <div>
                <p className="text-slate-400 text-sm mb-4">
                  Performance Matrix ({shiftMatrixData.staff.length}) — showing shift counts per care worker per location
                </p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm border-collapse" style={{ background: '#111' }}>
                    <thead>
                      <tr style={{ background: '#1e1e1e' }}>
                        <th className="text-left py-3 px-4 text-amber-400 font-bold border-b border-white/10 min-w-40">Care Worker</th>
                        {shiftMatrixData.homes.map(h => (
                          <th key={h.id} className="text-center py-3 px-2 text-slate-300 font-semibold border-b border-white/10 min-w-20"
                            title={h.name}>
                            {h.name.length > 7 ? h.name.substring(0, 7).toUpperCase() : h.name.toUpperCase()}
                          </th>
                        ))}
                        <th className="text-center py-3 px-3 text-amber-400 font-bold border-b border-white/10">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftMatrixData.staff.map((s, idx) => {
                        const staffShifts = shiftMatrixData.shiftMap[s.id] || {}
                        const rowTotal = shiftMatrixData.homes.reduce((sum, h) => sum + (staffShifts[h.id] || 0), 0)
                        return (
                          <tr key={s.id} className={clsx('border-b border-white/5 transition-colors hover:bg-white/3', idx % 2 === 0 ? '' : 'bg-white/2')}>
                            <td className="py-2.5 px-4">
                              <p className="font-medium text-white text-sm">{s.name}</p>
                              <p className="text-xs text-slate-500 capitalize">{s.role?.replace(/_/g, ' ')}</p>
                            </td>
                            {shiftMatrixData.homes.map(h => {
                              const count = staffShifts[h.id] || 0
                              return (
                                <td key={h.id} className="py-2.5 px-2 text-center">
                                  {count > 0 ? (
                                    <span className="inline-block w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm"
                                      style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-2.5 px-3 text-center">
                              <span className={clsx('font-bold', rowTotal > 0 ? 'text-amber-400' : 'text-slate-600')}>
                                {rowTotal || '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#1a1a1a' }}>
                        <td className="py-2.5 px-4 text-amber-400 font-bold text-sm">Total</td>
                        {shiftMatrixData.homes.map(h => {
                          const colTotal = shiftMatrixData.staff.reduce((sum, s) => sum + (shiftMatrixData.shiftMap[s.id]?.[h.id] || 0), 0)
                          return (
                            <td key={h.id} className="py-2.5 px-2 text-center font-bold text-amber-400">
                              {colTotal || '—'}
                            </td>
                          )
                        })}
                        <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                          {shiftMatrixData.staff.reduce((sum, s) =>
                            sum + shiftMatrixData.homes.reduce((s2, h) => s2 + (shiftMatrixData.shiftMap[s.id]?.[h.id] || 0), 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          )}

          {view === 'history' && (
            history.length === 0 ? <EmptyState title="No reviews found" description="No performance reviews recorded yet" /> : (
              <div className="space-y-3">
                {history.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-white">{r.staff_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{r.staff_role?.replace(/_/g, ' ')} · Period: {r.period}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.overall_score != null && (
                          <span className={clsx('text-2xl font-bold', scoreColor(parseFloat(r.overall_score)))}>
                            {parseFloat(r.overall_score).toFixed(1)}
                          </span>
                        )}
                        {r.risk_rating && (
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold border capitalize', riskBadge(r.risk_rating))}>
                            {r.risk_rating} risk
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                      {[
                        { label: 'Punctuality', val: r.punctuality_score },
                        { label: 'Attitude', val: r.attitude_score },
                        { label: 'Care Quality', val: r.care_quality_score },
                        { label: 'Documentation', val: r.documentation_score },
                        { label: 'Teamwork', val: r.teamwork_score },
                      ].map(({ label, val }) => (
                        <div key={label} className="text-center">
                          <p className="text-xs text-slate-500 mb-1">{label}</p>
                          <Stars value={val} />
                        </div>
                      ))}
                    </div>
                    {r.strengths && <p className="text-xs text-slate-400 mb-0.5">Strengths: <span className="text-emerald-300">{r.strengths}</span></p>}
                    {r.areas_improvement && <p className="text-xs text-slate-400 mb-0.5">Improve: <span className="text-amber-300">{r.areas_improvement}</span></p>}
                    {r.action_plan && <p className="text-xs text-slate-400 mb-0.5">Action plan: <span className="text-slate-300">{r.action_plan}</span></p>}
                    <p className="text-xs text-slate-600 mt-2">Assessed by {r.assessed_by_name} · {format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Auto-generate result modal */}
      {autoGenResult && (
        <Modal open={true} onClose={() => setAutoGenResult(null)} title="Auto-generate complete" size="md">
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-emerald-400 font-bold text-lg">
                Processed {autoGenResult.staffProcessed ?? 0} staff &middot; {autoGenResult.created ?? 0} new records created
              </p>
            </div>
            {autoGenResult.records && autoGenResult.records.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {autoGenResult.records.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/5">
                    <span className="text-slate-300">{r.staffName || r.staff_name}</span>
                    <span className="text-xs text-slate-500 capitalize">{r.action}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => { setAutoGenResult(null); setView('shift_matrix') }}>View Shift Matrix</Button>
              <Button variant="gold" onClick={() => { setAutoGenResult(null); setView('matrix') }}>View Matrix</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Performance Review" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Staff Member *" options={staffOptions} placeholder="Select staff..." value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} required />
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Period *</label>
              <input className="input w-full" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g. January 2026" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Training compliance (%)</label>
              <input type="number" min="0" max="100" className="input w-full" value={form.trainingCompliance} onChange={e => setForm(f => ({ ...f, trainingCompliance: e.target.value }))} placeholder="e.g. 85" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Supervisions due</label>
              <input type="number" min="0" className="input w-full" value={form.supervisionsDue} onChange={e => setForm(f => ({ ...f, supervisionsDue: e.target.value }))} placeholder="e.g. 2" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Supervisions done</label>
              <input type="number" min="0" className="input w-full" value={form.supervisionsDone} onChange={e => setForm(f => ({ ...f, supervisionsDone: e.target.value }))} placeholder="e.g. 2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <ScoreInput label="Punctuality" field="punctualityScore" form={form} setForm={setForm} />
            <ScoreInput label="Attitude & professionalism" field="attitudeScore" form={form} setForm={setForm} />
            <ScoreInput label="Care quality" field="careQualityScore" form={form} setForm={setForm} />
            <ScoreInput label="Documentation" field="documentationScore" form={form} setForm={setForm} />
            <ScoreInput label="Teamwork" field="teamworkScore" form={form} setForm={setForm} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Overall score (0–5)</label>
              <input type="number" step="0.1" min="0" max="5" className="input w-full" value={form.overallScore} onChange={e => setForm(f => ({ ...f, overallScore: e.target.value }))} placeholder="e.g. 4.2" />
            </div>
            <Select label="Risk rating" options={RISK_RATINGS} value={form.riskRating} onChange={e => setForm(f => ({ ...f, riskRating: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.supervisionCompleted} onChange={e => setForm(f => ({ ...f, supervisionCompleted: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Supervision completed this period</span>
          </label>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Strengths</label>
            <textarea className="input" rows={2} value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="What does this staff member do well?" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Areas for improvement</label>
            <textarea className="input" rows={2} value={form.areasImprovement} onChange={e => setForm(f => ({ ...f, areasImprovement: e.target.value }))} placeholder="Where does this staff member need to develop?" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Action plan</label>
            <textarea className="input" rows={2} value={form.actionPlan} onChange={e => setForm(f => ({ ...f, actionPlan: e.target.value }))} placeholder="Specific actions agreed with the staff member..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Review</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
