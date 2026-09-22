import { query } from '../config/database';

// Whether this staff member's most recent clock event was a clock-in (i.e.
// they're still on shift right now). Shared by anything that gates a staff
// member's ability to edit their own input (daily records, tasks, …) to
// "until their shift is over" instead of an arbitrary same-calendar-day cutoff.
export async function isStaffClockedIn(staffId: string): Promise<boolean> {
  if (!staffId) return false;
  const rows = await query<any>(
    `SELECT event_type FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
    [staffId]
  );
  return rows[0]?.event_type === 'clock_in';
}

// Broader than isStaffClockedIn: staff can still amend their own documentation
// for a 24-hour grace period after clocking out — e.g. a night shift ends in
// the morning and an issue is spotted later that day, they shouldn't be locked
// out the second they clock out. Still on shift counts too; only fully locks
// once 24 hours have passed since their last clock-out.
export async function isWithinAmendWindow(staffId: string): Promise<boolean> {
  if (!staffId) return false;
  const rows = await query<any>(
    `SELECT event_type, event_time FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
    [staffId]
  );
  const last = rows[0];
  if (!last) return false;
  if (last.event_type === 'clock_in') return true;
  const hoursSinceClockOut = (Date.now() - new Date(last.event_time).getTime()) / 3600000;
  return hoursSinceClockOut <= 24;
}
