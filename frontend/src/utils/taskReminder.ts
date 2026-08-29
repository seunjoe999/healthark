// Task pop-up reminder preferences — stored per-browser in localStorage.
// Lets staff (or admins on their behalf) control how often the "Today's Tasks"
// pop-up appears, instead of it firing on every dashboard visit.

export type ReminderFrequency = 'every_visit' | 'hourly' | 'every_4_hours' | 'once_daily' | 'off'

export const REMINDER_FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'every_visit', label: 'Every time I open the dashboard' },
  { value: 'hourly', label: 'Once every hour' },
  { value: 'every_4_hours', label: 'Once every 4 hours' },
  { value: 'once_daily', label: 'Once a day' },
  { value: 'off', label: 'Off — never pop up automatically' },
]

const FREQ_MS: Record<ReminderFrequency, number> = {
  every_visit: 0,
  hourly: 60 * 60 * 1000,
  every_4_hours: 4 * 60 * 60 * 1000,
  once_daily: 24 * 60 * 60 * 1000,
  off: Infinity,
}

function key(userId: string, suffix: string) { return `taskReminder:${userId}:${suffix}` }

export function getReminderFrequency(userId: string): ReminderFrequency {
  const v = localStorage.getItem(key(userId, 'frequency')) as ReminderFrequency | null
  return v && FREQ_MS[v] !== undefined ? v : 'every_visit'
}

export function setReminderFrequency(userId: string, freq: ReminderFrequency) {
  localStorage.setItem(key(userId, 'frequency'), freq)
}

export function shouldShowTaskPopup(userId: string): boolean {
  if (!userId) return false
  const freq = getReminderFrequency(userId)
  if (freq === 'off') return false
  if (freq === 'every_visit') return true
  const last = Number(localStorage.getItem(key(userId, 'lastShown')) || 0)
  return Date.now() - last >= FREQ_MS[freq]
}

export function markTaskPopupShown(userId: string) {
  if (!userId) return
  localStorage.setItem(key(userId, 'lastShown'), String(Date.now()))
}

// Time-based due check — independent of the frequency-based reminder above.
// A task or medication becomes "overdue" the moment its scheduled HH:mm for
// today passes, regardless of when the pop-up was last shown. Accepts
// "HH:mm" or "HH:mm:ss" (as returned by Postgres TIME columns).
export function isTimePastDue(dueTime?: string | null): boolean {
  if (!dueTime) return false
  const parts = String(dueTime).split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  const now = new Date()
  const due = new Date()
  due.setHours(h, m, 0, 0)
  return now.getTime() >= due.getTime()
}
