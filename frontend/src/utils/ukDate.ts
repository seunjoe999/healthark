// UK calendar date from a JS Date, regardless of the device's own configured
// timezone — matches the backend's ukDateStr() (backend/src/utils/ukTime.ts).
// date.toISOString().split('T')[0] takes the UTC date, which sits up to an
// hour behind the UK's during BST — every "default this filter/date-field to
// today" spot that did that was wrong for up to an hour after UK midnight,
// every night, for about seven months of the year.
export function ukDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}
