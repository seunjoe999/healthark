// UK wall-clock time helpers (`Europe/London`), automatically accounting for
// both BST (UTC+1, last Sunday of March -> last Sunday of October) and GMT
// (UTC+0), including the repeated 01:00–01:59 hour on autumn fallback nights
// (e.g. Sunday 25 Oct 2026 at 01:00 UTC when 01:59:59 BST becomes 01:00:00 GMT)
// and the skipped 01:00–01:59 hour on spring forward nights.

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
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23',
  }).formatToParts(d);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

export function ukTimeHHMMSS(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, hourCycle: 'h23',
  }).formatToParts(d);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  const s = parts.find(p => p.type === 'second')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}:${s}`;
}

// 0 = Sunday .. 6 = Saturday, evaluated in UK local time.
export function ukDayOfWeek(d: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

// Whole calendar days between two dates in Europe/London, computed via UTC noon
// so a 23-hour (spring forward) or 25-hour (autumn fallback) UK day is always
// exactly 1 calendar day — never off by one due to 86,400,000 ms division.
export function ukDaysBetween(start: Date | string, end: Date | string): number {
  const toYMD = (v: Date | string) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
      ? v.slice(0, 10)
      : ukDateStr(typeof v === 'string' ? new Date(v) : v);
  const a = Date.parse(`${toYMD(start)}T12:00:00Z`);
  const b = Date.parse(`${toYMD(end)}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Returns the EARLIEST UTC epoch timestamp (ms) at which UK wall-clock time on
// `dateStr` ("YYYY-MM-DD") reaches `hhmm` ("HH:MM").
//
// Why this matters on DST transition nights:
// - Normal BST day (UTC+1): "08:00" -> 07:00Z.
// - Normal GMT day (UTC+0): "08:00" -> 08:00Z (automatically +1h later in UTC).
// - Autumn fallback Sunday (e.g. 2026-10-25, clocks go back 01:59 BST -> 01:00 GMT):
//   "01:30" first occurs at 00:30Z (01:30 BST). Comparing plain "HH:MM" strings at
//   01:05 GMT (01:05Z, 35 minutes AFTER 01:30 BST!) would see "01:30" > "01:05"
//   and falsely re-lock an already-due medication as "early" for up to 59 minutes.
//   Using `ukSlotStartUtcMs` is strictly monotonic in real time and never re-locks.
// - Spring forward Sunday (clocks jump 01:00 GMT -> 02:00 BST):
//   A slot at "01:30" becomes due as soon as the clock crosses 02:00 BST (01:00Z).
export function ukSlotStartUtcMs(dateStr: string, hhmm: string): number {
  const [y, mo, d] = dateStr.slice(0, 10).split('-').map(Number);
  const [h, mi] = hhmm.slice(0, 5).split(':').map(Number);
  const targetKey = `${dateStr.slice(0, 10)} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;

  // Test the two possible UK offsets in chronological order:
  //   1. BST (UTC+1): local - 60 min in UTC (comes FIRST chronologically)
  //   2. GMT (UTC+0): local - 0 min in UTC
  const candidates = [
    Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0) - 3600_000,
    Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0),
  ];
  for (const ms of candidates) {
    const dt = new Date(ms);
    if (`${ukDateStr(dt)} ${ukTimeHHMM(dt)}` === targetKey) {
      return ms;
    }
  }
  // Non-existent wall time during spring-forward 01:00–01:59 gap: the moment UK
  // clocks jump over 01:XX directly to 02:00 BST (`01:00:00Z`), that slot has arrived.
  return Date.UTC(y, (mo || 1) - 1, d || 1, 1, 0, 0);
}

export function isUkSlotDue(
  dateStr: string,
  hhmm: string,
  now: Date = new Date(),
  graceMinutes: number = 0,
): boolean {
  const cleanDate = dateStr.slice(0, 10);
  const cleanTime = hhmm.slice(0, 5);
  return now.getTime() >= ukSlotStartUtcMs(cleanDate, cleanTime) + graceMinutes * 60_000;
}
