// UK wall-clock date/time utilities (`Europe/London`), matching
// `backend/src/utils/ukTime.ts` across BST <-> GMT transitions.

const UK_TZ = 'Europe/London'

export function ukDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: UK_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

export function ukTimeHHMM(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23',
  }).formatToParts(date)
  const h = parts.find(p => p.type === 'hour')?.value ?? '00'
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${h === '24' ? '00' : h}:${m}`
}

// Earliest UTC epoch ms at which `dateStr` ("YYYY-MM-DD") reaches `hhmm` ("HH:MM")
// in Europe/London — strictly monotonic across the 01:59 BST -> 01:00 GMT fallback
// so a due medication slot never re-locks when the UK clock goes back an hour.
export function ukSlotStartUtcMs(dateStr: string, hhmm: string): number {
  const [y, mo, d] = dateStr.slice(0, 10).split('-').map(Number)
  const [h, mi] = hhmm.slice(0, 5).split(':').map(Number)
  const targetKey = `${dateStr.slice(0, 10)} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
  const candidates = [
    Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0) - 3600_000,
    Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0),
  ]
  for (const ms of candidates) {
    const dt = new Date(ms)
    if (`${ukDateStr(dt)} ${ukTimeHHMM(dt)}` === targetKey) return ms
  }
  return Date.UTC(y, (mo || 1) - 1, d || 1, 1, 0, 0)
}

export function isUkSlotDue(dateStr: string, hhmm: string, now: Date = new Date()): boolean {
  const cleanDate = dateStr.slice(0, 10)
  const today = ukDateStr(now)
  if (cleanDate < today) return true
  if (cleanDate > today) return false
  return now.getTime() >= ukSlotStartUtcMs(cleanDate, hhmm.slice(0, 5))
}
