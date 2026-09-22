// The VPS runs in UTC, but every "due today" / "is this early" check in the app
// means it in UK wall-clock time. During BST (late March–late October) UTC runs
// an hour behind the UK, so plain `new Date().toTimeString()` made medication
// doses look "not due yet" for up to an hour after they actually were —
// staff logging a 12:00 dose at 12:53 UK time were blocked because the server
// (at 11:53 UTC) still thought it wasn't noon yet. These helpers read the clock
// in Europe/London instead, which automatically accounts for BST/GMT.

const TZ = 'Europe/London';

export function ukDateStr(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

export function ukTimeHHMM(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

export function ukTimeHHMMSS(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d);
}

// 0 = Sunday .. 6 = Saturday, matching Date.prototype.getDay(), but evaluated
// in UK local time rather than the server's.
export function ukDayOfWeek(d: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}
