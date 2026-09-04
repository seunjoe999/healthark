import React, { useState, useEffect } from 'react'
import { Droplets, Plus, Trash2, Info } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const INPUT_CATEGORIES = [
  { value: 'drink', label: 'Drink / Oral fluids' },
  { value: 'iv_fluids', label: 'IV Fluids' },
  { value: 'ng_feed', label: 'NG / PEG Feed' },
  { value: 'other', label: 'Other input' },
]

const OUTPUT_CATEGORIES = [
  { value: 'urine', label: 'Urine' },
  { value: 'vomit', label: 'Vomit / Emesis' },
  { value: 'drain', label: 'Drain / Wound output' },
  { value: 'other', label: 'Other output' },
]

const defaultForm = {
  suId: '',
  type: 'input' as 'input' | 'output',
  category: 'drink',
  amountMl: '',
  recordTime: new Date().toTimeString().slice(0, 5),
  notes: '',
}

export default function FluidBalance() {
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalInput: 0, totalOutput: 0, balance: 0 })
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    api.get('/service-users').then(r => setServiceUsers(r.data.data || [])).catch(() => {})
  }, [])

  async function load() {
    if (!selectedSU) { setRecords([]); setSummary({ totalInput: 0, totalOutput: 0, balance: 0 }); return; }
    setLoading(true)
    try {
      const r = await api.get('/fluid-balance', { params: { suId: selectedSU, date: selectedDate } })
      setRecords(r.data.data || [])
      setSummary(r.data.summary || { totalInput: 0, totalOutput: 0, balance: 0 })
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU, selectedDate])

  function handleTypeChange(t: 'input' | 'output') {
    setForm(f => ({ ...f, type: t, category: t === 'input' ? 'drink' : 'urine' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.suId) { toast.error('Please select a service user'); return; }
    if (!form.amountMl || parseInt(form.amountMl) <= 0) { toast.error('Please enter a valid amount'); return; }
    setSubmitting(true)
    try {
      await api.post('/fluid-balance', {
        suId: form.suId,
        recordDate: selectedDate,
        recordTime: form.recordTime,
        type: form.type,
        category: form.category,
        amountMl: parseInt(form.amountMl),
        notes: form.notes,
      })
      setShowAdd(false)
      setForm(defaultForm)
      if (form.suId === selectedSU) load()
      else setSelectedSU(form.suId)
      toast.success('Fluid record saved')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save record') }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this record?')) return
    try {
      await api.delete(`/fluid-balance/${id}`)
      load()
      toast.success('Record deleted')
    } catch { toast.error('Failed to delete') }
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const categoryOptions = form.type === 'input' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES
  const balancePositive = summary.balance >= 0

  return (
    <div className="p-6 max-w-5xl mx-auto" style={{ background: '#0d1526', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-blue-400" /> Fluid Balance Chart
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track daily fluid intake and output for residents</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          Add Record
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="input w-64"
          value={selectedSU}
          onChange={e => setSelectedSU(e.target.value)}
        >
          <option value="">Select a resident...</option>
          {serviceUsers.map((s: any) => (
            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
          ))}
        </select>
        <input
          type="date"
          className="input w-44"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Summary bar */}
      {selectedSU && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-2xl font-bold text-blue-400">{summary.totalInput} ml</div>
            <div className="text-xs text-slate-400 mt-1">Total Input</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-2xl font-bold text-amber-400">{summary.totalOutput} ml</div>
            <div className="text-xs text-slate-400 mt-1">Total Output</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className={clsx('text-2xl font-bold', balancePositive ? 'text-emerald-400' : 'text-rose-400')}>
              {summary.balance >= 0 ? '+' : ''}{summary.balance} ml
            </div>
            <div className="text-xs text-slate-400 mt-1">Balance</div>
          </div>
        </div>
      )}

      {/* Recommended intake note */}
      {selectedSU && (
        <div className="flex items-center gap-2 mb-5 p-3 rounded-lg text-xs text-blue-300" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Recommended daily fluid intake: <strong>1500–2000 ml</strong>. Consult care plan for individual targets.</span>
        </div>
      )}

      {/* Records table */}
      {!selectedSU ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Droplets className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Select a resident above to view their fluid balance chart</p>
        </div>
      ) : loading ? <Spinner /> : records.length === 0 ? (
        <EmptyState title="No records for this date" description="Use 'Add Record' to log fluid intake or output" />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="text-right p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">By</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any, i: number) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: i < records.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-3 text-white font-mono">{r.record_time ? r.record_time.slice(0, 5) : '—'}</td>
                  <td className="p-3">
                    <span className={clsx(
                      'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                      r.type === 'input'
                        ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                        : 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                    )}>
                      {r.type === 'input' ? 'Input' : 'Output'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 capitalize">{r.category?.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right font-semibold text-white">{r.amount_ml} ml</td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{r.notes || '—'}</td>
                  <td className="p-3 text-slate-500 text-xs">{r.recorded_by_name}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Record Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Fluid Record" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Service User *"
            options={suOptions}
            placeholder="Select service user..."
            value={form.suId}
            onChange={e => setForm(f => ({ ...f, suId: e.target.value }))}
            required
          />

          {/* Input / Output toggle */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">Type *</label>
            <div className="flex gap-2">
              {(['input', 'output'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border',
                    form.type === t
                      ? t === 'input'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'border-white/10 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {t === 'input' ? 'Input (In)' : 'Output (Out)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category *"
              options={categoryOptions}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              required
            />
            <Input
              label="Amount (ml) *"
              type="number"
              min={1}
              placeholder="e.g. 250"
              value={form.amountMl}
              onChange={e => setForm(f => ({ ...f, amountMl: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Time"
            type="time"
            value={form.recordTime}
            onChange={e => setForm(f => ({ ...f, recordTime: e.target.value }))}
          />

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
