import React, { useEffect, useState } from 'react'
import { Modal, Button } from './ui'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { REMINDER_FREQUENCY_OPTIONS, getReminderFrequency, setReminderFrequency, markTaskPopupShown } from '../utils/taskReminder'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  due_date?: string
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
      const res = await api.get('/tasks', { params: { date: today } })
      const pending = (res.data.data || []).filter((t: Task) => t.status === 'pending')
      setTasks(pending)
      setHasLoaded(true)
      if (pending.length === 0) onClose()
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
  const pendingCount = incompleteTasks.length

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
          incompleteTasks.map(task => (
            <div key={task.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                {task.description && <p className="text-xs text-slate-600 mt-1">{task.description}</p>}
                {task.due_date && <p className="text-xs text-slate-500 mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
              </div>
              <button onClick={() => markComplete(task.id)} className="text-slate-400 hover:text-green-600 transition-colors flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-3 justify-end pt-4 mt-4 border-t">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
