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
