import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, PrintButton } from '../../components/ui'
import { CheckSquare, Plus, Check, Clock, AlertTriangle, Trash2, Zap, LayoutTemplate, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQUENCIES = [
  { value: 'once', label: 'Once only' },
  { value: 'daily', label: 'Daily' },
  { value: 'rota_days', label: 'Rota days' },
  { value: 'weekdays', label: 'Weekdays only' },
  { value: 'weekends', label: 'Weekends only' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'every_3_weeks', label: 'Every 3 weeks' },
  { value: 'every_28_days', label: 'Every 28 days' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const CATEGORIES = [{ value: 'housekeeping', label: 'Housekeeping' }, { value: 'medication', label: 'Medication check' }, { value: 'social_visit', label: 'Social visit' }, { value: 'personal_care', label: 'Personal care' }, { value: 'health_check', label: 'Health check' }, { value: 'general', label: 'General' }, { value: 'maintenance', label: 'Maintenance' }]
const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]

export default function Tasks() {
  const { user, isRole } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addTemplateOpen, setAddTemplateOpen] = useState(false)
  const [editTemplateOpen, setEditTemplateOpen] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [pageTab, setPageTab] = useState<'tasks' | 'templates'>('tasks')
  const [sus, setSus] = useState<any[]>([])
  const [generatingDaily, setGeneratingDaily] = useState(false)
  const [completingTask, setCompletingTask] = useState<any>(null)
  const [completionNote, setCompletionNote] = useState('')
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
    loadTemplates()
  }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tasks', { params: { homeId: selectedHome, date: today } })
      setTasks(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadTemplates = async () => {
    try {
      const res = await api.get('/tasks/templates', { params: { homeId: selectedHome } })
      setTemplates(res.data.data || [])
    } catch (e) { console.error(e) }
  }

  const complete = async (taskId: string, notes = '') => {
    try {
      await api.put(`/tasks/${taskId}/complete`, { notes })
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

  const deleteTemplate = async (templateId: string) => {
    if (!window.confirm('Delete this template?')) return
    try {
      await api.delete(`/tasks/templates/${templateId}`)
      await loadTemplates()
      toast.success('Template deleted')
    } catch { toast.error('Failed to delete template') }
  }

  const generateDaily = async () => {
    setGeneratingDaily(true)
    try {
      const res = await api.post('/tasks/generate-daily', { homeId: selectedHome })
      await load()
      toast.success(res.data.message || 'Tasks generated')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to generate tasks')
    }
    setGeneratingDaily(false)
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
          {pageTab === 'tasks' && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add task</Button>}
          {pageTab === 'templates' && isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddTemplateOpen(true)}>Add template</Button>}
        </div>
      </div>

      {/* Page tab switcher */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1 mb-5 w-fit">
        <button onClick={() => setPageTab('tasks')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${pageTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Tasks
        </button>
        <button onClick={() => setPageTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${pageTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <LayoutTemplate className="w-3.5 h-3.5" /> Templates
        </button>
      </div>

      {pageTab === 'tasks' && (
        <>
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

          {/* Filter + generate button */}
          <div className="flex gap-3 mb-5 items-center">
            <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 flex-1">
              {[{ key: 'pending', label: 'Pending' }, { key: 'completed', label: 'Completed' }, { key: 'all', label: 'All' }].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
              <Button size="sm" variant="outline" icon={<Zap className="w-3.5 h-3.5" />} loading={generatingDaily} onClick={generateDaily}>
                Generate today's tasks
              </Button>
            )}
          </div>

          {loading ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState title={filter === 'pending' ? 'No pending tasks' : 'No tasks found'}
              description="All tasks completed for today!"
              action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add task</Button>} />
          ) : (
            <div className="space-y-3">
              {filtered.map((task: any) => (
                <div key={task.id} className={`bg-white rounded-2xl border shadow-card p-4 flex items-start gap-4 ${task.status === 'completed' ? 'border-emerald-200 opacity-70' : 'border-slate-100'}`}>
                  <button onClick={() => task.status !== 'completed' && setCompletingTask(task)}
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
                    {task.status === 'completed' && task.completion_notes && <span className="text-xs text-slate-500 italic mt-0.5 block">Note: {task.completion_notes}</span>}
                  </div>
                  {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {pageTab === 'templates' && (
        <>
          {templates.length === 0 ? (
            <EmptyState title="No templates" description="Templates let you auto-generate recurring tasks each day"
              action={isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddTemplateOpen(true)}>Add first template</Button> : undefined} />
          ) : (
            <div className="space-y-3">
              {templates.map((tmpl: any) => (
                <div key={tmpl.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm text-slate-900">{tmpl.title}</h3>
                      <span className={`badge text-xs ${priorityColor(tmpl.priority)}`}>{tmpl.priority}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{(tmpl.category || '').replace('_', ' ')}</span>
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full capitalize">{(tmpl.frequency || '').replace('_', ' ')}</span>
                    </div>
                    {tmpl.description && <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      {tmpl.due_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tmpl.due_time}</span>}
                      {tmpl.assigned_role && <span>Role: {tmpl.assigned_role.replace('_', ' ')}</span>}
                    </div>
                  </div>
                  {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditTemplateOpen(tmpl)} className="p-1.5 rounded-lg text-slate-300 hover:text-purple-500 hover:bg-purple-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTemplate(tmpl.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} sus={sus} homeId={selectedHome}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Task added') }} />

      <AddTemplateModal open={addTemplateOpen} onClose={() => setAddTemplateOpen(false)} homeId={selectedHome}
        onSaved={async () => { setAddTemplateOpen(false); await loadTemplates(); toast.success('Template added') }} />

      {editTemplateOpen && (
        <EditTemplateModal template={editTemplateOpen} onClose={() => setEditTemplateOpen(null)}
          onSaved={async () => { setEditTemplateOpen(null); await loadTemplates(); toast.success('Template updated') }} />
      )}

      {completingTask && (
        <Modal open={!!completingTask} onClose={() => { setCompletingTask(null); setCompletionNote('') }} title="Complete task">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Mark <strong>{completingTask.title}</strong> as complete?</p>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={3} value={completionNote} onChange={e => setCompletionNote(e.target.value)} placeholder="Any notes about completion..." autoFocus />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => { setCompletingTask(null); setCompletionNote('') }}>Cancel</Button>
              <Button icon={<Check className="w-4 h-4" />} onClick={async () => {
                await complete(completingTask.id, completionNote)
                setCompletingTask(null)
                setCompletionNote('')
              }}>Complete task</Button>
            </div>
          </div>
        </Modal>
      )}
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

function AddTemplateModal({ open, onClose, homeId, onSaved }: { open: boolean; onClose: () => void; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'general', description: '', frequency: 'daily', dueTime: '', assignedRole: '', priority: 'normal' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/tasks/templates', { homeId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add task template">
      <form onSubmit={save} className="space-y-4">
        <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Morning medication round, Clean bathrooms..." autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
          <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)} options={PRIORITIES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} />
          <Input label="Due time" type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <Input label="Assigned role" value={form.assignedRole} onChange={e => set('assignedRole', e.target.value)} placeholder="e.g. care_staff, home_manager..." />
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add template</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditTemplateModal({ template, onClose, onSaved }: { template: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: template.title || '',
    category: template.category || 'general',
    description: template.description || '',
    frequency: template.frequency || 'daily',
    dueTime: template.due_time || '',
    assignedRole: template.assigned_role || '',
    priority: template.priority || 'normal',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.put(`/tasks/templates/${template.id}`, form); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Edit task template">
      <form onSubmit={save} className="space-y-4">
        <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
          <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)} options={PRIORITIES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} />
          <Input label="Due time" type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <Input label="Assigned role" value={form.assignedRole} onChange={e => set('assignedRole', e.target.value)} placeholder="e.g. care_staff, home_manager..." />
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}
