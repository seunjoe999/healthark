import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Smile, Frown, Meh } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format } from 'date-fns'

const MOODS = [
  { value: 'great',      label: 'Great' },
  { value: 'good',       label: 'Good' },
  { value: 'fair',       label: 'Fair' },
  { value: 'low',        label: 'Low' },
  { value: 'distressed', label: 'Distressed' },
]

const APPETITE = [
  { value: 'good',    label: 'Good' },
  { value: 'fair',    label: 'Fair' },
  { value: 'poor',    label: 'Poor' },
  { value: 'refused', label: 'Refused' },
]

const FLUID = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

const SLEEP = [
  { value: 'good',     label: 'Good' },
  { value: 'fair',     label: 'Fair' },
  { value: 'poor',     label: 'Poor' },
  { value: 'restless', label: 'Restless' },
]

function moodIcon(mood: string) {
  if (mood === 'great' || mood === 'good') return <Smile className="w-4 h-4 text-emerald-400" />
  if (mood === 'fair') return <Meh className="w-4 h-4 text-amber-400" />
  return <Frown className="w-4 h-4 text-rose-400" />
}

function moodColor(mood: string) {
  if (mood === 'great') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (mood === 'good') return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
  if (mood === 'fair') return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (mood === 'low') return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
  return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
}

export default function ResidentDiary() {
  const [entries, setEntries] = useState<any[]>([])
  const [summary, setSummary] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [view, setView] = useState<'summary' | 'log'>('summary')

  const [form, setForm] = useState({
    suId: '', diaryDate: new Date().toISOString().slice(0, 10),
    mood: 'good', moodNotes: '', activities: '',
    foodAppetite: 'good', fluidIntake: 'good', sleepQuality: 'good',
    personalCareDone: false, notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [entriesRes, suRes, summaryRes] = await Promise.all([
        api.get('/diary', { params: selectedSU ? { suId: selectedSU } : {} }),
        api.get('/service-users'),
        api.get('/diary/summary'),
      ])
      setEntries(entriesRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
      setSummary(summaryRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/diary', form)
      setShowAdd(false)
      setForm(f => ({ ...f, suId: '', moodNotes: '', activities: '', notes: '' }))
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
            <BookOpen className="w-6 h-6 text-amber-400" /> Resident Diary
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daily observations and activity log</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            New Entry
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['summary', 'log'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'summary' ? 'By Resident' : 'All Entries'}
          </button>
        ))}
      </div>

      {view === 'log' && (
        <div className="mb-4">
          <select className="input w-60" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
            <option value="">All Residents</option>
            {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {view === 'summary' && (
            summary.length === 0 ? <EmptyState title="No residents found" /> : (
              <div className="space-y-2">
                {summary.map((s: any) => (
                  <div key={s.su_id} className="card p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{s.su_name}</p>
                        {s.room_number && <span className="text-xs text-slate-500">Room {s.room_number}</span>}
                      </div>
                      {s.diary_date ? (
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {s.mood && (
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize', moodColor(s.mood))}>
                              {moodIcon(s.mood)} {s.mood}
                            </span>
                          )}
                          {s.food_appetite && <span className="text-xs text-slate-400">Food: <span className="text-white capitalize">{s.food_appetite}</span></span>}
                          {s.sleep_quality && <span className="text-xs text-slate-400">Sleep: <span className="text-white capitalize">{s.sleep_quality}</span></span>}
                          {s.activities && <p className="text-xs text-slate-400 w-full mt-0.5 truncate">{s.activities}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-rose-400 mt-1">No diary entry yet</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-400 flex-shrink-0">
                      {s.diary_date ? (
                        <>
                          <p className="text-white font-medium">{format(new Date(s.diary_date), 'dd MMM yyyy')}</p>
                          <p className="text-slate-500 mt-0.5">Last entry</p>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {view === 'log' && (
            entries.length === 0 ? <EmptyState title="No diary entries" description="Use 'New Entry' to log a daily observation" /> : (
              <div className="space-y-3">
                {entries.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {r.mood && (
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize', moodColor(r.mood))}>
                              {moodIcon(r.mood)} {r.mood}
                            </span>
                          )}
                          {r.personal_care_done && <span className="text-xs text-blue-400 font-medium">Personal care done</span>}
                        </div>
                        <p className="font-semibold text-white">{r.su_name}</p>
                        {r.mood_notes && <p className="text-sm text-slate-300 mt-1">{r.mood_notes}</p>}
                        {r.activities && <p className="text-sm text-slate-300 mt-1">Activities: {r.activities}</p>}
                        <div className="flex gap-4 mt-1 flex-wrap">
                          {r.food_appetite && <span className="text-xs text-slate-400">Food: <span className="capitalize text-slate-300">{r.food_appetite}</span></span>}
                          {r.fluid_intake && <span className="text-xs text-slate-400">Fluids: <span className="capitalize text-slate-300">{r.fluid_intake}</span></span>}
                          {r.sleep_quality && <span className="text-xs text-slate-400">Sleep: <span className="capitalize text-slate-300">{r.sleep_quality}</span></span>}
                        </div>
                        {r.notes && <p className="text-xs text-slate-500 mt-1">{r.notes}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400 flex-shrink-0">
                        <div className="text-white font-medium">{format(new Date(r.diary_date), 'dd MMM yyyy')}</div>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Diary Entry" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Service User *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
            <Input label="Date" type="date" value={form.diaryDate} onChange={e => setForm(f => ({ ...f, diaryDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mood" options={MOODS} value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))} />
            <Select label="Sleep quality" options={SLEEP} value={form.sleepQuality} onChange={e => setForm(f => ({ ...f, sleepQuality: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Food appetite" options={APPETITE} value={form.foodAppetite} onChange={e => setForm(f => ({ ...f, foodAppetite: e.target.value }))} />
            <Select label="Fluid intake" options={FLUID} value={form.fluidIntake} onChange={e => setForm(f => ({ ...f, fluidIntake: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Activities today</label>
            <textarea className="input" rows={2} value={form.activities}
              onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
              placeholder="What did the resident do today? Any events, visits, interests..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Mood / behaviour notes</label>
            <textarea className="input" rows={2} value={form.moodNotes}
              onChange={e => setForm(f => ({ ...f, moodNotes: e.target.value }))}
              placeholder="Describe mood, behaviour, any concerns..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">General notes</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any other observations for this resident today..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.personalCareDone} onChange={e => setForm(f => ({ ...f, personalCareDone: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Personal care completed</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
