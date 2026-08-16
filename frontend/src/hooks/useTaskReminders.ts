import { useEffect, useRef } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

// Periodically reminds staff of their pending tasks for today via an in-app pop-up.
// The interval is configurable per-home in Settings (task_reminder_minutes, default 60).
export function useTaskReminders(enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const checkDueTasks = async () => {
      try {
        const res = await api.get('/tasks')
        const tasks: any[] = res.data?.data || []
        const pending = tasks.filter(t => t.status !== 'completed' && t.status !== 'done')
        if (pending.length > 0 && !cancelled) {
          toast(`You have ${pending.length} task${pending.length !== 1 ? 's' : ''} due today`, {
            icon: '✅',
            duration: 6000,
          })
        }
      } catch { /* non-fatal — skip this reminder cycle */ }
    }

    const setup = async () => {
      let minutes = 60
      try {
        const res = await api.get('/reviews/settings/home')
        minutes = res.data?.data?.task_reminder_minutes || 60
      } catch { /* fall back to default */ }

      // First reminder shortly after load, then repeat at the configured interval.
      const firstTimer = setTimeout(checkDueTasks, 20000)
      timerRef.current = setInterval(checkDueTasks, minutes * 60 * 1000)
      return firstTimer
    }

    let firstTimerHandle: ReturnType<typeof setTimeout> | undefined
    setup().then(t => { firstTimerHandle = t })

    return () => {
      cancelled = true
      if (firstTimerHandle) clearTimeout(firstTimerHandle)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled])
}
