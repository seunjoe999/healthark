import React, { useState, useEffect, useMemo } from 'react'
import { Scale, Plus, Trash2, TrendingUp } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface WeightRecord {
  id: string
  su_id: string
  su_name: string
  record_date: string
  weight_kg: string
  height_cm: string | null
  bmi: string | null
  notes: string | null
  recorded_by_name: string
}

function calcBMI(weightKg: string, heightCm: string): number | null {
  const w = parseFloat(weightKg)
  const h = parseFloat(heightCm)
  if (!w || !h || h <= 0) return null
  const hm = h / 100
  return Math.round((w / (hm * hm)) * 10) / 10
}

function bmiClass(bmi: number | null): { label: string; className: string } {
  if (bmi === null) return { label: '—', className: 'text-slate-400' }
  if (bmi < 18.5) return { label: `${bmi} — Underweight`, className: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
  if (bmi < 25)   return { label: `${bmi} — Normal`, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
  if (bmi < 30)   return { label: `${bmi} — Overweight`, className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
  return { label: `${bmi} — Obese`, className: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
}

const defaultForm = {
  suId: '',
  recordDate: new Date().toISOString().slice(0, 10),
  weightKg: '',
  heightCm: '',
  notes: '',
}

// Simple SVG line chart for last 8 weight readings
function WeightChart({ records }: { records: WeightRecord[] }) {
  const last8 = useMemo(() => [...records].reverse().slice(-8), [records])

  if (last8.length < 2) return (
    <div className="rounded-xl p-6 text-center text-slate-500 text-sm" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
      At least 2 readings needed to show trend chart
    </div>
  )

  const weights = last8.map(r => parseFloat(r.weight_kg))
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const W = 600
  const H = 160
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const xStep = chartW / (last8.length - 1)
  const points = last8.map((r, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + chartH - ((parseFloat(r.weight_kg) - minW) / range) * chartH,
    label: r.record_date,
    weight: r.weight_kg,
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-white">Weight Trend (last {last8.length} readings)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = PAD.top + chartH - frac * chartH
          const wVal = minW + frac * range
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#64748b">
                {wVal.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Gradient fill under line */}
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          points={`${points[0].x},${PAD.top + chartH} ${polyline} ${points[points.length - 1].x},${PAD.top + chartH}`}
          fill="url(#wGrad)"
        />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots + tooltips */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="#3b82f6" stroke="#0d1526" strokeWidth={2} />
            <text
              x={p.x}
              y={PAD.top + chartH + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {p.label.slice(5)}
            </text>
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={9} fill="#93c5fd">
              {parseFloat(p.weight).toFixed(1)}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.left - 40} y={PAD.top + chartH / 2} fontSize={10} fill="#475569" transform={`rotate(-90,${PAD.left - 38},${PAD.top + chartH / 2})`}>
          kg
        </text>
      </svg>
    </div>
  )
}

export default function WeightTracker() {
  const { user } = useAuth()
  const homeId = user?.homeId || ''
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [form, setForm] = useState(defaultForm)

  // Live BMI preview while typing
  const liveBmi = useMemo(() => {
    if (form.weightKg && form.heightCm) return calcBMI(form.weightKg, form.heightCm)
    return null
  }, [form.weightKg, form.heightCm])

  const liveBmiInfo = bmiClass(liveBmi)

  useEffect(() => {
    if (!homeId) return
    api.get('/service-users', { params: { homeId } }).then(r => setServiceUsers(r.data.data || [])).catch(() => {})
  }, [homeId])

  async function load() {
    if (!selectedSU) { setRecords([]); return; }
    setLoading(true)
    try {
      const r = await api.get('/weight-tracker', { params: { suId: selectedSU } })
      setRecords(r.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU])

  // Pre-fill height from last reading
  useEffect(() => {
    if (form.suId && records.length > 0 && !form.heightCm) {
      const lastWithHeight = records.find((r: WeightRecord) => r.su_id === form.suId && r.height_cm)
      if (lastWithHeight?.height_cm) {
        setForm(f => ({ ...f, heightCm: String(parseFloat(lastWithHeight.height_cm!)) }))
      }
    }
  }, [form.suId, records])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a service user'); return; }
    if (!form.weightKg || parseFloat(form.weightKg) <= 0) { toast.error('Please enter a valid weight'); return; }
    setSubmitting(true)
    try {
      await api.post('/weight-tracker', {
        suId: form.suId,
        recordDate: form.recordDate,
        weightKg: parseFloat(form.weightKg),
        heightCm: form.heightCm ? parseFloat(form.heightCm) : undefined,
        notes: form.notes,
      })
      setShowAdd(false)
      setForm(f => ({ ...defaultForm, suId: f.suId }))
      if (form.suId === selectedSU) load()
      else setSelectedSU(form.suId)
      toast.success('Weight reading saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save reading') }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this weight record?')) return
    try {
      await api.delete(`/weight-tracker/${id}`)
      load()
      toast.success('Record deleted')
    } catch { toast.error('Failed to delete') }
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const latestRecord = records[0]

  return (
    <div className="p-6 max-w-5xl mx-auto" style={{ background: '#0d1526', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scale className="w-6 h-6 text-blue-400" /> Weight / BMI Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor resident weight and body mass index over time</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          Add Reading
        </Button>
      </div>

      {/* Resident selector */}
      <div className="mb-5">
        <select
          className="input w-72"
          value={selectedSU}
          onChange={e => setSelectedSU(e.target.value)}
        >
          <option value="">Select a resident...</option>
          {serviceUsers.map((s: any) => (
            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
          ))}
        </select>
      </div>

      {/* Latest reading summary */}
      {latestRecord && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-2xl font-bold text-blue-400">{parseFloat(latestRecord.weight_kg).toFixed(1)} kg</div>
            <div className="text-xs text-slate-400 mt-1">Latest Weight</div>
            <div className="text-xs text-slate-600 mt-0.5">{format(parseISO(latestRecord.record_date), 'dd MMM yyyy')}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-2xl font-bold text-slate-300">
              {latestRecord.height_cm ? `${parseFloat(latestRecord.height_cm).toFixed(1)} cm` : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">Height</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            {latestRecord.bmi ? (() => {
              const info = bmiClass(parseFloat(latestRecord.bmi))
              return (
                <>
                  <div className={clsx('text-2xl font-bold', info.className.split(' ')[0])}>{parseFloat(latestRecord.bmi).toFixed(1)}</div>
                  <div className="text-xs text-slate-400 mt-1">BMI</div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border mt-1 inline-block', info.className)}>
                    {info.label.split(' — ')[1]}
                  </span>
                </>
              )
            })() : (
              <>
                <div className="text-2xl font-bold text-slate-500">—</div>
                <div className="text-xs text-slate-400 mt-1">BMI (add height)</div>
              </>
            )}
          </div>
        </div>
      )}

      {!selectedSU ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Select a resident above to view their weight history</p>
        </div>
      ) : loading ? <Spinner /> : (
        <>
          {/* Trend chart */}
          {records.length >= 2 && (
            <div className="mb-6">
              <WeightChart records={records} />
            </div>
          )}

          {/* History table */}
          {records.length === 0 ? (
            <EmptyState title="No weight records" description="Use 'Add Reading' to record a weight measurement" />
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Weight</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Height</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">BMI</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Recorded By</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const bmiNum = r.bmi ? parseFloat(r.bmi) : null
                    const info = bmiClass(bmiNum)
                    return (
                      <tr
                        key={r.id}
                        style={{ borderBottom: i < records.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-3 text-white font-medium">
                          {format(parseISO(r.record_date), 'dd MMM yyyy')}
                        </td>
                        <td className="p-3 text-blue-300 font-semibold">{parseFloat(r.weight_kg).toFixed(1)} kg</td>
                        <td className="p-3 text-slate-300">{r.height_cm ? `${parseFloat(r.height_cm).toFixed(1)} cm` : '—'}</td>
                        <td className="p-3">
                          {bmiNum ? (
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border', info.className)}>
                              {info.label}
                            </span>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{r.recorded_by_name}</td>
                        <td className="p-3 text-slate-400 max-w-xs truncate text-xs">{r.notes || '—'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Reading Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Weight Reading" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Service User *"
            options={suOptions}
            placeholder="Select service user..."
            value={form.suId}
            onChange={e => setForm(f => ({ ...f, suId: e.target.value }))}
            required
          />

          <Input
            label="Date *"
            type="date"
            value={form.recordDate}
            onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Weight (kg) *"
              type="number"
              step="0.1"
              min={1}
              placeholder="e.g. 68.5"
              value={form.weightKg}
              onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))}
              required
            />
            <Input
              label="Height (cm) — optional"
              type="number"
              step="0.1"
              min={1}
              placeholder="e.g. 165.0"
              value={form.heightCm}
              onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))}
            />
          </div>

          {/* Live BMI display */}
          {liveBmi !== null && (
            <div className={clsx('p-3 rounded-lg border text-sm', liveBmiInfo.className)}>
              <span className="font-semibold">Calculated BMI: {liveBmi}</span>
              <span className="ml-2 text-xs opacity-80">— {liveBmiInfo.label.split(' — ')[1]}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Pre-breakfast, clothed, using hoist scale..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Reading</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
