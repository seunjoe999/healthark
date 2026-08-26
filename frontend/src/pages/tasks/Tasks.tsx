import React, { useEffect, useState } from 'react'
import { homesApi, suApi, staffApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, PrintButton } from '../../components/ui'
import { CheckSquare, Plus, Check, Clock, AlertTriangle, Trash2, Zap, LayoutTemplate, Pencil, Image as ImageIcon, Pill, Send, CalendarClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { LogMARModal, MAR_CODE_OPTIONS } from '../mar/MAR'

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

const CATEGORIES = [{ value: 'housekeeping', label: 'Housekeeping' }, { value: 'medication', label: 'Medication check' }, { value: 'social_visit', label: 'Social visit' }, { value: 'personal_care', label: 'Personal care' }, { value: 'health_check', label: 'Health check' }, { value: 'general', label: 'General' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'follow_up', label: 'Follow up' }]
const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]
const TEAMS = [
  { value: '', label: 'All' },
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'senior_carer', label: 'Senior Carer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'home_manager', label: 'Manager' },
  { value: 'auditor', label: 'Auditor' },
]

function PictureUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(res.data?.data?.fileUrl || '')
      toast.success('Picture uploaded')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }
  return (
    <div>
      <label className="label">Picture (optional)</label>
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        <Button type="button" size="sm" variant="outline" icon={<ImageIcon className="w-3.5 h-3.5" />} loading={uploading} onClick={() => inputRef.current?.click()}>
          {value ? 'Change picture' : 'Choose file'}
        </Button>
        {value && <img src={value} alt="Task" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />}
      </div>
    </div>
  )
}

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
  const [pageTab, setPageTab] = useState<'tasks' | 'templates' | 'medication'>('tasks')
  const [sus, setSus] = useState<any[]>([])
  const [generatingDaily, setGeneratingDaily] = useState(false)
  const [completingTask, setCompletingTask] = useState<any>(null)
  const [completionNote, setCompletionNote] = useState('')
  const [medTasks, setMedTasks] = useState<any[]>([])
  const [medTasksLoading, setMedTasksLoading] = useState(false)
  const [logMedTarget, setLogMedTarget] = useState<any>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false)
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([])
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
    staffApi.list({ homeId: selectedHome }).then(res => setStaffList(res.data.data || [])).catch(() => {})
    load()
    loadTemplates()
    loadMedTasks()
    loadTodaysAppointments()
  }, [selectedHome])

  const loadTodaysAppointments = async () => {
    try {
      const res = await api.get('/calendar', { params: { homeId: selectedHome, from: today, to: today } })
      setTodaysAppointments((res.data.data || []).filter((e: any) => e.event_type === 'appointment'))
    } catch (e) { console.error(e) }
  }

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

  const loadMedTasks = async () => {
    setMedTasksLoading(true)
    try {
      const res = await api.get('/mar/due-today', { params: { homeId: selectedHome } })
      setMedTasks(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setMedTasksLoading(false) }
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
          {pageTab === 'tasks' && <Button size="sm" variant="outline" icon={<Send className="w-4 h-4" />} onClick={() => setAddFollowUpOpen(true)}>Follow up</Button>}
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
        <button onClick={() => setPageTab('medication')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${pageTab === 'medication' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Pill className="w-3.5 h-3.5" /> Medication{medTasks.filter(m => m.status === 'pending').length > 0 ? ` (${medTasks.filter(m => m.status === 'pending').length})` : ''}
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

          {/* Today's appointments — pulled from the calendar so they show up as things to do today */}
          {todaysAppointments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Today's appointments
              </p>
              <div className="space-y-1.5">
                {todaysAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-blue-900">
                    {a.start_time && <span className="text-xs text-blue-500 font-medium">{format(new Date(a.start_time), 'HH:mm')}</span>}
                    <span className="font-medium">{a.title}</span>
                    {a.su_name && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{a.su_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      {task.category === 'follow_up' && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Send className="w-3 h-3" /> Follow up</span>}
                      {task.assigned_staff_name && <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">For {task.assigned_staff_name}</span>}
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

      {pageTab === 'medication' && (
        <>
          <p className="text-sm text-slate-500 mb-4">Medication due today for your residents. Complete each round here — it's recorded on the MAR automatically with your name and time.</p>
          {medTasksLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : medTasks.length === 0 ? (
            <EmptyState title="No medication due" description="No medication rounds are due today for your assigned residents" />
          ) : (
            <div className="space-y-3">
              {medTasks.map((m: any, i: number) => {
                const codeInfo = MAR_CODE_OPTIONS.find(o => o.code === m.status)
                const isDone = m.status !== 'pending'
                return (
                  <div key={`${m.medicationId}-${m.scheduledTime}-${i}`}
                    className={`bg-white rounded-2xl border shadow-card p-4 flex items-center gap-4 ${isDone ? 'border-emerald-100' : 'border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDone ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)' }}>
                      <Pill className="w-5 h-5" style={{ color: isDone ? '#10b981' : '#8b5cf6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-slate-900">{m.medicationName}</h3>
                        {m.dose && <span className="text-xs text-slate-500">{m.dose}</span>}
                        {m.isControlled && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Controlled</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{m.suName} · Due {m.scheduledTime}</p>
                    </div>
                    {isDone ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: codeInfo?.bg, color: codeInfo?.color }}>
                        {codeInfo?.label || 'Done'}
                      </span>
                    ) : (
                      <Button size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => setLogMedTarget(m)}>Complete</Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {logMedTarget && (
        <LogMARModal
          med={{ id: logMedTarget.medicationId, medication_name: logMedTarget.medicationName, is_controlled: logMedTarget.isControlled }}
          date={today} slot={logMedTarget.scheduledTime} suId={logMedTarget.suId} homeId={selectedHome}
          onClose={() => setLogMedTarget(null)}
          onSaved={async () => { setLogMedTarget(null); await loadMedTasks(); toast.success('Medication recorded on MAR') }}
        />
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} sus={sus} homeId={selectedHome} staffList={staffList}
        onSaved={async () => { setAddOpen(false); await load(); toast.success('Task added') }} />

      <AddFollowUpModal open={addFollowUpOpen} onClose={() => setAddFollowUpOpen(false)} homeId={selectedHome} staffList={staffList}
        onSaved={async () => { setAddFollowUpOpen(false); await load(); toast.success('Follow up scheduled') }} />

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

function AddTaskModal({ open, onClose, sus, homeId, staffList, onSaved }: { open: boolean; onClose: () => void; sus: any[]; homeId: string; staffList: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'general', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '', priority: 'normal', suId: '', assignedRole: '', assignedStaffId: '', pictureUrl: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const suOptions = sus.map(su => ({ value: su.id, label: `${su.first_name || su.firstName} ${su.last_name || su.lastName}` }))
  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/tasks', { homeId, ...form, suId: form.suId || null, assignedStaffId: form.assignedStaffId || null }); onSaved() }
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
        <Select label="Team" value={form.assignedRole} onChange={e => set('assignedRole', e.target.value)} options={TEAMS} />
        <Select label="Assign to a specific staff member (optional)" value={form.assignedStaffId} onChange={e => set('assignedStaffId', e.target.value)}
          options={staffOptions} placeholder="Anyone on the team above" />
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." /></div>
        <PictureUploadField value={form.pictureUrl} onChange={url => set('pictureUrl', url)} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add task</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddFollowUpModal({ open, onClose, homeId, staffList, onSaved }: { open: boolean; onClose: () => void; homeId: string; staffList: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '', assignedStaffId: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const staffOptions = staffList.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assignedStaffId) { toast.error('Select who this follow up is for'); return }
    setLoading(true)
    try {
      await api.post('/tasks', { homeId, ...form, category: 'follow_up', priority: 'normal' })
      onSaved()
      setForm({ title: '', description: '', taskDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '', assignedStaffId: '' })
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Follow up">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-slate-500">Ask a colleague to follow up on something on a specific day — e.g. checking a medication order arrived. It'll pop up as a task for them on the date and time you set.</p>
        <Input label="Title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check medication order arrived" autoFocus />
        <div><label className="label">Message *</label><textarea required className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details for whoever follows this up..." /></div>
        <Select label="Follow up with *" required value={form.assignedStaffId} onChange={e => set('assignedStaffId', e.target.value)}
          options={staffOptions} placeholder="Select staff member" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date *" type="date" required value={form.taskDate} onChange={e => set('taskDate', e.target.value)} />
          <Input label="Time *" type="time" required value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Schedule follow up</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddTemplateModal({ open, onClose, homeId, onSaved }: { open: boolean; onClose: () => void; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'general', description: '', frequency: 'daily', dueTime: '', assignedRole: '', priority: 'normal', pictureUrl: '' })
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
          <Input label="Time" type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <Select label="Team" value={form.assignedRole} onChange={e => set('assignedRole', e.target.value)} options={TEAMS} />
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." /></div>
        <PictureUploadField value={form.pictureUrl} onChange={url => set('pictureUrl', url)} />
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
    pictureUrl: template.picture_url || '',
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
          <Input label="Time" type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
        </div>
        <Select label="Team" value={form.assignedRole} onChange={e => set('assignedRole', e.target.value)} options={TEAMS} />
        <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <PictureUploadField value={form.pictureUrl} onChange={url => set('pictureUrl', url)} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}
