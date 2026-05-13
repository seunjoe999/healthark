import cron from 'node-cron';
import { alertsService } from './alerts.service';
import { logger } from '../config/logger';

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


// Daily at midnight: generate recurring tasks for all homes
async function generateDailyTasks() {
  try {
    const { query } = await import('../config/database');
    // Get all active homes
    const homes = await query<any>('SELECT id FROM homes WHERE is_active = true');
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();

    for (const home of homes) {
      const templates = await query<any>(
        'SELECT * FROM task_templates WHERE home_id = $1 AND is_active = true',
        [home.id]
      );

      for (const tmpl of templates) {
        // Check if already exists today
        const existing = await query(
          'SELECT id FROM tasks WHERE home_id=$1 AND task_date=$2 AND title=$3',
          [home.id, today, tmpl.title]
        );
        if (existing.length > 0) continue;

        const freq = tmpl.frequency || 'daily';
        let create = false;
        if (freq === 'daily') create = true;
        else if (freq === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) create = true;
        else if (freq === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) create = true;
        else if (freq === 'weekly' && dayOfWeek === 1) create = true;

        if (create) {
          await query(
            `INSERT INTO tasks (home_id, su_id, title, category, description, task_date, due_time, priority, assigned_role, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
            [home.id, tmpl.su_id || null, tmpl.title, tmpl.category || 'general',
             tmpl.description || null, today, tmpl.due_time || null,
             tmpl.priority || 'normal', tmpl.assigned_role || null]
          );
        }
      }
    }
    logger.info('Daily tasks generated successfully');
  } catch (err) { logger.error('Daily task generation failed:', err); }
}

export function startScheduler(): void {
  logger.info('Starting CompCare Hub scheduler');

  // Every hour: check fluid intake
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduler: checking fluid intake');
    await alertsService.checkFluidIntake();
  });

  // Every 2 hours: check for missed tasks
  cron.schedule('0 */2 * * *', async () => {
    logger.info('Scheduler: checking care plan reviews');
    await alertsService.checkCarePlanReviews();
  });

  // Every morning at 8am: training expiry checks
  cron.schedule('0 8 * * *', async () => {
    logger.info('Scheduler: checking training expiry');
    await alertsService.checkTrainingExpiry();
  });

  // Every morning at 9am: unreviewed incidents
  cron.schedule('0 9 * * *', async () => {
    logger.info('Scheduler: checking incident reviews');
    await alertsService.checkIncidentReviews();
  });

  // Monthly report: 1st of each month at 6am
  cron.schedule('0 6 1 * *', async () => {
    logger.info('Scheduler: generating monthly reports');
    // AI monthly report generation - wired in Phase 5
  });

  logger.info('Scheduler started — all jobs registered');
}
