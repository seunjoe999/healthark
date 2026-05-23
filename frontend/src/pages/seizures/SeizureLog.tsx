import React, { useState, useEffect } from 'react'
import { Zap, Plus, AlertTriangle, Clock } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'

const SEIZURE_TYPES = [
  { value: 'tonic_clonic', label: 'Tonic-Clonic (Grand Mal)' },
  { value: 'absence', label: 'Absence (Petit Mal)' },
  { value: 'focal', label: 'Focal / Partial' },
  { value: 'myoclonic', label: 'Myoclonic' },
  { value: 'tonic', label: 'Tonic' },
  { value: 'clonic', label: 'Clonic' },
  { value: 'atonic', label: 'Atonic (Drop Attack)' },
  { value: 'unclassified', label: 'Unclassified' },
  { value: 'other', label: 'Other' },
]

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export default function SeizureLog() {
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [view, setView] = useState<'log' | 'stats'>('log')

  const [form, setForm] = useState({
    suId: '', seizureAt: new Date().toISOString().slice(0, 16),
    seizureType: 'tonic_clonic', durationSeconds: '', description: '',
    recoveryTime: '', postIctal: '', action: '',
    notifiedGP: false, notifiedFamily: false, notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [logsRes, suRes, statsRes] = await Promise.all([
        api.get('/seizures', { params: selectedSU ? { suId: selectedSU } : {} }),
        api.get('/service-users'),
        api.get('/seizures/stats', { params: selectedSU ? { suId: selectedSU } : {} }),
      ])
      setRecords(logsRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
      setStats(statsRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/seizures', {
        ...form,
        durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : null,
        recoveryTime: form.recoveryTime ? parseInt(form.recoveryTime) : null,
      })
      setShowAdd(false)
      load()
    } catch {}
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-400" /> Seizure Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">Record and track seizure episodes</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          Log Seizure
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['log', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'log' ? 'Seizure Log' : 'Stats by Type'}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <select className="input w-60" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
          <option value="">All Service Users</option>
          {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          {view === 'stats' && (
            stats.length === 0 ? <EmptyState title="No data yet" /> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((s: any) => (
                  <div key={s.seizure_type} className="card p-5 text-center">
                    <div className="text-3xl font-bold text-amber-400">{s.count}</div>
                    <div className="font-semibold text-white mt-1 capitalize text-sm">{s.seizure_type?.replace(/_/g, ' ')}</div>
                    {s.avg_duration_secs && (
                      <div className="text-xs text-slate-400 mt-1">Avg: {formatDuration(Math.round(parseFloat(s.avg_duration_secs)))}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5">last 30 days</div>
                  </div>
                ))}
              </div>
            )
          )}

          {view === 'log' && (
            records.length === 0 ? <EmptyState title="No seizures recorded" description="Use 'Log Seizure' to record an episode" /> : (
              <div className="space-y-3">
                {records.map(r => (
                  <div key={r.id} className="card p-4 border-l-4 border-l-rose-500/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="badge badge-critical capitalize">{r.seizure_type?.replace(/_/g, ' ')}</span>
                          {r.duration_seconds && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" /> {formatDuration(r.duration_seconds)}
                            </span>
                          )}
                          {r.notified_gp && <span className="text-xs text-blue-400 font-medium">GP notified</span>}
                          {r.notified_family && <span className="text-xs text-purple-400 font-medium">Family notified</span>}
                        </div>
                        <p className="font-semibold text-white">{r.su_name}</p>
                        {r.description && <p className="text-sm text-slate-300 mt-1">{r.description}</p>}
                        {r.action_taken && <p className="text-sm text-amber-400 mt-1">Action: {r.action_taken}</p>}
                        {r.post_ictal && <p className="text-xs text-slate-400 mt-1">Post-ictal: {r.post_ictal}</p>}
                        {r.recovery_time_mins && <p className="text-xs text-slate-400">Recovery: {r.recovery_time_mins} mins</p>}
                        {r.notes && <p className="text-xs text-slate-500 mt-1">{r.notes}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400 flex-shrink-0">
                        <div className="text-white font-medium">{format(new Date(r.seizure_at), 'dd MMM yyyy')}</div>
                        <div>{format(new Date(r.seizure_at), 'HH:mm')}</div>
                        <div className="mt-1">{r.recorded_by_name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Seizure Episode" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service User *" options={suOptions} placeholder="Select service user..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Seizure type *" options={SEIZURE_TYPES} value={form.seizureType} onChange={e => setForm(f => ({ ...f, seizureType: e.target.value }))} />
            <Input label="Date & Time" type="datetime-local" value={form.seizureAt} onChange={e => setForm(f => ({ ...f, seizureAt: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (seconds)" type="number" placeholder="e.g. 45" value={form.durationSeconds} onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value }))} />
            <Input label="Recovery time (mins)" type="number" placeholder="e.g. 5" value={form.recoveryTime} onChange={e => setForm(f => ({ ...f, recoveryTime: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Description of episode</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what happened, movements, loss of consciousness..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Action taken</label>
            <textarea className="input" rows={2} value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} placeholder="e.g. Positioned on side, timed episode, called for assistance..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Post-ictal state</label>
            <textarea className="input" rows={2} value={form.postIctal} onChange={e => setForm(f => ({ ...f, postIctal: e.target.value }))} placeholder="e.g. Drowsy, confused, sleeping..." />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.notifiedGP} onChange={e => setForm(f => ({ ...f, notifiedGP: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">GP notified</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.notifiedFamily} onChange={e => setForm(f => ({ ...f, notifiedFamily: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">Family notified</span>
            </label>
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
