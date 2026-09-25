import { query } from '../config/database';
import { ukDateStr, ukDayOfWeek } from './ukTime';

// Single source of truth for "which recurring task templates fire today" —
// used by both the 6am cron (scheduler.ts) and the manual "Generate today's
// tasks" button (tasks.routes.ts POST /generate-daily). These used to be two
// separately-maintained copies of the same logic that had drifted apart (the
// cron's copy was missing several frequency types, including a "weekly"
// check hardcoded to only ever fire on a Monday regardless of which day the
// template was actually created), so a frequency added to one could silently
// not exist in the other.
export async function generateTasksForHome(homeId: string): Promise<number> {
  const today = ukDateStr();
  const dayOfWeek = ukDayOfWeek(); // 0=Sun, 1=Mon...

  const templates = await query<any>(
    `SELECT * FROM task_templates WHERE home_id = $1 AND is_active = true`,
    [homeId]
  );

  let created = 0;
  for (const tmpl of templates) {
    // "weekly" recurs on whatever day of the week the template was first
    // created on (not hardcoded to Monday, which meant a template created
    // any other day never fired except by coincidence).
    const freq = tmpl.frequency || 'daily';
    const anchor = tmpl.created_at ? new Date(tmpl.created_at) : new Date();
    const templateDow = anchor.getDay();
    const now = new Date();
    const monthsSinceAnchor = (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
    // Whole days between the template's creation date and today, both
    // normalised to midnight so a same-day time-of-day difference can't
    // throw off the day-interval frequencies below by one.
    const anchorMidnight = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceAnchor = Math.round((todayMidnight.getTime() - anchorMidnight.getTime()) / 86400000);

    let shouldCreate = false;
    if (freq === 'daily' || freq === 'twice_daily' || freq === 'three_times_daily') shouldCreate = true;
    else if (freq === 'weekly' && dayOfWeek === templateDow) shouldCreate = true;
    else if (freq === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldCreate = true;
    else if (freq === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldCreate = true;
    // "Rota days" — recurs only on days this home actually has a shift
    // scheduled, instead of every calendar day. This was offered as a
    // dropdown option on the template form but had no matching logic here
    // at all, so any template using it never generated a task on any day.
    else if (freq === 'rota_days') {
      const shiftRows = await query(
        `SELECT 1 FROM staff_shifts WHERE home_id=$1 AND shift_date=$2 AND status != 'cancelled' LIMIT 1`,
        [homeId, today]
      );
      shouldCreate = shiftRows.length > 0;
    }
    // Day-interval frequencies — recur every N days from the template's
    // creation date.
    else if (freq === 'fortnightly' && daysSinceAnchor >= 0 && daysSinceAnchor % 14 === 0) shouldCreate = true;
    else if (freq === 'every_3_weeks' && daysSinceAnchor >= 0 && daysSinceAnchor % 21 === 0) shouldCreate = true;
    else if (freq === 'every_28_days' && daysSinceAnchor >= 0 && daysSinceAnchor % 28 === 0) shouldCreate = true;
    // Month-interval frequencies — recur on the same day-of-month the
    // template was created, every N months from then on.
    else if (freq === 'monthly' && monthsSinceAnchor >= 0 && now.getDate() === anchor.getDate()) shouldCreate = true;
    else if (freq === 'quarterly' && monthsSinceAnchor >= 0 && monthsSinceAnchor % 3 === 0 && now.getDate() === anchor.getDate()) shouldCreate = true;
    else if (freq === 'every_6_months' && monthsSinceAnchor >= 0 && monthsSinceAnchor % 6 === 0 && now.getDate() === anchor.getDate()) shouldCreate = true;
    else if (freq === 'yearly' && monthsSinceAnchor >= 0 && monthsSinceAnchor % 12 === 0 && now.getDate() === anchor.getDate()) shouldCreate = true;

    if (shouldCreate) {
      // "twice_daily"/"three_times_daily" generate one row per occurrence time
      // (due_times, set on the template) instead of one row carrying multiple
      // times — each occurrence is its own independent pending task, poppable
      // and completable on its own, same as every other task. Falls back to
      // the template's single due_time for every other frequency, unchanged.
      const occurrenceTimes = (freq === 'twice_daily' || freq === 'three_times_daily') && Array.isArray(tmpl.due_times) && tmpl.due_times.length
        ? tmpl.due_times
        : [tmpl.due_time || null];

      for (const dueTime of occurrenceTimes) {
        // Dedup per occurrence (title + due_time), not just title — a
        // twice-daily template's two occurrences share a title but must both
        // be allowed to exist for the same day.
        const existing = await query(
          `SELECT id FROM tasks WHERE home_id=$1 AND task_date=$2 AND title=$3 AND due_time IS NOT DISTINCT FROM $4`,
          [homeId, today, tmpl.title, dueTime]
        );
        if (existing.length > 0) continue;

        await query(
          `INSERT INTO tasks (home_id, su_id, title, category, description, task_date, due_time, priority, assigned_role, status, visible_team_ids)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)`,
          [homeId, tmpl.su_id || null, tmpl.title, tmpl.category || 'general',
           tmpl.description || null, today, dueTime,
           tmpl.priority || 'normal', tmpl.assigned_role || null, tmpl.visible_team_ids || null]
        );
        created++;
      }
    }
  }
  return created;
}
