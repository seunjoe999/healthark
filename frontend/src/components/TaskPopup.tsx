import React, { useEffect, useState } from 'react'
import { Modal, Button } from './ui'
import api from '../api'
import { CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (open && !hasLoaded) {
      loadTasks()
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
