import cron from 'node-cron';
import { alertsService } from './alerts.service';
import { logger } from '../config/logger';
import { getDueTodayTasks } from '../utils/medicationDue';
import { ukDateStr, ukTimeHHMM } from '../utils/ukTime';

// ================================================================
// HEALTHARK SCHEDULED JOBS
// Runs background checks for the AI audit engine
// ================================================================


// Daily: check overdue care plans and send notifications
async function checkOverdueCarePlans() {
  try {
    const { query } = await import('../config/database');
    const overdueRows = await query(
      `SELECT cp.id, cp.su_id, cp.plan_type, su.first_name || ' ' || su.last_name as su_name,
              s.id as manager_id, cp.home_id
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       JOIN staff s ON s.home_id = su.home_id AND s.role IN ('home_manager','group_admin') AND s.is_active = true
       WHERE cp.next_review_date < CURRENT_DATE AND cp.is_active = true
       LIMIT 50`
    );
    for (const row of overdueRows as any[]) {
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'warning','/care-plans')
         ON CONFLICT DO NOTHING`,
        [row.manager_id, row.home_id,
         `Care plan review overdue — ${row.su_name}`,
         `${row.plan_type?.replace(/_/g, ' ')} care plan for ${row.su_name} is overdue for review.`]
      );
    }
  } catch (err) { console.error('Overdue care plan check failed:', err); }
}


// Daily at 6am UK time: generate recurring tasks for all homes. Delegates to
// the same generateTasksForHome() the manual "Generate today's tasks" button
// uses (utils/taskGeneration.ts) — this used to be a separately-maintained
// copy of that logic that had drifted: missing several frequency types
// (including "rota_days", which had a dropdown option on the template form
// but no matching generation logic anywhere, so it silently never fired) and
// a "weekly" check hardcoded to only ever fire on a Monday.
async function generateDailyTasks() {
  try {
    const { query } = await import('../config/database');
    const { generateTasksForHome } = await import('../utils/taskGeneration');
    const homes = await query<any>('SELECT id FROM homes WHERE is_active = true');
    let totalCreated = 0;
    for (const home of homes) {
      totalCreated += await generateTasksForHome(home.id);
    }
    logger.info(`Daily tasks generated successfully (${totalCreated} created across ${homes.length} home(s))`);
  } catch (err) { logger.error('Daily task generation failed:', err); }
}

// Daily at 08:00: check for staff training expiring within 30 days
async function checkExpiringTraining() {
  try {
    const { query } = await import('../config/database');
    const rows = await query<any>(
      `SELECT st.staff_id, st.training_name, st.expiry_date,
              s.first_name || ' ' || s.last_name as staff_name,
              s.home_id,
              mgr.id as manager_id
       FROM staff_training st
       JOIN staff s ON s.id = st.staff_id AND s.is_active = true
       JOIN staff mgr ON mgr.home_id = s.home_id
           AND mgr.role IN ('home_manager','group_admin') AND mgr.is_active = true
       WHERE st.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND st.is_active = true
       LIMIT 100`
    );
    for (const row of rows) {
      const expiryFormatted = new Date(row.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'warning','/training')
         ON CONFLICT DO NOTHING`,
        [
          row.manager_id,
          row.home_id,
          `Training expiring soon — ${row.staff_name}`,
          `${row.training_name} expires on ${expiryFormatted}. Please arrange renewal.`,
        ]
      );
    }
    logger.info(`Training expiry check complete — ${rows.length} records checked`);
  } catch (err) {
    logger.error('Training expiry check failed:', err);
  }
}

// Daily at 07:00: check for medication stock at or below minimum threshold
async function checkLowMedicationStock() {
  try {
    const { query } = await import('../config/database');
    // Was querying current_quantity/minimum_quantity/is_active — none of which
    // exist on medication_stock (the real columns are current_stock and
    // reorder_threshold, and there's no soft-delete flag on this table) — so
    // this check has been silently no-op'ing on every run since it always hit
    // a column-does-not-exist error, caught below. Now matches the real schema.
    const rows = await query<any>(
      `SELECT ms.id, ms.medication_name, ms.current_stock, ms.reorder_threshold,
              ms.unit, ms.home_id,
              mgr.id as manager_id
       FROM medication_stock ms
       JOIN staff mgr ON mgr.home_id = ms.home_id
           AND mgr.role IN ('home_manager','group_admin') AND mgr.is_active = true
       WHERE ms.current_stock <= ms.reorder_threshold
       LIMIT 100`
    );
    for (const row of rows) {
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'warning','/medication-stock')`,
        [
          row.manager_id,
          row.home_id,
          `Low medication stock — ${row.medication_name}`,
          `Current stock: ${row.current_stock} ${row.unit}. Reorder threshold: ${row.reorder_threshold} ${row.unit}. Please reorder.`,
        ]
      );
    }
    logger.info(`Medication stock check complete — ${rows.length} low-stock items found`);
  } catch (err: any) {
    // Silently handle missing table or column errors
    logger.warn('Medication stock check skipped (table or column may not exist):', err?.message);
  }
}

// Every 30 minutes: notify managers about medication that was due and is still
// unrecorded — uses the same getDueTodayTasks list the staff task view and the
// clock-out gate already agree on, so "missed" here means exactly what it
// means everywhere else in the app. Dedupes on the notification's link so a
// re-run 30 minutes later doesn't spam a second alert for the same dose.
async function checkMissedMedication() {
  try {
    const { query } = await import('../config/database');
    const homes = await query<any>('SELECT id FROM homes WHERE is_active = true');
    const today = ukDateStr();
    const nowHHMM = ukTimeHHMM();
    // A dose isn't "missed" the second the clock ticks past its time — give
    // staff a reasonable window to actually administer it before alerting.
    const graceMinutes = 60;
    const cutoff = ukTimeHHMM(new Date(Date.now() - graceMinutes * 60000));

    for (const home of homes as any[]) {
      const tasks = await getDueTodayTasks(home.id, '', 'home_manager');
      const missed = tasks.filter(t => t.status === 'pending' && t.scheduledTime && t.scheduledTime < cutoff);
      if (!missed.length) continue;

      const managers = await query<any>(
        `SELECT id FROM staff WHERE home_id = $1 AND role IN ('home_manager','group_admin','deputy_manager') AND is_active = true`,
        [home.id]
      );
      if (!managers.length) continue;

      for (const med of missed) {
        const link = `/mar?missed=${med.medicationId}-${med.scheduledTime}-${today}`;
        const already = await query<any>(`SELECT 1 FROM notifications WHERE home_id = $1 AND link = $2 LIMIT 1`, [home.id, link]);
        if (already.length) continue;

        // Care staff assigned to this resident, plus whoever is currently
        // clocked in at the home right now (they're the ones who can still
        // actually administer it) — not just managers reviewing after the
        // fact.
        const assignedStaff = await query<any>(
          `SELECT DISTINCT s.id FROM staff_service_user_assignments a
           JOIN staff s ON s.id = a.staff_id AND s.home_id = $1 AND s.is_active = true
           WHERE a.su_id = $2`,
          [home.id, med.suId]
        );
        const onShiftStaff = await query<any>(
          `SELECT id FROM (
             SELECT DISTINCT ON (sce.staff_id) sce.staff_id AS id, sce.event_type
             FROM staff_clock_events sce
             JOIN staff s ON s.id = sce.staff_id AND s.home_id = $1 AND s.is_active = true
             ORDER BY sce.staff_id, sce.event_time DESC
           ) latest WHERE event_type = 'clock_in'`,
          [home.id]
        );
        const staffRecipients = new Map<string, true>();
        for (const s of assignedStaff) staffRecipients.set(s.id, true);
        for (const s of onShiftStaff) staffRecipients.set(s.id, true);

        const recipients = new Map<string, true>();
        for (const mgr of managers) recipients.set(mgr.id, true);
        for (const id of staffRecipients.keys()) recipients.set(id, true);

        for (const recipientId of recipients.keys()) {
          await query(
            `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'warning',$5)`,
            [recipientId, home.id, `Medication missed — ${med.suName}`,
             `${med.medicationName} scheduled for ${med.scheduledTime} was not recorded as given.`, link]
          ).catch(() => {});
        }
      }
    }
  } catch (err) { logger.error('Missed medication check failed:', err); }
}

// Every 30 minutes: notify all managers about general tasks (not medication —
// that's checkMissedMedication above) that are still pending well past their
// due time or from a previous day. Dedupes on the notification's link so a
// re-run doesn't spam a second alert for the same task.
async function checkOverdueTasks() {
  try {
    const { query } = await import('../config/database');
    const today = ukDateStr();
    const graceMinutes = 60;
    const cutoffHHMM = ukTimeHHMM(new Date(Date.now() - graceMinutes * 60000));

    const overdue = await query<any>(
      `SELECT t.id, t.home_id, t.title, t.task_date, t.due_time
       FROM tasks t
       WHERE t.status = 'pending'
         AND (t.task_date < $1 OR (t.task_date = $1 AND t.due_time IS NOT NULL AND t.due_time <> '' AND t.due_time < $2))
       LIMIT 200`,
      [today, cutoffHHMM]
    );
    if (!overdue.length) return;

    const byHome = new Map<string, any[]>();
    for (const t of overdue as any[]) {
      if (!byHome.has(t.home_id)) byHome.set(t.home_id, []);
      byHome.get(t.home_id)!.push(t);
    }

    for (const [homeId, tasksForHome] of byHome) {
      const managers = await query<any>(
        `SELECT id FROM staff WHERE home_id = $1 AND role IN ('home_manager','group_admin','deputy_manager') AND is_active = true`,
        [homeId]
      );
      if (!managers.length) continue;

      for (const t of tasksForHome) {
        const link = `/tasks?overdue=${t.id}`;
        const already = await query<any>(`SELECT 1 FROM notifications WHERE home_id = $1 AND link = $2 LIMIT 1`, [homeId, link]);
        if (already.length) continue;

        const label = t.task_date < today ? `missed (was due ${t.task_date})` : `overdue (was due ${t.due_time})`;
        for (const mgr of managers) {
          await query(
            `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'warning',$5)`,
            [mgr.id, homeId, `Task ${label} — ${t.title}`,
             `"${t.title}" has not been completed by staff.`, link]
          ).catch(() => {});
        }
      }
    }
  } catch (err) { logger.error('Overdue task check failed:', err); }
}

// Every 15 minutes: notify managers about staff who are late for (or have
// entirely missed) a shift they're rota'd on today — no clock_in event found
// for that staff member since midnight, more than 15 minutes after the shift's
// start_time. Dedupes on the notification's link so a re-run doesn't spam a
// second alert for the same shift.
async function checkLateOrMissedShifts() {
  try {
    const { query } = await import('../config/database');
    const late = await query<any>(
      `SELECT ss.id, ss.home_id, ss.staff_id, ss.start_time,
              s.first_name || ' ' || s.last_name as staff_name
       FROM staff_shifts ss
       JOIN staff s ON s.id = ss.staff_id AND s.is_active = true
       WHERE ss.shift_date = CURRENT_DATE
         AND ss.staff_id IS NOT NULL
         AND ss.status NOT IN ('cancelled')
         AND ss.start_time IS NOT NULL
         AND CURRENT_TIME > ss.start_time + INTERVAL '15 minutes'
         AND CURRENT_TIME < ss.start_time + INTERVAL '6 hours'
         AND NOT EXISTS (
           SELECT 1 FROM staff_clock_events ce
           WHERE ce.staff_id = ss.staff_id AND ce.event_type = 'clock_in'
             AND ce.event_time >= CURRENT_DATE
         )
       LIMIT 200`
    );
    if (!late.length) return;

    const byHome = new Map<string, any[]>();
    for (const row of late as any[]) {
      if (!byHome.has(row.home_id)) byHome.set(row.home_id, []);
      byHome.get(row.home_id)!.push(row);
    }

    for (const [homeId, shiftsForHome] of byHome) {
      const managers = await query<any>(
        `SELECT id FROM staff WHERE home_id = $1 AND role IN ('home_manager','group_admin','deputy_manager') AND is_active = true`,
        [homeId]
      );
      if (!managers.length) continue;

      for (const sh of shiftsForHome) {
        const link = `/rota?late=${sh.id}`;
        const already = await query<any>(`SELECT 1 FROM notifications WHERE home_id = $1 AND link = $2 LIMIT 1`, [homeId, link]);
        if (already.length) continue;

        for (const mgr of managers) {
          await query(
            `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'warning',$5)`,
            [mgr.id, homeId, `Shift not clocked in — ${sh.staff_name}`,
             `${sh.staff_name} was due to start their shift at ${sh.start_time?.substring(0, 5)} and has not clocked in.`, link]
          ).catch(() => {});
        }
      }
    }
  } catch (err) { logger.error('Late/missed shift check failed:', err); }
}

// The server runs in UTC, but every one of these "at Nam" jobs means UK wall-clock
// time — without this, they silently fire an hour late (or early) for half the
// year, whenever the UK is on BST instead of GMT. This is the same root cause as
// the MAR "not due yet" bug (see utils/ukTime.ts): server-local time drifting
// from the UK time the business actually runs on.
const UK_TZ = { timezone: 'Europe/London' };

export function startScheduler(): void {
  logger.info('Starting CompCare Hub scheduler');

  // Every hour: check fluid intake
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduler: checking fluid intake');
    await alertsService.checkFluidIntake();
  }, UK_TZ);

  // Every 2 hours: check for missed tasks
  cron.schedule('0 */2 * * *', async () => {
    logger.info('Scheduler: checking care plan reviews');
    await alertsService.checkCarePlanReviews();
  }, UK_TZ);

  // Every morning at 7am: low medication stock — notifies managers directly, and
  // separately raises a dashboard alert visible to everyone (alertsService's version),
  // matching how every other "things to do today" item surfaces on the dashboard.
  cron.schedule('0 7 * * *', async () => {
    await checkLowMedicationStock();
    await alertsService.checkLowMedicationStock();
  }, UK_TZ);

  // Every 30 minutes: missed medication alerts to managers
  cron.schedule('*/30 * * * *', checkMissedMedication, UK_TZ);

  // Every 30 minutes: overdue/missed general task alerts to managers
  cron.schedule('*/30 * * * *', checkOverdueTasks, UK_TZ);

  // Every 15 minutes: late/no-show shift alerts to managers
  cron.schedule('*/15 * * * *', checkLateOrMissedShifts, UK_TZ);

  // Every morning at 8am: training expiry checks
  cron.schedule('0 8 * * *', async () => {
    logger.info('Scheduler: checking training expiry');
    await alertsService.checkTrainingExpiry();
  }, UK_TZ);

  // Every morning at 8am: expiring training notifications
  cron.schedule('0 8 * * *', checkExpiringTraining, UK_TZ);

  // Every morning at 9am: unreviewed incidents
  cron.schedule('0 9 * * *', async () => {
    logger.info('Scheduler: checking incident reviews');
    await alertsService.checkIncidentReviews();
  }, UK_TZ);

  // Monthly report: 1st of each month at 6am
  cron.schedule('0 6 1 * *', async () => {
    logger.info('Scheduler: generating monthly reports');
    // AI monthly report generation - wired in Phase 5
  }, UK_TZ);

  // Just after UK midnight: generate today's recurring task instances. Was
  // 6am, which meant a "daily" task completed yesterday had no fresh pending
  // instance for up to 6 hours after the new day started — moved to 00:01 so
  // a new one is there right at the start of the day. Uncompleted tasks from
  // previous days are no longer duplicated forward — the task list query
  // itself keeps showing any pending task until it's completed, so it never
  // silently disappears.
  cron.schedule('1 0 * * *', async () => {
    logger.info('Scheduler: generating daily tasks');
    await generateDailyTasks();
  }, UK_TZ);

  logger.info('Scheduler started — all jobs registered');
}
