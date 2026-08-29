import React, { useEffect, useState } from 'react'
import { Modal, Button } from './ui'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Settings, AlarmClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { REMINDER_FREQUENCY_OPTIONS, getReminderFrequency, setReminderFrequency, markTaskPopupShown, isTimePastDue } from '../utils/taskReminder'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  due_date?: string
  due_time?: string
  kind?: 'task' | 'medication'
  suName?: string
}

interface TaskPopupProps {
  open: boolean
  onClose: () => void
}

export default function TaskPopup({ open, onClose }: TaskPopupProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showFreqSettings, setShowFreqSettings] = useState(false)
  const [freq, setFreq] = useState(() => user?.id ? getReminderFrequency(user.id) : 'every_visit')

  useEffect(() => {
    if (open && !hasLoaded) {
      loadTasks()
      if (user?.id) markTaskPopupShown(user.id)
    }
  }, [open])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [taskRes, medRes] = await Promise.allSettled([
        api.get('/tasks', { params: { date: today } }),
        user?.homeId ? api.get('/mar/due-today', { params: { homeId: user.homeId } }) : Promise.resolve(null),
      ])
      const pending: Task[] = taskRes.status === 'fulfilled'
        ? (taskRes.value.data.data || []).filter((t: any) => t.status === 'pending').map((t: any) => ({ ...t, kind: 'task' }))
        : []
      const medsRaw = medRes.status === 'fulfilled' && medRes.value ? (medRes.value.data.data || []) : []
      const meds: Task[] = medsRaw
        .filter((m: any) => m.status === 'pending')
        .map((m: any) => ({
          id: `med-${m.medicationId}-${m.scheduledTime}`,
          title: `${m.medicationName}${m.dose ? ` (${m.dose})` : ''}`,
          description: m.suName ? `For ${m.suName}` : undefined,
          status: 'pending',
          due_time: m.scheduledTime,
          kind: 'medication',
        }))
      const merged = [...pending, ...meds]
      setTasks(merged)
      setHasLoaded(true)
      if (merged.length === 0) onClose()
    } catch (err) {
      console.error('Failed to load tasks', err)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const markComplete = async (taskId: string) => {
    try {
      await api.put(`/tasks/${taskId}/complete`, { notes: '' })
      setCompleted(prev => new Set([...prev, taskId]))
      toast.success('Task completed!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to complete task')
    }
  }

  const incompleteTasks = tasks.filter(t => !completed.has(t.id))
  const overdueTasks = incompleteTasks.filter(t => isTimePastDue(t.due_time))
  const upcomingTasks = incompleteTasks.filter(t => !isTimePastDue(t.due_time))
  const pendingCount = incompleteTasks.length

  const renderItem = (task: Task, overdue: boolean) => (
    <div key={task.id} className={`p-3 rounded border flex items-start gap-3 ${overdue ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
          {task.kind === 'medication' && <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">Medication</span>}
          {overdue && <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlarmClock className="w-2.5 h-2.5" /> Overdue</span>}
        </div>
        {task.description && <p className="text-xs text-slate-600 mt-1">{task.description}</p>}
        {task.due_time && <p className="text-xs text-slate-500 mt-1">Due: {task.due_time.slice(0, 5)}</p>}
      </div>
      {task.kind !== 'medication' && (
        <button onClick={() => markComplete(task.id)} className="text-slate-400 hover:text-green-600 transition-colors flex-shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </button>
      )}
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={`Today's Tasks${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`} size="md">
      <div className="flex items-center justify-end -mt-2 mb-1">
        <button type="button" onClick={() => setShowFreqSettings(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <Settings className="w-3.5 h-3.5" /> Reminder frequency
        </button>
      </div>
      {showFreqSettings && (
        <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <select className="input text-xs" value={freq} onChange={e => {
            const v = e.target.value as any
            setFreq(v)
            if (user?.id) setReminderFrequency(user.id, v)
            toast.success('Reminder frequency updated')
          }}>
            {REMINDER_FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {loading ? (
          <p className="text-center text-slate-500 py-8">Loading tasks...</p>
        ) : incompleteTasks.length === 0 ? (
          <p className="text-center text-slate-500 py-8">All tasks completed for today!</p>
        ) : (
          <>
            {overdueTasks.length > 0 && (
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Overdue now ({overdueTasks.length})</p>
                <div className="space-y-2">{overdueTasks.map(t => renderItem(t, true))}</div>
              </div>
            )}
            {upcomingTasks.length > 0 && (
              <div>
                {overdueTasks.length > 0 && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 mt-3">Later today</p>}
                <div className="space-y-2">{upcomingTasks.map(t => renderItem(t, false))}</div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex gap-3 justify-end pt-4 mt-4 border-t">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
