import { query } from '../config/database';

// UK Working Time Regulations 1998 — workers are entitled to a minimum of 11
// consecutive hours' rest in any 24-hour period. A night shift immediately
// followed by a day shift the next day (or similar) that leaves less than
// this is what carers call a "shift crash" — not illegal to schedule by
// itself, but a compliance risk the system should flag, not silently allow.
const MIN_REST_HOURS = 11;

export interface ShiftConflict {
  type: 'overlap' | 'rest';
  staffName: string;
  date: string;
  withDate: string;
  withStart: string;
  withEnd: string;
  gapHours?: number;
}

function toTimestamp(dateStr: string, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCHours(h, m, 0, 0);
  return d.getTime();
}

// Returns [start, end] as epoch ms, pushing end into the next day when the
// shift crosses midnight (e.g. 20:00 -> 08:00).
function shiftRange(dateStr: string, startTime: string, endTime: string): [number, number] {
  const start = toTimestamp(dateStr, startTime);
  let end = toTimestamp(dateStr, endTime);
  if (end <= start) end += 24 * 3600 * 1000;
  return [start, end];
}

// Checks one proposed (staffId, date, start, end) assignment against that
// staff member's other shifts the day before/of/after, for a hard overlap
// (already on a shift) or an insufficient rest gap (shift crash). Call this
// BEFORE or AFTER writing the new/updated shift — excludeShiftId lets the
// shift being written exclude itself from its own conflict check.
export async function findStaffShiftConflicts(
  homeId: string,
  staffId: string,
  shiftDate: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<ShiftConflict[]> {
  const dayBefore = new Date(new Date(shiftDate + 'T00:00:00Z').getTime() - 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(new Date(shiftDate + 'T00:00:00Z').getTime() + 86400000).toISOString().split('T')[0];

  const rows = await query<any>(
    `SELECT id, shift_date::text as shift_date, start_time::text as start_time, end_time::text as end_time
     FROM staff_shifts
     WHERE home_id = $1 AND staff_id = $2 AND shift_date BETWEEN $3 AND $4
       AND status NOT IN ('cancelled')
       ${excludeShiftId ? 'AND id != $5' : ''}`,
    excludeShiftId ? [homeId, staffId, dayBefore, dayAfter, excludeShiftId] : [homeId, staffId, dayBefore, dayAfter]
  );
  if (!rows.length) return [];

  const staffRows = await query<any>(`SELECT first_name, last_name FROM staff WHERE id = $1`, [staffId]);
  const staffName = staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : 'This staff member';

  const [newStart, newEnd] = shiftRange(shiftDate, startTime, endTime);
  const conflicts: ShiftConflict[] = [];

  for (const r of rows) {
    const [exStart, exEnd] = shiftRange(r.shift_date, r.start_time, r.end_time);
    if (newStart < exEnd && exStart < newEnd) {
      conflicts.push({ type: 'overlap', staffName, date: shiftDate, withDate: r.shift_date, withStart: r.start_time, withEnd: r.end_time });
      continue;
    }
    const gapMs = newStart >= exEnd ? newStart - exEnd : exStart - newEnd;
    const gapHours = gapMs / 3600000;
    if (gapHours < MIN_REST_HOURS) {
      conflicts.push({
        type: 'rest', staffName, date: shiftDate, withDate: r.shift_date, withStart: r.start_time, withEnd: r.end_time,
        gapHours: Math.round(gapHours * 10) / 10,
      });
    }
  }
  return conflicts;
}

export function conflictMessage(c: ShiftConflict): string {
  if (c.type === 'overlap') {
    return `${c.staffName} is already on a shift ${c.withStart.slice(0, 5)}-${c.withEnd.slice(0, 5)} on ${c.withDate} that overlaps this one.`;
  }
  return `Shift crash: ${c.staffName} only gets ${c.gapHours}h rest between the shift on ${c.withDate} (${c.withStart.slice(0, 5)}-${c.withEnd.slice(0, 5)}) and this one — UK law requires at least ${MIN_REST_HOURS}h rest.`;
}
