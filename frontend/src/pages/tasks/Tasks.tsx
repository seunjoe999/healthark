import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, PrintButton } from '../../components/ui'
import { CheckSquare, Plus, Check, Clock, AlertTriangle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQUENCIES = [
  { value: 'once', label: 'Once only' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays only' },
  { value: 'weekends', label: 'Weekends only' },
  { value: 'weekly', label: 'Weekly (Mondays)' },
]

const CATEGORIES = [{ value: 'housekeeping', label: 'Housekeeping' }, { value: 'medication', label: 'Medication check' }, { value: 'social_visit', label: 'Social visit' }, { value: 'personal_care', label: 'Personal care' }, { value: 'health_check', label: 'Health check' }, { value: 'general', label: 'General' }, { value: 'maintenance', label: 'Maintenance' }]
const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]

export default function Tasks() {
  const { user, isRole } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [sus, setSus] = useState<any[]>([])
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    Promise.all([
      suApi.list(selectedHome, { status: 'live' }),
    ]).then(([suRes]) => setSus(suRes.data.data || []))
    load()
  }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tasks', { params: { homeId: selectedHome, date: today } })
      setTasks(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const complete = async (taskId: string) => {
    try {
      await api.put(`/tasks/${taskId}/complete`, { notes: '' })
      await load()
      toast.success('Task completed')
    } catch { toast.error('Failed') }
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      await load()
      toast.success('Task deleted')
    } catch { toast.error('Failed to delete task') }
  }

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'pending' ? t.status === 'pending' : t.status === 'completed')

  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20'
    if (p === 'high') return 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20'
    if (p === 'low') return 'bg-slate-100 text-slate-600'
    return 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-purple-600" /> Tasks
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2 items-center">
          <PrintButton />
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add task</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total today', value: tasks.length, color: 'text-slate-900' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'text-amber-600' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
            <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mb-5">
        {[{ key: 'pending', label: 'Pending' }, { key: 'completed', label: 'Completed' }, { key: 'all', label: 'All' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'No pending tasks' : 'No tasks found'}
          description="All tasks completed for today!"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add task</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((task: any) => (
            <div key={task.id} className={`bg-white rounded-2xl border shadow-card p-4 flex items-start gap-4 ${task.status === 'completed' ? 'border-emerald-200 opacity-70' : 'border-slate-100'}`}>
              <button onClick={() => task.status !== 'completed' && complete(task.id)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-purple-500'}`}>
                {task.status === 'completed' && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className={`font-semibold text-sm ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h3>
                  <span className={`badge text-xs ${priorityColor(task.priority)}`}>{task.priority}</span>
                  {task.su_name && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{task.su_name}</span>}
                </div>
                {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {task.due_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.due_time}</span>}
                  <span className="capitalize">{(task.category || '').replace('_', ' ')}</span>
                  {task.status === 'completed' && task.completed_by_name && <span className="text-emerald-600 font-medium flex items-center gap-0.5"><Check className="w-3 h-3" /> {task.completed_by_name}</span>}
                </div>
              </div>
              {isRole('home_manager', 'group_admin') && (
                <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} sus={sus} homeId={selectedHome}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Task added') }} />
    </div>
  )
}

function AddTaskModal({ open, onClose, sus, homeId, onSaved }: { open: boolean; onClose: () => void; sus: any[]; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'general', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '', priority: 'normal', suId: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const suOptions = sus.map(su => ({ value: su.id, label: `${su.first_name || su.firstName} ${su.last_name || su.lastName}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/tasks', { homeId, ...form, suId: form.suId || null }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add task">
      <form onSubmit={save} className="space-y-4">
        <Input label="Task title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Clean kitchen, Check medications..." autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
          <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)} options={PRIORITIES} />
        </div>
        <Select label="Linked to resident (optional)" value={form.suId} onChange={e => set('suId', e.target.value)}
          options={suOptions} placeholder="Select resident (optional)" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={form.taskDate} onChange={e => set('taskDate', e.target.value)} />
          <Input label="Due time" type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add task</Button>
        </div>
      </form>
    </Modal>
  )
}
